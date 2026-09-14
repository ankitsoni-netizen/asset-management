import type { Database, Json } from "@/types/database";
import type {
  AllocationImageRecord,
  AllocationRecord,
  AllocationWithAsset,
  AssetImageRecord,
  AssetRecord,
  AssetTypeRecord,
  EmailDeliveryStatus,
  EmployeeRecord,
} from "./models";

type AssetTypeRow = Database["public"]["Tables"]["asset_types"]["Row"];
type AssetRow = Database["public"]["Tables"]["assets"]["Row"];
type AllocationRow = Database["public"]["Tables"]["allocations"]["Row"];
type AllocationImageRow = Database["public"]["Tables"]["allocation_images"]["Row"];
type AssetImageRow = Database["public"]["Tables"]["asset_images"]["Row"];
type EmployeeRow = Database["public"]["Tables"]["employees"]["Row"];

export function asDate(value: string | Date | null | undefined): Date {
  if (value instanceof Date) return value;
  return new Date(value ?? 0);
}

export function asDateOrNull(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  return asDate(value);
}

export function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function many<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export function mapAssetType(row: AssetTypeRow): AssetTypeRecord {
  return {
    id: row.id,
    name: row.name,
    isCustom: row.is_custom,
    createdAt: asDate(row.created_at),
  };
}

export function mapEmployee(row: EmployeeRow): EmployeeRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    department: row.department,
    position: row.position,
    code: row.code,
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
  };
}

export function mapAllocationImage(row: AllocationImageRow): AllocationImageRecord {
  return {
    id: row.id,
    allocationId: row.allocation_id,
    filename: row.filename,
    mimeType: row.mime_type,
    createdAt: asDate(row.created_at),
  };
}

export function mapAssetImage(row: AssetImageRow): AssetImageRecord {
  return {
    id: row.id,
    assetId: row.asset_id,
    filename: row.filename,
    mimeType: row.mime_type,
    createdAt: asDate(row.created_at),
  };
}

export function mapAllocation(
  row: AllocationRow,
  images: AllocationImageRow[] | AllocationImageRow | null = [],
): AllocationRecord {
  return {
    id: row.id,
    assetId: row.asset_id,
    employeeId: row.employee_id,
    employeeName: row.employee_name,
    department: row.department,
    position: row.position,
    employeeEmail: row.employee_email,
    action: row.action,
    allocatedAt: asDate(row.allocated_at),
    endedAt: asDateOrNull(row.ended_at),
    isCurrent: row.is_current,
    confirmationNote: row.confirmation_note,
    emailSent: row.email_sent,
    emailError: row.email_error,
    emailDeliveryStatus: row.email_delivery_status as EmailDeliveryStatus,
    emailSentAt: asDateOrNull(row.email_sent_at),
    emailAttemptCount: row.email_attempt_count,
    emailMessageId: row.email_message_id,
    emailLastAttemptedAt: asDateOrNull(row.email_last_attempted_at),
    images: many(images).map(mapAllocationImage),
  };
}

export function mapAsset(
  row: AssetRow,
  assetType: AssetTypeRow,
  images: AssetImageRow[] | AssetImageRow | null = [],
): AssetRecord {
  return {
    id: row.id,
    uid: row.uid,
    assetTypeId: row.asset_type_id,
    brand: row.brand,
    model: row.model,
    serialNumber: row.serial_number,
    notes: row.notes,
    status: row.status,
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
    assetType: mapAssetType(assetType),
    images: many(images).map(mapAssetImage),
  };
}

export function isRecord(value: Json | object | null | undefined): value is Record<string, Json> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function asRow<T>(value: Json | null | undefined): T {
  if (!isRecord(value)) {
    throw new Error("Unexpected database response.");
  }
  return value as T;
}

export function mapAllocationWithAsset(
  allocation: AllocationRow,
  images: AllocationImageRow[] | AllocationImageRow | null,
  asset: AssetRow,
  assetType: AssetTypeRow,
): AllocationWithAsset {
  return {
    ...mapAllocation(allocation, images),
    asset: {
      id: asset.id,
      uid: asset.uid,
      status: asset.status,
      serialNumber: asset.serial_number,
      brand: asset.brand,
      model: asset.model,
      assetType: mapAssetType(assetType),
    },
  };
}
