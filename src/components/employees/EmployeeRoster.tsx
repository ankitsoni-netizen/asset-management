"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { EmployeeEditLink } from "@/components/employees/EmployeeEditLink";
import { EmployeeStatusButton } from "@/components/employees/EmployeeStatusButton";
import { formatDate } from "@/lib/utils";

export type EmployeeRosterRow = {
  id: string;
  name: string;
  email: string;
  department: string;
  position: string;
  code: string | null;
  disabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type EmployeeRosterAsset = {
  allocationId: string;
  uid: string;
  assetType: string;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  allocatedAt: string;
};

function assetLabel(brand: string | null, model: string | null) {
  return [brand, model].filter(Boolean).join(" ") || "No brand / model";
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="cf-label">{label}</p>
      <p className="mt-1 break-all text-sm font-medium">{value}</p>
    </div>
  );
}

function EmployeeAssets({ assets }: { assets: EmployeeRosterAsset[] }) {
  if (assets.length === 0) {
    return (
      <p className="text-sm text-cf-muted">
        No assets currently allocated.{" "}
        <Link href="/allocations/new" className="text-cf-primary">
          Allocate a device
        </Link>
        .
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {assets.map((asset) => (
        <li key={asset.allocationId} className="rounded-lg border border-cf-border bg-white px-3 py-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <Link href={`/a/${asset.uid}`} className="font-mono text-sm font-semibold break-all text-cf-primary">
                {asset.uid}
              </Link>
              <p className="mt-1 text-xs text-cf-muted">
                {asset.assetType} · {assetLabel(asset.brand, asset.model)}
                {asset.serialNumber ? ` · ${asset.serialNumber}` : ""}
              </p>
            </div>
            <p className="shrink-0 text-xs text-cf-muted">Since {formatDate(asset.allocatedAt)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmployeeDetails({
  employee,
  assets,
}: {
  employee: EmployeeRosterRow;
  assets: EmployeeRosterAsset[];
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Detail label="Name" value={employee.name} />
        <Detail label="Official email" value={employee.email} />
        <Detail label="Department" value={employee.department} />
        <Detail label="Position" value={employee.position} />
        <Detail label="Employee ID" value={employee.code || "—"} />
        <Detail label="Status" value={employee.disabled ? "Disabled" : "Active"} />
        <Detail label="Added" value={formatDate(employee.createdAt)} />
        <Detail label="Last updated" value={formatDate(employee.updatedAt)} />
        <Detail
          label="Assets held"
          value={`${assets.length} ${assets.length === 1 ? "device" : "devices"}`}
        />
      </div>
      <div>
        <p className="cf-label">Allocated assets</p>
        <div className="mt-2">
          <EmployeeAssets assets={assets} />
        </div>
      </div>
    </div>
  );
}

export function EmployeeRoster({
  employees,
  assetsByEmployeeId,
}: {
  employees: EmployeeRosterRow[];
  assetsByEmployeeId: Record<string, EmployeeRosterAsset[]>;
}) {
  const [openIds, setOpenIds] = useState<string[]>([]);

  function isOpen(id: string) {
    return openIds.includes(id);
  }

  function toggle(id: string) {
    setOpenIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  return (
    <>
      <ul className="space-y-3 lg:hidden">
        {employees.map((employee) => {
          const assets = assetsByEmployeeId[employee.id] ?? [];
          const open = isOpen(employee.id);
          return (
            <li key={employee.id} className={`cf-card ${employee.disabled ? "opacity-70" : ""}`}>
              <div className="flex items-start gap-2 p-4">
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={`employee-${employee.id}-details-mobile`}
                  onClick={() => toggle(employee.id)}
                  className="flex min-w-0 flex-1 items-start gap-3 text-left"
                >
                  <ChevronDown
                    className={`mt-0.5 h-4 w-4 shrink-0 text-cf-muted transition-transform ${open ? "rotate-180" : ""}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{employee.name}</span>
                        <span className="mt-1 block break-all text-sm text-cf-muted">{employee.email}</span>
                      </span>
                      <span className="shrink-0 rounded-full bg-cf-soft px-2 py-1 text-xs">
                        {employee.disabled ? "Disabled" : "Active"}
                      </span>
                    </span>
                    <span className="mt-2 block text-xs text-cf-muted">
                      {employee.department} · {employee.position}
                      {assets.length > 0
                        ? ` · ${assets.length} ${assets.length === 1 ? "asset" : "assets"}`
                        : ""}
                    </span>
                  </span>
                </button>
                <EmployeeEditLink id={employee.id} name={employee.name} className="-mr-1 mt-0.5" />
              </div>
              {open ? (
                <div id={`employee-${employee.id}-details-mobile`} className="border-t border-cf-border px-4 py-4">
                  <EmployeeDetails employee={employee} assets={assets} />
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="font-mono text-xs text-cf-muted">{employee.code || "No employee ID"}</span>
                    <EmployeeStatusButton id={employee.id} name={employee.name} disabled={employee.disabled} />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 border-t border-cf-border px-4 py-3">
                  <span className="font-mono text-xs text-cf-muted">{employee.code || "No employee ID"}</span>
                  <EmployeeStatusButton id={employee.id} name={employee.name} disabled={employee.disabled} />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="cf-card hidden overflow-hidden lg:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-cf-soft text-xs uppercase tracking-[0.08em] text-cf-muted">
              <tr>
                <th className="w-10 px-3 py-3">
                  <span className="sr-only">Open</span>
                </th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Position</th>
                <th className="px-4 py-3">Employee ID</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Assets</th>
                <th className="px-4 py-3"> </th>
                <th className="w-10 px-3 py-3">
                  <span className="sr-only">Edit</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => {
                const assets = assetsByEmployeeId[employee.id] ?? [];
                const open = isOpen(employee.id);
                return (
                  <EmployeeTableRows
                    key={employee.id}
                    employee={employee}
                    assets={assets}
                    open={open}
                    onToggle={() => toggle(employee.id)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function EmployeeTableRows({
  employee,
  assets,
  open,
  onToggle,
}: {
  employee: EmployeeRosterRow;
  assets: EmployeeRosterAsset[];
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className={`cursor-pointer border-t border-cf-border ${employee.disabled ? "bg-cf-soft/40" : ""} ${
          open ? "bg-cf-soft/50" : "hover:bg-cf-soft/70"
        }`}
        onClick={onToggle}
      >
        <td className="px-3 py-3">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={`employee-${employee.id}-details`}
            onClick={(event) => {
              event.stopPropagation();
              onToggle();
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-cf-muted hover:bg-white hover:text-cf-text"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
            <span className="sr-only">
              {open ? "Hide" : "Show"} details for {employee.name}
            </span>
          </button>
        </td>
        <td className="px-4 py-3 font-medium">{employee.name}</td>
        <td className="px-4 py-3">{employee.email}</td>
        <td className="px-4 py-3">{employee.department}</td>
        <td className="px-4 py-3">{employee.position}</td>
        <td className="px-4 py-3 font-mono text-xs">{employee.code || "—"}</td>
        <td className="px-4 py-3">
          <span className="rounded-full bg-cf-soft px-2 py-1 text-xs">{employee.disabled ? "Disabled" : "Active"}</span>
        </td>
        <td className="px-4 py-3 tabular-nums">{assets.length}</td>
        <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
          <EmployeeStatusButton id={employee.id} name={employee.name} disabled={employee.disabled} />
        </td>
        <td className="px-3 py-3" onClick={(event) => event.stopPropagation()}>
          <EmployeeEditLink id={employee.id} name={employee.name} />
        </td>
      </tr>
      {open ? (
        <tr className="border-t border-cf-border bg-cf-soft/30">
          <td colSpan={10} className="px-5 py-5" id={`employee-${employee.id}-details`}>
            <EmployeeDetails employee={employee} assets={assets} />
          </td>
        </tr>
      ) : null}
    </>
  );
}
