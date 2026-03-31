function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const env = {
  appName: process.env.APP_NAME || "Case Creator",
  appUrl: process.env.APP_URL || "http://localhost:3000",
  authSecret: () => requireEnv("AUTH_SECRET"),
  databaseUrl: () => requireEnv("DATABASE_URL"),
  paypalEnv: process.env.PAYPAL_ENV === "live" ? "live" : "sandbox",
  paypalClientId: () => requireEnv("PAYPAL_CLIENT_ID"),
  paypalClientSecret: () => requireEnv("PAYPAL_CLIENT_SECRET"),
  paypalWebhookId: process.env.PAYPAL_WEBHOOK_ID || "",
  paypalPlanStarter: process.env.PAYPAL_PLAN_ID_STARTER || "",
  paypalPlanGrowth: process.env.PAYPAL_PLAN_ID_GROWTH || "",
  paypalPlanPro: process.env.PAYPAL_PLAN_ID_PRO || "",
  paypalCreditPack100: process.env.PAYPAL_CREDIT_PACK_ID_100 || "",
  paypalCreditPack500: process.env.PAYPAL_CREDIT_PACK_ID_500 || "",
  printifySyncApiToken: process.env.PRINTIFY_SYNC_API_TOKEN || "",
  openAiApiKey: process.env.OPENAI_API_KEY || "",
  openAiModel: process.env.OPENAI_MODEL || "gpt-5.1",
  storageRoot: process.env.STORAGE_ROOT || "./storage",
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB || "25"),
  dataEncryptionKey: process.env.DATA_ENCRYPTION_KEY || "",
  adminEmails: (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
};
