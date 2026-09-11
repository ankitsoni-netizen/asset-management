"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Laptop, Plus } from "lucide-react";
import { DEPARTMENTS, isOfficialEmployeeEmail, OFFICIAL_EMAIL_HINT } from "@/lib/employee";
import { DepartmentField, resolvedDepartment } from "@/components/forms/DepartmentField";

type AssetType = {
  id: string;
  name: string;
  isCustom: boolean;
};

type Success = {
  uid: string;
  qrDataUrl: string;
  emailSent: boolean;
  emailError?: string;
  assetType: string;
  employeeName: string;
};

export function AllocateForm({ types }: { types: AssetType[] }) {
  const router = useRouter();
  const [assetTypes, setAssetTypes] = useState(types);
  const [assetTypeId, setAssetTypeId] = useState(types[0]?.id ?? "");
  const [customName, setCustomName] = useState("");
  const [creatingType, setCreatingType] = useState(false);
  const [employeeName, setEmployeeName] = useState("");
  const [department, setDepartment] = useState<string>(DEPARTMENTS[0]);
  const [customDepartment, setCustomDepartment] = useState("");
  const [position, setPosition] = useState("");
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<Success | null>(null);

  const previews = useMemo(
    () => files.map((file) => ({ name: file.name, url: URL.createObjectURL(file) })),
    [files],
  );

  async function createCustomType() {
    const name = customName.trim();
    if (!name) return;
    setCreatingType(true);
    setError("");
    try {
      const response = await fetch("/api/asset-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to add asset type.");
      setAssetTypes((current) => {
        if (current.some((item) => item.id === data.type.id)) return current;
        return [...current, data.type].sort((a, b) => a.name.localeCompare(b.name));
      });
      setAssetTypeId(data.type.id);
      setCustomName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add asset type.");
    } finally {
      setCreatingType(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isOfficialEmployeeEmail(employeeEmail)) {
      setError(OFFICIAL_EMAIL_HINT);
      return;
    }
    const departmentValue = resolvedDepartment(department, customDepartment);
    if (!departmentValue) {
      setError("Enter a department.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const formData = new FormData();
      formData.set("assetTypeId", assetTypeId);
      formData.set("employeeName", employeeName);
      formData.set("department", departmentValue);
      formData.set("position", position);
      formData.set("employeeEmail", employeeEmail);
      formData.set("brand", brand);
      formData.set("model", model);
      formData.set("serialNumber", serialNumber);
      formData.set("notes", notes);
      files.forEach((file) => formData.append("images", file));

      const response = await fetch("/api/allocate", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Allocation failed.");
      setSuccess(data);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Allocation failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="cf-card p-6 sm:p-8">
        <p className="cf-label">Allocated</p>
        <h2 className="mt-2 text-2xl font-medium tracking-tight">UID and QR code are ready</h2>
        <p className="mt-2 text-sm text-cf-muted">
          {success.assetType} is now with {success.employeeName}. Print the UID on the device and keep the QR with the
          record.
        </p>
        <div className="mt-8 grid gap-8 md:grid-cols-[220px_1fr]">
          <div className="rounded-xl border border-cf-border bg-white p-4">
            <img src={success.qrDataUrl} alt={`QR for ${success.uid}`} className="mx-auto h-48 w-48" />
          </div>
          <div>
            <p className="cf-label">UID</p>
            <p className="mt-2 font-mono text-3xl font-semibold tracking-[0.12em]">{success.uid}</p>
            <p className="mt-4 text-sm text-cf-muted">
              {success.emailSent
                ? "An acknowledgement was sent to the employee email."
                : success.emailError || "Acknowledgement email could not be sent."}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={`/a/${success.uid}/print`}
                className="inline-flex h-10 items-center rounded-md bg-cf-primary px-4 text-sm font-medium text-white"
              >
                Print UID and QR
              </a>
              <a
                href={`/a/${success.uid}`}
                className="inline-flex h-10 items-center rounded-md border border-cf-border px-4 text-sm font-medium"
              >
                Open record
              </a>
              <button
                type="button"
                onClick={() => {
                  setSuccess(null);
                  setFiles([]);
                  setEmployeeName("");
                  setPosition("");
                  setEmployeeEmail("");
                  setBrand("");
                  setModel("");
                  setSerialNumber("");
                  setNotes("");
                }}
                className="inline-flex h-10 items-center rounded-md border border-cf-border px-4 text-sm font-medium"
              >
                Allocate another
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="cf-card p-6">
        <div className="flex items-center gap-2">
          <Laptop className="h-4 w-4 text-cf-primary" />
          <h2 className="text-lg font-medium">1. Select asset</h2>
        </div>
        <p className="mt-1 text-sm text-cf-muted">Choose a standard type or add a custom asset.</p>
        <label className="mt-5 block">
          <span className="cf-label">Asset type</span>
          <select
            required
            value={assetTypeId}
            onChange={(event) => setAssetTypeId(event.target.value)}
            className="mt-2 h-11 w-full rounded-md border border-cf-border px-3 text-sm"
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
            className="h-11 flex-1 rounded-md border border-cf-border px-3 text-sm"
          />
          <button
            type="button"
            onClick={createCustomType}
            disabled={creatingType}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-cf-border px-4 text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            {creatingType ? "Adding..." : "Add custom asset"}
          </button>
        </div>
      </section>

      <section className="cf-card p-6">
        <h2 className="text-lg font-medium">2. Employee details</h2>
        <p className="mt-1 text-sm text-cf-muted">Official Cloutflow information for the person receiving the asset.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="cf-label">Employee name</span>
            <input
              required
              value={employeeName}
              onChange={(event) => setEmployeeName(event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-cf-border px-3 text-sm"
            />
          </label>
          <DepartmentField
            department={department}
            customDepartment={customDepartment}
            onDepartmentChange={setDepartment}
            onCustomDepartmentChange={setCustomDepartment}
          />
          <label className="block">
            <span className="cf-label">Position</span>
            <input
              required
              value={position}
              onChange={(event) => setPosition(event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-cf-border px-3 text-sm"
            />
          </label>
          <label className="block">
            <span className="cf-label">Official email ID</span>
            <input
              required
              type="email"
              value={employeeEmail}
              onChange={(event) => setEmployeeEmail(event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-cf-border px-3 text-sm"
              placeholder="name@cloutflow.com"
            />
            <span className="mt-1 block text-xs text-cf-muted">{OFFICIAL_EMAIL_HINT}</span>
          </label>
          <label className="block">
            <span className="cf-label">Brand (optional)</span>
            <input
              value={brand}
              onChange={(event) => setBrand(event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-cf-border px-3 text-sm"
            />
          </label>
          <label className="block">
            <span className="cf-label">Model (optional)</span>
            <input
              value={model}
              onChange={(event) => setModel(event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-cf-border px-3 text-sm"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="cf-label">Serial number (optional)</span>
            <input
              value={serialNumber}
              onChange={(event) => setSerialNumber(event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-cf-border px-3 text-sm"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="cf-label">Notes (optional)</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="mt-2 w-full rounded-md border border-cf-border px-3 py-2 text-sm"
            />
          </label>
        </div>
      </section>

      <section className="cf-card p-6">
        <div className="flex items-center gap-2">
          <ImagePlus className="h-4 w-4 text-cf-primary" />
          <h2 className="text-lg font-medium">3. Asset images</h2>
        </div>
        <p className="mt-1 text-sm text-cf-muted">Upload photographs of the device being issued.</p>
        <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-cf-border bg-cf-soft px-4 py-10 text-center">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
          />
          <span className="text-sm font-medium">Click to upload images</span>
          <span className="mt-1 text-xs text-cf-muted">PNG, JPG, WEBP. Add every relevant angle.</span>
        </label>
        {previews.length ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {previews.map((file) => (
              <div key={file.url} className="overflow-hidden rounded-lg border border-cf-border">
                <img src={file.url} alt={file.name} className="h-28 w-full object-cover" />
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex h-12 items-center rounded-md bg-cf-primary px-6 text-sm font-medium text-white hover:bg-cf-primary-dark disabled:opacity-60"
      >
        {submitting ? "Allocating..." : "Allocate"}
      </button>
    </form>
  );
}
