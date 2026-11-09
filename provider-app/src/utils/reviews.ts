/**
 * A review as the provider screens show it. The server returns raw rating rows (`GET /provider/reviews`): `score`, `user_name`,
 * `createdAt`, `status` (published / pending / rejected), `reply`. The screens used to read `rating`, `author` and `date`,
 * which do not exist, so every star count, name and date was blank.
 */
export interface ReviewView { id: string; rating: number; author: string; date: string; comment: string; reply: string; status: string; canReply: boolean }

export function toReview(r: any): ReviewView {
  const status = String(r?.status ?? 'published');
  return {
    id: String(r?.id ?? r?._id ?? ''),
    rating: Number(r?.score ?? r?.rating ?? 0) || 0,
    author: String(r?.user_name ?? r?.author ?? r?.patient ?? ''),
    date: r?.createdAt || r?.created_at ? new Date(r.createdAt ?? r.created_at).toLocaleDateString() : String(r?.date ?? ''),
    comment: String(r?.comment ?? ''),
    reply: String(r?.reply ?? ''),
    status,
    // the server refuses an answer to a review that is not published (review_not_published)
    canReply: !['pending', 'rejected'].includes(status),
  };
}

export const toReviews = (data: unknown): ReviewView[] => {
  const rows = Array.isArray(data) ? data : (data as { items?: unknown[] } | null)?.items;
  return (Array.isArray(rows) ? rows : []).map(toReview).filter((r) => r.id);
};
