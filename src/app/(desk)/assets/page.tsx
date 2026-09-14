import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { listAssets, listAssetTypes } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; assetTypeId?: string }>;
}) {
  const filters = await searchParams;
  const [assets, types] = await Promise.all([listAssets(filters), listAssetTypes()]);

  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="Assets"
        description="Every company device, identified by the QR already printed on it. Employee assignment lives under Allocation."
        actions={
          <Link href="/assets/new" className="cf-action bg-cf-primary text-white hover:bg-cf-primary-dark">
            <Plus className="h-4 w-4" />
            Create asset
          </Link>
        }
      />

      <form className="cf-card mb-4 grid gap-3 p-4 md:grid-cols-4" method="get">
        <input
          name="q"
          defaultValue={filters.q}
          placeholder="Search UID, brand, serial"
          className="h-12 rounded-md border border-cf-border px-3 md:col-span-2 md:h-10"
        />
        <select name="status" defaultValue={filters.status ?? ""} className="h-12 rounded-md border border-cf-border px-3 md:h-10">
          <option value="">All statuses</option>
          <option value="available">Available</option>
          <option value="allocated">Allocated</option>
        </select>
        <select
          name="assetTypeId"
          defaultValue={filters.assetTypeId ?? ""}
          className="h-12 rounded-md border border-cf-border px-3 md:h-10"
        >
          <option value="">All types</option>
          {types.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
        <div className="flex flex-col gap-2 sm:flex-row md:col-span-4">
          <button type="submit" className="cf-action bg-cf-ink text-white">
            Apply
          </button>
          <Link href="/assets" className="cf-action border border-cf-border">
            Reset
          </Link>
        </div>
      </form>

      {assets.length === 0 ? (
        <div className="cf-card px-4 py-12 text-center text-sm text-cf-muted">
          No devices in inventory yet.{" "}
          <Link href="/assets/new" className="text-cf-primary">
            Scan a printed QR to add the first asset
          </Link>
          .
        </div>
      ) : (
        <>
          <ul className="space-y-3 lg:hidden">
            {assets.map((asset) => (
              <li key={asset.id}>
                <Link href={`/a/${asset.uid}`} className="cf-card block p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-mono text-sm font-semibold break-all text-cf-primary">{asset.uid}</p>
                    <span className="shrink-0 rounded-full bg-cf-soft px-2 py-1 text-xs capitalize">
                      {asset.status === "allocated" ? "Allocated" : "Available"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium">{asset.assetType.name}</p>
                  <p className="mt-1 text-xs text-cf-muted">
                    {[asset.brand, asset.model].filter(Boolean).join(" ") || "No brand / model"}
                    {asset.serialNumber ? ` · ${asset.serialNumber}` : ""}
                  </p>
                  <p className="mt-2 text-xs text-cf-muted">Added {formatDate(asset.createdAt)}</p>
                </Link>
              </li>
            ))}
          </ul>

          <div className="cf-card hidden overflow-hidden lg:block">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-cf-soft text-xs uppercase tracking-[0.08em] text-cf-muted">
                  <tr>
                    <th className="px-4 py-3">UID</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Brand / model</th>
                    <th className="px-4 py-3">Serial</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Added</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((asset) => (
                    <tr key={asset.id} className="border-t border-cf-border transition-colors hover:bg-cf-soft/70">
                      <td className="px-4 py-3">
                        <Link href={`/a/${asset.uid}`} className="font-mono text-xs font-semibold text-cf-primary">
                          {asset.uid}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{asset.assetType.name}</td>
                      <td className="px-4 py-3">{[asset.brand, asset.model].filter(Boolean).join(" ") || "—"}</td>
                      <td className="px-4 py-3">{asset.serialNumber || "—"}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-cf-soft px-2 py-1 text-xs capitalize">
                          {asset.status === "allocated" ? "Allocated" : "Available"}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatDate(asset.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}
