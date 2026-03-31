import { env } from "@/lib/env";

const PRINTIFY_BASE_URL = "https://api.printify.com/v1";

async function printifyFetch<T>(path: string, token: string, init?: RequestInit) {
  const response = await fetch(`${PRINTIFY_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": env.appName,
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Printify request failed: ${errorText}`);
  }

  return (await response.json()) as T;
}

export function listPrintifyShops(token: string) {
  return printifyFetch<Array<{ id: number; title: string; sales_channel: string }>>(
    "/shops.json",
    token,
  );
}

export function listPrintifyProducts(token: string, shopId: string) {
  return printifyFetch(`/shops/${shopId}/products.json`, token);
}

export function listCatalogBlueprints() {
  if (!env.printifySyncApiToken) {
    throw new Error("PRINTIFY_SYNC_API_TOKEN is not configured.");
  }

  return printifyFetch<Array<{ id: number; title: string; brand: string; model: string }>>(
    "/catalog/blueprints.json",
    env.printifySyncApiToken,
  );
}

export function listBlueprintPrintProviders(blueprintId: number) {
  if (!env.printifySyncApiToken) {
    throw new Error("PRINTIFY_SYNC_API_TOKEN is not configured.");
  }

  return printifyFetch<Array<{ id: number; title: string }>>(
    `/catalog/blueprints/${blueprintId}/print_providers.json`,
    env.printifySyncApiToken,
  );
}

export function listBlueprintVariants(blueprintId: number, printProviderId: number) {
  if (!env.printifySyncApiToken) {
    throw new Error("PRINTIFY_SYNC_API_TOKEN is not configured.");
  }

  return printifyFetch<
    Array<{
      id: number;
      title: string;
      cost?: number;
      price?: number;
      options?: unknown[];
    }>
  >(
    `/catalog/blueprints/${blueprintId}/print_providers/${printProviderId}/variants.json`,
    env.printifySyncApiToken,
  );
}
