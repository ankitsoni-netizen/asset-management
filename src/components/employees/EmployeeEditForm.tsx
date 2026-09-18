"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { isOfficialEmployeeEmail, OFFICIAL_EMAIL_HINT } from "@/lib/employee";
import { DepartmentField, departmentFormState, resolvedDepartment } from "@/components/forms/DepartmentField";
import { useProcessing } from "@/components/status/Processing";

export function EmployeeEditForm({
  employee,
}: {
  employee: {
    id: string;
    name: string;
    email: string;
    department: string;
    position: string;
    code: string;
    disabled: boolean;
  };
}) {
  const router = useRouter();
  const { run } = useProcessing();
  const initialDepartment = departmentFormState(employee.department);
  const [name, setName] = useState(employee.name);
  const [department, setDepartment] = useState<string>(initialDepartment.department);
  const [customDepartment, setCustomDepartment] = useState(initialDepartment.customDepartment);
  const [position, setPosition] = useState(employee.position);
  const [email, setEmail] = useState(employee.email);
  const [employeeId, setEmployeeId] = useState(employee.code);
  const [disabled, setDisabled] = useState(employee.disabled);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isOfficialEmployeeEmail(email)) {
      setError(OFFICIAL_EMAIL_HINT);
      return;
    }
    const departmentValue = resolvedDepartment(department, customDepartment);
    if (!departmentValue) {
      setError("Enter a department.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await run("Saving employee", async () => {
        const response = await fetch(`/api/employees/${employee.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            department: departmentValue,
            position,
            email,
            employeeId: employeeId || undefined,
            disabled,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to update this employee.");
        router.push("/employees");
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update this employee.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="cf-card p-4 sm:p-6">
        <h2 className="text-lg font-medium">Employee details</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="cf-label">First name</span>
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 h-12 w-full rounded-md border border-cf-border px-3 sm:h-11"
              placeholder="e.g. Jordan"
            />
          </label>
          <label className="block">
            <span className="cf-label">Employee ID</span>
            <input
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
              className="mt-2 h-12 w-full rounded-md border border-cf-border px-3 sm:h-11"
              placeholder="Optional, e.g. EMP-204"
            />
          </label>
          <DepartmentField
            department={department}
            customDepartment={customDepartment}
            onDepartmentChange={setDepartment}
            onCustomDepartmentChange={setCustomDepartment}
          />
          <label className="block">
            <span className="cf-label">Position</span>
            <input
              required
              value={position}
              onChange={(event) => setPosition(event.target.value)}
              className="mt-2 h-12 w-full rounded-md border border-cf-border px-3 sm:h-11"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="cf-label">Official email ID</span>
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 h-12 w-full rounded-md border border-cf-border px-3 sm:h-11"
              placeholder="name@cloutflow.com"
            />
            <span className="mt-1 block text-xs text-cf-muted">{OFFICIAL_EMAIL_HINT}</span>
          </label>
          <label className="block">
            <span className="cf-label">Status</span>
            <select
              value={disabled ? "disabled" : "active"}
              onChange={(event) => setDisabled(event.target.value === "disabled")}
              className="mt-2 h-12 w-full rounded-md border border-cf-border px-3 sm:h-11"
            >
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
            <span className="mt-1 block text-xs text-cf-muted">Disabled people stay on the roster but cannot receive new assets.</span>
          </label>
        </div>
      </section>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="submit"
          disabled={submitting}
          className="cf-action bg-cf-primary text-white hover:bg-cf-primary-dark disabled:opacity-60"
        >
          {submitting ? "Saving..." : "Save changes"}
        </button>
        <button type="button" onClick={() => router.push("/employees")} className="cf-action border border-cf-border">
          Cancel
        </button>
      </div>
    </form>
  );
}
