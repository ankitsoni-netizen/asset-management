import { notFound } from "next/navigation";
import { AssetEditForm } from "@/components/assets/AssetEditForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { getAssetById, listAssetTypes } from "@/lib/queries";

export default async function EditAssetPage({
  params,
}: {
  params: Promise<{ assetId: string }>;
}) {
  const { assetId } = await params;
  const [asset, types] = await Promise.all([getAssetById(assetId), listAssetTypes()]);
  if (!asset) notFound();

  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="Edit asset"
        description="Update the inventory details for this device. The printed QR / UID stays the same."
      />
      <AssetEditForm
        asset={{
          id: asset.id,
          uid: asset.uid,
          assetTypeId: asset.assetTypeId,
          brand: asset.brand ?? "",
          model: asset.model ?? "",
          serialNumber: asset.serialNumber ?? "",
          notes: asset.notes ?? "",
          status: asset.status,
          active: asset.active,
          images: asset.images,
        }}
        types={types}
      />
    </>
  );
}
