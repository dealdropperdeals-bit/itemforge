import { BillingProvider, PlanInterval } from "@prisma/client";
import { z } from "zod";

import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

const LAUNCH_SETTINGS_KEY = "launch-settings-v1";

const secretEnvelopeSchema = z.object({
  encrypted: z.string().min(1),
});

const launchSettingsSchema = z.object({
  appUrl: z.string().url().optional(),
  paypalEnv: z.enum(["sandbox", "live"]).optional(),
  paypalClientId: z.string().optional(),
  paypalClientSecret: secretEnvelopeSchema.optional(),
  paypalWebhookId: z.string().optional(),
  paypalPlanStarter: z.string().optional(),
  paypalPlanCreator: z.string().optional(),
  paypalPlanPro: z.string().optional(),
  paypalCreditPack100: z.string().optional(),
  paypalCreditPack250: z.string().optional(),
  paypalCreditPack600: z.string().optional(),
  starterPriceCents: z.number().int().nonnegative().optional(),
  creatorPriceCents: z.number().int().nonnegative().optional(),
  proPriceCents: z.number().int().nonnegative().optional(),
  starterCredits: z.number().int().nonnegative().optional(),
  creatorCredits: z.number().int().nonnegative().optional(),
  proCredits: z.number().int().nonnegative().optional(),
  creditPack100PriceCents: z.number().int().nonnegative().optional(),
  creditPack250PriceCents: z.number().int().nonnegative().optional(),
  creditPack600PriceCents: z.number().int().nonnegative().optional(),
  openAiApiKey: secretEnvelopeSchema.optional(),
  openAiModel: z.string().optional(),
  stripeEnabled: z.boolean().optional(),
  stripeSecretKey: secretEnvelopeSchema.optional(),
  stripeWebhookSecret: secretEnvelopeSchema.optional(),
  stripePriceStarter: z.string().optional(),
  stripePriceCreator: z.string().optional(),
  stripePricePro: z.string().optional(),
  stripeCreditPack100: z.string().optional(),
  stripeCreditPack300: z.string().optional(),
  stripeCreditPack800: z.string().optional(),
});

export type LaunchSettingsResolved = {
  appUrl: string;
  paypalEnv: "sandbox" | "live";
  paypalClientId: string;
  paypalClientSecret: string;
  paypalWebhookId: string;
  paypalPlanStarter: string;
  paypalPlanCreator: string;
  paypalPlanPro: string;
  paypalCreditPack100: string;
  paypalCreditPack250: string;
  paypalCreditPack600: string;
  starterPriceCents: number;
  creatorPriceCents: number;
  proPriceCents: number;
  starterCredits: number;
  creatorCredits: number;
  proCredits: number;
  creditPack100PriceCents: number;
  creditPack250PriceCents: number;
  creditPack600PriceCents: number;
  openAiApiKey: string;
  openAiModel: string;
  stripeEnabled: boolean;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  stripePriceStarter: string;
  stripePriceCreator: string;
  stripePricePro: string;
  stripeCreditPack100: string;
  stripeCreditPack300: string;
  stripeCreditPack800: string;
};

export type LaunchSettingsAdminView = {
  appUrl: string;
  paypalEnv: "sandbox" | "live";
  paypalClientId: string;
  paypalWebhookId: string;
  paypalPlanStarter: string;
  paypalPlanCreator: string;
  paypalPlanPro: string;
  paypalCreditPack100: string;
  paypalCreditPack250: string;
  paypalCreditPack600: string;
  starterPriceCents: number;
  creatorPriceCents: number;
  proPriceCents: number;
  starterCredits: number;
  creatorCredits: number;
  proCredits: number;
  creditPack100PriceCents: number;
  creditPack250PriceCents: number;
  creditPack600PriceCents: number;
  openAiModel: string;
  stripeEnabled: boolean;
  stripePriceStarter: string;
  stripePriceCreator: string;
  stripePricePro: string;
  stripeCreditPack100: string;
  stripeCreditPack300: string;
  stripeCreditPack800: string;
  secretsConfigured: {
    paypalClientSecret: boolean;
    openAiApiKey: boolean;
    stripeSecretKey: boolean;
    stripeWebhookSecret: boolean;
  };
};

type LaunchSettingsSaveInput = {
  appUrl: string;
  paypalEnv: "sandbox" | "live";
  paypalClientId: string;
  paypalClientSecret: string;
  paypalWebhookId: string;
  paypalPlanStarter: string;
  paypalPlanCreator: string;
  paypalPlanPro: string;
  paypalCreditPack100: string;
  paypalCreditPack250: string;
  paypalCreditPack600: string;
  starterPriceCents: number;
  creatorPriceCents: number;
  proPriceCents: number;
  starterCredits: number;
  creatorCredits: number;
  proCredits: number;
  creditPack100PriceCents: number;
  creditPack250PriceCents: number;
  creditPack600PriceCents: number;
  openAiApiKey: string;
  openAiModel: string;
  stripeEnabled: boolean;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  stripePriceStarter: string;
  stripePriceCreator: string;
  stripePricePro: string;
  stripeCreditPack100: string;
  stripeCreditPack300: string;
  stripeCreditPack800: string;
};

function clean(value?: string | null) {
  return (value || "").trim();
}

function cleanInt(value: number | undefined, fallback: number) {
  if (typeof value !== "number" || Number.isNaN(value) || value < 0) {
    return fallback;
  }

  return Math.round(value);
}

function decryptIfPresent(payload?: { encrypted: string }) {
  if (!payload?.encrypted) {
    return "";
  }

  try {
    return decryptSecret(payload.encrypted);
  } catch {
    return "";
  }
}

async function getRawLaunchSettings() {
  const setting = await prisma.runtimeSetting.findUnique({
    where: {
      key: LAUNCH_SETTINGS_KEY,
    },
  });

  if (!setting) {
    return null;
  }

  const parsed = launchSettingsSchema.safeParse(setting.valueJson);
  if (!parsed.success) {
    return null;
  }

  return parsed.data;
}

export async function getResolvedLaunchSettings(): Promise<LaunchSettingsResolved> {
  const saved = await getRawLaunchSettings();

  return {
    appUrl: clean(saved?.appUrl) || env.appUrl,
    paypalEnv: saved?.paypalEnv || (env.paypalEnv === "live" ? "live" : "sandbox"),
    paypalClientId: clean(saved?.paypalClientId) || process.env.PAYPAL_CLIENT_ID || "",
    paypalClientSecret: decryptIfPresent(saved?.paypalClientSecret) || process.env.PAYPAL_CLIENT_SECRET || "",
    paypalWebhookId: clean(saved?.paypalWebhookId) || process.env.PAYPAL_WEBHOOK_ID || "",
    paypalPlanStarter: clean(saved?.paypalPlanStarter) || process.env.PAYPAL_PLAN_ID_STARTER || "",
    paypalPlanCreator:
      clean(saved?.paypalPlanCreator) ||
      process.env.PAYPAL_PLAN_ID_CREATOR ||
      process.env.PAYPAL_PLAN_ID_GROWTH ||
      "",
    paypalPlanPro: clean(saved?.paypalPlanPro) || process.env.PAYPAL_PLAN_ID_PRO || "",
    paypalCreditPack100:
      clean(saved?.paypalCreditPack100) || process.env.PAYPAL_CREDIT_PACK_ID_100 || "",
    paypalCreditPack250:
      clean(saved?.paypalCreditPack250) ||
      process.env.PAYPAL_CREDIT_PACK_ID_250 ||
      process.env.PAYPAL_CREDIT_PACK_ID_500 ||
      "",
    paypalCreditPack600:
      clean(saved?.paypalCreditPack600) || process.env.PAYPAL_CREDIT_PACK_ID_600 || "",
    starterPriceCents: cleanInt(saved?.starterPriceCents, 900),
    creatorPriceCents: cleanInt(saved?.creatorPriceCents, 2900),
    proPriceCents: cleanInt(saved?.proPriceCents, 5900),
    starterCredits: cleanInt(saved?.starterCredits, 100),
    creatorCredits: cleanInt(saved?.creatorCredits, 400),
    proCredits: cleanInt(saved?.proCredits, 1200),
    creditPack100PriceCents: cleanInt(saved?.creditPack100PriceCents, 900),
    creditPack250PriceCents: cleanInt(saved?.creditPack250PriceCents, 1900),
    creditPack600PriceCents: cleanInt(saved?.creditPack600PriceCents, 3900),
    openAiApiKey: decryptIfPresent(saved?.openAiApiKey) || process.env.OPENAI_API_KEY || "",
    openAiModel: clean(saved?.openAiModel) || process.env.OPENAI_MODEL || "gpt-5.1",
    stripeEnabled: saved?.stripeEnabled || process.env.STRIPE_ENABLED === "true",
    stripeSecretKey: decryptIfPresent(saved?.stripeSecretKey) || process.env.STRIPE_SECRET_KEY || "",
    stripeWebhookSecret:
      decryptIfPresent(saved?.stripeWebhookSecret) || process.env.STRIPE_WEBHOOK_SECRET || "",
    stripePriceStarter: clean(saved?.stripePriceStarter) || process.env.STRIPE_PRICE_STARTER || "",
    stripePriceCreator: clean(saved?.stripePriceCreator) || process.env.STRIPE_PRICE_CREATOR || "",
    stripePricePro: clean(saved?.stripePricePro) || process.env.STRIPE_PRICE_PRO || "",
    stripeCreditPack100:
      clean(saved?.stripeCreditPack100) || process.env.STRIPE_CREDIT_PACK_100 || "",
    stripeCreditPack300:
      clean(saved?.stripeCreditPack300) || process.env.STRIPE_CREDIT_PACK_300 || "",
    stripeCreditPack800:
      clean(saved?.stripeCreditPack800) || process.env.STRIPE_CREDIT_PACK_800 || "",
  };
}

export async function getLaunchSettingsForAdmin(): Promise<LaunchSettingsAdminView> {
  const saved = await getRawLaunchSettings();
  const resolved = await getResolvedLaunchSettings();

  return {
    appUrl: resolved.appUrl,
    paypalEnv: resolved.paypalEnv,
    paypalClientId: resolved.paypalClientId,
    paypalWebhookId: resolved.paypalWebhookId,
    paypalPlanStarter: resolved.paypalPlanStarter,
    paypalPlanCreator: resolved.paypalPlanCreator,
    paypalPlanPro: resolved.paypalPlanPro,
    paypalCreditPack100: resolved.paypalCreditPack100,
    paypalCreditPack250: resolved.paypalCreditPack250,
    paypalCreditPack600: resolved.paypalCreditPack600,
    starterPriceCents: resolved.starterPriceCents,
    creatorPriceCents: resolved.creatorPriceCents,
    proPriceCents: resolved.proPriceCents,
    starterCredits: resolved.starterCredits,
    creatorCredits: resolved.creatorCredits,
    proCredits: resolved.proCredits,
    creditPack100PriceCents: resolved.creditPack100PriceCents,
    creditPack250PriceCents: resolved.creditPack250PriceCents,
    creditPack600PriceCents: resolved.creditPack600PriceCents,
    openAiModel: resolved.openAiModel,
    stripeEnabled: resolved.stripeEnabled,
    stripePriceStarter: resolved.stripePriceStarter,
    stripePriceCreator: resolved.stripePriceCreator,
    stripePricePro: resolved.stripePricePro,
    stripeCreditPack100: resolved.stripeCreditPack100,
    stripeCreditPack300: resolved.stripeCreditPack300,
    stripeCreditPack800: resolved.stripeCreditPack800,
    secretsConfigured: {
      paypalClientSecret: Boolean(saved?.paypalClientSecret?.encrypted || process.env.PAYPAL_CLIENT_SECRET),
      openAiApiKey: Boolean(saved?.openAiApiKey?.encrypted || process.env.OPENAI_API_KEY),
      stripeSecretKey: Boolean(saved?.stripeSecretKey?.encrypted || process.env.STRIPE_SECRET_KEY),
      stripeWebhookSecret: Boolean(
        saved?.stripeWebhookSecret?.encrypted || process.env.STRIPE_WEBHOOK_SECRET,
      ),
    },
  };
}

export async function saveLaunchSettings(input: LaunchSettingsSaveInput) {
  const existing = await getRawLaunchSettings();
  const value = {
    appUrl: clean(input.appUrl),
    paypalEnv: input.paypalEnv,
    paypalClientId: clean(input.paypalClientId),
    paypalClientSecret:
      clean(input.paypalClientSecret).length > 0
        ? { encrypted: encryptSecret(clean(input.paypalClientSecret)) }
        : existing?.paypalClientSecret,
    paypalWebhookId: clean(input.paypalWebhookId),
    paypalPlanStarter: clean(input.paypalPlanStarter),
    paypalPlanCreator: clean(input.paypalPlanCreator),
    paypalPlanPro: clean(input.paypalPlanPro),
    paypalCreditPack100: clean(input.paypalCreditPack100),
    paypalCreditPack250: clean(input.paypalCreditPack250),
    paypalCreditPack600: clean(input.paypalCreditPack600),
    starterPriceCents: cleanInt(input.starterPriceCents, 900),
    creatorPriceCents: cleanInt(input.creatorPriceCents, 2900),
    proPriceCents: cleanInt(input.proPriceCents, 5900),
    starterCredits: cleanInt(input.starterCredits, 100),
    creatorCredits: cleanInt(input.creatorCredits, 400),
    proCredits: cleanInt(input.proCredits, 1200),
    creditPack100PriceCents: cleanInt(input.creditPack100PriceCents, 900),
    creditPack250PriceCents: cleanInt(input.creditPack250PriceCents, 1900),
    creditPack600PriceCents: cleanInt(input.creditPack600PriceCents, 3900),
    openAiApiKey:
      clean(input.openAiApiKey).length > 0
        ? { encrypted: encryptSecret(clean(input.openAiApiKey)) }
        : existing?.openAiApiKey,
    openAiModel: clean(input.openAiModel),
    stripeEnabled: input.stripeEnabled,
    stripeSecretKey:
      clean(input.stripeSecretKey).length > 0
        ? { encrypted: encryptSecret(clean(input.stripeSecretKey)) }
        : existing?.stripeSecretKey,
    stripeWebhookSecret:
      clean(input.stripeWebhookSecret).length > 0
        ? { encrypted: encryptSecret(clean(input.stripeWebhookSecret)) }
        : existing?.stripeWebhookSecret,
    stripePriceStarter: clean(input.stripePriceStarter),
    stripePriceCreator: clean(input.stripePriceCreator),
    stripePricePro: clean(input.stripePricePro),
    stripeCreditPack100: clean(input.stripeCreditPack100),
    stripeCreditPack300: clean(input.stripeCreditPack300),
    stripeCreditPack800: clean(input.stripeCreditPack800),
  };

  const parsed = launchSettingsSchema.parse(value);

  await prisma.runtimeSetting.upsert({
    where: {
      key: LAUNCH_SETTINGS_KEY,
    },
    update: {
      valueJson: parsed,
    },
    create: {
      key: LAUNCH_SETTINGS_KEY,
      valueJson: parsed,
    },
  });

  await syncCommerceCatalogWithLaunchSettings();
}

function providerPlanId(value: string, code: string) {
  const cleaned = clean(value);
  return cleaned || `paypal-plan-${code}`;
}

function providerPackId(value: string, code: string) {
  const cleaned = clean(value);
  return cleaned || `paypal-pack-${code}`;
}

export async function syncCommerceCatalogWithLaunchSettings() {
  const settings = await getResolvedLaunchSettings();

  const legacyGrowth = await prisma.subscriptionPlan.findUnique({
    where: { code: "launch-growth" },
  });
  if (legacyGrowth) {
    const creatorExists = await prisma.subscriptionPlan.findUnique({
      where: { code: "launch-creator" },
    });
    if (!creatorExists) {
      await prisma.subscriptionPlan.update({
        where: { id: legacyGrowth.id },
        data: { code: "launch-creator", name: "Creator Beta" },
      });
    } else {
      await prisma.subscriptionPlan.update({
        where: { id: legacyGrowth.id },
        data: { isActive: false },
      });
    }
  }

  const plans = [
    {
      code: "launch-starter",
      name: "Starter Beta",
      providerPlanId: providerPlanId(settings.paypalPlanStarter, "starter"),
      amountCents: settings.starterPriceCents,
      includedCredits: settings.starterCredits,
    },
    {
      code: "launch-creator",
      name: "Creator Beta",
      providerPlanId: providerPlanId(settings.paypalPlanCreator, "creator"),
      amountCents: settings.creatorPriceCents,
      includedCredits: settings.creatorCredits,
    },
    {
      code: "launch-pro",
      name: "Pro Beta",
      providerPlanId: providerPlanId(settings.paypalPlanPro, "pro"),
      amountCents: settings.proPriceCents,
      includedCredits: settings.proCredits,
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

  await prisma.subscriptionPlan.updateMany({
    where: {
      code: { in: ["launch-growth"] },
    },
    data: {
      isActive: false,
    },
  });

  const packs = [
    {
      code: "credits-100",
      name: "100 Credits",
      credits: 100,
      amountCents: settings.creditPack100PriceCents,
      providerProductId: providerPackId(settings.paypalCreditPack100, "100"),
    },
    {
      code: "credits-250",
      name: "250 Credits",
      credits: 250,
      amountCents: settings.creditPack250PriceCents,
      providerProductId: providerPackId(settings.paypalCreditPack250, "250"),
    },
    {
      code: "credits-600",
      name: "600 Credits",
      credits: 600,
      amountCents: settings.creditPack600PriceCents,
      providerProductId: providerPackId(settings.paypalCreditPack600, "600"),
    },
  ];

  for (const pack of packs) {
    await prisma.creditPack.upsert({
      where: { code: pack.code },
      update: {
        name: pack.name,
        credits: pack.credits,
        amountCents: pack.amountCents,
        currency: "USD",
        providerProductId: pack.providerProductId,
        isActive: true,
      },
      create: {
        code: pack.code,
        name: pack.name,
        credits: pack.credits,
        amountCents: pack.amountCents,
        currency: "USD",
        providerProductId: pack.providerProductId,
      },
    });
  }

  await prisma.creditPack.updateMany({
    where: {
      code: { in: ["credits-500"] },
    },
    data: {
      isActive: false,
    },
  });
}
