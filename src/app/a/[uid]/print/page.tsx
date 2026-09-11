import { notFound } from "next/navigation";
import { getAssetByUid } from "@/lib/queries";
import { generateQrDataUrl } from "@/lib/qr";
import { normalizeUid } from "@/lib/utils";
import { PrintButton } from "@/components/print/PrintButton";
import { BrandLogo } from "@/components/brand/BrandLogo";

export default async function PrintPage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const { uid } = await params;
  const asset = await getAssetByUid(normalizeUid(decodeURIComponent(uid)));
  if (!asset) notFound();
  const current = asset.allocations.find((item) => item.isCurrent);
  const qr = await generateQrDataUrl(asset.uid);

  return (
    <div className="min-h-screen bg-white px-6 py-8">
      <div className="no-print mb-6 flex items-center justify-between">
        <a href={`/a/${asset.uid}`} className="text-sm text-cf-muted">
          Back to record
        </a>
        <PrintButton />
      </div>
      <div className="print-sheet mx-auto w-[360px] rounded-2xl border border-cf-border p-6 text-center">
        <div className="-mx-6 -mt-6 mb-2 rounded-t-2xl bg-black px-6 py-4">
          <BrandLogo className="mx-auto h-8 w-auto max-w-[180px]" />
        </div>
        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-cf-muted">Allocated asset</p>
        <img src={qr} alt={`QR for ${asset.uid}`} className="mx-auto mt-4 h-48 w-48" />
        <p className="mt-4 font-mono text-2xl font-semibold tracking-[0.14em]">{asset.uid}</p>
        <p className="mt-2 text-sm font-medium">{asset.assetType.name}</p>
        {current ? <p className="mt-1 text-xs text-cf-muted">{current.employeeName}</p> : null}
        <p className="mt-6 text-[11px] text-cf-muted">Scan to open the admin record. Print this UID on the device.</p>
      </div>
    </div>
  );
}
