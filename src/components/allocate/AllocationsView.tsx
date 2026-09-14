"use client";

import { useRouter } from "next/navigation";
import { useProcessing } from "@/components/status/Processing";
import { formatDateTime } from "@/lib/utils";
import { RetryAcknowledgementButton } from "@/components/asset/RetryAcknowledgementButton";

type MappingRow = {
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
  asset: {
    uid: string;
    status: string;
    serialNumber: string | null;
    assetType: { name: string };
  };
};

export function AllocationsView({
  rows,
  types,
  departments,
  filters,
}: {
  rows: MappingRow[];
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
  const { run, startNavigation } = useProcessing();

  async function removeMapping(uid: string, employeeName: string) {
    if (
      !confirm(
        `Remove this asset from ${employeeName}? It will become available in inventory and can then be attached to another employee.`,
      )
    ) {
      return;
    }
    await run("Removing from employee", async () => {
      const response = await fetch("/api/return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Unable to remove this asset.");
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <form
        className="cf-card grid gap-3 p-4 md:grid-cols-6"
        method="get"
        onSubmit={() => startNavigation("Loading mappings")}
      >
        <input
          name="q"
          defaultValue={filters.q}
          placeholder="Search employee, UID, asset"
          className="h-12 rounded-md border border-cf-border px-3 md:col-span-2 md:h-10"
        />
        <select name="status" defaultValue={filters.status ?? "allocated"} className="h-12 rounded-md border border-cf-border px-3 md:h-10">
          <option value="allocated">Currently mapped</option>
          <option value="historical">Removed / previous</option>
          <option value="">All mappings</option>
        </select>
        <select
          name="assetTypeId"
          defaultValue={filters.assetTypeId ?? ""}
          className="h-12 rounded-md border border-cf-border px-3 md:h-10"
        >
          <option value="">All asset types</option>
          {types.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
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
          <a href="/allocations" className="cf-action border border-cf-border">
            Reset
          </a>
        </div>
      </form>

      {rows.length === 0 ? (
        <div className="cf-card px-4 py-10 text-center text-sm text-cf-muted">
          No asset–employee mappings match these filters.
        </div>
      ) : (
        <>
          <ul className="space-y-3 lg:hidden">
            {rows.map((row) => (
              <li key={row.id} className="cf-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-semibold break-all">{row.asset.uid}</p>
                    <p className="text-xs text-cf-muted">{row.asset.assetType.name}</p>
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
                <div className="mt-3 space-y-2">
                  {row.isCurrent && !row.emailSent ? (
                    <RetryAcknowledgementButton allocationId={row.id} />
                  ) : (
                    <p className="text-xs text-cf-muted">{row.emailSent ? "Acknowledgement sent" : "No email"}</p>
                  )}
                  {row.isCurrent ? (
                    <button
                      type="button"
                      onClick={() => void removeMapping(row.asset.uid, row.employeeName)}
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
            ))}
          </ul>

          <div className="cf-card hidden overflow-hidden lg:block">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-cf-soft text-xs uppercase tracking-[0.08em] text-cf-muted">
                  <tr>
                    <th className="px-4 py-3">Asset</th>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Mapped on</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3"> </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-cf-border">
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs font-semibold">{row.asset.uid}</div>
                        <div className="text-xs text-cf-muted">{row.asset.assetType.name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div>{row.employeeName}</div>
                        <div className="text-xs text-cf-muted">{row.employeeEmail}</div>
                      </td>
                      <td className="px-4 py-3">
                        {row.department}
                        <div className="text-xs text-cf-muted">{row.position}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(row.allocatedAt)}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-cf-soft px-2 py-1 text-xs capitalize">
                          {row.isCurrent ? "Allocated" : "Available"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {row.isCurrent && !row.emailSent ? (
                          <RetryAcknowledgementButton allocationId={row.id} />
                        ) : row.emailSent ? (
                          "Sent"
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {row.isCurrent ? (
                          <button
                            type="button"
                            onClick={() => void removeMapping(row.asset.uid, row.employeeName)}
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
