import client from './client';

/**
 * P22.7 — provider review replies.
 *
 * Backend (sibling branch p22-b, read-only here):
 * - GET  /provider/reviews            (reviews received by this provider)
 * - POST /provider/reviews/:id/reply { reply: string } (owner-only; 403 on another provider's review)
 */

export interface ProviderReview {
  id: string;
  author?: string;
  patient?: string;
  rating?: number;
  comment?: string;
  date?: string;
  reply?: string;
}

function requireId(id: string): string {
  const v = String(id || '').trim();
  if (!v) throw new Error('review_id_required');
  return v;
}

export async function getMyReviews(): Promise<ProviderReview[]> {
  const res = await client.get('/provider/reviews');
  const data = res.data?.data || res.data;
  return Array.isArray(data) ? data : data?.items || [];
}

/** Reply to one review. Empty replies are rejected client-side (server field is optional). */
export async function replyToReview(reviewId: string, reply: string): Promise<unknown> {
  const id = requireId(reviewId);
  const text = String(reply || '').trim();
  if (!text) throw new Error('reply_text_required');
  const res = await client.post(`/provider/reviews/${encodeURIComponent(id)}/reply`, { reply: text });
  return res.data?.data || res.data;
}
