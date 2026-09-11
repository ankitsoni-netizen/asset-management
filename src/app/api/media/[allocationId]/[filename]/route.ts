import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { readAllocationImage } from "@/lib/media";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ allocationId: string; filename: string }> };

export async function GET(_request: Request, { params }: Params) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allocationId, filename } = await params;
  const image = await prisma.assetImage.findFirst({
    where: { allocationId, filename },
  });
  if (!image) {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }

  try {
    const file = await readAllocationImage(allocationId, filename);
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": image.mimeType,
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }
}
