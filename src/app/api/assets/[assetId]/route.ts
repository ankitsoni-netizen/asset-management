import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helpers";
import { parseAssetActive } from "@/lib/constants";
import { collectImages, registerAssetImages, saveAssetImages } from "@/lib/media";
import { findAssetTypeById, getAssetById, updateAsset } from "@/lib/queries";

const fields = z.object({
  assetTypeId: z.string().min(1),
  brand: z.string().trim().min(1),
  model: z.string().trim().min(1),
  serialNumber: z.string().trim().min(1),
  notes: z.string().trim().optional(),
  active: z.boolean(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ assetId: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { assetId } = await context.params;
  if (!assetId) {
    return NextResponse.json({ error: "Asset is required." }, { status: 400 });
  }

  const existing = await getAssetById(assetId);
  if (!existing) {
    return NextResponse.json({ error: "Asset was not found." }, { status: 404 });
  }

  const formData = await request.formData();
  const parsed = fields.safeParse({
    assetTypeId: formData.get("assetTypeId"),
    brand: String(formData.get("brand") ?? ""),
    model: String(formData.get("model") ?? ""),
    serialNumber: String(formData.get("serialNumber") ?? ""),
    notes: String(formData.get("notes") ?? "") || undefined,
    active: parseAssetActive(formData.get("active"), existing.active),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Enter brand, model, and serial number." }, { status: 400 });
  }

  const assetType = await findAssetTypeById(parsed.data.assetTypeId);
  if (!assetType) {
    return NextResponse.json({ error: "Selected asset type was not found." }, { status: 404 });
  }

  let result: Awaited<ReturnType<typeof updateAsset>>;
  try {
    result = await updateAsset(admin.supabase, assetId, parsed.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update this asset.";
    const status = /not found/i.test(message) ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }

  const images = collectImages(formData);
  if (images.length) {
    const savedImages = await saveAssetImages(admin.supabase, result.id, images);
    if (savedImages.length) {
      await registerAssetImages(admin.supabase, result.id, savedImages);
    }
  }

  return NextResponse.json({
    uid: result.uid,
    assetId: result.id,
    assetType: result.assetType.name,
    status: result.status,
  });
}
