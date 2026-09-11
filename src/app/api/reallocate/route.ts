import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { collectImages, saveAllocationImages } from "@/lib/media";
import { generateQrDataUrl } from "@/lib/qr";
import { sendAllocationEmail } from "@/lib/email";
import { ALLOCATION_ACTION, ASSET_STATUS } from "@/lib/constants";
import { isOfficialEmployeeEmail, OFFICIAL_EMAIL_HINT } from "@/lib/employee";
import { normalizeUid } from "@/lib/utils";

const fields = z.object({
  uid: z.string().min(1),
  employeeName: z.string().trim().min(2),
  department: z.string().trim().min(2),
  position: z.string().trim().min(2),
  employeeEmail: z
    .string()
    .trim()
    .email()
    .refine(isOfficialEmployeeEmail, { message: OFFICIAL_EMAIL_HINT }),
  confirmation: z.literal("true"),
  confirmationNote: z.string().trim().optional(),
});

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const parsed = fields.safeParse({
    uid: normalizeUid(String(formData.get("uid") ?? "")),
    employeeName: formData.get("employeeName"),
    department: formData.get("department"),
    position: formData.get("position"),
    employeeEmail: formData.get("employeeEmail"),
    confirmation: String(formData.get("confirmation") ?? ""),
    confirmationNote: String(formData.get("confirmationNote") ?? "") || undefined,
  });

  if (!parsed.success) {
    const emailIssue = parsed.error.issues.find((issue) => issue.path.includes("employeeEmail"));
    return NextResponse.json(
      { error: emailIssue?.message || "Confirm the transfer and complete every required employee field." },
      { status: 400 },
    );
  }

  const images = collectImages(formData);
  if (!images.length) {
    return NextResponse.json({ error: "Upload at least one image of the asset being reallocated." }, { status: 400 });
  }

  const asset = await prisma.asset.findUnique({
    where: { uid: parsed.data.uid },
    include: {
      assetType: true,
      allocations: { where: { isCurrent: true }, take: 1 },
    },
  });

  if (!asset) {
    return NextResponse.json({ error: "No asset was found for this UID." }, { status: 404 });
  }

  const now = new Date();
  const allocation = await prisma.$transaction(async (tx) => {
    await tx.allocation.updateMany({
      where: { assetId: asset.id, isCurrent: true },
      data: { isCurrent: false, endedAt: now },
    });

    const created = await tx.allocation.create({
      data: {
        assetId: asset.id,
        employeeName: parsed.data.employeeName,
        department: parsed.data.department,
        position: parsed.data.position,
        employeeEmail: parsed.data.employeeEmail.toLowerCase(),
        action: ALLOCATION_ACTION.reallocated,
        isCurrent: true,
        confirmationNote: parsed.data.confirmationNote,
      },
    });

    await tx.asset.update({
      where: { id: asset.id },
      data: { status: ASSET_STATUS.allocated },
    });

    return created;
  });

  const savedImages = await saveAllocationImages(allocation.id, images);
  await prisma.assetImage.createMany({
    data: savedImages.map((image) => ({
      allocationId: allocation.id,
      filename: image.filename,
      mimeType: image.mimeType,
    })),
  });

  let emailSent = false;
  let emailError: string | undefined;
  try {
    const mail = await sendAllocationEmail({
      employeeName: parsed.data.employeeName,
      employeeEmail: parsed.data.employeeEmail,
      department: parsed.data.department,
      position: parsed.data.position,
      assetName: asset.assetType.name,
      uid: asset.uid,
      brand: asset.brand,
      model: asset.model,
      serialNumber: asset.serialNumber,
      action: "reallocated",
      allocatedAt: allocation.allocatedAt,
    });
    emailSent = mail.sent;
    emailError = mail.error;
  } catch (error) {
    emailError = error instanceof Error ? error.message : "Email delivery failed.";
  }

  await prisma.allocation.update({
    where: { id: allocation.id },
    data: { emailSent, emailError },
  });

  return NextResponse.json({
    uid: asset.uid,
    qrDataUrl: await generateQrDataUrl(asset.uid),
    emailSent,
    emailError,
    assetType: asset.assetType.name,
    employeeName: parsed.data.employeeName,
  });
}
