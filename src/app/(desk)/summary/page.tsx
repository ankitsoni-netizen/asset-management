import { PageHeader } from "@/components/layout/PageHeader";
import { SummaryDashboard } from "@/components/summary/SummaryDashboard";
import { summarizeParkingAllocations } from "@/lib/parking";
import { getDashboardSummary, listCurrentParkingAssignments } from "@/lib/queries";

export default async function SummaryPage() {
  const [summary, parkingRows] = await Promise.all([getDashboardSummary(), listCurrentParkingAssignments()]);

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Summary"
        description="A live snapshot of inventory, who currently holds each device, parking, and how the onboarded roster is split by department."
      />
      <SummaryDashboard
        summary={summary}
        parking={summarizeParkingAllocations(parkingRows.map((row) => ({ parkingType: row.parkingSpot.parkingType })))}
        parkingAssignments={parkingRows.map((row) => ({
          allocationId: row.id,
          parkingType: row.parkingSpot.parkingType,
          slotNumber: row.parkingSpot.slotNumber,
          vehicleNumbers: row.vehicleNumbers,
          employeeId: row.employeeId,
          employeeName: row.employeeName,
          employeeEmail: row.employeeEmail,
          department: row.department,
          position: row.position,
          allocatedAt: row.allocatedAt,
        }))}
      />
    </>
  );
}
