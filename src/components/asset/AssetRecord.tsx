"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate, formatDateTime } from "@/lib/utils";
import { ReallocateModal } from "./ReallocateModal";

type ImageRecord = { id: string; filename: string };
type Allocation = {
  id: string;
  employeeName: string;
  department: string;
  position: string;
  employeeEmail: string;
  action: string;
  allocatedAt: string;
  endedAt: string | null;
  isCurrent: boolean;
  confirmationNote: string | null;
  emailSent: boolean;
  images: ImageRecord[];
};

export type AssetRecordData = {
  uid: string;
  status: string;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  notes: string | null;
  createdAt: string;
  assetType: { name: string };
  allocations: Allocation[];
  qrDataUrl: string;
};

export function AssetRecord({ asset }: { asset: AssetRecordData }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [returning, setReturning] = useState(false);
  const current = asset.allocations.find((item) => item.isCurrent);

  const history = useMemo(
    () => [...asset.allocations].sort((a, b) => +new Date(b.allocatedAt) - +new Date(a.allocatedAt)),
    [asset.allocations],
  );

  async function markReturned() {
    if (!confirm("Return this asset to inventory? The current employee will no longer hold it.")) {
      return;
    }
    setReturning(true);
    const response = await fetch("/api/return", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid: asset.uid }),
    });
    setReturning(false);
    if (response.ok) router.refresh();
  }

  return (
    <div className="space-y-6">
      <section className="cf-card p-6">
        <div className="flex flex-col justify-between gap-6 lg:flex-row">
          <div>
            <p className="cf-label">Asset record</p>
            <h1 className="mt-2 font-mono text-3xl font-semibold tracking-[0.12em]">{asset.uid}</h1>
            <p className="mt-2 text-sm text-cf-muted">
              {asset.assetType.name}
              {asset.brand ? ` · ${asset.brand}` : ""}
              {asset.model ? ` ${asset.model}` : ""}
            </p>
            <div className="mt-4 inline-flex rounded-full bg-cf-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]">
              {asset.status === "allocated" ? "Allocated" : "In inventory"}
            </div>
          </div>
          <div className="rounded-xl border border-cf-border p-4">
            <img src={asset.qrDataUrl} alt={`QR for ${asset.uid}`} className="h-36 w-36" />
            <a href={`/a/${asset.uid}/print`} className="mt-3 block text-center text-xs font-medium text-cf-primary">
              Print label
            </a>
          </div>
        </div>

        {current ? (
          <div className="mt-8 grid gap-4 border-t border-cf-border pt-6 md:grid-cols-2 lg:grid-cols-4">
            <Field label="Employee" value={current.employeeName} />
            <Field label="Department" value={current.department} />
            <Field label="Position" value={current.position} />
            <Field label="Official email" value={current.employeeEmail} />
            <Field label="Allocated on" value={formatDateTime(current.allocatedAt)} />
            <Field label="Serial number" value={asset.serialNumber || "—"} />
            <Field label="Acknowledgement" value={current.emailSent ? "Sent" : "Not sent"} />
            <Field label="Notes" value={asset.notes || "—"} />
          </div>
        ) : (
          <p className="mt-8 text-sm text-cf-muted">This UID is currently in inventory and is not assigned to an employee.</p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="h-11 rounded-md bg-cf-primary px-5 text-sm font-medium text-white"
          >
            Reallocate
          </button>
          {current ? (
            <button
              type="button"
              onClick={markReturned}
              disabled={returning}
              className="h-11 rounded-md border border-cf-border px-5 text-sm font-medium"
            >
              {returning ? "Returning..." : "Return to inventory"}
            </button>
          ) : null}
        </div>
      </section>

      {current?.images.length ? (
        <section className="cf-card p-6">
          <h2 className="text-lg font-medium">Current images</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {current.images.map((image) => (
              <a
                key={image.id}
                href={`/api/media/${current.id}/${image.filename}`}
                target="_blank"
                rel="noreferrer"
                className="overflow-hidden rounded-lg border border-cf-border"
              >
                <img
                  src={`/api/media/${current.id}/${image.filename}`}
                  alt="Allocated asset"
                  className="h-36 w-full object-cover"
                />
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <section className="cf-card overflow-hidden">
        <div className="border-b border-cf-border px-6 py-4">
          <h2 className="text-lg font-medium">UID history</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-cf-soft text-xs uppercase tracking-[0.08em] text-cf-muted">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Employee</th>
                <th className="px-6 py-3">Department</th>
                <th className="px-6 py-3">Action</th>
                <th className="px-6 py-3">Ended</th>
                <th className="px-6 py-3">Images</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id} className="border-t border-cf-border">
                  <td className="px-6 py-3">{formatDateTime(item.allocatedAt)}</td>
                  <td className="px-6 py-3">
                    <div>{item.employeeName}</div>
                    <div className="text-xs text-cf-muted">{item.employeeEmail}</div>
                  </td>
                  <td className="px-6 py-3">
                    {item.department}
                    <div className="text-xs text-cf-muted">{item.position}</div>
                  </td>
                  <td className="px-6 py-3 capitalize">{item.action}</td>
                  <td className="px-6 py-3">{item.endedAt ? formatDate(item.endedAt) : item.isCurrent ? "Current" : "—"}</td>
                  <td className="px-6 py-3">
                    <div className="flex gap-1">
                      {item.images.slice(0, 3).map((image) => (
                        <img
                          key={image.id}
                          src={`/api/media/${item.id}/${image.filename}`}
                          alt=""
                          className="h-10 w-10 rounded object-cover"
                        />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {open ? (
        <ReallocateModal
          uid={asset.uid}
          assetName={asset.assetType.name}
          currentName={current?.employeeName}
          onClose={() => setOpen(false)}
          onDone={() => {
            setOpen(false);
            router.refresh();
          }}
        />
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
