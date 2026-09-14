"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ChevronDown } from "lucide-react";
import { RetryAcknowledgementButton } from "@/components/asset/RetryAcknowledgementButton";
import { useProcessing } from "@/components/status/Processing";
import { ACKNOWLEDGEMENT_EMAIL_FAILURE_AFTER_ALLOCATE } from "@/lib/constants";

type AssetOption = {
  id: string;
  uid: string;
  status: string;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  assetType: { name: string };
};

type EmployeeOption = {
  id: string;
  name: string;
  email: string;
  department: string;
  position: string;
  code: string | null;
};

type Success = {
  uid: string;
  allocationId: string;
  emailSent: boolean;
  emailError?: string | null;
  emailWarning?: string | null;
  assetType: string;
  employeeName: string;
};

function assetDetails(asset: AssetOption) {
  return [asset.assetType.name, [asset.brand, asset.model].filter(Boolean).join(" "), asset.serialNumber]
    .filter(Boolean)
    .join(" · ");
}

export function AllocationMapForm({
  assets,
  employees,
  availableCount,
  allocatedCount,
}: {
  assets: AssetOption[];
  employees: EmployeeOption[];
  availableCount: number;
  allocatedCount: number;
}) {
  const router = useRouter();
  const { run } = useProcessing();
  const assetPickerRef = useRef<HTMLDivElement>(null);
  const employeePickerRef = useRef<HTMLDivElement>(null);
  const [uid, setUid] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [assetQuery, setAssetQuery] = useState("");
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [assetListOpen, setAssetListOpen] = useState(false);
  const [employeeResultsOpen, setEmployeeResultsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<Success | null>(null);

  const selectedAsset = assets.find((asset) => asset.uid === uid) ?? null;
  const selectedEmployee = employees.find((employee) => employee.id === employeeId) ?? null;

  const availableAssets = useMemo(() => {
    const needle = assetQuery.trim().toLowerCase();
    if (!needle) return assets;
    return assets.filter((asset) =>
      [asset.uid, asset.assetType.name, asset.brand, asset.model, asset.serialNumber]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [assets, assetQuery]);

  const employeeMatches = useMemo(() => {
    const needle = employeeQuery.trim().toLowerCase();
    if (!needle) return [];
    return employees
      .filter(
        (employee) =>
          employee.name.toLowerCase().includes(needle) || employee.email.toLowerCase().includes(needle),
      )
      .slice(0, 12);
  }, [employees, employeeQuery]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (assetPickerRef.current && !assetPickerRef.current.contains(target)) {
        setAssetListOpen(false);
      }
      if (employeePickerRef.current && !employeePickerRef.current.contains(target)) {
        setEmployeeResultsOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setAssetListOpen(false);
      setEmployeeResultsOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function resetForm() {
    setSuccess(null);
    setUid("");
    setEmployeeId("");
    setAssetQuery("");
    setEmployeeQuery("");
    setAssetListOpen(false);
    setEmployeeResultsOpen(false);
    setError("");
  }

  function selectAsset(asset: AssetOption) {
    setUid(asset.uid);
    setAssetListOpen(false);
    setAssetQuery("");
    setError("");
  }

  function selectEmployee(employee: EmployeeOption) {
    setEmployeeId(employee.id);
    setEmployeeQuery(employee.name);
    setEmployeeResultsOpen(false);
    setError("");
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!uid || !employeeId) {
      setError("Select an available asset and an employee.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await run("Mapping asset to employee", async () => {
        const response = await fetch("/api/allocate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid, employeeId }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Allocation failed.");
        setSuccess(data);
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Allocation failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="cf-card p-4 sm:p-8">
        <p className="cf-label">Mapped</p>
        <h2 className="mt-2 text-2xl font-medium tracking-tight">Asset attached to employee</h2>
        <p className="mt-2 text-sm text-cf-muted">
          {success.assetType} ({success.uid}) is now with {success.employeeName}. To give this device to someone else,
          remove it first so it returns to available, then attach it again.
        </p>
        <p className="mt-4 text-sm text-cf-muted">
          {success.emailSent
            ? "An acknowledgement was sent to the employee email."
            : success.emailWarning || success.emailError || ACKNOWLEDGEMENT_EMAIL_FAILURE_AFTER_ALLOCATE}
        </p>
        {!success.emailSent ? (
          <div className="mt-4">
            <RetryAcknowledgementButton allocationId={success.allocationId} />
          </div>
        ) : null}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link href="/allocations" className="cf-action bg-cf-primary text-white">
            Open mappings
          </Link>
          <button type="button" onClick={resetForm} className="cf-action border border-cf-border">
            Map another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="cf-card p-4 sm:p-6">
        <h2 className="text-lg font-medium">Asset</h2>
        <p className="mt-1 text-sm text-cf-muted">Choose which available device to attach.</p>
        <div ref={assetPickerRef} className="relative mt-5">
          <span className="cf-label">Which asset</span>
          <div className="mt-2 flex">
            <button
              type="button"
              onClick={() => setAssetListOpen((open) => !open)}
              aria-expanded={assetListOpen}
              aria-controls="available-asset-list"
              className="flex min-h-12 min-w-0 flex-1 items-center overflow-hidden rounded-l-md border border-r-0 border-cf-border bg-white px-3 text-left sm:min-h-11"
            >
              {selectedAsset ? (
                <span className="min-w-0">
                  <span className="block truncate font-mono text-sm font-medium">{selectedAsset.uid}</span>
                  <span className="mt-0.5 block truncate text-xs text-cf-muted">{assetDetails(selectedAsset)}</span>
                </span>
              ) : (
                <span className="text-sm text-cf-muted">Select an available asset</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setAssetListOpen((open) => !open)}
              aria-label={assetListOpen ? "Hide available assets" : "Show available assets"}
              className="flex w-12 shrink-0 items-center justify-center rounded-r-md border border-cf-border bg-white"
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${assetListOpen ? "rotate-180" : ""}`} />
            </button>
          </div>
          <p className="mt-2 text-xs text-cf-muted">
            {availableCount} available · {allocatedCount} allocated
          </p>
          {assetListOpen ? (
            <div
              id="available-asset-list"
              className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-cf-border bg-white shadow-lg"
            >
              {assets.length > 0 ? (
                <div className="border-b border-cf-border p-2">
                  <input
                    value={assetQuery}
                    onChange={(event) => setAssetQuery(event.target.value)}
                    placeholder="Filter available assets"
                    className="h-11 w-full rounded-md border border-cf-border px-3"
                  />
                </div>
              ) : null}
              <ul className="max-h-72 overflow-y-auto py-1">
                {availableAssets.length === 0 ? (
                  <li className="px-4 py-6 text-sm text-cf-muted">
                    {assets.length === 0
                      ? "No available devices. Remove a mapping first, or add an asset to inventory."
                      : "No available assets match that filter."}
                  </li>
                ) : (
                  availableAssets.map((asset) => {
                    const selected = asset.uid === uid;
                    return (
                      <li key={asset.id}>
                        <button
                          type="button"
                          onClick={() => selectAsset(asset)}
                          className={`flex min-h-12 w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-cf-soft ${
                            selected ? "bg-cf-soft" : ""
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="block font-mono text-sm font-medium">{asset.uid}</span>
                            <span className="mt-0.5 block text-xs text-cf-muted">{assetDetails(asset) || "No details"}</span>
                          </span>
                          {selected ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-cf-primary" /> : null}
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      <section className="cf-card p-4 sm:p-6">
        <h2 className="text-lg font-medium">Employee</h2>
        <p className="mt-1 text-sm text-cf-muted">Search by name or email ID, then select the person from the results.</p>
        <div ref={employeePickerRef} className="relative mt-5">
          <label className="block">
            <span className="cf-label">Which employee</span>
            <input
              value={employeeQuery}
              onChange={(event) => {
                const value = event.target.value;
                setEmployeeQuery(value);
                setEmployeeResultsOpen(value.trim().length > 0);
                if (selectedEmployee && value.trim().toLowerCase() !== selectedEmployee.name.toLowerCase()) {
                  setEmployeeId("");
                }
              }}
              onFocus={() => {
                if (employeeQuery.trim()) setEmployeeResultsOpen(true);
              }}
              placeholder="Search by name or email ID"
              autoComplete="off"
              className="mt-2 h-12 w-full rounded-md border border-cf-border px-3 sm:h-11"
            />
          </label>
          {employeeResultsOpen && employeeQuery.trim() ? (
            <ul className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-cf-border bg-white py-1 shadow-lg">
              {employeeMatches.length === 0 ? (
                <li className="px-4 py-6 text-sm text-cf-muted">
                  {employees.length === 0
                    ? "No employees on the roster yet."
                    : "No employees match that name or email ID."}
                </li>
              ) : (
                employeeMatches.map((employee) => {
                  const selected = employee.id === employeeId;
                  return (
                    <li key={employee.id}>
                      <button
                        type="button"
                        onClick={() => selectEmployee(employee)}
                        className={`flex min-h-12 w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-cf-soft ${
                          selected ? "bg-cf-soft" : ""
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">{employee.name}</span>
                          <span className="mt-0.5 block break-all text-xs text-cf-muted">{employee.email}</span>
                          <span className="mt-0.5 block text-xs text-cf-muted">
                            {employee.department} · {employee.position}
                          </span>
                        </span>
                        {selected ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-cf-primary" /> : null}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          ) : null}
        </div>
        {selectedEmployee ? (
          <div className="mt-4 rounded-xl bg-cf-soft px-4 py-3">
            <p className="text-sm font-medium">{selectedEmployee.name}</p>
            <p className="mt-1 break-all text-sm text-cf-muted">{selectedEmployee.email}</p>
            <p className="mt-1 text-xs text-cf-muted">
              {selectedEmployee.department} · {selectedEmployee.position}
              {selectedEmployee.code ? ` · ${selectedEmployee.code}` : ""}
            </p>
          </div>
        ) : null}
      </section>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="cf-action bg-cf-primary text-white hover:bg-cf-primary-dark disabled:opacity-60"
      >
        {submitting ? "Mapping..." : "Attach to employee"}
      </button>
    </form>
  );
}
