import Link from "next/link";
import { AllocatedHolders } from "@/components/summary/AllocatedHolders";
import { CollapsibleSection } from "@/components/summary/CollapsibleSection";
import type { DashboardSummary } from "@/lib/summary";

function StatCard({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: number;
  hint?: string;
  href?: string;
}) {
  const content = (
    <>
      <p className="cf-label">{label}</p>
      <p className="mt-3 text-3xl font-medium tracking-tight tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs leading-5 text-cf-muted">{hint}</p> : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className="cf-card p-4 transition-colors hover:bg-cf-soft/70 sm:p-5">
        {content}
      </Link>
    );
  }

  return <div className="cf-card p-4 sm:p-5">{content}</div>;
}

function CountBar({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.max(0, Math.min(100, Math.round((value / total) * 100))) : 0;
  return (
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cf-soft">
      <div className="h-full rounded-full bg-cf-primary" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function SummaryDashboard({ summary }: { summary: DashboardSummary }) {
  const { assets, employees } = summary;

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-sm font-medium">Inventory</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="In inventory" value={assets.total} hint="Every device currently on the books" href="/assets" />
          <StatCard
            label="Available"
            value={assets.available}
            hint={
              assets.allocatable === assets.available
                ? "Ready to assign"
                : `${assets.allocatable} active and ready to assign`
            }
            href="/assets?status=available"
          />
          <StatCard
            label="Allocated"
            value={assets.allocated}
            hint="Currently attached to an employee"
            href="/assets?status=allocated"
          />
          <StatCard label="Active" value={assets.active} hint="Can be allocated" href="/assets?active=active" />
          <StatCard
            label="Inactive"
            value={assets.inactive}
            hint="Stay in inventory, cannot be assigned"
            href="/assets?active=inactive"
          />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium">Employees onboarded</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="On the roster" value={employees.total} hint="Everyone currently onboarded" href="/employees" />
          <StatCard label="Active" value={employees.active} hint="Can receive hardware" href="/employees?status=active" />
          <StatCard
            label="Disabled"
            value={employees.disabled}
            hint="Kept on the roster, no new allocations"
            href="/employees?status=disabled"
          />
          <StatCard
            label="Holding assets"
            value={employees.withAssets}
            hint={`${employees.withoutAssets} onboarded with no current device`}
            href="/allocations"
          />
        </div>
      </section>

      <CollapsibleSection label="By type" title="Inventory mix">
        {assets.byType.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-cf-muted sm:px-5">
            No devices in inventory yet.{" "}
            <Link href="/assets/new" className="text-cf-primary">
              Add the first asset
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y divide-cf-border">
            {assets.byType.map((type) => (
              <li key={type.id} className="px-4 py-4 sm:px-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{type.name}</p>
                    <p className="mt-1 text-xs text-cf-muted">
                      {type.available} available · {type.allocated} allocated · {type.active} active
                      {type.inactive ? ` · ${type.inactive} inactive` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 tabular-nums text-sm font-medium">{type.total}</span>
                </div>
                <CountBar value={type.allocated} total={type.total} />
              </li>
            ))}
          </ul>
        )}
      </CollapsibleSection>

      <CollapsibleSection label="Department wise" title="Current roster">
        {employees.byDepartment.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-cf-muted sm:px-5">
            No employees onboarded yet.{" "}
            <Link href="/employees/new" className="text-cf-primary">
              Create the first employee
            </Link>
            .
          </p>
        ) : (
          <>
            <ul className="divide-y divide-cf-border lg:hidden">
              {employees.byDepartment.map((row) => (
                <li key={row.department} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/employees?department=${encodeURIComponent(row.department)}`} className="text-sm font-medium">
                        {row.department}
                      </Link>
                      <p className="mt-1 text-xs text-cf-muted">
                        {row.active} active · {row.disabled} disabled · {row.withAssets} holding assets
                      </p>
                    </div>
                    <span className="shrink-0 tabular-nums text-sm font-medium">{row.total}</span>
                  </div>
                  <CountBar value={row.total} total={employees.total} />
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-cf-soft text-xs uppercase tracking-[0.08em] text-cf-muted">
                  <tr>
                    <th className="px-5 py-3">Department</th>
                    <th className="px-4 py-3">Onboarded</th>
                    <th className="px-4 py-3">Active</th>
                    <th className="px-4 py-3">Disabled</th>
                    <th className="px-5 py-3">With assets</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.byDepartment.map((row) => (
                    <tr key={row.department} className="border-t border-cf-border">
                      <td className="px-5 py-3 font-medium">
                        <Link href={`/employees?department=${encodeURIComponent(row.department)}`} className="hover:text-cf-primary">
                          {row.department}
                        </Link>
                      </td>
                      <td className="px-4 py-3 tabular-nums">{row.total}</td>
                      <td className="px-4 py-3 tabular-nums">{row.active}</td>
                      <td className="px-4 py-3 tabular-nums">{row.disabled}</td>
                      <td className="px-5 py-3 tabular-nums">{row.withAssets}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CollapsibleSection>

      <AllocatedHolders
        holders={summary.holders.map((holder) => ({
          employeeId: holder.employeeId,
          employeeName: holder.employeeName,
          employeeEmail: holder.employeeEmail,
          department: holder.department,
          position: holder.position,
          assets: holder.assets.map((asset) => ({
            allocationId: asset.allocationId,
            uid: asset.uid,
            assetType: asset.assetType,
            brand: asset.brand,
            model: asset.model,
            serialNumber: asset.serialNumber,
            allocatedAt: asset.allocatedAt.toISOString(),
          })),
        }))}
      />
    </div>
  );
}
