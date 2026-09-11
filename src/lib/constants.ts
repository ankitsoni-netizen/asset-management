export const ADMIN_EMAIL = (
  process.env.ADMIN_EMAIL?.trim() || "admin@cloutflow.com"
).toLowerCase();

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

export const ALLOCATION_ACTION = {
  allocated: "allocated",
  reallocated: "reallocated",
  returned: "returned",
} as const;
