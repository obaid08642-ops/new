/** The documents the legal service publishes (GET /legal/policies) and how the About screen reads them. */
export type PolicyListItem = { key: string; title: string; version: string | null };

/** The four documents the patient site already has a page for. */
export const PAGE_POLICIES = ["patient_terms", "privacy_policy", "refund_policy", "telehealth_consent"] as const;

/** Shown as sections of Settings > About and legal (the public pages /refund-policy and /telehealth-consent stay for the flows that link them). */
export const INLINE_POLICIES = ["refund_policy", "telehealth_consent"] as const;

const rec = (value: unknown): Record<string, unknown> | null => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null);
const str = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value.trim() : null);

/**
 * The list a patient may read: a document for the other side (`applies_to` without "all" or "patient") is left out. The title
 * is the Arabic one on the Arabic site and the English one elsewhere (the service holds those two), falling back to the other,
 * then to the key.
 */
export function parsePolicyList(payload: unknown, locale: string): PolicyListItem[] {
  const root = rec(payload);
  const rows = Array.isArray(payload) ? payload : Array.isArray(root?.data) ? root.data : [];
  return rows.flatMap((row): PolicyListItem[] => {
    const r = rec(row);
    const key = str(r?.key);
    if (!r || !key || !/^[a-z0-9][a-z0-9_-]{1,63}$/.test(key)) return [];
    const appliesTo = Array.isArray(r.applies_to) ? r.applies_to.filter((item): item is string => typeof item === "string") : [];
    if (appliesTo.length > 0 && !appliesTo.includes("all") && !appliesTo.includes("patient")) return [];
    const ar = str(r.title_ar);
    const en = str(r.title_en);
    const version = typeof r.version === "number" || typeof r.version === "string" ? String(r.version).trim() || null : null;
    return [{ key, title: (locale === "ar" ? ar ?? en : en ?? ar) ?? key, version }];
  });
}
