import { EmployeeBulkUpload } from "@/components/employees/EmployeeBulkUpload";
import { PageHeader } from "@/components/layout/PageHeader";

export default function BulkEmployeesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Roster"
        title="Bulk upload employees"
        description="Download the sample CSV, fill one employee per row, then upload it. Asset details are not part of this sheet."
      />
      <EmployeeBulkUpload />
    </>
  );
}
