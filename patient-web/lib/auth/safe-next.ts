/**
 * The page a patient returns to after signing in (journey 1: a guest who taps "request offers" must come back
 * to the checkout, not land on the dashboard). Only a path inside this site is accepted: no scheme, no
 * protocol-relative "//", no backslash, and never the sign-in pages themselves.
 */
const LOCALES = ["ar", "en", "ur", "hi", "bn", "fil"];

export function safeNextPath(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!v || v.length > 512 || !v.startsWith("/") || v.startsWith("//") || v.includes("\\") || /[\u0000-\u001f]/.test(v)) return null;
  if (/^\/[^/?#]*:/.test(v)) return null;
  const [, first, second] = v.split(/[/?#]/);
  if (!LOCALES.includes(first)) return null;
  if (["login", "register", "forgot-password", "reset-password", "otp"].includes(second ?? "")) return null;
  return v;
}
