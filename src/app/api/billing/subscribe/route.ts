import { NextResponse } from "next/server";
import { BillingProvider } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createPaypalSubscription } from "@/lib/paypal";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { planCode?: string };
  const planCode = body.planCode || "launch-starter";
  const plan = await prisma.subscriptionPlan.findUnique({
    where: {
      code: planCode,
    },
  });

  if (!plan) {
    return NextResponse.json({ error: "Plan is not configured in the database" }, { status: 400 });
  }

  if (!plan.providerPlanId) {
    return NextResponse.json({ error: "PayPal plan is not configured" }, { status: 500 });
  }

  const subscription = await createPaypalSubscription({
    planId: plan.providerPlanId,
    customId: session.user.id,
    returnUrl: `${process.env.APP_URL || "http://localhost:3000"}/billing/success`,
    cancelUrl: `${process.env.APP_URL || "http://localhost:3000"}/billing/cancel`,
  });

  if (subscription?.id) {
    await prisma.userSubscription.upsert({
      where: {
        providerSubscriptionId: subscription.id,
      },
      update: {
        planId: plan.id,
        provider: BillingProvider.PAYPAL,
        status: "INCOMPLETE",
      },
      create: {
        userId: session.user.id,
        planId: plan.id,
        provider: BillingProvider.PAYPAL,
        providerSubscriptionId: subscription.id,
        status: "INCOMPLETE",
      },
    });
  }

  return NextResponse.json(subscription);
}
