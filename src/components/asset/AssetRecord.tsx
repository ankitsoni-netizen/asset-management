"use client";

import Link from "next/link";
import { formatDate } from "@/lib/utils";

type ImageRecord = { id: string; filename: string };

export type AssetRecordData = {
  id: string;
  uid: string;
  status: string;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  notes: string | null;
  createdAt: string;
  assetType: { name: string };
  images: ImageRecord[];
};

export function AssetRecord({ asset }: { asset: AssetRecordData }) {
  return (
    <div className="space-y-6">
      <section className="cf-card p-4 sm:p-6">
        <p className="cf-label">Inventory record</p>
        <h1 className="mt-2 font-mono text-2xl font-semibold tracking-[0.08em] break-all sm:text-3xl sm:tracking-[0.12em]">{asset.uid}</h1>
        <p className="mt-2 text-sm text-cf-muted">
          {asset.assetType.name}
          {asset.brand ? ` · ${asset.brand}` : ""}
          {asset.model ? ` ${asset.model}` : ""}
        </p>
        <div className="mt-4 inline-flex rounded-full bg-cf-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]">
          {asset.status === "allocated" ? "Allocated" : "Available"}
        </div>

        <div className="mt-8 grid gap-4 border-t border-cf-border pt-6 md:grid-cols-2 lg:grid-cols-4">
          <Field label="Asset type" value={asset.assetType.name} />
          <Field label="Brand" value={asset.brand || "—"} />
          <Field label="Model" value={asset.model || "—"} />
          <Field label="Serial number" value={asset.serialNumber || "—"} />
          <Field label="Added" value={formatDate(asset.createdAt)} />
          <Field label="Status" value={asset.status === "allocated" ? "Allocated" : "Available"} />
          <Field label="Notes" value={asset.notes || "—"} />
        </div>

        <p className="mt-6 text-sm text-cf-muted">
          Employee mapping is not shown here. Open Allocation to attach or remove this device.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link
            href="/allocations"
            className="cf-action bg-cf-primary text-white"
          >
            Open allocation
          </Link>
          {asset.status === "available" ? (
            <Link
              href="/allocations/new"
              className="cf-action border border-cf-border"
            >
              Attach to employee
            </Link>
          ) : null}
        </div>
      </section>

      {asset.images.length ? (
        <section className="cf-card p-4 sm:p-6">
          <h2 className="text-lg font-medium">Inventory photos</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {asset.images.map((image) => (
              <a
                key={image.id}
                href={`/api/media/assets/${asset.id}/${image.filename}`}
                target="_blank"
                rel="noreferrer"
                className="overflow-hidden rounded-lg border border-cf-border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/media/assets/${asset.id}/${image.filename}`}
                  alt="Inventory asset"
                  className="h-36 w-full object-cover"
                />
              </a>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="cf-label">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}
