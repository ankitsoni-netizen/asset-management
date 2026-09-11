import { mkdir, writeFile, readFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

const UPLOAD_ROOT = path.join(process.cwd(), "data", "uploads");

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function uploadsRoot() {
  return UPLOAD_ROOT;
}

export async function saveAllocationImages(allocationId: string, files: File[]) {
  const saved: { filename: string; mimeType: string }[] = [];
  const dir = path.join(UPLOAD_ROOT, allocationId);
  await mkdir(dir, { recursive: true });

  for (const file of files) {
    if (!file.size) continue;
    if (!ALLOWED_TYPES.has(file.type)) {
      throw new Error(`Unsupported image type: ${file.type || "unknown"}`);
    }
    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : file.type === "image/gif" ? "gif" : "jpg";
    const filename = `${randomBytes(8).toString("hex")}.${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, filename), buffer);
    saved.push({ filename, mimeType: file.type });
  }

  return saved;
}

export async function readAllocationImage(allocationId: string, filename: string) {
  const filePath = path.join(UPLOAD_ROOT, allocationId, filename);
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(UPLOAD_ROOT))) {
    throw new Error("Invalid media path");
  }
  return readFile(resolved);
}

export function collectImages(formData: FormData) {
  return formData
    .getAll("images")
    .filter((value): value is File => value instanceof File && value.size > 0);
}
