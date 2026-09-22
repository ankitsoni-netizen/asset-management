"use client";

import { useRouter } from "next/navigation";
import { useProcessing } from "@/components/status/Processing";
import {
  formatVehicleNumbers,
  PARKING_TYPES,
  parkingSpotLabel,
  type ParkingType,
} from "@/lib/parking";
import { formatDateTime } from "@/lib/utils";

type ParkingRow = {
  id: string;
  employeeName: string;
  department: string;
  position: string;
  employeeEmail: string;
  vehicleNumbers: string[];
  allocatedAt: string;
  endedAt: string | null;
  isCurrent: boolean;
  parkingSpot: {
    id: string;
    parkingType: ParkingType;
    slotNumber: string | null;
    status: string;
  };
};

export function ParkingAllocationsView({
  rows,
  departments,
  filters,
}: {
  rows: ParkingRow[];
  departments: string[];
  filters: {
    q?: string;
    status?: string;
    parkingType?: string;
    department?: string;
    from?: string;
    to?: string;
  };
}) {
  const router = useRouter();
  const { run, startNavigation } = useProcessing();

  async function removeMapping(parkingSpotId: string, employeeName: string, label: string) {
    if (
      !confirm(
        `Remove ${label} from ${employeeName}? It will become available and can then be attached to another employee.`,
      )
    ) {
      return;
    }
    await run("Removing parking", async () => {
      const response = await fetch("/api/parking/return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parkingSpotId }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Unable to remove this parking allocation.");
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <form
        className="cf-card grid gap-3 p-4 md:grid-cols-6"
        method="get"
        onSubmit={() => startNavigation("Loading parking")}
      >
        <input
          name="q"
          defaultValue={filters.q}
          placeholder="Search employee, slot, vehicle"
          className="h-12 rounded-md border border-cf-border px-3 md:col-span-2 md:h-10"
        />
        <select name="status" defaultValue={filters.status ?? "allocated"} className="h-12 rounded-md border border-cf-border px-3 md:h-10">
          <option value="allocated">Currently mapped</option>
          <option value="historical">Removed / previous</option>
          <option value="">All parking</option>
        </select>
        <select
          name="parkingType"
          defaultValue={filters.parkingType ?? ""}
          className="h-12 rounded-md border border-cf-border px-3 md:h-10"
        >
          <option value="">All parking types</option>
          {PARKING_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        <select
          name="department"
          defaultValue={filters.department ?? ""}
          className="h-12 rounded-md border border-cf-border px-3 md:h-10"
        >
          <option value="">All departments</option>
          {departments.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2 md:col-span-6 lg:col-span-2">
          <input type="date" name="from" defaultValue={filters.from} className="h-12 rounded-md border border-cf-border px-3 md:h-10" />
          <input type="date" name="to" defaultValue={filters.to} className="h-12 rounded-md border border-cf-border px-3 md:h-10" />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row md:col-span-6">
          <button type="submit" className="cf-action bg-cf-ink text-white">
            Apply filters
          </button>
          <a href="/parking" className="cf-action border border-cf-border">
            Reset
          </a>
        </div>
      </form>

      {rows.length === 0 ? (
        <div className="cf-card px-4 py-10 text-center text-sm text-cf-muted">
          No parking allocations match these filters.
        </div>
      ) : (
        <>
          <ul className="space-y-3 lg:hidden">
            {rows.map((row) => {
              const label = parkingSpotLabel(row.parkingSpot.parkingType, row.parkingSpot.slotNumber);
              return (
                <li key={row.id} className="cf-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{label}</p>
                      <p className="mt-1 text-xs text-cf-muted">{formatVehicleNumbers(row.vehicleNumbers)}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-cf-soft px-2 py-1 text-xs">
                      {row.isCurrent ? "Allocated" : "Available"}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-medium">{row.employeeName}</p>
                  <p className="break-all text-xs text-cf-muted">{row.employeeEmail}</p>
                  <p className="mt-1 text-xs text-cf-muted">
                    {row.department} · {row.position}
                  </p>
                  <p className="mt-2 text-xs text-cf-muted">{formatDateTime(row.allocatedAt)}</p>
                  <div className="mt-3">
                    {row.isCurrent ? (
                      <button
                        type="button"
                        onClick={() => void removeMapping(row.parkingSpot.id, row.employeeName, label)}
                        className="cf-action border border-cf-border"
                      >
                        Remove
                      </button>
                    ) : (
                      <p className="text-xs text-cf-muted">
                        {row.endedAt ? `Removed ${formatDateTime(row.endedAt)}` : "Removed"}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="cf-card hidden overflow-hidden lg:block">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-cf-soft text-xs uppercase tracking-[0.08em] text-cf-muted">
                  <tr>
                    <th className="px-4 py-3">Parking</th>
                    <th className="px-4 py-3">Vehicles</th>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Mapped on</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3"> </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const label = parkingSpotLabel(row.parkingSpot.parkingType, row.parkingSpot.slotNumber);
                    return (
                      <tr key={row.id} className="border-t border-cf-border">
                        <td className="px-4 py-3">
                          <div className="font-medium">{label}</div>
                          <div className="text-xs text-cf-muted">{row.department}</div>
                        </td>
                        <td className="px-4 py-3">{formatVehicleNumbers(row.vehicleNumbers)}</td>
                        <td className="px-4 py-3">
                          <div>{row.employeeName}</div>
                          <div className="text-xs text-cf-muted">{row.employeeEmail}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(row.allocatedAt)}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-cf-soft px-2 py-1 text-xs capitalize">
                            {row.isCurrent ? "Allocated" : "Available"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {row.isCurrent ? (
                            <button
                              type="button"
                              onClick={() => void removeMapping(row.parkingSpot.id, row.employeeName, label)}
                              className="h-9 rounded-md border border-cf-border px-3 text-xs font-medium"
                            >
                              Remove
                            </button>
                          ) : (
                            <span className="text-xs text-cf-muted">
                              {row.endedAt ? `Removed ${formatDateTime(row.endedAt)}` : "Removed"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
