import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { collectImages, saveAllocationImages } from "@/lib/media";
import { createUniqueUid } from "@/lib/uid";
import { generateQrDataUrl } from "@/lib/qr";
import { sendAllocationEmail } from "@/lib/email";
import { ALLOCATION_ACTION, ASSET_STATUS } from "@/lib/constants";
import { isOfficialEmployeeEmail, OFFICIAL_EMAIL_HINT } from "@/lib/employee";

const fields = z.object({
  assetTypeId: z.string().min(1),
  employeeName: z.string().trim().min(2),
  department: z.string().trim().min(2),
  position: z.string().trim().min(2),
  employeeEmail: z
    .string()
    .trim()
    .email()
    .refine(isOfficialEmployeeEmail, { message: OFFICIAL_EMAIL_HINT }),
  brand: z.string().trim().optional(),
  model: z.string().trim().optional(),
  serialNumber: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const parsed = fields.safeParse({
    assetTypeId: formData.get("assetTypeId"),
    employeeName: formData.get("employeeName"),
    department: formData.get("department"),
    position: formData.get("position"),
    employeeEmail: formData.get("employeeEmail"),
    brand: String(formData.get("brand") ?? "") || undefined,
    model: String(formData.get("model") ?? "") || undefined,
    serialNumber: String(formData.get("serialNumber") ?? "") || undefined,
    notes: String(formData.get("notes") ?? "") || undefined,
  });

  if (!parsed.success) {
    const emailIssue = parsed.error.issues.find((issue) => issue.path.includes("employeeEmail"));
    return NextResponse.json(
      { error: emailIssue?.message || "Complete every required field with valid values." },
      { status: 400 },
    );
  }

  const images = collectImages(formData);
  if (!images.length) {
    return NextResponse.json({ error: "Upload at least one image of the allocated asset." }, { status: 400 });
  }

  const assetType = await prisma.assetType.findUnique({
    where: { id: parsed.data.assetTypeId },
  });
  if (!assetType) {
    return NextResponse.json({ error: "Selected asset type was not found." }, { status: 404 });
  }

  const uid = await createUniqueUid();

  const result = await prisma.$transaction(async (tx) => {
    const asset = await tx.asset.create({
      data: {
        uid,
        assetTypeId: assetType.id,
        brand: parsed.data.brand,
        model: parsed.data.model,
        serialNumber: parsed.data.serialNumber,
        notes: parsed.data.notes,
        status: ASSET_STATUS.allocated,
      },
    });

    const allocation = await tx.allocation.create({
      data: {
        assetId: asset.id,
        employeeName: parsed.data.employeeName,
        department: parsed.data.department,
        position: parsed.data.position,
        employeeEmail: parsed.data.employeeEmail.toLowerCase(),
        action: ALLOCATION_ACTION.allocated,
        isCurrent: true,
      },
    });

    return { asset, allocation };
  });

  const savedImages = await saveAllocationImages(result.allocation.id, images);
  if (savedImages.length) {
    await prisma.assetImage.createMany({
      data: savedImages.map((image) => ({
        allocationId: result.allocation.id,
        filename: image.filename,
        mimeType: image.mimeType,
      })),
    });
  }

  let emailSent = false;
  let emailError: string | undefined;
  try {
    const mail = await sendAllocationEmail({
      employeeName: parsed.data.employeeName,
      employeeEmail: parsed.data.employeeEmail,
      department: parsed.data.department,
      position: parsed.data.position,
      assetName: assetType.name,
      uid,
      brand: parsed.data.brand,
      model: parsed.data.model,
      serialNumber: parsed.data.serialNumber,
      action: "allocated",
      allocatedAt: result.allocation.allocatedAt,
    });
    emailSent = mail.sent;
    emailError = mail.error;
  } catch (error) {
    emailError = error instanceof Error ? error.message : "Email delivery failed.";
  }

  await prisma.allocation.update({
    where: { id: result.allocation.id },
    data: { emailSent, emailError },
  });

  const qrDataUrl = await generateQrDataUrl(uid);

  return NextResponse.json({
    uid,
    qrDataUrl,
    emailSent,
    emailError,
    assetType: assetType.name,
    employeeName: parsed.data.employeeName,
  });
}
