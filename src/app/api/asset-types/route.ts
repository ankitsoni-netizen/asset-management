import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helpers";
import { findOrCreateAssetType, listAssetTypes } from "@/lib/queries";

const createSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const types = await listAssetTypes();
  return NextResponse.json({ types });
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = createSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: "Enter a valid asset name." }, { status: 400 });
  }

  const { type, created } = await findOrCreateAssetType(body.data.name);
  return NextResponse.json({ type }, { status: created ? 201 : 200 });
}
