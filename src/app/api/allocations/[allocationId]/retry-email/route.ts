import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { sendAcknowledgementForAllocation } from "@/lib/acknowledgement";

export async function POST(
  _request: Request,
  context: { params: Promise<{ allocationId: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allocationId } = await context.params;
  if (!allocationId) {
    return NextResponse.json({ error: "Allocation is required." }, { status: 400 });
  }

  const acknowledgement = await sendAcknowledgementForAllocation(
    admin.supabase,
    allocationId,
    admin.user.email ?? "",
    { isRetry: true },
  );

  return NextResponse.json({
    emailSent: acknowledgement.sent,
    alreadySent: acknowledgement.alreadySent,
    skipped: acknowledgement.skipped,
    emailError: acknowledgement.error,
  });
}
