import allowlist from "../data/printify-allowlist.json";
import { prisma } from "../src/lib/db";
import { calculateMarketplacePricing } from "../src/lib/marketplace-pricing";
import {
  listBlueprintPrintProviders,
  listBlueprintVariants,
  listCatalogBlueprints,
} from "../src/lib/printify";
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

const DEFAULT_TARGET_MARGIN_PCT = Number(process.env.DEFAULT_TARGET_MARGIN_PCT || "52");
const FULL_SYNC = process.env.PRINTIFY_FULL_CATALOG_SYNC !== "0";
const PHONE_CASE_KEYWORDS = [
  "case",
  "phone case",
  "iphone",
  "samsung",
  "galaxy",
  "google pixel",
  "pixel",
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function isPhoneCaseBlueprint(title: string) {
  const lower = title.toLowerCase();
  return PHONE_CASE_KEYWORDS.some((keyword) => lower.includes(keyword));
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function getCaseModel(blueprintTitle: string) {
  const lower = blueprintTitle.toLowerCase();
  if (lower.includes("clear")) {
    return "clear-case";
  }
  if (lower.includes("tough")) {
    return "tough-case";
  }
  if (lower.includes("slim")) {
    return "slim-case";
  }
  if (lower.includes("mag")) {
    return "magnetic-case";
  }
  if (lower.includes("snap")) {
    return "snap-case";
  }
  return "standard-case";
}

function extractPhoneModel(variantTitle: string, blueprintTitle: string) {
  const source = `${variantTitle} ${blueprintTitle}`;
  const match = source.match(
    /(iphone\s?\d{1,2}(?:\s?(?:mini|plus|pro|pro max))?|samsung\s?(?:galaxy\s?)?(?:s?\d{1,2}|a\d{1,2}|note\s?\d{1,2}|z\s?flip\s?\d|z\s?fold\s?\d)(?:\s?(?:ultra|plus|fe))?|google\s?pixel\s?\d(?:\s?(?:a|pro|xl))?)/i,
  );
  if (match?.[0]) {
    return normalizeWhitespace(match[0]).toLowerCase();
  }
  return normalizeWhitespace(variantTitle).toLowerCase();
}

function getManufacturer(blueprint: { brand: string; title: string }, variantTitle: string) {
  const source = `${blueprint.brand} ${variantTitle} ${blueprint.title}`.toLowerCase();
  if (source.includes("iphone") || source.includes("apple")) {
    return "apple";
  }
  if (source.includes("samsung") || source.includes("galaxy")) {
    return "samsung";
  }
  if (source.includes("pixel") || source.includes("google")) {
    return "google";
  }
  return (blueprint.brand || "unknown").toLowerCase();
}

function safeNumber(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return fallback;
}

function inferDimensions(options?: unknown[]) {
  const fallback = { widthPx: 1800, heightPx: 3200, dpi: 300 };

  if (!Array.isArray(options)) {
    return fallback;
  }

  let widthPx = fallback.widthPx;
  let heightPx = fallback.heightPx;

  for (const option of options) {
    if (!option || typeof option !== "object") {
      continue;
    }
    const normalized = JSON.stringify(option).toLowerCase();
    if (normalized.includes("iphone") || normalized.includes("samsung") || normalized.includes("pixel")) {
      widthPx = 1800;
      heightPx = 3200;
      break;
    }
  }

  return { widthPx, heightPx, dpi: 300 };
}

function safeAreaForCase() {
  return {
    insetTopPct: 0.06,
    insetBottomPct: 0.08,
    insetLeftPct: 0.05,
    insetRightPct: 0.05,
  };
}

async function upsertDeviceProfile(input: {
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
  parametersJson: Record<string, unknown>;
  baseCostCents: number;
}) {
  const suggestedPriceCents = Math.round(input.baseCostCents / (1 - input.targetMarginPct / 100));
  const channelPricing = calculateMarketplacePricing({
    baseCostCents: input.baseCostCents,
    targetMarginPct: input.targetMarginPct,
  });

  await prisma.deviceProfile.upsert({
    where: {
      slug: input.slug,
    },
    update: {
      title: input.title,
      provider: "PRINTIFY",
      blueprintId: input.blueprintId,
      printProviderId: input.printProviderId,
      variantId: input.variantId,
      widthPx: input.widthPx,
      heightPx: input.heightPx,
      dpi: input.dpi,
      marketplaceStatus: input.marketplaceStatus,
      baseCostCents: input.baseCostCents,
      suggestedPriceCents,
      targetMarginPct: input.targetMarginPct,
      safeAreaJson: input.safeAreaJson,
      parametersJson: {
        ...input.parametersJson,
        sourcing: {
          provider: "PRINTIFY",
          blueprintId: input.blueprintId,
          printProviderId: input.printProviderId,
          variantId: input.variantId,
          baseCostCents: input.baseCostCents,
        },
        channelPricing,
      },
      syncedAt: new Date(),
      enabled: true,
    },
    create: {
      slug: input.slug,
      title: input.title,
      provider: "PRINTIFY",
      blueprintId: input.blueprintId,
      printProviderId: input.printProviderId,
      variantId: input.variantId,
      widthPx: input.widthPx,
      heightPx: input.heightPx,
      dpi: input.dpi,
      marketplaceStatus: input.marketplaceStatus,
      baseCostCents: input.baseCostCents,
      suggestedPriceCents,
      targetMarginPct: input.targetMarginPct,
      safeAreaJson: input.safeAreaJson,
      parametersJson: {
        ...input.parametersJson,
        sourcing: {
          provider: "PRINTIFY",
          blueprintId: input.blueprintId,
          printProviderId: input.printProviderId,
          variantId: input.variantId,
          baseCostCents: input.baseCostCents,
        },
        channelPricing,
      },
      syncedAt: new Date(),
      enabled: true,
    },
  });
}

async function syncAllowlistOnly() {
  const blueprints = await listCatalogBlueprints();

  for (const item of allowlist as AllowlistEntry[]) {
    const blueprint = blueprints.find((entry) => entry.id === item.blueprintId);
    const variants = await listBlueprintVariants(item.blueprintId, item.printProviderId);
    const variant = variants.find((entry) => entry.id === item.variantId);
    const baseCostCents = safeNumber(variant?.cost, 0);

    await upsertDeviceProfile({
      slug: item.slug,
      title: item.title || `${blueprint?.title || "Printify item"} ${variant?.title || ""}`.trim(),
      blueprintId: item.blueprintId,
      printProviderId: item.printProviderId,
      variantId: item.variantId,
      widthPx: item.widthPx,
      heightPx: item.heightPx,
      dpi: item.dpi,
      marketplaceStatus: item.marketplaceStatus,
      targetMarginPct: item.targetMarginPct,
      safeAreaJson: item.safeAreaJson,
      parametersJson: {
        ...item.parametersJson,
        manufacturer: getManufacturer(
          { brand: blueprint?.brand || "", title: blueprint?.title || "" },
          variant?.title || "",
        ),
        caseModel: getCaseModel(blueprint?.title || item.title || ""),
        phoneModel: extractPhoneModel(variant?.title || "", blueprint?.title || item.title || ""),
        blueprintTitle: blueprint?.title || "",
        printProviderTitle: null,
        variantTitle: variant?.title || null,
        syncedPriceCents: variant?.price || null,
      },
      baseCostCents,
    });
  }
}

async function syncFullPhoneCaseCatalog() {
  const blueprints = await listCatalogBlueprints();
  const caseBlueprints = blueprints.filter((blueprint) => isPhoneCaseBlueprint(blueprint.title));
  const seenSlugs = new Set<string>();
  let createdOrUpdated = 0;

  for (const blueprint of caseBlueprints) {
    const providers = await listBlueprintPrintProviders(blueprint.id).catch(() => []);
    for (const provider of providers) {
      const variants = await listBlueprintVariants(blueprint.id, provider.id).catch(() => []);
      for (const variant of variants) {
        const dimensions = inferDimensions(variant.options);
        const variantTitle = variant.title || `Variant ${variant.id}`;
        const title = `${blueprint.title} - ${variantTitle}`.trim();
        const slug = slugify(
          `printify-${blueprint.id}-${provider.id}-${variant.id}-${title}`,
        );
        seenSlugs.add(slug);
        const baseCostCents = safeNumber(variant.cost, 0);
        const manufacturer = getManufacturer(blueprint, variantTitle);
        const phoneModel = extractPhoneModel(variantTitle, blueprint.title);
        const caseModel = getCaseModel(blueprint.title);

        await upsertDeviceProfile({
          slug,
          title,
          blueprintId: blueprint.id,
          printProviderId: provider.id,
          variantId: variant.id,
          widthPx: dimensions.widthPx,
          heightPx: dimensions.heightPx,
          dpi: dimensions.dpi,
          marketplaceStatus: "CANDIDATE",
          targetMarginPct: DEFAULT_TARGET_MARGIN_PCT,
          safeAreaJson: safeAreaForCase(),
          parametersJson: {
            family: "phone-case",
            manufacturer,
            caseModel,
            phoneModel,
            model: blueprint.model || null,
            blueprintTitle: blueprint.title,
            printProviderTitle: provider.title,
            variantTitle,
            syncedPriceCents: safeNumber(variant.price, 0),
            fullCatalogSync: true,
          },
          baseCostCents,
        });
        createdOrUpdated += 1;
      }
    }
  }

  // Disable stale full-sync records no longer present in catalog.
  await prisma.deviceProfile.updateMany({
    where: {
      provider: "PRINTIFY",
      parametersJson: {
        path: ["fullCatalogSync"],
        equals: true,
      },
      slug: {
        notIn: Array.from(seenSlugs),
      },
    },
    data: {
      enabled: false,
    },
  });

  console.log(
    `Printify full sync completed: ${createdOrUpdated} profiles upserted, ${seenSlugs.size} active slugs tracked.`,
  );
}

async function main() {
  if (FULL_SYNC) {
    await syncFullPhoneCaseCatalog();
    return;
  }

  await syncAllowlistOnly();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
