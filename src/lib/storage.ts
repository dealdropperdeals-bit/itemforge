import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { env } from "@/lib/env";

function storageRootAbsolute() {
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), env.storageRoot);
}

export function resolveStoragePath(relativePath: string) {
  return path.join(storageRootAbsolute(), relativePath);
}

export async function ensureStoragePath(relativePath = "") {
  const absolutePath = path.join(storageRootAbsolute(), relativePath);
  await mkdir(absolutePath, { recursive: true });
  return absolutePath;
}

export async function writeUpload(relativePath: string, file: File) {
  const targetPath = resolveStoragePath(relativePath);
  await mkdir(path.dirname(targetPath), { recursive: true });
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(targetPath, bytes);
  return targetPath;
}

export async function writeBuffer(relativePath: string, buffer: Buffer | Uint8Array) {
  const targetPath = resolveStoragePath(relativePath);
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, buffer);
  return targetPath;
}

export async function readStorageFile(relativePath: string) {
  return readFile(resolveStoragePath(relativePath));
}

export async function fileSizeBytes(relativePath: string) {
  const fileStat = await stat(resolveStoragePath(relativePath));
  return fileStat.size;
}
