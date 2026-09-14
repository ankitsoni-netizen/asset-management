import { AssetCreateForm } from "@/components/assets/AssetCreateForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { listAssetTypes } from "@/lib/queries";

export default async function NewAssetPage() {
  const types = await listAssetTypes();

  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="Create asset"
        description="Scan the QR already printed on the device, then save it to inventory as available. Do not generate a new code."
      />
      <AssetCreateForm types={types} />
    </>
  );
}
