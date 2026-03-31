import { ExportKind } from "@prisma/client";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getOwnedExportPath } from "@/lib/designs";

type Props = {
  params: Promise<{ designId: string }>;
};

function getContentType(kind: ExportKind) {
  switch (kind) {
    case "PRINT_FILE":
      return "image/png";
    case "PREVIEW":
      return "image/jpeg";
    case "METADATA":
      return "application/json";
    case "ZIP":
      return "application/zip";
  }
}

function getExtension(kind: ExportKind) {
  switch (kind) {
    case "PRINT_FILE":
      return "png";
    case "PREVIEW":
      return "jpg";
    case "METADATA":
      return "json";
    case "ZIP":
      return "zip";
  }
}

export async function GET(request: Request, { params }: Props) {
  const session = await auth();

  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { designId } = await params;
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") as ExportKind | null;

  if (!kind || !Object.values(ExportKind).includes(kind)) {
    return new NextResponse("Invalid export kind", { status: 400 });
  }

  const exportData = await getOwnedExportPath({
    userId: session.user.id,
    designId,
    kind,
  });

  return new NextResponse(exportData.buffer, {
    headers: {
      "Content-Type": getContentType(kind),
      "Content-Disposition": `attachment; filename="${exportData.title}.${getExtension(kind)}"`,
    },
  });
}
