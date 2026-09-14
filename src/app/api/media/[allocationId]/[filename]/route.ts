import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { readStoredImage } from "@/lib/media";

type Params = { params: Promise<{ allocationId: string; filename: string }> };

export async function GET(_request: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allocationId, filename } = await params;
  const { data: image, error } = await admin.supabase
    .from("allocation_images")
    .select("*")
    .eq("allocation_id", allocationId)
    .eq("filename", filename)
    .maybeSingle();

  if (error || !image) {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }

  try {
    const file = await readStoredImage(admin.supabase, image.storage_path);
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": image.mime_type,
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }
}
