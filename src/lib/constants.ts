export const ADMIN_EMAIL = "admin@cloutflow.com";

export function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? "";
}

export function isAdminEmail(email?: string | null) {
  return normalizeEmail(email) === ADMIN_EMAIL;
}

export { DEPARTMENTS, CUSTOM_DEPARTMENT } from "./employee";

export const COMPANY = {
  name: "Cloutflow",
  legalName: "Growlance Tech Solutions Pvt. Ltd.",
  address: "WeWork Platina Tower, Sector 28, Gurugram 122002",
  adminEmail: ADMIN_EMAIL,
};

export const ASSET_STATUS = {
  allocated: "allocated",
  available: "available",
} as const;

export function parseAssetActive(value: unknown, fallback = true) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "inactive" || raw === "false" || raw === "0") return false;
  if (raw === "active" || raw === "true" || raw === "1") return true;
  return fallback;
}

export function assetActiveLabel(active: boolean) {
  return active ? "Active" : "Inactive";
}

export function assetAssignmentLabel(status: string) {
  return status === ASSET_STATUS.allocated ? "Allocated" : "Available";
}

export const ALLOCATION_ACTION = {
  allocated: "allocated",
  returned: "returned",
} as const;

export const ACKNOWLEDGEMENT_EMAIL_FAILURE_AFTER_ALLOCATE =
  "Asset allocated successfully, but the acknowledgement email could not be sent.";

export const ACKNOWLEDGEMENT_RETRY_COOLDOWN_SECONDS = 30;
