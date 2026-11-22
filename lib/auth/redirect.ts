export const DEFAULT_AUTH_REDIRECT = "/community";

/** Hanya mengizinkan path relatif internal yang diawali satu "/". */
export function sanitizeNextPath(
  candidate: string | null | undefined,
  fallback: string = DEFAULT_AUTH_REDIRECT,
): string {
  if (typeof candidate !== "string") return fallback;
  const value = candidate.trim();
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  if (/[\u0000-\u001f]/.test(value)) return fallback;
  if (value === "/login" || value.startsWith("/login?") || value === "/register" || value.startsWith("/register?")) {
    return fallback;
  }
  return value;
}
