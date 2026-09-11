"use client";

import { useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/utils";

type LogRow = {
  id: string;
  employeeName: string;
  department: string;
  position: string;
  employeeEmail: string;
  action: string;
  allocatedAt: string;
  endedAt: string | null;
  isCurrent: boolean;
  emailSent: boolean;
  images: { id: string; filename: string }[];
  asset: {
    uid: string;
    status: string;
    serialNumber: string | null;
    assetType: { name: string };
  };
};

export function LogsView({
  rows,
  types,
  departments,
  filters,
}: {
  rows: LogRow[];
  types: { id: string; name: string }[];
  departments: string[];
  filters: {
    q?: string;
    status?: string;
    assetTypeId?: string;
    department?: string;
    from?: string;
    to?: string;
  };
}) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <form className="cf-card grid gap-3 p-4 md:grid-cols-6" method="get">
        <input
          name="q"
          defaultValue={filters.q}
          placeholder="Search name, email, UID, asset"
          className="h-10 rounded-md border border-cf-border px-3 text-sm md:col-span-2"
        />
        <select name="status" defaultValue={filters.status ?? ""} className="h-10 rounded-md border border-cf-border px-3 text-sm">
          <option value="">All statuses</option>
          <option value="allocated">Currently allocated</option>
          <option value="available">In inventory</option>
          <option value="historical">Previous allocations</option>
        </select>
        <select
          name="assetTypeId"
          defaultValue={filters.assetTypeId ?? ""}
          className="h-10 rounded-md border border-cf-border px-3 text-sm"
        >
          <option value="">All assets</option>
          {types.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
        <select
          name="department"
          defaultValue={filters.department ?? ""}
          className="h-10 rounded-md border border-cf-border px-3 text-sm"
        >
          <option value="">All departments</option>
          {departments.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2 md:col-span-6 lg:col-span-2">
          <input type="date" name="from" defaultValue={filters.from} className="h-10 rounded-md border border-cf-border px-3 text-sm" />
          <input type="date" name="to" defaultValue={filters.to} className="h-10 rounded-md border border-cf-border px-3 text-sm" />
        </div>
        <div className="flex gap-2 md:col-span-6">
          <button type="submit" className="h-10 rounded-md bg-cf-ink px-4 text-sm font-medium text-white">
            Apply filters
          </button>
          <a href="/logs" className="inline-flex h-10 items-center rounded-md border border-cf-border px-4 text-sm">
            Reset
          </a>
        </div>
      </form>

      <div className="cf-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-cf-soft text-xs uppercase tracking-[0.08em] text-cf-muted">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">UID</th>
                <th className="px-4 py-3">Asset</th>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Images</th>
                <th className="px-4 py-3">Email</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-cf-muted">
                    No allocation records match these filters.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer border-t border-cf-border hover:bg-cf-soft/70"
                    onClick={() => router.push(`/a/${row.asset.uid}`)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(row.allocatedAt)}</td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold">{row.asset.uid}</td>
                    <td className="px-4 py-3">
                      {row.asset.assetType.name}
                      {row.asset.serialNumber ? (
                        <div className="text-xs text-cf-muted">{row.asset.serialNumber}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <div>{row.employeeName}</div>
                      <div className="text-xs text-cf-muted">{row.employeeEmail}</div>
                    </td>
                    <td className="px-4 py-3">
                      {row.department}
                      <div className="text-xs text-cf-muted">{row.position}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-cf-soft px-2 py-1 text-xs capitalize">
                        {row.isCurrent && row.asset.status === "allocated" ? "Allocated" : row.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {row.images.slice(0, 3).map((image) => (
                          <img
                            key={image.id}
                            src={`/api/media/${row.id}/${image.filename}`}
                            alt=""
                            className="h-10 w-10 rounded object-cover"
                          />
                        ))}
                        {row.images.length === 0 ? <span className="text-xs text-cf-muted">—</span> : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">{row.emailSent ? "Sent" : "Not sent"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
