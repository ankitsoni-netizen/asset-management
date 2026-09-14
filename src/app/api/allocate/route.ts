import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helpers";
import { sendAcknowledgementForAllocation } from "@/lib/acknowledgement";
import { allocateAsset } from "@/lib/queries";
import { normalizeUid } from "@/lib/utils";

const fields = z.object({
  uid: z.string().min(1),
  employeeId: z.string().uuid(),
});

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = fields.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Select an available asset and an employee from the roster." },
      { status: 400 },
    );
  }

  const uid = normalizeUid(parsed.data.uid);

  let result: Awaited<ReturnType<typeof allocateAsset>>;
  try {
    result = await allocateAsset(admin.supabase, {
      uid,
      employeeId: parsed.data.employeeId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Allocation failed.";
    const status = /not found/i.test(message) ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }

  const acknowledgement = await sendAcknowledgementForAllocation(
    admin.supabase,
    result.allocation.id,
    admin.user.email ?? "",
  );

  return NextResponse.json({
    uid: result.asset.uid,
    allocationId: result.allocation.id,
    emailSent: acknowledgement.sent,
    emailError: acknowledgement.error,
    emailWarning: acknowledgement.adminMessage,
    assetType: result.assetType.name,
    employeeName: result.allocation.employee_name,
  });
}
