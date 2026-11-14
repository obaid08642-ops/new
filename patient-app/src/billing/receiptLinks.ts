import { apiFetch } from '../utils/api';
import { extractNewShareLink, extractShareLinks, sharedPageUrl, type ReceiptKind, type ShareLinkRow } from '../utils/receipt';

type Fetcher = typeof apiFetch;
const base = (kind: ReceiptKind, bookingId: string) => `/billing/invoice/${kind}/${encodeURIComponent(bookingId)}`;

export type CreateResult = { ok: true; id: string; url: string; expiresAt: string | null } | { ok: false; reason: 'limit' | 'failed' };

/** POST .../share-link (the token comes back once; it becomes the web page's address); a 429 is "limit". */
export async function createShareLink(o: { kind: ReceiptKind; bookingId: string; days: number; lang: string }, doFetch: Fetcher = apiFetch): Promise<CreateResult> {
  try {
    const made = extractNewShareLink(await doFetch(`${base(o.kind, o.bookingId)}/share-link`, { method: 'POST', body: JSON.stringify({ expires_in_days: o.days }) }));
    return made ? { ok: true, id: made.id, url: sharedPageUrl(o.lang, made.token), expiresAt: made.expiresAt } : { ok: false, reason: 'failed' };
  } catch (error) {
    return { ok: false, reason: /429|rate_limited|too_many/i.test(String((error as Error)?.message)) ? 'limit' : 'failed' };
  }
}

/** GET .../share-links; null when the list could not be read (the screen keeps what it had). */
export async function listShareLinks(kind: ReceiptKind, bookingId: string, doFetch: Fetcher = apiFetch): Promise<ShareLinkRow[] | null> {
  try {
    return extractShareLinks(await doFetch(`${base(kind, bookingId)}/share-links`));
  } catch {
    return null;
  }
}

/** DELETE .../share-links/:id */
export async function revokeShareLink(kind: ReceiptKind, bookingId: string, linkId: string, doFetch: Fetcher = apiFetch): Promise<boolean> {
  try {
    await doFetch(`${base(kind, bookingId)}/share-links/${encodeURIComponent(linkId)}`, { method: 'DELETE' });
    return true;
  } catch {
    return false;
  }
}
