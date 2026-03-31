import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { addCreditLedgerEntry, getCreditBalance } from "@/lib/credits";
import { prisma } from "@/lib/db";
import { resolveEntitlements } from "@/lib/entitlements";
import { getOpenAiClient } from "@/lib/openai";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    prompt?: string;
    operation?: string;
    title?: string;
    designId?: string;
  };

  if (!body.prompt) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  const subscription = await prisma.userSubscription.findFirst({
    where: {
      userId: session.user.id,
    },
    include: {
      plan: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const entitlements = resolveEntitlements(subscription);

  if (!entitlements.canUseAi) {
    return NextResponse.json({ error: "An active membership is required" }, { status: 403 });
  }

  const operation = body.operation || "idea";
  const creditCost = operation === "job-spec" ? 2 : 1;
  const creditBalance = await getCreditBalance(session.user.id);

  if (creditBalance < creditCost) {
    return NextResponse.json({ error: "Credit balance too low" }, { status: 402 });
  }

  const client = getOpenAiClient();
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-5.1",
    input: body.prompt,
  });

  await prisma.aiUsageEvent.create({
    data: {
      userId: session.user.id,
      model: response.model,
      operation: "generate",
      inputTokens: response.usage?.input_tokens || 0,
      outputTokens: response.usage?.output_tokens || 0,
    },
  });

  await addCreditLedgerEntry({
    userId: session.user.id,
    delta: -creditCost,
    kind: "AI_GENERATION",
    description: `AI ${operation}`,
    metadataJson: {
      responseId: response.id,
      model: response.model,
      inputTokens: response.usage?.input_tokens || 0,
      outputTokens: response.usage?.output_tokens || 0,
    },
  });

  if (operation === "job-spec") {
    await prisma.jobSpec.create({
      data: {
        userId: session.user.id,
        designId: body.designId || null,
        title: body.title || "Generated job spec",
        prompt: body.prompt,
        specJson: {
          responseId: response.id,
          outputText: response.output_text,
        },
      },
    });
  }

  return NextResponse.json({
    id: response.id,
    outputText: response.output_text,
    creditCost,
    creditBalanceAfter: creditBalance - creditCost,
  });
}
