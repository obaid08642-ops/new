/**
 * Ordering context (M6, Ord01): where the service happens, who pays and for whom, read from the saved profile.
 * Reads only existing endpoints: GET /users/me/addresses (array) and GET /users/me/insurance (object or null).
 * "For whom" is not shown yet: nothing downstream uses it until the ordering engine (M3) exists.
 */

type Raw = Record<string, unknown>;

function text(v: unknown, max = 160): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;
}

function rowsOf(payload: unknown): Raw[] {
  if (Array.isArray(payload)) return payload.filter((r): r is Raw => !!r && typeof r === "object");
  if (payload && typeof payload === "object") {
    const inner = (payload as Raw).addresses ?? (payload as Raw).data;
    if (Array.isArray(inner)) return inner.filter((r): r is Raw => !!r && typeof r === "object");
  }
  return [];
}

/** The default address (is_default, else the first saved one) as one line, or null when none is saved. */
export function defaultAddressLine(payload: unknown): string | null {
  const rows = rowsOf(payload);
  const chosen = rows.find((r) => r.is_default === true) ?? rows[0];
  if (!chosen) return null;
  const parts = [text(chosen.label), text(chosen.street) ?? text(chosen.line1), text(chosen.district), text(chosen.city)];
  const line = parts.filter((p): p is string => !!p).filter((p, i, all) => all.indexOf(p) === i).join(" · ");
  return line || null;
}

/** The saved insurance as "class", or null when none is saved. The company name is not shown (ids are not names). */
export function insuranceClass(payload: unknown): { hasPolicy: boolean; cls: string | null } {
  if (!payload || typeof payload !== "object") return { hasPolicy: false, cls: null };
  const p = payload as Raw;
  const provider = text(p.provider) ?? text(p.company_id);
  if (!provider) return { hasPolicy: false, cls: null };
  return { hasPolicy: true, cls: text(p.class, 32) ?? text(p.plan_class, 32) ?? null };
}
