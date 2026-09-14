export function safeInternalPath(value?: string | null) {
  if (!value) return "/";
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/login")) {
    return "/";
  }

  try {
    const url = new URL(trimmed, "http://localhost");
    if (url.username || url.password || url.hostname !== "localhost") {
      return "/";
    }
    return `${url.pathname}${url.search}` || "/";
  } catch {
    return "/";
  }
}

export function loginRedirectPath(callbackUrl?: string | null) {
  const next = safeInternalPath(callbackUrl);
  if (next === "/") return "/login";
  return `/login?callbackUrl=${encodeURIComponent(next)}`;
}
