import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function stripTrailingSlash(value: string) {
  return value.replace(/\/$/, "");
}

export function appUrl() {
  const fromEnv = process.env.APP_URL?.trim();
  if (fromEnv) return stripTrailingSlash(fromEnv);
  return "http://localhost:3100";
}

export function normalizeUid(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

const DISPLAY_TIME_ZONE = "Asia/Kolkata";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

function dateParts(value: Date | string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: DISPLAY_TIME_ZONE,
    day: "2-digit",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));

  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const monthIndex = Math.max(0, Number(get("month")) - 1);

  return {
    day: get("day").padStart(2, "0"),
    month: MONTHS[monthIndex] ?? get("month"),
    year: get("year"),
    hour: get("hour").padStart(2, "0"),
    minute: get("minute").padStart(2, "0"),
    second: get("second").padStart(2, "0"),
  };
}

export function formatDate(value: Date | string) {
  const { day, month, year } = dateParts(value);
  return `${day} ${month} ${year}`;
}

export function formatDateTime(value: Date | string) {
  const { day, month, year, hour, minute, second } = dateParts(value);
  return `${day} ${month} ${year}, ${hour}:${minute}:${second}`;
}
