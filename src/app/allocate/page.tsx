import { AppShell } from "@/components/layout/AppShell";
import { AllocateForm } from "@/components/allocate/AllocateForm";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ADMIN_EMAIL } from "@/lib/constants";

export default async function AllocatePage() {
  const session = await auth();
  const types = await prisma.assetType.findMany({
    orderBy: [{ isCustom: "asc" }, { name: "asc" }],
  });

  return (
    <AppShell email={session?.user?.email ?? ADMIN_EMAIL} pathname="/allocate">
      <div className="mb-8">
        <p className="cf-label">New allocation</p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight">Allocate an asset</h1>
        <p className="mt-2 max-w-2xl text-sm text-cf-muted">
          Select the asset, enter the employee record, upload images, then allocate. A UID and QR code are generated at
          that point.
        </p>
      </div>
      <AllocateForm types={types} />
    </AppShell>
  );
}
