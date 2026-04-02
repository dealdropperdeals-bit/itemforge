import OpenAI from "openai";

import { getResolvedLaunchSettings } from "@/lib/runtime-settings";

export async function getOpenAiClient() {
  const settings = await getResolvedLaunchSettings();

  if (!settings.openAiApiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  return new OpenAI({
    apiKey: settings.openAiApiKey,
  });
}
