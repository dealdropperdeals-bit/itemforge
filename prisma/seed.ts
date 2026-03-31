import {
  AmazonListingStatus,
  BillingProvider,
  PlanInterval,
  PrismaClient,
  ProviderKind,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const plans = [
    {
      code: "launch-starter",
      name: "Starter",
      providerPlanId: process.env.PAYPAL_PLAN_ID_STARTER || "paypal-plan-starter",
      amountCents: 2900,
      includedCredits: 150,
    },
    {
      code: "launch-growth",
      name: "Growth",
      providerPlanId: process.env.PAYPAL_PLAN_ID_GROWTH || "paypal-plan-growth",
      amountCents: 7900,
      includedCredits: 600,
    },
    {
      code: "launch-pro",
      name: "Pro",
      providerPlanId: process.env.PAYPAL_PLAN_ID_PRO || "paypal-plan-pro",
      amountCents: 14900,
      includedCredits: 1500,
    },
  ];

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        provider: BillingProvider.PAYPAL,
        providerPlanId: plan.providerPlanId,
        interval: PlanInterval.MONTHLY,
        amountCents: plan.amountCents,
        currency: "USD",
        aiEnabled: true,
        includedCredits: plan.includedCredits,
        isActive: true,
      },
      create: {
        code: plan.code,
        name: plan.name,
        provider: BillingProvider.PAYPAL,
        providerPlanId: plan.providerPlanId,
        interval: PlanInterval.MONTHLY,
        amountCents: plan.amountCents,
        currency: "USD",
        aiEnabled: true,
        includedCredits: plan.includedCredits,
      },
    });
  }

  const creditPacks = [
    {
      code: "credits-100",
      name: "100 Credits",
      credits: 100,
      amountCents: 1500,
      providerProductId: process.env.PAYPAL_CREDIT_PACK_ID_100 || null,
    },
    {
      code: "credits-500",
      name: "500 Credits",
      credits: 500,
      amountCents: 6000,
      providerProductId: process.env.PAYPAL_CREDIT_PACK_ID_500 || null,
    },
  ];

  for (const pack of creditPacks) {
    await prisma.creditPack.upsert({
      where: { code: pack.code },
      update: pack,
      create: pack,
    });
  }

  await prisma.deviceProfile.upsert({
    where: { slug: "printify-iphone-16-pro-clear-case" },
    update: {
      title: "iPhone 16 Pro Clear Case",
      provider: ProviderKind.PRINTIFY,
      blueprintId: 9,
      printProviderId: 99,
      variantId: 999,
      widthPx: 1800,
      heightPx: 3200,
      dpi: 300,
      marketplaceStatus: AmazonListingStatus.CANDIDATE,
      baseCostCents: 1199,
      suggestedPriceCents: 2499,
      targetMarginPct: 52,
      safeAreaJson: {
        insetTopPct: 0.06,
        insetBottomPct: 0.08,
        insetLeftPct: 0.05,
        insetRightPct: 0.05,
      },
      parametersJson: {
        family: "clear-case",
        surface: "full-wrap",
      },
      syncedAt: new Date(),
      enabled: true,
    },
    create: {
      slug: "printify-iphone-16-pro-clear-case",
      title: "iPhone 16 Pro Clear Case",
      provider: ProviderKind.PRINTIFY,
      blueprintId: 9,
      printProviderId: 99,
      variantId: 999,
      widthPx: 1800,
      heightPx: 3200,
      dpi: 300,
      marketplaceStatus: AmazonListingStatus.CANDIDATE,
      baseCostCents: 1199,
      suggestedPriceCents: 2499,
      targetMarginPct: 52,
      safeAreaJson: {
        insetTopPct: 0.06,
        insetBottomPct: 0.08,
        insetLeftPct: 0.05,
        insetRightPct: 0.05,
      },
      parametersJson: {
        family: "clear-case",
        surface: "full-wrap",
      },
      syncedAt: new Date(),
      enabled: true,
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
