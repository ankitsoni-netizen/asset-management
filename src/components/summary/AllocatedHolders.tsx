"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { CollapsibleSection } from "@/components/summary/CollapsibleSection";
import { formatVehicleNumbers, isParkingType, parkingSpotLabel } from "@/lib/parking";
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

type AllocatedParking = {
  allocationId: string;
  parkingType: string;
  slotNumber: string | null;
  vehicleNumbers: string[];
  allocatedAt: string;
};

type AllocatedHolder = {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  department: string;
  position: string;
  assets: AllocatedAsset[];
  parking: AllocatedParking[];
};

function assetName(brand: string | null, model: string | null) {
  return [brand, model].filter(Boolean).join(" ") || "No brand / model";
}

const tagClassName =
  "block w-[12.5rem] shrink-0 rounded-lg border border-cf-border bg-cf-soft px-3 py-2.5 text-left transition-colors";

function AssetTag({ asset }: { asset: AllocatedAsset }) {
  const uid = asset.uid || "Unknown UID";
  const unknown = !asset.uid || asset.uid === "Unknown UID";
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
    return <div className={tagClassName}>{body}</div>;
  }

  return (
    <Link
      href={`/a/${uid}`}
      aria-label={`Open ${asset.assetType} ${uid}`}
      className={`${tagClassName} hover:border-cf-primary hover:bg-white`}
    >
      {body}
    </Link>
  );
}

function ParkingTag({ parking }: { parking: AllocatedParking }) {
  const label = isParkingType(parking.parkingType)
    ? parkingSpotLabel(parking.parkingType, parking.slotNumber)
    : parking.parkingType;
  const vehicles = formatVehicleNumbers(parking.vehicleNumbers);

  return (
    <Link
      href={`/parking?parkingType=${encodeURIComponent(parking.parkingType)}`}
      aria-label={`Open ${label} parking`}
      className={`${tagClassName} hover:border-cf-primary hover:bg-white`}
    >
      <p className="text-[11px] font-semibold tracking-[0.04em] text-cf-primary">{label}</p>
      <p className="mt-1 text-xs font-medium text-cf-text">Parking</p>
      <p className="mt-0.5 text-[11px] leading-4 text-cf-muted">{vehicles || "No vehicle number"}</p>
      <p className="mt-1.5 text-[11px] text-cf-muted">Since {formatDate(parking.allocatedAt)}</p>
    </Link>
  );
}

function holderCounts(holder: AllocatedHolder) {
  const parts: string[] = [];
  if (holder.assets.length > 0) {
    parts.push(`${holder.assets.length} ${holder.assets.length === 1 ? "asset" : "assets"}`);
  }
  if (holder.parking.length > 0) {
    parts.push(`${holder.parking.length} parking`);
  }
  return parts.join(" · ") || "None";
}

export function AllocatedHolders({ holders }: { holders: AllocatedHolder[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => filterHolders(holders, query), [holders, query]);
  const assetCount = filtered.reduce((count, holder) => count + holder.assets.length, 0);
  const parkingCount = filtered.reduce((count, holder) => count + holder.parking.length, 0);
  const searching = query.trim().length > 0;

  return (
    <CollapsibleSection
      label="Who has what"
      title="Currently allocated"
      subtitle={`${filtered.length} ${filtered.length === 1 ? "person" : "people"} · ${assetCount} ${
        assetCount === 1 ? "asset" : "assets"
      } · ${parkingCount} parking${searching ? " matching" : ""}`}
      headerRight={
        holders.length > 0 ? (
          <div className="relative w-full">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cf-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, email, UID, asset, parking"
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
          No assets or parking are attached to employees right now.{" "}
          <Link href="/allocations/new" className="text-cf-primary">
            Allocate a device
          </Link>{" "}
          or{" "}
          <Link href="/parking/new" className="text-cf-primary">
            allocate parking
          </Link>
          .
        </p>
      ) : filtered.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-cf-muted sm:px-5">
          {`No allocated assets or parking match "${query.trim()}".`}
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
                <p className="shrink-0 text-xs text-cf-muted">{holderCounts(holder)}</p>
              </div>
              <div className="mt-3 flex flex-nowrap items-stretch gap-2 overflow-x-auto pb-0.5">
                {holder.assets.map((row) => (
                  <AssetTag key={row.allocationId} asset={row} />
                ))}
                {holder.parking.map((row) => (
                  <ParkingTag key={row.allocationId} parking={row} />
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </CollapsibleSection>
  );
}
