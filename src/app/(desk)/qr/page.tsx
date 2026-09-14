import { QrCodesView } from "@/components/qr/QrCodesView";
import { PageHeader } from "@/components/layout/PageHeader";
import { listAssetUids } from "@/lib/queries";

export default async function QrCodesPage() {
  const usedUids = await listAssetUids();

  return (
    <>
      <div className="no-print">
        <PageHeader
          eyebrow="Labels"
          title="QR codes"
          description="Generate printable QR codes that contain a unique UID. Stick them on devices, then add those UIDs to inventory under Assets."
        />
      </div>
      <QrCodesView usedUids={usedUids} />
    </>
  );
}
