import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helpers";
import { setEmployeeDisabled } from "@/lib/queries";

const fields = z.object({
  disabled: z.boolean(),
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

  const parsed = fields.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose Enable or Disable." }, { status: 400 });
  }

  try {
    const employee = await setEmployeeDisabled(admin.supabase, employeeId, parsed.data.disabled);
    return NextResponse.json({ employee });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update this employee.";
    const status = /not found/i.test(message) ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
