import { EmployeeCreateForm } from "@/components/employees/EmployeeCreateForm";
import { PageHeader } from "@/components/layout/PageHeader";

export default function NewEmployeePage() {
  return (
    <>
      <PageHeader
        eyebrow="Roster"
        title="Create employee"
        description="Add someone to the roster with name, email, department, position, and optional employee ID. Do not attach assets here."
      />
      <EmployeeCreateForm />
    </>
  );
}
