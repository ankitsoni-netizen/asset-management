import Link from "next/link";
import { Plus } from "lucide-react";
import { ParkingAllocationsView } from "@/components/parking/ParkingAllocationsView";
import { PageHeader } from "@/components/layout/PageHeader";
import { getFilterOptions, getParkingLogs } from "@/lib/queries";

export default async function ParkingPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    parkingType?: string;
    department?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const filters = await searchParams;
  const resolved = { ...filters, status: filters.status ?? "allocated" };
  const [rows, options] = await Promise.all([getParkingLogs(resolved), getFilterOptions()]);

  return (
    <>
      <PageHeader
        eyebrow="Mapping"
        title="Parking"
        description="Allocate valet or basement parking to an employee. Valet has no slot number. To move a basement slot, remove it first so it becomes available, then attach it to someone else."
        actions={
          <Link href="/parking/new" className="cf-action bg-cf-primary text-white hover:bg-cf-primary-dark">
            <Plus className="h-4 w-4" />
            New parking
          </Link>
        }
      />
      <ParkingAllocationsView
        rows={rows.map((row) => ({
          id: row.id,
          employeeName: row.employeeName,
          department: row.department,
          position: row.position,
          employeeEmail: row.employeeEmail,
          vehicleNumbers: row.vehicleNumbers,
          allocatedAt: row.allocatedAt.toISOString(),
          endedAt: row.endedAt ? row.endedAt.toISOString() : null,
          isCurrent: row.isCurrent,
          parkingSpot: {
            id: row.parkingSpot.id,
            parkingType: row.parkingSpot.parkingType,
            slotNumber: row.parkingSpot.slotNumber,
            status: row.parkingSpot.status,
          },
        }))}
        departments={options.departments}
        filters={resolved}
      />
    </>
  );
}
