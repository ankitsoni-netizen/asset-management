import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helpers";
import { normalizeUid } from "@/lib/utils";
import { returnAsset } from "@/lib/queries";

const schema = z.object({
  uid: z.string().min(1),
});

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = schema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: "UID is required." }, { status: 400 });
  }

  try {
    await returnAsset(admin.supabase, normalizeUid(body.data.uid));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Return failed.";
    const status = /not found/i.test(message) ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json({ ok: true });
}
