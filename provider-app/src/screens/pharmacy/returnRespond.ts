/**
 * P7: pure helpers for the pharmacy's answer on a return.
 * GET /pharmacy/returns/provider/:id, POST /pharmacy/returns/provider/:id/respond { agree, note? } (note max 500).
 * The pharmacy only agrees or disputes; the admin decides the refund.
 */
export const RETURN_NOTE_MAX = 500;

export interface RespondBody { agree: boolean; note?: string }

/** Body for the respond call: the note is trimmed and cut to the DTO limit; an empty note is omitted. */
export function buildRespondBody(agree: boolean, note: string): RespondBody {
  const n = note.trim().slice(0, RETURN_NOTE_MAX);
  return n ? { agree, note: n } : { agree };
}

export interface PharmacyResponse { agree: boolean; note: string; at: string | null }

export interface ReturnDetail {
  id: string;
  orderId: string;
  status: string;
  reason: string;
  details: string;
  amount: number | null;
  createdAt: string;
  photos: string[];
  response: PharmacyResponse | null;
}

const s = (v: unknown): string => (typeof v === 'string' ? v : '');

export function mapReturnDetail(raw: unknown): ReturnDetail | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string') return null;
  const amount = r.amount === undefined || r.amount === null ? NaN : Number(r.amount);
  const resp = r.pharmacy_response && typeof r.pharmacy_response === 'object' ? (r.pharmacy_response as Record<string, unknown>) : null;
  return {
    id: r.id,
    orderId: s(r.order_id),
    status: s(r.status).toLowerCase(),
    reason: s(r.reason),
    details: s(r.details),
    amount: Number.isFinite(amount) ? amount : null,
    createdAt: s(r.createdAt),
    photos: Array.isArray(r.attached_docs) ? r.attached_docs.filter((u): u is string => typeof u === 'string' && /^https?:\/\//.test(u)) : [],
    response: resp ? { agree: resp.agree === true, note: s(resp.note), at: s(resp.at) || null } : null,
  };
}

/** The pharmacy can answer only while the return is still being processed and has no answer yet. */
export function canRespond(d: ReturnDetail): boolean {
  return d.status === 'processing' && !d.response;
}

export type ReturnErrorKey = 'not_yours' | 'already_decided' | 'other';

export function returnErrorKey(err: unknown): ReturnErrorKey {
  const resp = (err as { response?: { status?: number; data?: { message?: unknown } } } | null)?.response;
  const msg = resp?.data?.message;
  const text = Array.isArray(msg) ? msg.join(' ') : typeof msg === 'string' ? msg : '';
  if (resp?.status === 404) return 'not_yours';
  if (text.includes('return_already_decided')) return 'already_decided';
  return 'other';
}
