export type MarketplaceChannel = "amazon" | "etsy" | "ebay";

export type ChannelPricing = {
  channel: MarketplaceChannel;
  priceCents: number;
  feesCents: number;
  profitCents: number;
  marginPct: number;
  feePct: number;
  fixedFeeCents: number;
};

const CHANNEL_FEES: Record<MarketplaceChannel, { feePct: number; fixedFeeCents: number }> = {
  // Simplified channel fee assumptions for launch pricing math.
  amazon: { feePct: 0.15, fixedFeeCents: 180 },
  etsy: { feePct: 0.095, fixedFeeCents: 45 },
  ebay: { feePct: 0.1325, fixedFeeCents: 30 },
};

function roundMoney(value: number) {
  return Math.round(value);
}

function ceilMoney(value: number) {
  return Math.ceil(value);
}

function normalizeTargetMargin(targetMarginPct: number) {
  if (!Number.isFinite(targetMarginPct)) {
    return 0.5;
  }

  return Math.min(0.9, Math.max(0.05, targetMarginPct / 100));
}

export function calculateChannelPricing(input: {
  baseCostCents: number;
  targetMarginPct: number;
  channel: MarketplaceChannel;
}): ChannelPricing {
  const baseCostCents = Math.max(0, roundMoney(input.baseCostCents));
  const margin = normalizeTargetMargin(input.targetMarginPct);
  const feeModel = CHANNEL_FEES[input.channel];

  const denominator = 1 - margin - feeModel.feePct;
  const safeDenominator = denominator > 0.01 ? denominator : 0.01;
  const priceCents = ceilMoney((baseCostCents + feeModel.fixedFeeCents) / safeDenominator);
  const feesCents = roundMoney(priceCents * feeModel.feePct + feeModel.fixedFeeCents);
  const profitCents = priceCents - baseCostCents - feesCents;
  const marginPct = priceCents > 0 ? (profitCents / priceCents) * 100 : 0;

  return {
    channel: input.channel,
    priceCents,
    feesCents,
    profitCents,
    marginPct: Math.round(marginPct * 100) / 100,
    feePct: feeModel.feePct,
    fixedFeeCents: feeModel.fixedFeeCents,
  };
}

export function calculateMarketplacePricing(input: {
  baseCostCents: number;
  targetMarginPct: number;
}) {
  const amazon = calculateChannelPricing({
    baseCostCents: input.baseCostCents,
    targetMarginPct: input.targetMarginPct,
    channel: "amazon",
  });
  const etsy = calculateChannelPricing({
    baseCostCents: input.baseCostCents,
    targetMarginPct: input.targetMarginPct,
    channel: "etsy",
  });
  const ebay = calculateChannelPricing({
    baseCostCents: input.baseCostCents,
    targetMarginPct: input.targetMarginPct,
    channel: "ebay",
  });

  return {
    amazon,
    etsy,
    ebay,
  };
}
