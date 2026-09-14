import Link from "next/link";
import { Plus } from "lucide-react";
import { AllocationsView } from "@/components/allocate/AllocationsView";
import { PageHeader } from "@/components/layout/PageHeader";
import { getAllocationLogs, getFilterOptions } from "@/lib/queries";

export default async function AllocationsPage({
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
  const filters = await searchParams;
  const resolved = { ...filters, status: filters.status ?? "allocated" };
  const [rows, options] = await Promise.all([getAllocationLogs(resolved), getFilterOptions()]);

  return (
    <>
      <PageHeader
        eyebrow="Mapping"
        title="Allocation"
        description="Connect an available inventory asset to an employee. To move a device, remove it first so it becomes available, then attach it to someone else."
        actions={
          <Link href="/allocations/new" className="cf-action bg-cf-primary text-white hover:bg-cf-primary-dark">
            <Plus className="h-4 w-4" />
            New allocation
          </Link>
        }
      />
      <AllocationsView
        rows={rows.map((row) => ({
          ...row,
          allocatedAt: row.allocatedAt.toISOString(),
          endedAt: row.endedAt ? row.endedAt.toISOString() : null,
          emailSentAt: row.emailSentAt ? row.emailSentAt.toISOString() : null,
          emailLastAttemptedAt: row.emailLastAttemptedAt ? row.emailLastAttemptedAt.toISOString() : null,
        }))}
        types={options.types}
        departments={options.departments}
        filters={resolved}
      />
    </>
  );
}
