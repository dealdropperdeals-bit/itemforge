import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createPaypalOrder } from "@/lib/paypal";
import { getResolvedLaunchSettings } from "@/lib/runtime-settings";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { packCode?: string };
  const packCode = body.packCode || "";

  const pack = await prisma.creditPack.findFirst({
    where: {
      code: packCode,
      isActive: true,
    },
  });

  if (!pack) {
    return NextResponse.json({ error: "Credit pack not found" }, { status: 404 });
  }

  const settings = await getResolvedLaunchSettings();
  const baseUrl = settings.appUrl;
  const order = await createPaypalOrder({
    referenceId: pack.code,
    customId: session.user.id,
    description: `${pack.name} for ItemForge`,
    amountCents: pack.amountCents,
    returnUrl: `${baseUrl}/api/billing/credit-packs/return`,
    cancelUrl: `${baseUrl}/dashboard?error=Credit%20pack%20checkout%20canceled`,
  });

  if (order?.id) {
    await prisma.creditPackPurchase.upsert({
      where: {
        providerOrderId: order.id,
      },
      update: {
        creditPackId: pack.id,
        userId: session.user.id,
        status: "CREATED",
        credits: pack.credits,
        amountCents: pack.amountCents,
      },
      create: {
        userId: session.user.id,
        creditPackId: pack.id,
        providerOrderId: order.id,
        status: "CREATED",
        credits: pack.credits,
        amountCents: pack.amountCents,
      },
    });
  }

  return NextResponse.json(order);
}
