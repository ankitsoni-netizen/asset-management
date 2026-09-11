import { randomBytes } from "crypto";
import { prisma } from "./prisma";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function segment(length: number) {
  const bytes = randomBytes(length);
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join("");
}

export function createUid() {
  return `CF-${segment(4)}-${segment(4)}`;
}

export async function createUniqueUid() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const uid = createUid();
    const existing = await prisma.asset.findUnique({ where: { uid } });
    if (!existing) return uid;
  }
  throw new Error("Unable to generate a unique UID");
}
