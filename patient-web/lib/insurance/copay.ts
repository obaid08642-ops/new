/**
 * The card's copay figures (owner 2026-10-24), optional on a policy: `copay_percent` 0..100 and `copay_cap_sar` >= 0 (the names of
 * the backend policy DTO). An empty field is not sent; a filled one must be a plain number inside its range.
 */
export type CopayBody = { copay_percent?: number; copay_cap_sar?: number };
export type CopayResult = { ok: true; body: CopayBody } | { ok: false; field: "percent" | "cap" };

const NUMBER = /^\d{1,7}([.,]\d{1,2})?$/;
const read = (raw: string): number | null | undefined => {
  const text = raw.trim();
  if (!text) return undefined;
  if (!NUMBER.test(text)) return null;
  const n = Number(text.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

/** What choosing an insurer's class puts in the two copay boxes: the catalogue's figures when it has them, else what the patient already typed. Both stay editable. */
export function figuresForClass(item: { copayPercent?: number; copayCapSar?: number } | null, current: { percent: string; cap: string }): { percent: string; cap: string } {
  if (!item) return current;
  return {
    percent: item.copayPercent !== undefined ? String(item.copayPercent) : current.percent,
    cap: item.copayCapSar !== undefined ? String(item.copayCapSar) : current.cap,
  };
}

export function copayBody(percentText: string, capText: string): CopayResult {
  const percent = read(percentText);
  const cap = read(capText);
  if (percent === null || (percent !== undefined && percent > 100)) return { ok: false, field: "percent" };
  if (cap === null || (cap !== undefined && cap > 1_000_000)) return { ok: false, field: "cap" };
  return { ok: true, body: { ...(percent !== undefined ? { copay_percent: percent } : {}), ...(cap !== undefined ? { copay_cap_sar: cap } : {}) } };
}
