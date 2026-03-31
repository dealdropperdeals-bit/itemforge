import path from "node:path";

import { ExportKind, Prisma } from "@prisma/client";
import sharp from "sharp";
import yazl from "yazl";

import { prisma } from "@/lib/db";
import { readStorageFile, resolveStoragePath, writeBuffer, writeUpload } from "@/lib/storage";

function slugSegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

async function createZipBundle(files: Array<{ relativePath: string; name: string }>) {
  const zip = new yazl.ZipFile();
  const chunks: Buffer[] = [];
  const zipBufferPromise = new Promise<Buffer>((resolve, reject) => {
    zip.outputStream.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    zip.outputStream.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    zip.outputStream.on("error", reject);
  });

  for (const file of files) {
    zip.addFile(resolveStoragePath(file.relativePath), file.name);
  }

  zip.end();
  return zipBufferPromise;
}

export async function createDesignDraft(input: {
  userId: string;
  title: string;
  deviceProfileId: string;
  file: File;
}) {
  const extension = path.extname(input.file.name).toLowerCase() || ".png";
  const fileSlug = slugSegment(input.title || input.file.name || "design");
  const relativeOriginalPath = `users/${input.userId}/originals/${Date.now()}-${fileSlug}${extension}`;

  await writeUpload(relativeOriginalPath, input.file);

  return prisma.design.create({
    data: {
      userId: input.userId,
      deviceProfileId: input.deviceProfileId,
      title: input.title,
      originalPath: relativeOriginalPath,
      status: "DRAFT",
    },
  });
}

export async function prepareDesignExports(input: { designId: string; userId: string }) {
  const design = await prisma.design.findFirst({
    where: {
      id: input.designId,
      userId: input.userId,
    },
    include: {
      deviceProfile: true,
    },
  });

  if (!design) {
    throw new Error("Design not found.");
  }

  const baseName = `${slugSegment(design.title)}-${design.id}`;
  const printRelativePath = `users/${input.userId}/exports/${baseName}.png`;
  const previewRelativePath = `users/${input.userId}/exports/${baseName}-preview.jpg`;
  const metadataRelativePath = `users/${input.userId}/exports/${baseName}.json`;
  const zipRelativePath = `users/${input.userId}/exports/${baseName}.zip`;

  const image = sharp(resolveStoragePath(design.originalPath), { limitInputPixels: false });
  const metadata = await image.metadata();

  const printBuffer = await image
    .resize({
      width: design.deviceProfile.widthPx,
      height: design.deviceProfile.heightPx,
      fit: "contain",
      position: "center",
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toBuffer();

  const previewBuffer = await sharp(printBuffer)
    .resize({
      width: 800,
      height: 800,
      fit: "inside",
    })
    .jpeg({ quality: 86 })
    .toBuffer();

  const metadataPayload = {
    designId: design.id,
    title: design.title,
    originalFilename: path.basename(design.originalPath),
    sourceDimensions: {
      width: metadata.width || 0,
      height: metadata.height || 0,
    },
    targetDimensions: {
      width: design.deviceProfile.widthPx,
      height: design.deviceProfile.heightPx,
      dpi: design.deviceProfile.dpi,
    },
    warnings:
      metadata.width && metadata.height
        ? [
            metadata.width < design.deviceProfile.widthPx ||
            metadata.height < design.deviceProfile.heightPx
              ? "Source image is smaller than the target print area and may appear soft."
              : null,
          ].filter(Boolean)
        : [],
    provider: design.deviceProfile.provider,
    blueprintId: design.deviceProfile.blueprintId,
    printProviderId: design.deviceProfile.printProviderId,
    variantId: design.deviceProfile.variantId,
    safeArea: design.deviceProfile.safeAreaJson,
    generatedAt: new Date().toISOString(),
  };

  await writeBuffer(printRelativePath, printBuffer);
  await writeBuffer(previewRelativePath, previewBuffer);
  await writeBuffer(metadataRelativePath, Buffer.from(JSON.stringify(metadataPayload, null, 2)));

  const zipBuffer = await createZipBundle([
    { relativePath: printRelativePath, name: `${baseName}.png` },
    { relativePath: previewRelativePath, name: `${baseName}-preview.jpg` },
    { relativePath: metadataRelativePath, name: `${baseName}.json` },
  ]);

  await writeBuffer(zipRelativePath, zipBuffer);

  const exportRows: Prisma.DesignExportCreateManyInput[] = [
    { designId: design.id, kind: ExportKind.PRINT_FILE, path: printRelativePath },
    { designId: design.id, kind: ExportKind.PREVIEW, path: previewRelativePath },
    { designId: design.id, kind: ExportKind.METADATA, path: metadataRelativePath },
    { designId: design.id, kind: ExportKind.ZIP, path: zipRelativePath },
  ];

  await prisma.$transaction([
    prisma.designExport.deleteMany({ where: { designId: design.id } }),
    prisma.design.update({
      where: { id: design.id },
      data: {
        status: "READY",
        preparedPath: printRelativePath,
        previewPath: previewRelativePath,
        metadataJson: metadataPayload,
        exportedAt: new Date(),
      },
    }),
    prisma.designExport.createMany({
      data: exportRows,
    }),
  ]);

  return {
    printRelativePath,
    previewRelativePath,
    metadataRelativePath,
    zipRelativePath,
  };
}

export async function getOwnedExportPath(input: {
  userId: string;
  designId: string;
  kind: ExportKind;
}) {
  const exportRecord = await prisma.designExport.findFirst({
    where: {
      designId: input.designId,
      kind: input.kind,
      design: {
        userId: input.userId,
      },
    },
    include: {
      design: true,
    },
  });

  if (!exportRecord) {
    throw new Error("Export not found.");
  }

  return {
    relativePath: exportRecord.path,
    buffer: await readStorageFile(exportRecord.path),
    title: exportRecord.design.title,
  };
}
