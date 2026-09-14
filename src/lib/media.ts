import { randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export const ASSET_IMAGES_BUCKET = "asset-images";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function collectImages(formData: FormData) {
  return formData
    .getAll("images")
    .filter((value): value is File => value instanceof File && value.size > 0);
}

export function assertSupportedImages(files: File[]) {
  for (const file of files) {
    if (!ALLOWED_TYPES.has(file.type)) {
      throw new Error(`Unsupported image type: ${file.type || "unknown"}`);
    }
  }
}

function extensionFor(mimeType: string) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/gif") return "gif";
  return "jpg";
}

async function saveImages(
  supabase: SupabaseClient<Database>,
  folder: string,
  files: File[],
) {
  const saved: { filename: string; mimeType: string; storagePath: string }[] = [];

  for (const file of files) {
    if (!file.size) continue;
    assertSupportedImages([file]);
    const filename = `${randomBytes(8).toString("hex")}.${extensionFor(file.type)}`;
    const storagePath = `${folder}/${filename}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error } = await supabase.storage.from(ASSET_IMAGES_BUCKET).upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });
    if (error) {
      throw new Error(error.message);
    }
    saved.push({ filename, mimeType: file.type, storagePath });
  }

  return saved;
}

export async function saveAssetImages(
  supabase: SupabaseClient<Database>,
  assetId: string,
  files: File[],
) {
  return saveImages(supabase, `assets/${assetId}`, files);
}

export async function saveAllocationImages(
  supabase: SupabaseClient<Database>,
  allocationId: string,
  files: File[],
) {
  return saveImages(supabase, allocationId, files);
}

export async function readStoredImage(
  supabase: SupabaseClient<Database>,
  storagePath: string,
) {
  const { data, error } = await supabase.storage.from(ASSET_IMAGES_BUCKET).download(storagePath);
  if (error || !data) {
    throw new Error(error?.message || "Image not found.");
  }
  return Buffer.from(await data.arrayBuffer());
}

export async function readAllocationImage(
  supabase: SupabaseClient<Database>,
  storagePath: string,
) {
  return readStoredImage(supabase, storagePath);
}

export async function registerAssetImages(
  supabase: SupabaseClient<Database>,
  assetId: string,
  images: { filename: string; mimeType: string; storagePath: string }[],
) {
  if (!images.length) return;
  const { error } = await supabase.from("asset_images").insert(
    images.map((image) => ({
      asset_id: assetId,
      filename: image.filename,
      mime_type: image.mimeType,
      storage_path: image.storagePath,
    })),
  );
  if (error) {
    throw new Error(error.message);
  }
}

export async function registerAllocationImages(
  supabase: SupabaseClient<Database>,
  allocationId: string,
  images: { filename: string; mimeType: string; storagePath: string }[],
) {
  if (!images.length) return;
  const { error } = await supabase.from("allocation_images").insert(
    images.map((image) => ({
      allocation_id: allocationId,
      filename: image.filename,
      mime_type: image.mimeType,
      storage_path: image.storagePath,
    })),
  );
  if (error) {
    throw new Error(error.message);
  }
}
