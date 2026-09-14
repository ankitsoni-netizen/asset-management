import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { getFilterOptions, listEmployees } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; department?: string }>;
}) {
  const filters = await searchParams;
  const [employees, options] = await Promise.all([listEmployees(filters), getFilterOptions()]);

  return (
    <>
      <PageHeader
        eyebrow="Roster"
        title="Employees"
        description="People who can receive company hardware. Asset assignment lives under Allocation."
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

      <form className="cf-card mb-4 grid gap-3 p-4 md:grid-cols-3" method="get">
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
        <div className="flex flex-col gap-2 sm:flex-row md:col-span-3">
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
        <>
          <ul className="space-y-3 lg:hidden">
            {employees.map((employee) => (
              <li key={employee.id} className="cf-card p-4">
                <p className="text-sm font-medium">{employee.name}</p>
                <p className="mt-1 break-all text-sm text-cf-muted">{employee.email}</p>
                <p className="mt-2 text-xs text-cf-muted">
                  {employee.department} · {employee.position}
                </p>
                <div className="mt-2 flex items-center justify-between gap-3 text-xs text-cf-muted">
                  <span className="font-mono">{employee.code || "No employee ID"}</span>
                  <span>{formatDate(employee.createdAt)}</span>
                </div>
              </li>
            ))}
          </ul>

          <div className="cf-card hidden overflow-hidden lg:block">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-cf-soft text-xs uppercase tracking-[0.08em] text-cf-muted">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Position</th>
                    <th className="px-4 py-3">Employee ID</th>
                    <th className="px-4 py-3">Added</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr key={employee.id} className="border-t border-cf-border">
                      <td className="px-4 py-3 font-medium">{employee.name}</td>
                      <td className="px-4 py-3">{employee.email}</td>
                      <td className="px-4 py-3">{employee.department}</td>
                      <td className="px-4 py-3">{employee.position}</td>
                      <td className="px-4 py-3 font-mono text-xs">{employee.code || "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatDate(employee.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}
