import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmployeeStatusButton } from "@/components/employees/EmployeeStatusButton";
import { getFilterOptions, listEmployees } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; department?: string; status?: string }>;
}) {
  const filters = await searchParams;
  const disabled =
    filters.status === "disabled" ? true : filters.status === "active" ? false : undefined;
  const [employees, options] = await Promise.all([
    listEmployees({ q: filters.q, department: filters.department, disabled }),
    getFilterOptions(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Roster"
        title="Employees"
        description="People who can receive company hardware. Disable someone to keep them on the roster without allowing new allocations."
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
        <>
          <ul className="space-y-3 lg:hidden">
            {employees.map((employee) => (
              <li key={employee.id} className={`cf-card p-4 ${employee.disabled ? "opacity-70" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{employee.name}</p>
                    <p className="mt-1 break-all text-sm text-cf-muted">{employee.email}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-cf-soft px-2 py-1 text-xs">
                    {employee.disabled ? "Disabled" : "Active"}
                  </span>
                </div>
                <p className="mt-2 text-xs text-cf-muted">
                  {employee.department} · {employee.position}
                </p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="font-mono text-xs text-cf-muted">{employee.code || "No employee ID"}</span>
                  <EmployeeStatusButton id={employee.id} name={employee.name} disabled={employee.disabled} />
                </div>
                <p className="mt-2 text-xs text-cf-muted">{formatDate(employee.createdAt)}</p>
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
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Added</th>
                    <th className="px-4 py-3"> </th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr
                      key={employee.id}
                      className={`border-t border-cf-border ${employee.disabled ? "bg-cf-soft/40" : ""}`}
                    >
                      <td className="px-4 py-3 font-medium">{employee.name}</td>
                      <td className="px-4 py-3">{employee.email}</td>
                      <td className="px-4 py-3">{employee.department}</td>
                      <td className="px-4 py-3">{employee.position}</td>
                      <td className="px-4 py-3 font-mono text-xs">{employee.code || "—"}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-cf-soft px-2 py-1 text-xs">
                          {employee.disabled ? "Disabled" : "Active"}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatDate(employee.createdAt)}</td>
                      <td className="px-4 py-3">
                        <EmployeeStatusButton id={employee.id} name={employee.name} disabled={employee.disabled} />
                      </td>
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
