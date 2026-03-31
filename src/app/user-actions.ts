"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth, signIn, signOut } from "@/auth";
import { createDesignDraft, prepareDesignExports } from "@/lib/designs";
import { encryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { listPrintifyShops } from "@/lib/printify";

function getField(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

export async function registerUser(formData: FormData) {
  const name = getField(formData, "name");
  const email = getField(formData, "email").toLowerCase();
  const password = getField(formData, "password");

  if (!email || !password || password.length < 8) {
    redirect("/sign-up?error=Invalid%20registration%20details");
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    redirect("/sign-in?error=Account%20already%20exists");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const isAdmin = env.adminEmails.includes(email);

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: isAdmin ? "ADMIN" : "USER",
      status: "ACTIVE",
    },
  });

  await signIn("credentials", {
    email,
    password,
    redirectTo: "/dashboard",
  });
}

export async function loginUser(formData: FormData) {
  const email = getField(formData, "email").toLowerCase();
  const password = getField(formData, "password");

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
    });
  } catch {
    redirect("/sign-in?error=Invalid%20email%20or%20password");
  }
}

export async function logoutUser() {
  await signOut({
    redirectTo: "/",
  });
}

export async function createDesign(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const title = getField(formData, "title");
  const deviceProfileId = getField(formData, "deviceProfileId");
  const file = formData.get("artwork");

  if (!(file instanceof File) || !file.size || !title || !deviceProfileId) {
    redirect("/dashboard?error=Missing%20design%20fields");
  }

  if (file.size > env.maxUploadMb * 1024 * 1024) {
    redirect(`/dashboard?error=File%20exceeds%20${env.maxUploadMb}MB%20limit`);
  }

  await createDesignDraft({
    userId: session.user.id,
    title,
    deviceProfileId,
    file,
  });

  revalidatePath("/dashboard");
  redirect("/dashboard?created=1");
}

export async function prepareDesign(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const designId = getField(formData, "designId");

  if (!designId) {
    redirect("/dashboard?error=Missing%20design%20id");
  }

  await prepareDesignExports({
    designId,
    userId: session.user.id,
  });

  revalidatePath("/dashboard");
  redirect("/dashboard?prepared=1");
}

export async function savePrintifyConnection(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const apiToken = getField(formData, "apiToken");
  const shopId = getField(formData, "shopId");

  if (!apiToken || !shopId) {
    redirect("/dashboard?error=Missing%20Printify%20token%20or%20shop%20id");
  }

  const shops = await listPrintifyShops(apiToken);
  const matchedShop = shops.find((shop) => String(shop.id) === shopId);

  if (!matchedShop) {
    redirect("/dashboard?error=Could%20not%20validate%20Printify%20shop%20id");
  }

  await prisma.printifyConnection.upsert({
    where: {
      userId: session.user.id,
    },
    update: {
      apiTokenEncrypted: encryptSecret(apiToken),
      shopId,
      shopName: matchedShop.title,
      lastValidatedAt: new Date(),
    },
    create: {
      userId: session.user.id,
      apiTokenEncrypted: encryptSecret(apiToken),
      shopId,
      shopName: matchedShop.title,
      lastValidatedAt: new Date(),
    },
  });

  revalidatePath("/dashboard");
  redirect("/dashboard?connected=1");
}
