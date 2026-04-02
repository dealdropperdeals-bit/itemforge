import { BillingProvider, type SubscriptionStatus, WebhookProvider } from "@prisma/client";
import { NextResponse } from "next/server";

import { addCreditLedgerEntry } from "@/lib/credits";
import { prisma } from "@/lib/db";
import { getPaypalSubscription } from "@/lib/paypal";
import { getResolvedLaunchSettings } from "@/lib/runtime-settings";

function mapPaypalStatus(status?: string): SubscriptionStatus {
  switch (status) {
    case "APPROVAL_PENDING":
      return "INCOMPLETE";
    case "ACTIVE":
      return "ACTIVE";
    case "SUSPENDED":
      return "PAST_DUE";
    case "CANCELLED":
      return "CANCELED";
    case "EXPIRED":
      return "EXPIRED";
    default:
      return "INCOMPLETE";
  }
}

export async function POST(request: Request) {
  const settings = await getResolvedLaunchSettings();
  if (!settings.paypalWebhookId) {
    return NextResponse.json({ received: true, reconciled: false, reason: "Webhook ID not configured" });
  }

  const payload = await request.json();

  const event = await prisma.webhookEvent.create({
    data: {
      provider: WebhookProvider.PAYPAL,
      externalId: payload.id || null,
      eventType: payload.event_type || "unknown",
      headersJson: Object.fromEntries(request.headers.entries()),
      payloadJson: payload,
    },
  });

  const subscriptionId = payload.resource?.id;

  if (!subscriptionId) {
    return NextResponse.json({ received: true, reconciled: false });
  }

  let paypalSubscription: Awaited<ReturnType<typeof getPaypalSubscription>>;

  try {
    paypalSubscription = await getPaypalSubscription(subscriptionId);
  } catch {
    return NextResponse.json({
      received: true,
      reconciled: false,
      reason: "Subscription lookup failed",
    });
  }
  const plan = await prisma.subscriptionPlan.findFirst({
    where: {
      providerPlanId: paypalSubscription.plan_id,
    },
  });

  if (!plan) {
    return NextResponse.json({ received: true, reconciled: false, reason: "Unknown plan" });
  }

  const userId =
    paypalSubscription.custom_id ||
    (
      await prisma.userSubscription.findUnique({
        where: { providerSubscriptionId: subscriptionId },
      })
    )?.userId;

  if (!userId) {
    return NextResponse.json({ received: true, reconciled: false, reason: "Unknown user" });
  }

  await prisma.userSubscription.upsert({
    where: {
      providerSubscriptionId: subscriptionId,
    },
    update: {
      planId: plan.id,
      provider: BillingProvider.PAYPAL,
      providerPayerId: paypalSubscription.subscriber?.payer_id || null,
      status: mapPaypalStatus(paypalSubscription.status),
      currentPeriodStart: paypalSubscription.start_time
        ? new Date(paypalSubscription.start_time)
        : null,
      currentPeriodEnd: paypalSubscription.billing_info?.next_billing_time
        ? new Date(paypalSubscription.billing_info.next_billing_time)
        : null,
      activatedAt: paypalSubscription.status === "ACTIVE" ? new Date() : null,
    },
    create: {
      userId,
      planId: plan.id,
      provider: BillingProvider.PAYPAL,
      providerSubscriptionId: subscriptionId,
      providerPayerId: paypalSubscription.subscriber?.payer_id || null,
      status: mapPaypalStatus(paypalSubscription.status),
      currentPeriodStart: paypalSubscription.start_time
        ? new Date(paypalSubscription.start_time)
        : null,
      currentPeriodEnd: paypalSubscription.billing_info?.next_billing_time
        ? new Date(paypalSubscription.billing_info.next_billing_time)
        : null,
      activatedAt: paypalSubscription.status === "ACTIVE" ? new Date() : null,
    },
  });

  if (paypalSubscription.status === "ACTIVE") {
    const periodMarker =
      paypalSubscription.billing_info?.next_billing_time?.slice(0, 7) ||
      new Date().toISOString().slice(0, 7);

    await addCreditLedgerEntry({
      userId,
      delta: plan.includedCredits,
      kind: "MONTHLY_ALLOCATION",
      description: `${plan.name} monthly credits`,
      referenceKey: `subscription:${subscriptionId}:${periodMarker}`,
      metadataJson: {
        subscriptionId,
        planCode: plan.code,
      },
    }).catch(() => null);
  }

  await prisma.webhookEvent.update({
    where: {
      id: event.id,
    },
    data: {
      processedAt: new Date(),
    },
  });

  return NextResponse.json({
    received: true,
    reconciled: true,
  });
}
