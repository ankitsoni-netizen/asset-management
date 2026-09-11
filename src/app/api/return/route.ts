import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { ALLOCATION_ACTION, ASSET_STATUS } from "@/lib/constants";
import { normalizeUid } from "@/lib/utils";

const schema = z.object({
  uid: z.string().min(1),
});

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = schema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: "UID is required." }, { status: 400 });
  }

  const uid = normalizeUid(body.data.uid);
  const asset = await prisma.asset.findUnique({ where: { uid } });
  if (!asset) {
    return NextResponse.json({ error: "No asset was found for this UID." }, { status: 404 });
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.allocation.updateMany({
      where: { assetId: asset.id, isCurrent: true },
      data: { isCurrent: false, endedAt: now, action: ALLOCATION_ACTION.returned },
    }),
    prisma.asset.update({
      where: { id: asset.id },
      data: { status: ASSET_STATUS.available },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
