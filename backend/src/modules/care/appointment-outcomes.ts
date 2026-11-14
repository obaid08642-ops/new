/**
 * Pure helpers of the "My appointments" outcomes hub (Design #2145): what a completed visit left the patient, which of it is new,
 * and how the short lab/scan codes of a referral resolve to catalogue rows.
 */
export interface CatalogueHit { id: string; short_code?: string; code?: string; name_ar?: string; name_en?: string }
export type ResolvedCode = { code: string; resolved: true; id: string; short_code: string | null; name_ar: string | null; name_en: string | null } | { code: string; resolved: false };

const norm = (v: unknown): string => String(v ?? '').trim().toLowerCase();

/**
 * A referral stores free-form short codes. Each one resolves to a catalogue row by id, short_code, code, then name_ar / name_en
 * (case-insensitive, exact). A code that matches nothing (or only a row the patient cannot book) stays `{code, resolved:false}` so the client shows it
 * without a Book button.
 */
export function resolveCodes(codes: unknown, rows: CatalogueHit[]): ResolvedCode[] {
  const out: ResolvedCode[] = [];
  const seen = new Set<string>();
  for (const raw of Array.isArray(codes) ? codes : []) {
    const code = String(raw ?? '').trim();
    if (!code || seen.has(norm(code))) continue;
    seen.add(norm(code));
    const n = norm(code);
    const hit = rows.find((r) => norm(r.id) === n) ?? rows.find((r) => norm(r.short_code) === n) ?? rows.find((r) => norm(r.code) === n)
      ?? rows.find((r) => norm(r.name_ar) === n || norm(r.name_en) === n);
    out.push(hit ? { code, resolved: true, id: hit.id, short_code: hit.short_code ?? hit.code ?? null, name_ar: hit.name_ar ?? null, name_en: hit.name_en ?? null } : { code, resolved: false });
  }
  return out;
}

/** An outcome is new when the patient has not marked the appointment's outcomes seen since it was created. */
export function isNewOutcome(createdAt: unknown, seenAt: unknown): boolean {
  if (!seenAt) return true;
  const c = createdAt ? new Date(createdAt as string).getTime() : NaN;
  const s = new Date(seenAt as string).getTime();
  return Number.isNaN(c) ? false : c > s;
}
