export const DEPARTMENTS = [
  "Planning",
  "Strategy",
  "Pricing",
  "Ops",
  "Revenue",
  "Finance",
  "Tech",
  "Management",
] as const;

export const CUSTOM_DEPARTMENT = "Custom";

const OFFICIAL_EMAIL = /^[^\s@]+@(cloutflow\.com|backstage\.[a-z0-9.-]+)$/i;

export function isOfficialEmployeeEmail(email: string) {
  return OFFICIAL_EMAIL.test(email.trim().toLowerCase());
}

export const OFFICIAL_EMAIL_HINT = "Official email must end with @cloutflow.com or @backstage.";
