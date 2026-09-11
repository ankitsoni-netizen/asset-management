"use client";

import { FormEvent, useState } from "react";
import { DEPARTMENTS, isOfficialEmployeeEmail, OFFICIAL_EMAIL_HINT } from "@/lib/employee";
import { DepartmentField, resolvedDepartment } from "@/components/forms/DepartmentField";

export function ReallocateModal({
  uid,
  assetName,
  currentName,
  onClose,
  onDone,
}: {
  uid: string;
  assetName: string;
  currentName?: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [employeeName, setEmployeeName] = useState("");
  const [department, setDepartment] = useState<string>(DEPARTMENTS[0]);
  const [customDepartment, setCustomDepartment] = useState("");
  const [position, setPosition] = useState("");
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [confirmationNote, setConfirmationNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!confirmed) {
      setError("Confirm the reallocation before continuing.");
      return;
    }
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
    const formData = new FormData();
    formData.set("uid", uid);
    formData.set("employeeName", employeeName);
    formData.set("department", departmentValue);
    formData.set("position", position);
    formData.set("employeeEmail", employeeEmail);
    formData.set("confirmationNote", confirmationNote);
    formData.set("confirmation", "true");
    files.forEach((file) => formData.append("images", file));

    const response = await fetch("/api/reallocate", { method: "POST", body: formData });
    const data = await response.json();
    setSubmitting(false);
    if (!response.ok) {
      setError(data.error || "Reallocation failed.");
      return;
    }
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-cf-ink/50 p-4">
      <form onSubmit={onSubmit} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6">
        <h2 className="text-xl font-medium">Reallocate {uid}</h2>
        <p className="mt-2 text-sm text-cf-muted">
          The same UID stays on {assetName}
          {currentName ? ` and moves from ${currentName}` : ""} to the employee entered below.
        </p>

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
          <label className="block md:col-span-2">
            <span className="cf-label">Images of the asset</span>
            <input
              required
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
              className="mt-2 w-full text-sm"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="cf-label">Confirmation note (optional)</span>
            <textarea
              value={confirmationNote}
              onChange={(event) => setConfirmationNote(event.target.value)}
              rows={3}
              className="mt-2 w-full rounded-md border border-cf-border px-3 py-2 text-sm"
              placeholder="Reason for transfer, condition, or handover notes"
            />
          </label>
        </div>

        <label className="mt-5 flex items-start gap-3 rounded-lg border border-cf-border bg-cf-soft p-4 text-sm">
          <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
          <span>
            I confirm that UID <strong>{uid}</strong> should now be allocated to the employee named above. The previous
            holder will no longer be responsible for this asset.
          </span>
        </label>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="h-10 rounded-md border border-cf-border px-4 text-sm">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="h-10 rounded-md bg-cf-primary px-4 text-sm font-medium text-white disabled:opacity-60"
          >
            {submitting ? "Reallocating..." : "Confirm reallocation"}
          </button>
        </div>
      </form>
    </div>
  );
}
