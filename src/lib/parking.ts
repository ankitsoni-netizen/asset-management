export const PARKING_TYPE = {
  valet: "valet",
  basement_1: "basement_1",
  basement_2: "basement_2",
  basement_3: "basement_3",
} as const;

export type ParkingType = (typeof PARKING_TYPE)[keyof typeof PARKING_TYPE];

export const PARKING_TYPES = [
  { value: PARKING_TYPE.valet, label: "Valet" },
  { value: PARKING_TYPE.basement_1, label: "Basement 1" },
  { value: PARKING_TYPE.basement_2, label: "Basement 2" },
  { value: PARKING_TYPE.basement_3, label: "Basement 3" },
] as const;

export function isParkingType(value: unknown): value is ParkingType {
  return PARKING_TYPES.some((type) => type.value === value);
}

export function isValetParking(type: ParkingType) {
  return type === PARKING_TYPE.valet;
}

export function parkingTypeLabel(type: ParkingType) {
  return PARKING_TYPES.find((item) => item.value === type)?.label ?? type;
}

export function parkingSpotLabel(type: ParkingType, slotNumber: string | null | undefined) {
  const typeLabel = parkingTypeLabel(type);
  if (isValetParking(type) || !slotNumber?.trim()) return typeLabel;
  return `${typeLabel} · Slot ${slotNumber.trim()}`;
}

export function parseParkingSlot(type: ParkingType, value: unknown) {
  if (isValetParking(type)) return null;
  const slot = String(value ?? "").trim().replace(/\s+/g, " ");
  return slot || null;
}

const EMPLOYEE_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ParsedParkingAllocation = {
  parkingType: ParkingType;
  slotNumber: string | null;
  vehicleNumbers: string[];
  employeeId: string;
};

export function parseParkingAllocationBody(
  body: unknown,
): { ok: true; data: ParsedParkingAllocation } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Select a parking type, employee, and at least one vehicle number." };
  }

  const input = body as Record<string, unknown>;
  if (!isParkingType(input.parkingType)) {
    return {
      ok: false,
      error: `Parking type must be ${PARKING_TYPES.map((type) => type.label).join(", ")}.`,
    };
  }

  const vehicleNumbers = parseVehicleNumbers(input.vehicleNumbers);
  if (vehicleNumbers.length === 0) {
    return { ok: false, error: "Add at least one vehicle number." };
  }

  const slotNumber = parseParkingSlot(input.parkingType, input.slotNumber);
  if (!isValetParking(input.parkingType) && !slotNumber) {
    return { ok: false, error: "Slot number is required for basement parking." };
  }

  const employeeId = typeof input.employeeId === "string" ? input.employeeId.trim() : "";
  if (!EMPLOYEE_ID_RE.test(employeeId)) {
    return { ok: false, error: "Select an employee from the roster." };
  }

  return {
    ok: true,
    data: {
      parkingType: input.parkingType,
      slotNumber,
      vehicleNumbers,
      employeeId,
    },
  };
}

export function parkingAllocationErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Parking allocation failed.";
  if (/not assigned yet/i.test(message) || /tuple structure/i.test(message)) {
    return "Unable to allocate valet parking. Try again after the latest parking update.";
  }
  return message;
}

export function parseVehicleNumbers(values: unknown) {
  const list = Array.isArray(values) ? values : [values];
  const seen = new Set<string>();
  const vehicles: string[] = [];

  for (const value of list) {
    const normalized = String(value ?? "")
      .trim()
      .replace(/\s+/g, "")
      .toUpperCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    vehicles.push(normalized);
  }

  return vehicles;
}

export function formatVehicleNumbers(values: string[]) {
  return values.join(", ");
}

export function summarizeParkingAllocations(rows: Array<{ parkingType: ParkingType }>) {
  return {
    allocated: rows.length,
    byType: PARKING_TYPES.map((type) => ({
      value: type.value,
      label: type.label,
      count: rows.filter((row) => row.parkingType === type.value).length,
    })),
  };
}
