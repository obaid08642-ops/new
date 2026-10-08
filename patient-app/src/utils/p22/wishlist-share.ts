/**
 * P22.2 — shareable wishlists (patient surfaces).
 *
 * Backend contract (sibling branch p22-a, verified by reading
 * wishlist.controller.ts + wishlist-share.service.ts):
 *   POST   wishlist/share            { item_ids: string[] } -> { token, items, created_at }
 *   GET    wishlist/shares           -> [{ token, items_count, created_at }]
 *   DELETE wishlist/shares/:token
 *   GET    wishlist/shared/:token    PUBLIC (no auth) -> { token, items, created_at }
 *
 * No-leak rule: the resolve path returns a frozen snapshot of public product
 * fields only (id, names, price, image) — never owner identity. The client
 * enforces the same allowlist at render time: `sanitizeSharedItems` drops any
 * extra field a (possibly older/newer) server might send, so the shared-link
 * viewer provably cannot display non-public data.
 */

export interface SharedWishlistItem {
  id: string;
  name_ar: string;
  name_en: string | null;
  price: number;
  image: string | null;
}

export interface WishlistShare {
  token: string;
  items: SharedWishlistItem[];
  created_at: string | Date;
}

export type ApiFetch = (path: string, init?: Record<string, unknown>) => Promise<unknown>;

/** Fields the open-link viewer is allowed to render. Everything else is dropped. */
export const SHARED_ITEM_FIELDS = ['id', 'name_ar', 'name_en', 'price', 'image'] as const;

export function sanitizeSharedItems(raw: unknown): SharedWishlistItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
    const e = (entry || {}) as Record<string, unknown>;
    return {
      id: String(e.id ?? ''),
      name_ar: String(e.name_ar ?? ''),
      name_en: typeof e.name_en === 'string' ? e.name_en : null,
      price: Number(e.price ?? 0),
      image: typeof e.image === 'string' ? e.image : null,
    };
  }).filter((it) => it.id.length > 0);
}

/** Guard share creation input: 1..50 non-empty ids, de-duplicated. */
export function buildShareIds(itemIds: unknown): string[] {
  const ids = [...new Set((Array.isArray(itemIds) ? itemIds : []).map((s) => String(s || '').trim()))].filter(Boolean);
  if (ids.length === 0) throw new Error('share_items_required');
  if (ids.length > 50) throw new Error('share_too_many_items');
  return ids;
}

function unwrapShare(res: unknown): WishlistShare {
  const obj = ((res || {}) as { data?: unknown }) ?? {};
  const s = (obj.data ?? res) as {
    token: string;
    items: unknown;
    created_at: string | Date;
  };
  return { token: String(s.token), items: sanitizeSharedItems(s.items), created_at: s.created_at };
}

export async function createWishlistShare(fetch: ApiFetch, itemIds: unknown): Promise<WishlistShare> {
  const res = await fetch('/wishlist/share', {
    method: 'POST',
    headers: { 'Idempotency-Key': `wl-share-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}` },
    body: JSON.stringify({ item_ids: buildShareIds(itemIds) }),
  });
  return unwrapShare(res);
}

export async function listWishlistShares(fetch: ApiFetch): Promise<Array<{ token: string; items_count: number; created_at: string | Date }>> {
  const res = await fetch('/wishlist/shares');
  if (Array.isArray(res)) return res as Array<{ token: string; items_count: number; created_at: string | Date }>;
  const obj = (res || {}) as { data?: unknown };
  return (Array.isArray(obj.data) ? obj.data : []) as Array<{ token: string; items_count: number; created_at: string | Date }>;
}

export async function revokeWishlistShare(fetch: ApiFetch, token: string): Promise<unknown> {
  if (!token) throw new Error('share_token_required');
  return fetch(`/wishlist/shares/${token}`, { method: 'DELETE' });
}

/** Public resolve path — works without auth so recipients can open the link. */
export async function resolveWishlistShare(fetch: ApiFetch, token: string): Promise<WishlistShare> {
  if (!token) throw new Error('share_token_required');
  const res = await fetch(`/wishlist/shared/${token}`);
  return unwrapShare(res);
}
