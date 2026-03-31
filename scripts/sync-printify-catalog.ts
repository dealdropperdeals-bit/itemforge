import allowlist from "../data/printify-allowlist.json";
import { prisma } from "../src/lib/db";
import { listBlueprintVariants, listCatalogBlueprints } from "../src/lib/printify";
import type { AmazonListingStatus } from "@prisma/client";

type AllowlistEntry = {
  slug: string;
  title: string;
  blueprintId: number;
  printProviderId: number;
  variantId: number;
  widthPx: number;
  heightPx: number;
  dpi: number;
  marketplaceStatus: AmazonListingStatus;
  targetMarginPct: number;
  safeAreaJson: Record<string, number>;
  parametersJson: Record<string, string>;
};

async function main() {
  const blueprints = await listCatalogBlueprints();

  for (const item of allowlist as AllowlistEntry[]) {
    const blueprint = blueprints.find((entry) => entry.id === item.blueprintId);
    const variants = await listBlueprintVariants(item.blueprintId, item.printProviderId);
    const variant = variants.find((entry) => entry.id === item.variantId);
    const baseCostCents = variant?.cost || 0;
    const suggestedPriceCents = Math.round(baseCostCents / (1 - item.targetMarginPct / 100));

    await prisma.deviceProfile.upsert({
      where: {
        slug: item.slug,
      },
      update: {
        title: item.title || `${blueprint?.title || "Printify item"} ${variant?.title || ""}`.trim(),
        provider: "PRINTIFY",
        blueprintId: item.blueprintId,
        printProviderId: item.printProviderId,
        variantId: item.variantId,
        widthPx: item.widthPx,
        heightPx: item.heightPx,
        dpi: item.dpi,
        marketplaceStatus: item.marketplaceStatus,
        baseCostCents,
        suggestedPriceCents,
        targetMarginPct: item.targetMarginPct,
        safeAreaJson: item.safeAreaJson,
        parametersJson: {
          ...item.parametersJson,
          variantTitle: variant?.title || null,
          syncedPriceCents: variant?.price || null,
        },
        syncedAt: new Date(),
        enabled: true,
      },
      create: {
        slug: item.slug,
        title: item.title || `${blueprint?.title || "Printify item"} ${variant?.title || ""}`.trim(),
        provider: "PRINTIFY",
        blueprintId: item.blueprintId,
        printProviderId: item.printProviderId,
        variantId: item.variantId,
        widthPx: item.widthPx,
        heightPx: item.heightPx,
        dpi: item.dpi,
        marketplaceStatus: item.marketplaceStatus,
        baseCostCents,
        suggestedPriceCents,
        targetMarginPct: item.targetMarginPct,
        safeAreaJson: item.safeAreaJson,
        parametersJson: {
          ...item.parametersJson,
          variantTitle: variant?.title || null,
          syncedPriceCents: variant?.price || null,
        },
        syncedAt: new Date(),
        enabled: true,
      },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
