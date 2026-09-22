import { ParkingAllocateForm } from "@/components/parking/ParkingAllocateForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { listEmployees } from "@/lib/queries";

export default async function NewParkingPage() {
  const employees = await listEmployees({ disabled: false });

  return (
    <>
      <PageHeader
        eyebrow="Mapping"
        title="New parking allocation"
        description="Match valet or basement parking to an employee. Slot number is not used for valet. This does not reallocate a basement slot that is already attached to someone."
      />
      <ParkingAllocateForm
        employees={employees.map((employee) => ({
          id: employee.id,
          name: employee.name,
          email: employee.email,
          department: employee.department,
          position: employee.position,
          code: employee.code,
        }))}
      />
    </>
  );
}
