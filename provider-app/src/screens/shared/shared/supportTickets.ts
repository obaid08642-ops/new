/** Shapes of GET /support/tickets (the provider's own requests) and GET /support/faqs, as the screen needs them. */
export interface SupportTicket { id: string; tracking_id?: string; subject: string; status: 'open' | 'in_progress' | 'resolved'; createdAt: string; priority: string }
export interface SupportFaq { id: string; question: string; question_en: string | null; answer: string; answer_en: string | null }

const asArray = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? (v as Record<string, unknown>[]) : []);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** SupportStatus on the server is OPEN / IN_PROGRESS / RESOLVED / CLOSED; the screen shows three states (closed counts as resolved). */
export function ticketStatus(raw: unknown): SupportTicket['status'] {
  const s = str(raw).toUpperCase();
  if (s === 'IN_PROGRESS') return 'in_progress';
  if (s === 'RESOLVED' || s === 'CLOSED') return 'resolved';
  return 'open';
}

export function asTickets(data: unknown): SupportTicket[] {
  const list = asArray((data as { tickets?: unknown; data?: unknown } | null)?.tickets ?? (data as { data?: unknown } | null)?.data ?? data);
  return list.filter((t) => typeof t.id === 'string' && str(t.subject)).map((t) => ({
    id: String(t.id), tracking_id: str(t.tracking_id) || undefined, subject: str(t.subject), status: ticketStatus(t.status),
    createdAt: str(t.createdAt), priority: str(t.priority) || 'medium',
  }));
}

export function asFaqs(data: unknown): SupportFaq[] {
  return asArray((data as { faqs?: unknown } | null)?.faqs ?? data).filter((f) => str(f.question) && str(f.answer)).map((f, i) => ({
    id: str(f.id) || String(i), question: str(f.question), question_en: str(f.question_en) || null, answer: str(f.answer), answer_en: str(f.answer_en) || null,
  }));
}

/** A faq in the screen's language; English only when the admin wrote it, else the Arabic text (there is no machine translation). */
export const faqText = (f: SupportFaq, ar: boolean): { q: string; a: string } => ({ q: ar ? f.question : f.question_en || f.question, a: ar ? f.answer : f.answer_en || f.answer });

/** Message from a failed API call: the server's own text when present, else the fallback. */
export function serverMessage(e: unknown, fallback: string): string {
  const m = (e as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  if (typeof m === 'string' && m.trim()) return m;
  if (Array.isArray(m) && typeof m[0] === 'string') return m[0];
  return fallback;
}
