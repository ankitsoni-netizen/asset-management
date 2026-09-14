"use client";

import { FormEvent, useMemo, useState } from "react";
import { Download, QrCode } from "lucide-react";
import { PrintButton } from "@/components/print/PrintButton";
import { useProcessing } from "@/components/status/Processing";
import { generateQrDataUrl } from "@/lib/qr";
import { isAssetUid, nextGeneratedUids, QR_LABEL_MAX_COUNT } from "@/lib/uid";
import { normalizeUid } from "@/lib/utils";

type Label = {
  uid: string;
  qr: string;
  inInventory: boolean;
};

export function QrCodesView({ usedUids }: { usedUids: string[] }) {
  const { run } = useProcessing();
  const [count, setCount] = useState(8);
  const [customUid, setCustomUid] = useState("");
  const [labels, setLabels] = useState<Label[]>([]);
  const [reservedUids, setReservedUids] = useState<string[]>([]);
  const [error, setError] = useState("");

  const inventory = useMemo(() => new Set(usedUids.map((uid) => normalizeUid(uid))), [usedUids]);
  const onSheet = useMemo(() => new Set(labels.map((label) => label.uid)), [labels]);

  async function addUids(uids: string[]) {
    const unique = uids.map(normalizeUid).filter((uid) => uid && !onSheet.has(uid));
    if (!unique.length) {
      setError("Those UIDs are already on this sheet.");
      return;
    }
    const created = await Promise.all(
      unique.map(async (uid) => ({
        uid,
        qr: await generateQrDataUrl(uid),
        inInventory: inventory.has(uid),
      })),
    );
    setLabels((current) => [...current, ...created]);
    setReservedUids((current) => [...current, ...unique]);
    setError("");
  }

  async function generateNew(event: FormEvent) {
    event.preventDefault();
    try {
      await run("Generating QR codes", async () => {
        const uids = nextGeneratedUids([...usedUids, ...reservedUids], count);
        await addUids(uids);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate QR codes.");
    }
  }

  async function addCustom(event: FormEvent) {
    event.preventDefault();
    const uid = normalizeUid(customUid);
    if (!isAssetUid(uid)) {
      setError("Enter a UID to encode in a QR code.");
      return;
    }
    try {
      await run("Adding QR code", async () => {
        await addUids([uid]);
        setCustomUid("");
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add this QR code.");
    }
  }

  function removeLabel(uid: string) {
    setLabels((current) => current.filter((label) => label.uid !== uid));
  }

  function downloadPng(label: Label) {
    const link = document.createElement("a");
    link.href = label.qr;
    link.download = `${label.uid}.png`;
    link.click();
  }

  return (
    <div className="space-y-6">
      <section className="cf-card no-print p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <QrCode className="h-4 w-4 text-cf-primary" />
          <h2 className="text-lg font-medium">Generate new UIDs</h2>
        </div>
        <p className="mt-1 text-sm text-cf-muted">
          Creates the next available <span className="font-mono">CF-AST-XXXXXX</span> codes. Print the labels, stick them
          on devices, then add each device under Assets.
        </p>
        <form onSubmit={generateNew} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block sm:w-40">
            <span className="cf-label">How many</span>
            <input
              type="number"
              min={1}
              max={QR_LABEL_MAX_COUNT}
              required
              value={count}
              onChange={(event) => setCount(Number(event.target.value))}
              className="mt-2 h-12 w-full rounded-md border border-cf-border px-3 sm:h-11"
            />
          </label>
          <button type="submit" className="cf-action bg-cf-primary text-white hover:bg-cf-primary-dark">
            Generate QR codes
          </button>
        </form>
      </section>

      <section className="cf-card no-print p-4 sm:p-6">
        <h2 className="text-lg font-medium">Existing or custom UID</h2>
        <p className="mt-1 text-sm text-cf-muted">
          Encode any UID in a QR code — reprint a label already in inventory, or use a code you already have.
        </p>
        <form onSubmit={addCustom} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block flex-1">
            <span className="cf-label">UID</span>
            <input
              value={customUid}
              onChange={(event) => setCustomUid(event.target.value)}
              placeholder="CF-AST-000042"
              className="mt-2 h-12 w-full rounded-md border border-cf-border px-3 font-mono sm:h-11"
            />
          </label>
          <button type="submit" className="cf-action border border-cf-border">
            Add to sheet
          </button>
        </form>
      </section>

      {error ? (
        <p className="no-print rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      {labels.length ? (
        <section className="cf-card p-4 sm:p-6">
          <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-medium">Printable labels</h2>
              <p className="mt-1 text-sm text-cf-muted">
                {labels.length} QR code{labels.length === 1 ? "" : "s"} with UID. Print this sheet and attach each label
                to a device.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={() => setLabels([])} className="cf-action border border-cf-border">
                Clear sheet
              </button>
              <PrintButton label="Print labels" />
            </div>
          </div>

          <ul className="qr-label-grid mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {labels.map((label) => (
              <li key={label.uid} className="qr-label print-sheet rounded-2xl border border-cf-border p-5 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cf-muted">Cloutflow</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={label.qr} alt={`QR code for ${label.uid}`} className="mx-auto mt-4 h-40 w-40" />
                <p className="mt-4 font-mono text-lg font-semibold tracking-[0.12em] break-all">{label.uid}</p>
                <p className="mt-1 text-xs text-cf-muted">
                  {label.inInventory ? "Already in inventory" : "Scan this UID when adding the device"}
                </p>
                <div className="no-print mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <button
                    type="button"
                    onClick={() => downloadPng(label)}
                    className="cf-action border border-cf-border"
                  >
                    <Download className="h-4 w-4" />
                    PNG
                  </button>
                  <button type="button" onClick={() => removeLabel(label.uid)} className="cf-action border border-cf-border">
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <div className="cf-card no-print px-4 py-12 text-center text-sm text-cf-muted">
          Generate new UIDs or add an existing one to build a printable QR sheet.
        </div>
      )}
    </div>
  );
}
