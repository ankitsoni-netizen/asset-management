import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helpers";
import { collectImages, registerAssetImages, saveAssetImages } from "@/lib/media";
import { findAssetTypeById, getAssetByUid, registerAsset } from "@/lib/queries";
import { scannedAssetUid } from "@/lib/scan";
import { isAssetUid } from "@/lib/uid";
import { normalizeUid } from "@/lib/utils";

const fields = z.object({
  uid: z.string().trim().min(1).max(120),
  assetTypeId: z.string().min(1),
  brand: z.string().trim().optional(),
  model: z.string().trim().optional(),
  serialNumber: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export async function GET(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const uid = scannedAssetUid(new URL(request.url).searchParams.get("uid") ?? "");
  if (!uid) {
    return NextResponse.json({ error: "UID is required." }, { status: 400 });
  }

  const asset = await getAssetByUid(uid);
  if (!asset) {
    return NextResponse.json({ error: "No asset was found for this UID." }, { status: 404 });
  }

  return NextResponse.json({
    asset: {
      id: asset.id,
      uid: asset.uid,
      status: asset.status,
      brand: asset.brand,
      model: asset.model,
      serialNumber: asset.serialNumber,
      assetType: asset.assetType,
    },
  });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const parsed = fields.safeParse({
    uid: scannedAssetUid(String(formData.get("uid") ?? "")) ?? String(formData.get("uid") ?? ""),
    assetTypeId: formData.get("assetTypeId"),
    brand: String(formData.get("brand") ?? "") || undefined,
    model: String(formData.get("model") ?? "") || undefined,
    serialNumber: String(formData.get("serialNumber") ?? "") || undefined,
    notes: String(formData.get("notes") ?? "") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Scan or enter the printed QR / UID and choose an asset type." },
      { status: 400 },
    );
  }

  const uid = normalizeUid(parsed.data.uid);
  if (!isAssetUid(uid)) {
    return NextResponse.json({ error: "Enter a valid printed UID from the device QR code." }, { status: 400 });
  }

  const assetType = await findAssetTypeById(parsed.data.assetTypeId);
  if (!assetType) {
    return NextResponse.json({ error: "Selected asset type was not found." }, { status: 404 });
  }

  let result: Awaited<ReturnType<typeof registerAsset>>;
  try {
    result = await registerAsset(admin.supabase, { ...parsed.data, uid });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save this asset.";
    const status = /not found/i.test(message) ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }

  const images = collectImages(formData);
  if (images.length) {
    const savedImages = await saveAssetImages(admin.supabase, result.asset.id, images);
    if (savedImages.length) {
      await registerAssetImages(admin.supabase, result.asset.id, savedImages);
    }
  }

  return NextResponse.json({
    uid: result.asset.uid,
    assetId: result.asset.id,
    assetType: result.assetType.name,
    status: result.asset.status,
  });
}
