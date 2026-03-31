import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { addCreditLedgerEntry } from "@/lib/credits";
import { prisma } from "@/lib/db";
import { capturePaypalOrder } from "@/lib/paypal";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const url = new URL(request.url);
  const orderId = url.searchParams.get("token");

  if (!orderId) {
    return NextResponse.redirect(new URL("/dashboard?error=Missing%20order%20token", request.url));
  }

  const purchase = await prisma.creditPackPurchase.findUnique({
    where: {
      providerOrderId: orderId,
    },
    include: {
      creditPack: true,
    },
  });

  if (!purchase || purchase.userId !== session.user.id) {
    return NextResponse.redirect(new URL("/dashboard?error=Credit%20pack%20not%20found", request.url));
  }

  if (purchase.status === "COMPLETED") {
    return NextResponse.redirect(new URL("/dashboard?creditsPurchased=1", request.url));
  }

  let capture: Awaited<ReturnType<typeof capturePaypalOrder>>;

  try {
    capture = await capturePaypalOrder(orderId);
  } catch {
    return NextResponse.redirect(new URL("/dashboard?error=Credit%20pack%20capture%20failed", request.url));
  }

  const captureId =
    capture.purchase_units?.[0]?.payments?.captures?.[0]?.id || null;

  await prisma.creditPackPurchase.update({
    where: {
      providerOrderId: orderId,
    },
    data: {
      status: "COMPLETED",
      captureId,
      capturedAt: new Date(),
    },
  });

  await addCreditLedgerEntry({
    userId: session.user.id,
    delta: purchase.credits,
    kind: "CREDIT_PACK_PURCHASE",
    description: purchase.creditPack.name,
    referenceKey: `credit-pack:${orderId}`,
    metadataJson: {
      creditPackCode: purchase.creditPack.code,
      captureId,
    },
  }).catch(() => null);

  return NextResponse.redirect(new URL("/dashboard?creditsPurchased=1", request.url));
}
