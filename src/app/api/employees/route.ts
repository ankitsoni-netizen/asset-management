import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helpers";
import { isOfficialEmployeeEmail, OFFICIAL_EMAIL_HINT } from "@/lib/employee";
import { createEmployee, findEmployeeByCodeOrEmail } from "@/lib/queries";
import { scannedEmployeeFields } from "@/lib/scan";
import { normalizeUid } from "@/lib/utils";

const fields = z.object({
  name: z.string().trim().min(2),
  department: z.string().trim().min(2),
  position: z.string().trim().min(2),
  email: z
    .string()
    .trim()
    .email()
    .refine(isOfficialEmployeeEmail, { message: OFFICIAL_EMAIL_HINT }),
  employeeId: z.string().trim().max(120).optional(),
  code: z.string().trim().max(120).optional(),
});

export async function GET(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = new URL(request.url).searchParams.get("q") ?? "";
  const scanned = scannedEmployeeFields(q);
  const lookup = scanned.email || scanned.code || q.trim();
  if (!lookup) {
    return NextResponse.json({ error: "Scan or enter an employee QR, email, or badge code." }, { status: 400 });
  }

  const employee = await findEmployeeByCodeOrEmail(lookup);
  if (!employee) {
    return NextResponse.json({ error: "No employee was found for this QR / email." }, { status: 404 });
  }

  return NextResponse.json({ employee });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = fields.safeParse(await request.json());
  if (!body.success) {
    const emailIssue = body.error.issues.find((issue) => issue.path.includes("email"));
    return NextResponse.json(
      { error: emailIssue?.message || "Complete every required employee field with valid values." },
      { status: 400 },
    );
  }

  const rawEmployeeId = body.data.employeeId || body.data.code;
  const code = rawEmployeeId ? normalizeUid(rawEmployeeId) : undefined;

  try {
    const employee = await createEmployee(admin.supabase, {
      name: body.data.name,
      department: body.data.department,
      position: body.data.position,
      email: body.data.email,
      code,
    });
    return NextResponse.json({ employee }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save this employee.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
