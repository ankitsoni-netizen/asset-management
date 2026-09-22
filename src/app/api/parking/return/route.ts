import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helpers";
import { returnParking } from "@/lib/queries";

const schema = z.object({
  parkingSpotId: z.string().uuid(),
});

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = schema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: "Parking allocation is required." }, { status: 400 });
  }

  try {
    await returnParking(admin.supabase, body.data.parkingSpotId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to remove this parking allocation.";
    const status = /not found/i.test(message) ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json({ ok: true });
}
