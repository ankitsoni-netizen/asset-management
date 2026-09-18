import { PageHeader } from "@/components/layout/PageHeader";
import { SummaryDashboard } from "@/components/summary/SummaryDashboard";
import { getDashboardSummary } from "@/lib/queries";

export default async function SummaryPage() {
  const summary = await getDashboardSummary();

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Summary"
        description="A live snapshot of inventory, who currently holds each device, and how the onboarded roster is split by department."
      />
      <SummaryDashboard summary={summary} />
    </>
  );
}
