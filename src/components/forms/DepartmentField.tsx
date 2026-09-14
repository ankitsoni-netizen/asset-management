"use client";

import { CUSTOM_DEPARTMENT, DEPARTMENTS } from "@/lib/employee";

export function DepartmentField({
  department,
  customDepartment,
  onDepartmentChange,
  onCustomDepartmentChange,
}: {
  department: string;
  customDepartment: string;
  onDepartmentChange: (value: string) => void;
  onCustomDepartmentChange: (value: string) => void;
}) {
  return (
    <>
      <label className="block">
        <span className="cf-label">Department</span>
        <select
          required
          value={department}
          onChange={(event) => onDepartmentChange(event.target.value)}
          className="mt-2 h-12 w-full rounded-md border border-cf-border px-3 sm:h-11"
        >
          {DEPARTMENTS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
          <option value={CUSTOM_DEPARTMENT}>{CUSTOM_DEPARTMENT}</option>
        </select>
      </label>
      {department === CUSTOM_DEPARTMENT ? (
        <label className="block">
          <span className="cf-label">Custom department</span>
          <input
            required
            value={customDepartment}
            onChange={(event) => onCustomDepartmentChange(event.target.value)}
            className="mt-2 h-12 w-full rounded-md border border-cf-border px-3 sm:h-11"
            placeholder="Enter department name"
          />
        </label>
      ) : null}
    </>
  );
}

export function resolvedDepartment(department: string, customDepartment: string) {
  return department === CUSTOM_DEPARTMENT ? customDepartment.trim() : department;
}
