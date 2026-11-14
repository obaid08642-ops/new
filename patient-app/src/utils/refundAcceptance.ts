/**
 * The refund policy is shown before payment and the patient ticks "I agree" (owner decision 2026-11-09, KSA e-commerce law). The backend
 * requires `refund_policy_accepted: true` in the body of every patient booking or order create and answers 400
 * `refund_policy_acceptance_required` without it; an explicit false is always refused. Every create that sends a body goes through
 * `withRefundPolicy`, so the field is never forgotten or sent as false. Same helper as the web (patient-web/lib/refund-policy.ts).
 */
export const REFUND_POLICY_FIELD = 'refund_policy_accepted' as const;

/**
 * The hash of the policy text the patient's screen showed, per service (`GET /refund-policy/summary` answers it next to the lines). It is sent back as `refund_policy_hash` so the
 * server can refuse a table that changed while the patient was on the screen (409 `refund_policy_changed`). Only a summary that was really shown is remembered: a card that did not
 * load or shows the screen's own figures forgets the entry, so nothing stale is ever sent. Same helper as the web (patient-web/lib/refund-policy.ts).
 */
const shownHashes = new Map<string, string>();
const HASH = /^[a-f0-9]{64}$/;
const listeners = new Set<(service: string) => void>();

export function rememberShownPolicy(service: string, hash: unknown): void {
  if (typeof hash === 'string' && HASH.test(hash)) shownHashes.set(service, hash);
  else shownHashes.delete(service);
}
export function shownPolicyHash(service: string): string | undefined { return shownHashes.get(service); }
export function readRefundSummaryHash(payload: unknown): string | undefined {
  const h = payload && typeof payload === 'object' ? (payload as { hash?: unknown }).hash : undefined;
  return typeof h === 'string' && HASH.test(h) ? h : undefined;
}
/** `{ refund_policy_hash }` for a body built by hand (spread it next to `refund_policy_accepted: true`); empty when no text of that service was shown. */
export function policyHashField(service: string): { refund_policy_hash?: string } {
  const hash = shownPolicyHash(service);
  return hash ? { refund_policy_hash: hash } : {};
}

/** The body with the acceptance added (and the hash of the policy text shown for `service`, when there is one). Only called after the patient ticked: it never produces `false`. */
export function withRefundPolicy<T extends Record<string, unknown>>(body: T, service?: string): T & { refund_policy_accepted: true; refund_policy_hash?: string } {
  return { ...body, [REFUND_POLICY_FIELD]: true, ...(service ? policyHashField(service) : {}) } as T & { refund_policy_accepted: true; refund_policy_hash?: string };
}

/** The policy card of a service subscribes here to reload its text and ask for the tick again after a 409 `refund_policy_changed`. Returns the unsubscribe. */
export function onRefundPolicyChanged(listener: (service: string) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/**
 * Call this with the failure of a create (the status and what the server answered). When it is 409 `refund_policy_changed` the shown text is out of date: the remembered hash is dropped and the
 * policy card reloads the text and asks for the tick again. Returns true when it was that error (the caller then stops quietly: the card says what happened).
 */
export function noteRefundPolicyChanged(service: string, status: number, data: unknown): boolean {
  let text = '';
  try { text = typeof data === 'string' ? data : JSON.stringify(data ?? ''); } catch { text = ''; }
  if (status !== 409 || !text.includes('refund_policy_changed')) return false;
  shownHashes.delete(service);
  listeners.forEach((listener) => listener(service));
  return true;
}

/** Same for a create that threw: `apiFetch` throws an Error whose message is the server's `message`, which for this refusal is exactly `refund_policy_changed`. */
export function noteRefundPolicyChangedError(service: string, error: unknown): boolean {
  return error instanceof Error && error.message === 'refund_policy_changed' && noteRefundPolicyChanged(service, 409, error.message);
}

/**
 * The text of the policy at the tick, per service (lane Z: `GET /refund-policy/summary?service=...` answers
 * `{ service, version, hash, lines: [{ key, params }] }`). The server sends keys and the numbers it applies; the wording is ours, in the six
 * languages (`refund.policy.*`). An unknown key is dropped, never shown raw. Same reader as the web (patient-web/lib/refund-policy.ts).
 */
export type RefundService = 'consultation' | 'lab' | 'radiology' | 'nursing' | 'pharmacy';
export type RefundLine = { key: string; params: Record<string, string | number> };

export const refundSummaryPath = (service: RefundService): string => `/refund-policy/summary?service=${service}`;

/** Every line key the server may send; each has a message in all six languages (tested). */
export const KNOWN_LINES = new Set([
  'consultation.full', 'consultation.late', 'consultation.patient_no_show', 'consultation.free_reschedule', 'consultation.provider_no_show',
  'lab.after_transit', 'nursing.after_transit', 'nursing.patient_absent',
  'lab.full', 'lab.late', 'nursing.full', 'nursing.late', 'radiology.full', 'radiology.late', 'pharmacy.before_preparation', 'pharmacy.before_preparation_fee', 'pharmacy.after_preparation', 'consultation.late_rescheduled', 
  'provider_cancel', 'card_destination',
]);

/** The lines of the summary answer as locale keys (`refund.policy.<key>`) with their numbers. */
export function readRefundSummary(payload: unknown): RefundLine[] {
  const list = payload && typeof payload === 'object' ? (payload as { lines?: unknown }).lines : null;
  if (!Array.isArray(list)) return [];
  const out: RefundLine[] = [];
  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue;
    const raw = (entry as { key?: unknown }).key;
    if (typeof raw !== 'string' || !raw.startsWith('refund.policy.')) continue;
    const rawParams = (entry as { params?: unknown }).params;
    const params: Record<string, string | number> = {};
    if (rawParams && typeof rawParams === 'object') {
      for (const [name, value] of Object.entries(rawParams as Record<string, unknown>)) {
        if (typeof value === 'string' || typeof value === 'number') params[name] = value;
        else if (typeof value === 'boolean') params[name] = value ? '1' : '0';
      }
    }
    let key = raw.slice('refund.policy.'.length);
    if (key === 'pharmacy.before_preparation' && params.delivery_fee_refunded === '1') key = 'pharmacy.before_preparation_fee';
    if (KNOWN_LINES.has(key)) out.push({ key: `refund.policy.${key}`, params });
  }
  return out;
}
