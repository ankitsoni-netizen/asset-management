"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { CollapsibleSection } from "@/components/summary/CollapsibleSection";
import { filterHolders } from "@/lib/summary";
import { formatDate } from "@/lib/utils";

type AllocatedAsset = {
  allocationId: string;
  uid: string;
  assetType: string;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  allocatedAt: string;
};

type AllocatedHolder = {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  department: string;
  position: string;
  assets: AllocatedAsset[];
};

function assetName(brand: string | null, model: string | null) {
  return [brand, model].filter(Boolean).join(" ") || "No brand / model";
}

function AssetTag({ asset }: { asset: AllocatedAsset }) {
  const uid = asset.uid || "Unknown UID";
  const unknown = !asset.uid || asset.uid === "Unknown UID";
  const className =
    "block w-[12.5rem] shrink-0 rounded-lg border border-cf-border bg-cf-soft px-3 py-2.5 text-left transition-colors";
  const body = (
    <>
      <p className={`font-mono text-[11px] font-semibold tracking-[0.04em] ${unknown ? "text-cf-muted" : "text-cf-primary"}`}>
        {uid}
      </p>
      <p className="mt-1 text-xs font-medium text-cf-text">{asset.assetType}</p>
      <p className="mt-0.5 text-[11px] leading-4 text-cf-muted">{assetName(asset.brand, asset.model)}</p>
      {asset.serialNumber ? (
        <p className="mt-0.5 text-[11px] leading-4 text-cf-muted">SN {asset.serialNumber}</p>
      ) : null}
      <p className="mt-1.5 text-[11px] text-cf-muted">Since {formatDate(asset.allocatedAt)}</p>
    </>
  );

  if (unknown) {
    return <div className={className}>{body}</div>;
  }

  return (
    <Link
      href={`/a/${uid}`}
      aria-label={`Open ${asset.assetType} ${uid}`}
      className={`${className} hover:border-cf-primary hover:bg-white`}
    >
      {body}
    </Link>
  );
}

export function AllocatedHolders({ holders }: { holders: AllocatedHolder[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => filterHolders(holders, query), [holders, query]);
  const assetCount = filtered.reduce((count, holder) => count + holder.assets.length, 0);
  const searching = query.trim().length > 0;

  return (
    <CollapsibleSection
      label="Who has what"
      title="Currently allocated"
      subtitle={`${filtered.length} ${filtered.length === 1 ? "person" : "people"} · ${assetCount} ${
        assetCount === 1 ? "asset" : "assets"
      }${searching ? " matching" : ""}`}
      headerRight={
        holders.length > 0 ? (
          <div className="relative w-full">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cf-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, email, UID, asset"
              aria-label="Search currently allocated"
              enterKeyHint="search"
              inputMode="search"
              autoComplete="off"
              spellCheck={false}
              className="h-11 w-full rounded-md border border-cf-border bg-cf-soft pr-3 pl-10"
            />
          </div>
        ) : null
      }
    >
      {holders.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-cf-muted sm:px-5">
          No assets are attached to employees right now.{" "}
          <Link href="/allocations/new" className="text-cf-primary">
            Make the first allocation
          </Link>
          .
        </p>
      ) : filtered.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-cf-muted sm:px-5">
          No allocated assets match "{query.trim()}".
        </p>
      ) : (
        <ul className="divide-y divide-cf-border">
          {filtered.map((holder) => (
            <li key={holder.employeeId} className="px-4 py-4 sm:px-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{holder.employeeName}</p>
                  <p className="mt-1 break-all text-xs text-cf-muted">{holder.employeeEmail}</p>
                  <p className="mt-1 text-xs text-cf-muted">
                    {holder.department} · {holder.position}
                  </p>
                </div>
                <p className="shrink-0 text-xs text-cf-muted">
                  {holder.assets.length} {holder.assets.length === 1 ? "asset" : "assets"}
                </p>
              </div>
              <div className="mt-3 flex flex-nowrap items-stretch gap-2 overflow-x-auto pb-0.5">
                {holder.assets.map((row) => (
                  <AssetTag key={row.allocationId} asset={row} />
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </CollapsibleSection>
  );
}
