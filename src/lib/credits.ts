import { CreditLedgerKind } from "@prisma/client";

import { prisma } from "@/lib/db";

export async function getCreditBalance(userId: string) {
  const totals = await prisma.creditLedgerEntry.aggregate({
    where: { userId },
    _sum: {
      delta: true,
    },
  });

  return totals._sum.delta || 0;
}

export async function addCreditLedgerEntry(input: {
  userId: string;
  delta: number;
  kind: CreditLedgerKind;
  description: string;
  referenceKey?: string;
  metadataJson?: object;
}) {
  return prisma.creditLedgerEntry.create({
    data: {
      userId: input.userId,
      delta: input.delta,
      kind: input.kind,
      description: input.description,
      referenceKey: input.referenceKey,
      metadataJson: input.metadataJson,
    },
  });
}
