"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Plus, Trash2 } from "lucide-react";
import { useProcessing } from "@/components/status/Processing";
import {
  formatVehicleNumbers,
  isValetParking,
  PARKING_TYPE,
  PARKING_TYPES,
  parseParkingSlot,
  parseVehicleNumbers,
  type ParkingType,
} from "@/lib/parking";

type EmployeeOption = {
  id: string;
  name: string;
  email: string;
  department: string;
  position: string;
  code: string | null;
};

type Success = {
  parkingSpotId: string;
  allocationId: string;
  parkingLabel: string;
  employeeName: string;
  vehicleNumbers: string[];
};

export function ParkingAllocateForm({ employees }: { employees: EmployeeOption[] }) {
  const router = useRouter();
  const { run } = useProcessing();
  const employeePickerRef = useRef<HTMLDivElement>(null);
  const [parkingType, setParkingType] = useState<ParkingType>(PARKING_TYPE.valet);
  const [slotNumber, setSlotNumber] = useState("");
  const [vehicles, setVehicles] = useState<string[]>([""]);
  const [employeeId, setEmployeeId] = useState("");
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [employeeResultsOpen, setEmployeeResultsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<Success | null>(null);

  const selectedEmployee = employees.find((employee) => employee.id === employeeId) ?? null;
  const valet = isValetParking(parkingType);

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
      if (employeePickerRef.current && !employeePickerRef.current.contains(target)) {
        setEmployeeResultsOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setEmployeeResultsOpen(false);
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
    setParkingType(PARKING_TYPE.valet);
    setSlotNumber("");
    setVehicles([""]);
    setEmployeeId("");
    setEmployeeQuery("");
    setEmployeeResultsOpen(false);
    setError("");
  }

  function selectEmployee(employee: EmployeeOption) {
    setEmployeeId(employee.id);
    setEmployeeQuery(employee.name);
    setEmployeeResultsOpen(false);
    setError("");
  }

  function updateVehicle(index: number, value: string) {
    setVehicles((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
  }

  function addVehicle() {
    setVehicles((current) => [...current, ""]);
  }

  function removeVehicle(index: number) {
    setVehicles((current) => (current.length === 1 ? current : current.filter((_, itemIndex) => itemIndex !== index)));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const vehicleNumbers = parseVehicleNumbers(vehicles);
    const parsedSlot = parseParkingSlot(parkingType, slotNumber);

    const selectedId =
      employeeId || (employeeMatches.length === 1 ? employeeMatches[0].id : "");

    if (!valet && !parsedSlot) {
      setError("Slot number is required for basement parking.");
      return;
    }
    if (vehicleNumbers.length === 0) {
      setError("Add at least one vehicle number.");
      return;
    }
    if (!selectedId) {
      setError("Select an employee from the roster.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await run("Allocating parking", async () => {
        const response = await fetch("/api/parking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parkingType,
            ...(parsedSlot ? { slotNumber: parsedSlot } : {}),
            vehicleNumbers,
            employeeId: selectedId,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Parking allocation failed.");
        setSuccess(data);
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Parking allocation failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="cf-card p-4 sm:p-8">
        <p className="cf-label">Mapped</p>
        <h2 className="mt-2 text-2xl font-medium tracking-tight">Parking attached to employee</h2>
        <p className="mt-2 text-sm text-cf-muted">
          {success.parkingLabel} is now with {success.employeeName} for {formatVehicleNumbers(success.vehicleNumbers)}.
          Remove the mapping first if you need to attach it to someone else.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link href="/parking" className="cf-action bg-cf-primary text-white">
            Open parking
          </Link>
          <button type="button" onClick={resetForm} className="cf-action border border-cf-border">
            Allocate another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="cf-card p-4 sm:p-6">
        <h2 className="text-lg font-medium">Parking</h2>
        <p className="mt-1 text-sm text-cf-muted">
          Choose the parking type and the vehicle numbers.
          {valet ? " Valet does not use a slot number." : " Basement parking also needs a slot number."}
        </p>
        <div className={`mt-5 grid gap-4 ${valet ? "" : "sm:grid-cols-2"}`}>
          <label className="block">
            <span className="cf-label">Parking type</span>
            <select
              value={parkingType}
              onChange={(event) => {
                const next = event.target.value as ParkingType;
                setParkingType(next);
                if (isValetParking(next)) setSlotNumber("");
              }}
              className="mt-2 h-12 w-full rounded-md border border-cf-border bg-white px-3 sm:h-11"
            >
              {PARKING_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
          {valet ? null : (
            <label className="block">
              <span className="cf-label">Slot number</span>
              <input
                value={slotNumber}
                onChange={(event) => setSlotNumber(event.target.value)}
                placeholder="e.g. 12 or A-18"
                className="mt-2 h-12 w-full rounded-md border border-cf-border px-3 sm:h-11"
              />
            </label>
          )}
        </div>
        <div className="mt-4">
          <span className="cf-label">Vehicle number</span>
          <div className="mt-2 space-y-2">
            {vehicles.map((vehicle, index) => (
              <div key={index} className="flex gap-2">
                <input
                  value={vehicle}
                  onChange={(event) => updateVehicle(index, event.target.value)}
                  placeholder="e.g. HR26AB1234"
                  autoComplete="off"
                  className="h-12 min-w-0 flex-1 rounded-md border border-cf-border px-3 sm:h-11"
                />
                {vehicles.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeVehicle(index)}
                    aria-label={`Remove vehicle ${index + 1}`}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-md border border-cf-border text-cf-muted hover:text-cf-text sm:h-11 sm:w-11"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          <button type="button" onClick={addVehicle} className="mt-2 inline-flex items-center gap-1 text-sm text-cf-primary">
            <Plus className="h-4 w-4" />
            Add another vehicle
          </button>
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
        {submitting ? "Allocating..." : "Allocate parking"}
      </button>
    </form>
  );
}
