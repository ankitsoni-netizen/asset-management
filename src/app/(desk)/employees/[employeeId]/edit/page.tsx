import { notFound } from "next/navigation";
import { EmployeeEditForm } from "@/components/employees/EmployeeEditForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { getEmployeeById } from "@/lib/queries";

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { employeeId } = await params;
  const employee = await getEmployeeById(employeeId);
  if (!employee) notFound();

  return (
    <>
      <PageHeader
        eyebrow="Roster"
        title="Edit employee"
        description="Update name, email, department, position, and employee ID. This does not change current asset assignments."
      />
      <EmployeeEditForm
        employee={{
          id: employee.id,
          name: employee.name,
          email: employee.email,
          department: employee.department,
          position: employee.position,
          code: employee.code ?? "",
          disabled: employee.disabled,
        }}
      />
    </>
  );
}
