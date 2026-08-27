import { BASE_URL } from './api';

/**
 * Image URL resolver — Phase 4 contract:
 *   • Images come from Cloudflare R2 (public CDN base) — NEVER local folders.
 *   • Absolute http(s) URLs (already R2/CDN) pass through untouched.
 *   • Relative keys resolve against EXPO_PUBLIC_CDN_URL, falling back to the
 *     backend host (which streams from R2 via the storage service).
 */
const CDN_BASE =
  process.env.EXPO_PUBLIC_CDN_URL ||
  BASE_URL.replace('/api/v1', '');

export function resolveImageUri(input?: string | null): string | null {
  if (!input || typeof input !== 'string') return null;
  const u = input.trim();
  if (!u) return null;
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  if (u.startsWith('/')) return `${CDN_BASE}${u}`;
  return `${CDN_BASE}/${u}`;
}

/** Build a full gallery from every image field the API may return. */
export function resolveGallery(med: any): string[] {
  if (!med) return [];
  const raw: any[] = [
    ...(Array.isArray(med.images) ? med.images : []),
    med.image_1, med.image_2, med.image_3, med.image_4, med.image_5,
    med.image,
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of raw) {
    const u = resolveImageUri(r);
    if (u && !seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  }
  return out;
}
