import { AmazonListingStatus, PrismaClient, ProviderKind } from "@prisma/client";

import { syncCommerceCatalogWithLaunchSettings } from "@/lib/runtime-settings";

const prisma = new PrismaClient();

async function main() {
  await syncCommerceCatalogWithLaunchSettings();

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
