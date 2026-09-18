import { notFound } from "next/navigation";
import { AssetRecord } from "@/components/asset/AssetRecord";
import { getAssetByUid, getCurrentAllocationForAsset } from "@/lib/queries";
import { normalizeUid } from "@/lib/utils";

export default async function AssetPage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const { uid } = await params;
  const decodedUid = normalizeUid(decodeURIComponent(uid));
  const asset = await getAssetByUid(decodedUid);
  if (!asset) notFound();
  const allocatedTo = await getCurrentAllocationForAsset(asset.id);

  return (
    <AssetRecord
      asset={{
        id: asset.id,
        uid: asset.uid,
        status: asset.status,
        active: asset.active,
        brand: asset.brand,
        model: asset.model,
        serialNumber: asset.serialNumber,
        notes: asset.notes,
        createdAt: asset.createdAt.toISOString(),
        assetType: asset.assetType,
        images: asset.images,
        allocatedTo,
      }}
    />
  );
}
