import { EmployeeBulkUpload } from "@/components/employees/EmployeeBulkUpload";
import { PageHeader } from "@/components/layout/PageHeader";

export default function BulkEmployeesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Roster"
        title="Bulk upload employees"
        description="Required columns are first name, position, email ID, and department. Employee ID is optional."
      />
      <EmployeeBulkUpload />
    </>
  );
}
