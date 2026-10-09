/**
 * What the insurance screens read from the backend, parsed for display only (Batch 7). Every amount, status and text is
 * the server's: nothing here computes a copay, a split or a status. A field the server did not send is left out (never
 * invented), and a row without an id is dropped.
 */
export type Rec = Record<string, unknown>;

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function asRecord(value: unknown): Rec | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Rec) : null;
}

/** The list of a reply that is an array or wraps one in `data` / `requests` / `items`. */
export function listOf(payload: unknown): Rec[] {
  const root = asRecord(payload);
  const list = Array.isArray(payload) ? payload : [root?.data, root?.requests, root?.items].find(Array.isArray);
  return (Array.isArray(list) ? list : []).map(asRecord).filter((row): row is Rec => !!row);
}

const text = (value: unknown): string | undefined => (typeof value === "string" && value.trim() ? value : undefined);
const num = (value: unknown): number | undefined => (typeof value === "number" && Number.isFinite(value) ? value : undefined);

export type RequestRow = { id: string; state: string; bookingId?: string; createdAt?: string; copayAmount?: number; selfPayAmount?: number };

/** GET /insurance/requests/my: the patient's insurance requests, newest first. */
export function parseRequestRows(payload: unknown): RequestRow[] {
  return listOf(payload)
    .flatMap((row) => {
      const id = text(row.id);
      if (!id || !UUID.test(id)) return [];
      return [{ id, state: text(row.state) ?? "", bookingId: text(row.booking_id), createdAt: text(row.created_at) ?? text(row.createdAt), copayAmount: num(row.copay_amount), selfPayAmount: num(row.self_pay_amount) }];
    })
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

/** GET /insurance/requests/:id, the fields the request page shows besides the state (the total and the booking it belongs to). */
export function parseRequestExtras(payload: unknown): { price?: number; bookingId?: string } {
  const root = asRecord(payload);
  const rec = asRecord(root?.data) ?? root;
  const bookingId = text(rec?.booking_id);
  return { price: num(rec?.price) ?? num(rec?.total_amount), bookingId: bookingId && UUID.test(bookingId) ? bookingId : undefined };
}

export type BenefitRow = { key: string; note?: string };

/** GET /insurance/benefits-summary: `{ has_policy, policy, benefits: [{ key, note_ar }] }`. */
export function parseBenefits(payload: unknown): BenefitRow[] | null {
  const root = asRecord(payload);
  if (!root || !Array.isArray(root.benefits)) return null;
  return root.benefits.map(asRecord).filter((row): row is Rec => !!row).map((row, index) => ({ key: text(row.key) ?? String(index), note: text(row.note_ar) ?? text(row.note) }));
}

export type CoverageResult = { eligible: boolean; serviceType?: string; note?: string };

/** GET /insurance/coverage-check: `{ eligible, policy, service_type, note_ar }`. */
export function parseCoverage(payload: unknown): CoverageResult | null {
  const root = asRecord(payload);
  if (!root || typeof root.eligible !== "boolean") return null;
  return { eligible: root.eligible, serviceType: text(root.service_type), note: text(root.note_ar) ?? text(root.note) };
}

export type RefundRow = { id: string; amount?: number; status?: string; date?: string };

/** GET /refunds/my. */
export function parseRefunds(payload: unknown): RefundRow[] {
  return listOf(payload).flatMap((row) => {
    const id = text(row.id) ?? text(row._id);
    return id ? [{ id, amount: num(row.amount), status: text(row.status), date: text(row.createdAt) ?? text(row.created_at) }] : [];
  });
}

export type ProviderRow = { id: string; name: string; type?: string };

/** GET /providers?insurance_company=…: the network providers of the patient's insurer. */
export function parseProviders(payload: unknown): ProviderRow[] {
  return listOf(payload).flatMap((row) => {
    const id = text(row.id) ?? text(row._id);
    const name = text(row.name_ar) ?? text(row.name_en) ?? text(row.name);
    return id && name ? [{ id, name, type: text(row.type) }] : [];
  });
}

export type CompanyRow = { id: string; name: string };

/** GET /insurance/companies: the insurers a policy can be added with. */
export function parseCompanies(payload: unknown): CompanyRow[] {
  return listOf(payload).flatMap((row) => {
    const id = text(row.id) ?? text(row._id) ?? text(row.code);
    if (!id) return [];
    return [{ id, name: text(row.name_ar) ?? text(row.name_en) ?? text(row.name) ?? text(row.code) ?? id }];
  });
}

export type RequestTone = "good" | "wait" | "bad" | "plain";

export const REQUEST_STATES = ["PENDING_PROVIDER_REVIEW", "APPROVED_FULL", "COPAY_PENDING", "COPAY_PAID", "REJECTED", "SELF_PAY_PENDING", "SELF_PAY_PAID", "CANCELLED"] as const;
export type RequestState = (typeof REQUEST_STATES)[number];
export const isRequestState = (value: string): value is RequestState => (REQUEST_STATES as readonly string[]).includes(value);

export function requestTone(state: string): RequestTone {
  if (state === "APPROVED_FULL" || state === "COPAY_PAID" || state === "SELF_PAY_PAID") return "good";
  if (state === "PENDING_PROVIDER_REVIEW" || state === "COPAY_PENDING" || state === "SELF_PAY_PENDING") return "wait";
  if (state === "REJECTED" || state === "CANCELLED") return "bad";
  return "plain";
}

export const TABS = ["policy", "benefits", "claims", "refunds", "network"] as const;
export type InsuranceTab = (typeof TABS)[number];
export const tabOf = (value: string | undefined): InsuranceTab => ((TABS as readonly string[]).includes(value ?? "") ? (value as InsuranceTab) : "policy");
