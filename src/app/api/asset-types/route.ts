import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

const createSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const types = await prisma.assetType.findMany({
    orderBy: [{ isCustom: "asc" }, { name: "asc" }],
  });

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

  const name = body.data.name.replace(/\s+/g, " ");
  const existing = await prisma.assetType.findFirst({
    where: { name: { equals: name } },
  });
  if (existing) {
    return NextResponse.json({ type: existing });
  }

  const type = await prisma.assetType.create({
    data: { name, isCustom: true },
  });

  return NextResponse.json({ type }, { status: 201 });
}
