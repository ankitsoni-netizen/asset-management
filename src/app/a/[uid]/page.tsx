import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { AssetRecord } from "@/components/asset/AssetRecord";
import { auth } from "@/auth";
import { getAssetByUid } from "@/lib/queries";
import { generateQrDataUrl } from "@/lib/qr";
import { normalizeUid } from "@/lib/utils";
import { ADMIN_EMAIL } from "@/lib/constants";

export default async function AssetPage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const session = await auth();
  const { uid } = await params;
  const asset = await getAssetByUid(normalizeUid(decodeURIComponent(uid)));
  if (!asset) notFound();

  return (
    <AppShell email={session?.user?.email ?? ADMIN_EMAIL} pathname={`/a/${asset.uid}`}>
      <AssetRecord
        asset={{
          uid: asset.uid,
          status: asset.status,
          brand: asset.brand,
          model: asset.model,
          serialNumber: asset.serialNumber,
          notes: asset.notes,
          createdAt: asset.createdAt.toISOString(),
          assetType: asset.assetType,
          qrDataUrl: await generateQrDataUrl(asset.uid),
          allocations: asset.allocations.map((item) => ({
            ...item,
            allocatedAt: item.allocatedAt.toISOString(),
            endedAt: item.endedAt ? item.endedAt.toISOString() : null,
          })),
        }}
      />
    </AppShell>
  );
}
