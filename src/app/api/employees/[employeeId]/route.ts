import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helpers";
import { isOfficialEmployeeEmail, OFFICIAL_EMAIL_HINT } from "@/lib/employee";
import { getEmployeeById, setEmployeeDisabled, updateEmployee } from "@/lib/queries";
import { normalizeUid } from "@/lib/utils";

const statusFields = z.object({
  disabled: z.boolean(),
});

const detailFields = z.object({
  name: z.string().trim().min(2),
  department: z.string().trim().min(2),
  position: z.string().trim().min(2),
  email: z
    .string()
    .trim()
    .email()
    .refine(isOfficialEmployeeEmail, { message: OFFICIAL_EMAIL_HINT }),
  employeeId: z.string().trim().max(120).optional(),
  disabled: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ employeeId: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { employeeId } = await context.params;
  if (!employeeId) {
    return NextResponse.json({ error: "Employee is required." }, { status: 400 });
  }

  const existing = await getEmployeeById(employeeId);
  if (!existing) {
    return NextResponse.json({ error: "Employee was not found." }, { status: 404 });
  }

  const json: unknown = await request.json();
  const isDetailsUpdate =
    typeof json === "object" &&
    json !== null &&
    ("name" in json || "email" in json || "department" in json || "position" in json);

  try {
    if (isDetailsUpdate) {
      const parsed = detailFields.safeParse(json);
      if (!parsed.success) {
        const emailIssue = parsed.error.issues.find((issue) => issue.path.includes("email"));
        return NextResponse.json(
          { error: emailIssue?.message || "Complete every required employee field with valid values." },
          { status: 400 },
        );
      }
      const rawEmployeeId = parsed.data.employeeId;
      const employee = await updateEmployee(admin.supabase, employeeId, {
        name: parsed.data.name,
        department: parsed.data.department,
        position: parsed.data.position,
        email: parsed.data.email,
        code: rawEmployeeId ? normalizeUid(rawEmployeeId) : null,
        disabled: parsed.data.disabled,
      });
      return NextResponse.json({ employee });
    }

    const parsed = statusFields.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Choose Enable or Disable." }, { status: 400 });
    }
    const employee = await setEmployeeDisabled(admin.supabase, employeeId, parsed.data.disabled);
    return NextResponse.json({ employee });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update this employee.";
    const status = /not found/i.test(message) ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
