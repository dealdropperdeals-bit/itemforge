import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { decryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { resolveEntitlements } from "@/lib/entitlements";
import { listPrintifyShops } from "@/lib/printify";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subscription = await prisma.userSubscription.findFirst({
    where: {
      userId: session.user.id,
    },
    include: {
      plan: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
  const entitlements = resolveEntitlements(subscription);
  if (!entitlements.canAccessApp) {
    return NextResponse.json({ error: "An active membership is required" }, { status: 403 });
  }

  const connection = await prisma.printifyConnection.findUnique({
    where: {
      userId: session.user.id,
    },
  });

  if (!connection) {
    return NextResponse.json({ error: "Printify connection not found" }, { status: 404 });
  }

  const shops = await listPrintifyShops(decryptSecret(connection.apiTokenEncrypted));
  return NextResponse.json(shops);
}
