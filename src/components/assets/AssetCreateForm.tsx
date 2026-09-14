"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Laptop, Plus } from "lucide-react";
import { AssetImageField } from "@/components/forms/AssetImageField";
import { QrScanField } from "@/components/scan/QrScanField";
import { useProcessing } from "@/components/status/Processing";
import { scannedAssetUid } from "@/lib/scan";

type AssetType = {
  id: string;
  name: string;
  isCustom: boolean;
};

export function AssetCreateForm({ types }: { types: AssetType[] }) {
  const router = useRouter();
  const { run } = useProcessing();
  const [assetTypes, setAssetTypes] = useState(types);
  const [assetTypeId, setAssetTypeId] = useState(types[0]?.id ?? "");
  const [customName, setCustomName] = useState("");
  const [creatingType, setCreatingType] = useState(false);
  const [uid, setUid] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function createCustomType() {
    const name = customName.trim();
    if (!name) return;
    setCreatingType(true);
    setError("");
    try {
      await run("Adding asset type", async () => {
        const response = await fetch("/api/asset-types", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to add asset type.");
        setAssetTypes((current) => {
          if (current.some((item) => item.id === data.type.id)) return current;
          return [...current, data.type].sort((a: AssetType, b: AssetType) => a.name.localeCompare(b.name));
        });
        setAssetTypeId(data.type.id);
        setCustomName("");
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add asset type.");
    } finally {
      setCreatingType(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const scannedUid = scannedAssetUid(uid);
    if (!scannedUid) {
      setError("Scan or enter the QR / UID printed on the device.");
      return;
    }
    if (!brand.trim() || !model.trim() || !serialNumber.trim()) {
      setError("Enter brand, model, and serial number.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await run("Saving to inventory", async () => {
        const formData = new FormData();
        formData.set("uid", scannedUid);
        formData.set("assetTypeId", assetTypeId);
        formData.set("brand", brand);
        formData.set("model", model);
        formData.set("serialNumber", serialNumber);
        formData.set("notes", notes);
        files.forEach((file) => formData.append("images", file));

        const response = await fetch("/api/assets", { method: "POST", body: formData });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to save this asset.");
        router.push("/assets");
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save this asset.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="cf-card p-4 sm:p-6">
        <h2 className="text-lg font-medium">Printed QR / UID</h2>
        <p className="mt-1 text-sm text-cf-muted">
          Each device already has its own QR. Scan that code to store the device in inventory. The panel does not
          generate a UID.
        </p>
        <div className="mt-5">
          <QrScanField
            required
            label="Device QR / UID"
            value={uid}
            onChange={setUid}
            onRawScan={(raw) => setUid(scannedAssetUid(raw) ?? raw)}
            placeholder="Scan the sticker on the device"
          />
        </div>
      </section>

      <section className="cf-card p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <Laptop className="h-4 w-4 text-cf-primary" />
          <h2 className="text-lg font-medium">Asset details</h2>
        </div>
        <label className="mt-5 block">
          <span className="cf-label">Asset type</span>
          <select
            required
            value={assetTypeId}
            onChange={(event) => setAssetTypeId(event.target.value)}
            className="mt-2 h-12 w-full rounded-md border border-cf-border px-3 sm:h-11"
          >
            {assetTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
                {type.isCustom ? " (custom)" : ""}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <input
            value={customName}
            onChange={(event) => setCustomName(event.target.value)}
            placeholder="Create a custom asset type"
            className="h-12 flex-1 rounded-md border border-cf-border px-3 sm:h-11"
          />
          <button
            type="button"
            onClick={createCustomType}
            disabled={creatingType}
            className="cf-action border border-cf-border"
          >
            <Plus className="h-4 w-4" />
            {creatingType ? "Adding..." : "Add custom type"}
          </button>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="cf-label">
              Brand <span className="text-red-600">*</span>
            </span>
            <input
              required
              value={brand}
              onChange={(event) => setBrand(event.target.value)}
              className="mt-2 h-12 w-full rounded-md border border-cf-border px-3 sm:h-11"
            />
          </label>
          <label className="block">
            <span className="cf-label">
              Model <span className="text-red-600">*</span>
            </span>
            <input
              required
              value={model}
              onChange={(event) => setModel(event.target.value)}
              className="mt-2 h-12 w-full rounded-md border border-cf-border px-3 sm:h-11"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="cf-label">
              Serial number <span className="text-red-600">*</span>
            </span>
            <input
              required
              value={serialNumber}
              onChange={(event) => setSerialNumber(event.target.value)}
              className="mt-2 h-12 w-full rounded-md border border-cf-border px-3 sm:h-11"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="cf-label">Notes (optional)</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="mt-2 w-full rounded-md border border-cf-border px-3 py-3"
            />
          </label>
        </div>
      </section>

      <section className="cf-card p-4 sm:p-6">
        <h2 className="text-lg font-medium">Photos (optional)</h2>
        <p className="mt-1 text-sm text-cf-muted">Inventory photographs of the device. Employee details are not stored here.</p>
        <AssetImageField
          files={files}
          onChange={setFiles}
          className="mt-5"
          hint="PNG, JPG, WEBP. Optional, add useful angles of the device."
        />
      </section>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="cf-action bg-cf-primary text-white hover:bg-cf-primary-dark disabled:opacity-60"
      >
        {submitting ? "Saving..." : "Add to inventory"}
      </button>
    </form>
  );
}
