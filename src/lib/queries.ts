import { prisma } from "./prisma";
import { ASSET_STATUS } from "./constants";

export async function getDashboardStats() {
  const [totalAssets, allocated, available, totalAllocations, recent] = await Promise.all([
    prisma.asset.count(),
    prisma.asset.count({ where: { status: ASSET_STATUS.allocated } }),
    prisma.asset.count({ where: { status: ASSET_STATUS.available } }),
    prisma.allocation.count(),
    prisma.allocation.findMany({
      take: 8,
      orderBy: { allocatedAt: "desc" },
      include: {
        asset: { include: { assetType: true } },
        images: { take: 1 },
      },
    }),
  ]);

  return { totalAssets, allocated, available, totalAllocations, recent };
}

export async function getAssetByUid(uid: string) {
  return prisma.asset.findUnique({
    where: { uid },
    include: {
      assetType: true,
      allocations: {
        orderBy: { allocatedAt: "desc" },
        include: { images: true },
      },
    },
  });
}

export async function getAllocationLogs(filters: {
  q?: string;
  status?: string;
  assetTypeId?: string;
  department?: string;
  from?: string;
  to?: string;
}) {
  const where: Record<string, unknown> = {};

  if (filters.status === "allocated") {
    where.isCurrent = true;
    where.asset = { status: ASSET_STATUS.allocated };
  } else if (filters.status === "available") {
    where.asset = { status: ASSET_STATUS.available };
  } else if (filters.status === "historical") {
    where.isCurrent = false;
  }

  if (filters.assetTypeId) {
    where.asset = {
      ...((where.asset as object) ?? {}),
      assetTypeId: filters.assetTypeId,
    };
  }

  if (filters.department) {
    where.department = filters.department;
  }

  if (filters.from || filters.to) {
    where.allocatedAt = {
      ...(filters.from ? { gte: new Date(`${filters.from}T00:00:00`) } : {}),
      ...(filters.to ? { lte: new Date(`${filters.to}T23:59:59`) } : {}),
    };
  }

  if (filters.q) {
    const q = filters.q.trim();
    where.OR = [
      { employeeName: { contains: q } },
      { employeeEmail: { contains: q } },
      { position: { contains: q } },
      { department: { contains: q } },
      { asset: { uid: { contains: q.toUpperCase() } } },
      { asset: { assetType: { name: { contains: q } } } },
      { asset: { serialNumber: { contains: q } } },
    ];
  }

  return prisma.allocation.findMany({
    where,
    orderBy: { allocatedAt: "desc" },
    include: {
      asset: { include: { assetType: true } },
      images: true,
    },
  });
}

export async function getFilterOptions() {
  const [types, departments] = await Promise.all([
    prisma.assetType.findMany({ orderBy: { name: "asc" } }),
    prisma.allocation.findMany({
      distinct: ["department"],
      select: { department: true },
      orderBy: { department: "asc" },
    }),
  ]);

  return {
    types,
    departments: departments.map((item) => item.department),
  };
}
