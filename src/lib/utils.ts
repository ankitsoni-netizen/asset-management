import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function appUrl() {
  const fromEnv = process.env.APP_URL?.trim() || process.env.AUTH_URL?.trim();
  if (process.env.VERCEL_URL && (!fromEnv || /localhost|127\.0\.0\.1/.test(fromEnv))) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "http://localhost:3100";
}

export function normalizeUid(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDateTime(value: Date | string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
