import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { decryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { listPrintifyShops } from "@/lib/printify";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connection = await prisma.printifyConnection.findUnique({
    where: {
      userId: session.user.id,
    },
  });

  if (!connection) {
    return NextResponse.json({ error: "Printify connection not found" }, { status: 404 });
  }

  const shops = await listPrintifyShops(decryptSecret(connection.apiTokenEncrypted));
  return NextResponse.json(shops);
}
