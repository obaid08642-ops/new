import { AdminApiError, apiErrorMessage } from '@/lib/admin-client';

export interface ReviewArticle {
  id: string;
  title: string;
  doctorId: string;
  createdAt: string;
  body: string;
}

type Raw = Record<string, unknown>;
const text = (v: unknown) => (typeof v === 'string' ? v : '');

/** One article of GET /admin/articles (list: no body) or GET /admin/articles/:id (with body). */
export function reviewArticle(raw: unknown): ReviewArticle | null {
  const r = (raw && typeof raw === 'object' ? raw : null) as Raw | null;
  if (!r || typeof r.id !== 'string') return null;
  const author = (r.author && typeof r.author === 'object' ? r.author : {}) as Raw;
  return {
    id: r.id,
    title: text(r.title_ar) || text(r.title_en),
    doctorId: text(author.doctor_id),
    createdAt: text(r.createdAt),
    body: text(r.body_ar) || text(r.body_en),
  };
}

export function reviewList(raw: unknown): ReviewArticle[] {
  const rows = Array.isArray(raw) ? raw : [];
  return rows.map(reviewArticle).filter((a): a is ReviewArticle => a !== null);
}

export const BRAND_NOT_ALLOWED = 'prescription_brand_not_allowed';
export const BRAND_NOT_ALLOWED_MESSAGE = 'لا يمكن اعتماد المقال: النص يذكر اسم دواء لا يُصرف إلا بوصفة طبية. اطلب من الطبيب حذف الاسم ثم أعد المراجعة، أو ارفض المقال مع ذكر السبب.';

/** A 400 prescription_brand_not_allowed gets a clear message; any other error keeps the server message. */
export function approveErrorMessage(cause: unknown): string {
  if (cause instanceof AdminApiError && cause.status === 400) {
    const message = (cause.payload as { message?: unknown } | null)?.message;
    const flat = Array.isArray(message) ? message.join(' ') : String(message ?? '');
    if (flat.includes(BRAND_NOT_ALLOWED)) return BRAND_NOT_ALLOWED_MESSAGE;
  }
  return apiErrorMessage(cause, 'تعذر اعتماد المقال. لم يتغير شيء.');
}
