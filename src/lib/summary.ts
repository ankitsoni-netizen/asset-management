import { ASSET_STATUS } from "./constants";

export type SummaryAssetInput = {
  id: string;
  uid: string;
  status: string;
  active: boolean;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  assetTypeId: string;
  assetTypeName: string;
};

export type SummaryEmployeeInput = {
  id: string;
  name: string;
  email: string;
  department: string;
  position: string;
  disabled: boolean;
};

export type SummaryAllocationInput = {
  id: string;
  assetId: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  department: string;
  position: string;
  allocatedAt: Date;
};

export type AssetTypeSummary = {
  id: string;
  name: string;
  total: number;
  available: number;
  allocated: number;
  active: number;
  inactive: number;
};

export type DepartmentSummary = {
  department: string;
  total: number;
  active: number;
  disabled: number;
  withAssets: number;
};

export type AssignmentSummary = {
  allocationId: string;
  assetId: string;
  uid: string;
  assetType: string;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  department: string;
  position: string;
  allocatedAt: Date;
};

export type ParkingAssignmentSummary = {
  allocationId: string;
  parkingType: string;
  slotNumber: string | null;
  vehicleNumbers: string[];
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  department: string;
  position: string;
  allocatedAt: Date;
};

export type PersonAssignmentGroup = {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  department: string;
  position: string;
  latestAllocatedAt: Date;
  assets: AssignmentSummary[];
  parking: ParkingAssignmentSummary[];
};

export type DashboardSummary = {
  assets: {
    total: number;
    available: number;
    allocated: number;
    active: number;
    inactive: number;
    allocatable: number;
    byType: AssetTypeSummary[];
  };
  employees: {
    total: number;
    active: number;
    disabled: number;
    withAssets: number;
    withoutAssets: number;
    byDepartment: DepartmentSummary[];
  };
  assignments: AssignmentSummary[];
  holders: PersonAssignmentGroup[];
};

function incrementType(current: AssetTypeSummary, asset: SummaryAssetInput): AssetTypeSummary {
  current.total += 1;
  if (asset.status === ASSET_STATUS.allocated) current.allocated += 1;
  else current.available += 1;
  if (asset.active) current.active += 1;
  else current.inactive += 1;
  return current;
}

export function groupAssignmentsByPerson(assignments: AssignmentSummary[]): PersonAssignmentGroup[] {
  const groups = new Map<string, PersonAssignmentGroup>();

  for (const assignment of assignments) {
    const current = groups.get(assignment.employeeId);
    if (current) {
      current.assets.push(assignment);
      if (assignment.allocatedAt.getTime() > current.latestAllocatedAt.getTime()) {
        current.latestAllocatedAt = assignment.allocatedAt;
      }
      continue;
    }

    groups.set(assignment.employeeId, {
      employeeId: assignment.employeeId,
      employeeName: assignment.employeeName,
      employeeEmail: assignment.employeeEmail,
      department: assignment.department,
      position: assignment.position,
      latestAllocatedAt: assignment.allocatedAt,
      assets: [assignment],
      parking: [],
    });
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      assets: [...group.assets].sort((a, b) => {
        const byDate = b.allocatedAt.getTime() - a.allocatedAt.getTime();
        if (byDate !== 0) return byDate;
        return a.uid.localeCompare(b.uid);
      }),
    }))
    .sort((a, b) => a.employeeName.localeCompare(b.employeeName) || a.employeeEmail.localeCompare(b.employeeEmail));
}

function parkingSortKey(row: ParkingAssignmentSummary) {
  return `${row.parkingType} ${row.slotNumber ?? ""} ${row.vehicleNumbers.join(" ")}`.trim();
}

export function mergeParkingIntoHolders(
  holders: PersonAssignmentGroup[],
  parking: ParkingAssignmentSummary[],
): PersonAssignmentGroup[] {
  const groups = new Map(
    holders.map((holder) => [
      holder.employeeId,
      {
        ...holder,
        assets: [...holder.assets],
        parking: [...holder.parking],
      },
    ]),
  );

  for (const row of parking) {
    const current = groups.get(row.employeeId);
    if (current) {
      current.parking.push(row);
      if (row.allocatedAt.getTime() > current.latestAllocatedAt.getTime()) {
        current.latestAllocatedAt = row.allocatedAt;
      }
      continue;
    }

    groups.set(row.employeeId, {
      employeeId: row.employeeId,
      employeeName: row.employeeName,
      employeeEmail: row.employeeEmail,
      department: row.department,
      position: row.position,
      latestAllocatedAt: row.allocatedAt,
      assets: [],
      parking: [row],
    });
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      parking: [...group.parking].sort((a, b) => {
        const byDate = b.allocatedAt.getTime() - a.allocatedAt.getTime();
        if (byDate !== 0) return byDate;
        return parkingSortKey(a).localeCompare(parkingSortKey(b));
      }),
    }))
    .sort((a, b) => a.employeeName.localeCompare(b.employeeName) || a.employeeEmail.localeCompare(b.employeeEmail));
}

function includesQuery(value: string | null | undefined, query: string) {
  return (value ?? "").toLowerCase().includes(query);
}

export function filterHolders<
  T extends {
    employeeName: string;
    employeeEmail: string;
    department: string;
    position: string;
    assets: Array<{
      uid: string;
      assetType: string;
      brand: string | null;
      model: string | null;
      serialNumber: string | null;
    }>;
    parking?: Array<{
      parkingType: string;
      slotNumber: string | null;
      vehicleNumbers: string[];
    }>;
  },
>(holders: T[], query: string): T[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return holders;

  return holders.flatMap((holder) => {
    const personMatch =
      includesQuery(holder.employeeName, needle) ||
      includesQuery(holder.employeeEmail, needle) ||
      includesQuery(holder.department, needle) ||
      includesQuery(holder.position, needle);

    if (personMatch) return [holder];

    const assets = holder.assets.filter(
      (asset) =>
        includesQuery(asset.uid, needle) ||
        includesQuery(asset.assetType, needle) ||
        includesQuery(asset.brand, needle) ||
        includesQuery(asset.model, needle) ||
        includesQuery(asset.serialNumber, needle) ||
        includesQuery([asset.brand, asset.model].filter(Boolean).join(" "), needle),
    );

    const parking = (holder.parking ?? []).filter((row) => {
      const label = `${row.parkingType.replaceAll("_", " ")} ${row.slotNumber ?? ""}`.trim();
      return (
        includesQuery(row.parkingType, needle) ||
        includesQuery(label, needle) ||
        includesQuery(row.slotNumber, needle) ||
        row.vehicleNumbers.some((vehicle) => includesQuery(vehicle, needle))
      );
    });

    return assets.length > 0 || parking.length > 0 ? [{ ...holder, assets, parking }] : [];
  });
}

export function buildDashboardSummary(
  assets: SummaryAssetInput[],
  employees: SummaryEmployeeInput[],
  allocations: SummaryAllocationInput[],
): DashboardSummary {
  const assetById = new Map(assets.map((asset) => [asset.id, asset]));
  const allocatedEmployeeIds = new Set(allocations.map((row) => row.employeeId));
  const byType = new Map<string, AssetTypeSummary>();
  const byDepartment = new Map<string, DepartmentSummary>();

  let available = 0;
  let allocated = 0;
  let active = 0;
  let inactive = 0;
  let allocatable = 0;

  for (const asset of assets) {
    if (asset.status === ASSET_STATUS.allocated) allocated += 1;
    else available += 1;
    if (asset.active) active += 1;
    else inactive += 1;
    if (asset.status === ASSET_STATUS.available && asset.active) allocatable += 1;

    const type = byType.get(asset.assetTypeId) ?? {
      id: asset.assetTypeId,
      name: asset.assetTypeName,
      total: 0,
      available: 0,
      allocated: 0,
      active: 0,
      inactive: 0,
    };
    byType.set(asset.assetTypeId, incrementType(type, asset));
  }

  let employeeActive = 0;
  let employeeDisabled = 0;
  let withAssets = 0;

  for (const employee of employees) {
    if (employee.disabled) employeeDisabled += 1;
    else employeeActive += 1;
    if (allocatedEmployeeIds.has(employee.id)) withAssets += 1;

    const department = byDepartment.get(employee.department) ?? {
      department: employee.department,
      total: 0,
      active: 0,
      disabled: 0,
      withAssets: 0,
    };
    department.total += 1;
    if (employee.disabled) department.disabled += 1;
    else department.active += 1;
    if (allocatedEmployeeIds.has(employee.id)) department.withAssets += 1;
    byDepartment.set(employee.department, department);
  }

  const assignments = allocations
    .map((allocation) => {
      const asset = assetById.get(allocation.assetId);
      return {
        allocationId: allocation.id,
        assetId: allocation.assetId,
        uid: asset?.uid ?? "Unknown UID",
        assetType: asset?.assetTypeName ?? "Unknown",
        brand: asset?.brand ?? null,
        model: asset?.model ?? null,
        serialNumber: asset?.serialNumber ?? null,
        employeeId: allocation.employeeId,
        employeeName: allocation.employeeName,
        employeeEmail: allocation.employeeEmail,
        department: allocation.department,
        position: allocation.position,
        allocatedAt: allocation.allocatedAt,
      };
    })
    .sort((a, b) => {
      const byDate = b.allocatedAt.getTime() - a.allocatedAt.getTime();
      if (byDate !== 0) return byDate;
      return a.uid.localeCompare(b.uid);
    });

  return {
    assets: {
      total: assets.length,
      available,
      allocated,
      active,
      inactive,
      allocatable,
      byType: [...byType.values()].sort((a, b) => a.name.localeCompare(b.name)),
    },
    employees: {
      total: employees.length,
      active: employeeActive,
      disabled: employeeDisabled,
      withAssets,
      withoutAssets: employees.length - withAssets,
      byDepartment: [...byDepartment.values()].sort((a, b) => a.department.localeCompare(b.department)),
    },
    assignments,
    holders: groupAssignmentsByPerson(assignments),
  };
}
