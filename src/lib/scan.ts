import { isOfficialEmployeeEmail } from "./employee";
import { normalizeUid } from "./utils";

export type ScannedPayload = {
  raw: string;
  uid: string | null;
  email: string | null;
  code: string | null;
};

function firstQueryValue(url: URL, keys: string[]) {
  for (const key of keys) {
    const value = url.searchParams.get(key)?.trim();
    if (value) return value;
  }
  return null;
}

function asOfficialEmail(value: string | null | undefined) {
  const email = value?.trim().toLowerCase() ?? "";
  return email && isOfficialEmployeeEmail(email) ? email : null;
}

export function parseScannedPayload(raw: string): ScannedPayload {
  const value = raw.trim();
  if (!value) {
    return { raw: "", uid: null, email: null, code: null };
  }

  if (value.toLowerCase().startsWith("mailto:")) {
    const email = asOfficialEmail(value.slice("mailto:".length).split("?")[0]);
    return { raw: value, uid: null, email, code: email ? null : normalizeUid(value) };
  }

  try {
    const url = new URL(value);
    const assetMatch = url.pathname.match(/\/a\/([^/]+)/i);
    if (assetMatch?.[1]) {
      return {
        raw: value,
        uid: normalizeUid(decodeURIComponent(assetMatch[1])),
        email: null,
        code: null,
      };
    }

    const email = asOfficialEmail(firstQueryValue(url, ["email"]));
    const uid = firstQueryValue(url, ["uid", "asset", "assetUid", "code"]);
    if (email) {
      return { raw: value, uid: uid ? normalizeUid(uid) : null, email, code: null };
    }
    if (uid) {
      const code = normalizeUid(uid);
      return { raw: value, uid: code, email: null, code };
    }
  } catch {
    // Not a URL — treat the printed value as an email, UID, or employee code.
  }

  const email = asOfficialEmail(value);
  if (email) {
    return { raw: value, uid: null, email, code: null };
  }

  const code = normalizeUid(value);
  return { raw: value, uid: code, email: null, code };
}

export function scannedAssetUid(raw: string) {
  return parseScannedPayload(raw).uid;
}

export function scannedEmployeeFields(raw: string) {
  const parsed = parseScannedPayload(raw);
  return { email: parsed.email, code: parsed.code };
}
