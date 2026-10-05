/**
 * a95be9a / 7B-B4: the AI health endpoints (POST /ai/triage, /ai/skin-analysis,
 * nutrition) return `disclaimer: { ar, en }` (backend MEDICAL_DISCLAIMER). The
 * screens show it from the payload in the user's language: Arabic for `ar`,
 * English otherwise, falling back to the other language if one is missing.
 */
export function aiDisclaimerText(payload: unknown, lang: string): string | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const root = payload as Record<string, unknown>;
  const data = root.data && typeof root.data === 'object' && !Array.isArray(root.data) ? (root.data as Record<string, unknown>) : root;
  const value = data.disclaimer;
  if (typeof value === 'string') return value.trim() || null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const { ar, en } = value as { ar?: unknown; en?: unknown };
  const pick = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  return lang === 'ar' ? pick(ar) ?? pick(en) : pick(en) ?? pick(ar);
}
