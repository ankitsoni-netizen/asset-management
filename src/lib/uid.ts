import { normalizeUid } from "./utils";

export const ASSET_UID_MAX_LENGTH = 120;
export const GENERATED_UID_PREFIX = "CF-AST-";
export const GENERATED_UID_DIGITS = 6;
export const GENERATED_UID_MAX = 10 ** GENERATED_UID_DIGITS - 1;
export const QR_LABEL_MAX_COUNT = 50;

const GENERATED_UID_PATTERN = /^CF-AST-(\d{6})$/;

export function isAssetUid(value: string) {
  const uid = normalizeUid(value);
  return uid.length >= 1 && uid.length <= ASSET_UID_MAX_LENGTH;
}

export function formatGeneratedUid(n: number) {
  if (!Number.isInteger(n) || n < 1 || n > GENERATED_UID_MAX) {
    throw new Error("Unable to allocate another CF-AST UID.");
  }
  return `${GENERATED_UID_PREFIX}${String(n).padStart(GENERATED_UID_DIGITS, "0")}`;
}

export function parseGeneratedUidNumber(uid: string) {
  const match = normalizeUid(uid).match(GENERATED_UID_PATTERN);
  return match ? Number(match[1]) : null;
}

export function nextGeneratedUids(existing: string[], count: number) {
  if (!Number.isInteger(count) || count < 1 || count > QR_LABEL_MAX_COUNT) {
    throw new Error(`Generate between 1 and ${QR_LABEL_MAX_COUNT} QR codes at a time.`);
  }

  const used = new Set(existing.map((uid) => normalizeUid(uid)).filter(Boolean));
  const numbers = existing
    .map(parseGeneratedUidNumber)
    .filter((value): value is number => value != null);
  let next = numbers.length ? Math.max(...numbers) : 0;
  const uids: string[] = [];

  while (uids.length < count) {
    next += 1;
    const uid = formatGeneratedUid(next);
    if (!used.has(uid)) {
      used.add(uid);
      uids.push(uid);
    }
  }

  return uids;
}
