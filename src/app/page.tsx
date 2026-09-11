import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { auth } from "@/auth";
import { getDashboardStats } from "@/lib/queries";
import { formatDateTime } from "@/lib/utils";
import { ADMIN_EMAIL } from "@/lib/constants";

export default async function DashboardPage() {
  const session = await auth();
  const stats = await getDashboardStats();

  return (
    <AppShell email={session?.user?.email ?? ADMIN_EMAIL} pathname="/">
      <div className="mb-8">
        <p className="cf-label">Overview</p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight">Asset desk</h1>
        <p className="mt-2 max-w-2xl text-sm text-cf-muted">
          Record company hardware, allocate it to employees, and retrieve any record from a printed UID or scanned QR
          code.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total assets" value={stats.totalAssets} />
        <Stat label="Currently allocated" value={stats.allocated} />
        <Stat label="In inventory" value={stats.available} />
        <Stat label="Allocation events" value={stats.totalAllocations} />
      </div>

      <section className="cf-card mt-8 overflow-hidden">
        <div className="flex items-center justify-between border-b border-cf-border px-6 py-4">
          <h2 className="text-lg font-medium">Recent allocations</h2>
          <Link href="/logs" className="text-sm font-medium text-cf-primary">
            Open full log
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-cf-soft text-xs uppercase tracking-[0.08em] text-cf-muted">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">UID</th>
                <th className="px-6 py-3">Asset</th>
                <th className="px-6 py-3">Employee</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {stats.recent.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-cf-muted">
                    No assets have been allocated yet.{" "}
                    <Link href="/allocate" className="text-cf-primary">
                      Allocate the first asset
                    </Link>
                    .
                  </td>
                </tr>
              ) : (
                stats.recent.map((row) => (
                  <tr key={row.id} className="border-t border-cf-border">
                    <td className="px-6 py-3">{formatDateTime(row.allocatedAt)}</td>
                    <td className="px-6 py-3">
                      <Link href={`/a/${row.asset.uid}`} className="font-mono text-xs font-semibold text-cf-primary">
                        {row.asset.uid}
                      </Link>
                    </td>
                    <td className="px-6 py-3">{row.asset.assetType.name}</td>
                    <td className="px-6 py-3">
                      {row.employeeName}
                      <div className="text-xs text-cf-muted">{row.department}</div>
                    </td>
                    <td className="px-6 py-3 capitalize">{row.isCurrent ? row.asset.status : row.action}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="cf-card p-5">
      <p className="cf-label">{label}</p>
      <p className="mt-3 text-3xl font-medium tracking-tight">{value}</p>
    </div>
  );
}
