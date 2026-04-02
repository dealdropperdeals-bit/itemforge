"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { saveLaunchSettings } from "@/lib/runtime-settings";

function getField(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function parseDollarsToCents(value: string, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Math.round(parsed * 100);
}

function parseIntValue(value: string, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
}

export async function saveLaunchSettingsAction(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard?error=Admin%20access%20required");
  }

  const paypalEnv = getField(formData, "paypalEnv");

  if (paypalEnv !== "sandbox" && paypalEnv !== "live") {
    redirect("/admin/launch-settings?error=Invalid%20PayPal%20environment");
  }

  try {
    await saveLaunchSettings({
      appUrl: getField(formData, "appUrl"),
      paypalEnv,
      paypalClientId: getField(formData, "paypalClientId"),
      paypalClientSecret: getField(formData, "paypalClientSecret"),
      paypalWebhookId: getField(formData, "paypalWebhookId"),
      paypalPlanStarter: getField(formData, "paypalPlanStarter"),
      paypalPlanCreator: getField(formData, "paypalPlanCreator"),
      paypalPlanPro: getField(formData, "paypalPlanPro"),
      paypalCreditPack100: getField(formData, "paypalCreditPack100"),
      paypalCreditPack250: getField(formData, "paypalCreditPack250"),
      paypalCreditPack600: getField(formData, "paypalCreditPack600"),
      starterPriceCents: parseDollarsToCents(getField(formData, "starterPriceDollars"), 900),
      creatorPriceCents: parseDollarsToCents(getField(formData, "creatorPriceDollars"), 2900),
      proPriceCents: parseDollarsToCents(getField(formData, "proPriceDollars"), 5900),
      starterCredits: parseIntValue(getField(formData, "starterCredits"), 100),
      creatorCredits: parseIntValue(getField(formData, "creatorCredits"), 400),
      proCredits: parseIntValue(getField(formData, "proCredits"), 1200),
      creditPack100PriceCents: parseDollarsToCents(getField(formData, "creditPack100PriceDollars"), 900),
      creditPack250PriceCents: parseDollarsToCents(getField(formData, "creditPack250PriceDollars"), 1900),
      creditPack600PriceCents: parseDollarsToCents(getField(formData, "creditPack600PriceDollars"), 3900),
      openAiApiKey: getField(formData, "openAiApiKey"),
      openAiModel: getField(formData, "openAiModel"),
      stripeEnabled: formData.get("stripeEnabled") === "on",
      stripeSecretKey: getField(formData, "stripeSecretKey"),
      stripeWebhookSecret: getField(formData, "stripeWebhookSecret"),
      stripePriceStarter: getField(formData, "stripePriceStarter"),
      stripePriceCreator: getField(formData, "stripePriceCreator"),
      stripePricePro: getField(formData, "stripePricePro"),
      stripeCreditPack100: getField(formData, "stripeCreditPack100"),
      stripeCreditPack300: getField(formData, "stripeCreditPack300"),
      stripeCreditPack800: getField(formData, "stripeCreditPack800"),
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message ? encodeURIComponent(error.message) : "Failed%20to%20save";
    redirect(`/admin/launch-settings?error=${message}`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/admin/launch-settings");
  redirect("/admin/launch-settings?saved=1");
}
