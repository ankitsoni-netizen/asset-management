import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmployeeRoster, type EmployeeRosterAsset } from "@/components/employees/EmployeeRoster";
import { getFilterOptions, listCurrentAssignments, listEmployees } from "@/lib/queries";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; department?: string; status?: string }>;
}) {
  const filters = await searchParams;
  const disabled =
    filters.status === "disabled" ? true : filters.status === "active" ? false : undefined;
  const [employees, options, assignments] = await Promise.all([
    listEmployees({ q: filters.q, department: filters.department, disabled }),
    getFilterOptions(),
    listCurrentAssignments(),
  ]);

  const assetsByEmployeeId: Record<string, EmployeeRosterAsset[]> = {};
  for (const row of assignments) {
    const current = assetsByEmployeeId[row.employeeId] ?? [];
    current.push({
      allocationId: row.allocationId,
      uid: row.uid,
      assetType: row.assetType,
      brand: row.brand,
      model: row.model,
      serialNumber: row.serialNumber,
      allocatedAt: row.allocatedAt.toISOString(),
    });
    assetsByEmployeeId[row.employeeId] = current;
  }

  return (
    <>
      <PageHeader
        eyebrow="Roster"
        title="Employees"
        description="People who can receive company hardware. Open a row to see every detail and every asset currently held. Disable someone to keep them on the roster without allowing new allocations."
        actions={
          <>
            <Link href="/employees/bulk" className="cf-action border border-cf-border">
              <Upload className="h-4 w-4" />
              Bulk upload
            </Link>
            <Link href="/employees/new" className="cf-action bg-cf-primary text-white hover:bg-cf-primary-dark">
              <Plus className="h-4 w-4" />
              Create employee
            </Link>
          </>
        }
      />

      <form className="cf-card mb-4 grid gap-3 p-4 md:grid-cols-4" method="get">
        <input
          name="q"
          defaultValue={filters.q}
          placeholder="Search name, email, employee ID"
          className="h-12 rounded-md border border-cf-border px-3 md:col-span-2 md:h-10"
        />
        <select
          name="department"
          defaultValue={filters.department ?? ""}
          className="h-12 rounded-md border border-cf-border px-3 md:h-10"
        >
          <option value="">All departments</option>
          {options.departments.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={filters.status ?? ""}
          className="h-12 rounded-md border border-cf-border px-3 md:h-10"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </select>
        <div className="flex flex-col gap-2 sm:flex-row md:col-span-4">
          <button type="submit" className="cf-action bg-cf-ink text-white">
            Apply
          </button>
          <Link href="/employees" className="cf-action border border-cf-border">
            Reset
          </Link>
        </div>
      </form>

      {employees.length === 0 ? (
        <div className="cf-card px-4 py-12 text-center text-sm text-cf-muted">
          No employees on the roster yet.{" "}
          <Link href="/employees/new" className="text-cf-primary">
            Create the first employee
          </Link>{" "}
          or{" "}
          <Link href="/employees/bulk" className="text-cf-primary">
            bulk upload a CSV
          </Link>
          .
        </div>
      ) : (
        <EmployeeRoster
          employees={employees.map((employee) => ({
            id: employee.id,
            name: employee.name,
            email: employee.email,
            department: employee.department,
            position: employee.position,
            code: employee.code,
            disabled: employee.disabled,
            createdAt: employee.createdAt.toISOString(),
            updatedAt: employee.updatedAt.toISOString(),
          }))}
          assetsByEmployeeId={assetsByEmployeeId}
        />
      )}
    </>
  );
}
