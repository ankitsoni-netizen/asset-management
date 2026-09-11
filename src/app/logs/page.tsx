import { AppShell } from "@/components/layout/AppShell";
import { LogsView } from "@/components/logs/LogsView";
import { auth } from "@/auth";
import { getAllocationLogs, getFilterOptions } from "@/lib/queries";
import { ADMIN_EMAIL } from "@/lib/constants";

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    assetTypeId?: string;
    department?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const session = await auth();
  const filters = await searchParams;
  const [rows, options] = await Promise.all([getAllocationLogs(filters), getFilterOptions()]);

  return (
    <AppShell email={session?.user?.email ?? ADMIN_EMAIL} pathname="/logs">
      <div className="mb-8">
        <p className="cf-label">History</p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight">Allocation log</h1>
        <p className="mt-2 max-w-2xl text-sm text-cf-muted">
          Every allocate, reallocate, and return event, including who held the asset, when, and the images captured at
          handover.
        </p>
      </div>
      <LogsView
        rows={rows.map((row) => ({
          ...row,
          allocatedAt: row.allocatedAt.toISOString(),
          endedAt: row.endedAt ? row.endedAt.toISOString() : null,
        }))}
        types={options.types}
        departments={options.departments}
        filters={filters}
      />
    </AppShell>
  );
}
