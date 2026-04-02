import { env } from "@/lib/env";
import { getResolvedLaunchSettings } from "@/lib/runtime-settings";

const PAYPAL_LIVE_BASE_URL = "https://api-m.paypal.com";
const PAYPAL_SANDBOX_BASE_URL = "https://api-m.sandbox.paypal.com";

type CreateSubscriptionInput = {
  planId: string;
  customId: string;
  returnUrl: string;
  cancelUrl: string;
};

type CreateOrderInput = {
  referenceId: string;
  customId: string;
  description: string;
  amountCents: number;
  returnUrl: string;
  cancelUrl: string;
};

async function getPayPalAccessToken() {
  const settings = await getResolvedLaunchSettings();
  const baseUrl = settings.paypalEnv === "live" ? PAYPAL_LIVE_BASE_URL : PAYPAL_SANDBOX_BASE_URL;

  if (!settings.paypalClientId || !settings.paypalClientSecret) {
    throw new Error("PayPal client credentials are not configured.");
  }

  const credentials = Buffer.from(
    `${settings.paypalClientId}:${settings.paypalClientSecret}`,
  ).toString("base64");

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`PayPal auth failed with status ${response.status}`);
  }

  const payload = (await response.json()) as { access_token: string };
  return payload.access_token;
}

export async function createPaypalSubscription(input: CreateSubscriptionInput) {
  const settings = await getResolvedLaunchSettings();
  const baseUrl = settings.paypalEnv === "live" ? PAYPAL_LIVE_BASE_URL : PAYPAL_SANDBOX_BASE_URL;
  const accessToken = await getPayPalAccessToken();

  const response = await fetch(`${baseUrl}/v1/billing/subscriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      plan_id: input.planId,
      custom_id: input.customId,
      application_context: {
        brand_name: env.appName,
        user_action: "SUBSCRIBE_NOW",
        return_url: input.returnUrl,
        cancel_url: input.cancelUrl,
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PayPal subscription create failed: ${errorText}`);
  }

  return response.json();
}

export async function getPaypalSubscription(subscriptionId: string) {
  const settings = await getResolvedLaunchSettings();
  const baseUrl = settings.paypalEnv === "live" ? PAYPAL_LIVE_BASE_URL : PAYPAL_SANDBOX_BASE_URL;
  const accessToken = await getPayPalAccessToken();

  const response = await fetch(
    `${baseUrl}/v1/billing/subscriptions/${subscriptionId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`PayPal subscription fetch failed with status ${response.status}`);
  }

  return response.json();
}

export async function createPaypalOrder(input: CreateOrderInput) {
  const settings = await getResolvedLaunchSettings();
  const baseUrl = settings.paypalEnv === "live" ? PAYPAL_LIVE_BASE_URL : PAYPAL_SANDBOX_BASE_URL;
  const accessToken = await getPayPalAccessToken();

  const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: input.referenceId,
          custom_id: input.customId,
          description: input.description,
          amount: {
            currency_code: "USD",
            value: (input.amountCents / 100).toFixed(2),
          },
        },
      ],
      application_context: {
        brand_name: env.appName,
        user_action: "PAY_NOW",
        return_url: input.returnUrl,
        cancel_url: input.cancelUrl,
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PayPal order create failed: ${errorText}`);
  }

  return response.json();
}

export async function capturePaypalOrder(orderId: string) {
  const settings = await getResolvedLaunchSettings();
  const baseUrl = settings.paypalEnv === "live" ? PAYPAL_LIVE_BASE_URL : PAYPAL_SANDBOX_BASE_URL;
  const accessToken = await getPayPalAccessToken();

  const response = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PayPal order capture failed: ${errorText}`);
  }

  return response.json();
}
