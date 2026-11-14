import { extractNewShareLink, extractShareLinks, type ReceiptKind, type ShareLinkRow } from "./model";

type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

/** The address a person opens: the web page of the shared receipt under this site's own address and the reader's language. */
export const sharedPageUrl = (origin: string, locale: string, token: string) => `${origin}/${locale}/receipt/shared/${encodeURIComponent(token)}`;

const base = (kind: ReceiptKind, bookingId: string) => `/api/patient/billing/invoice/${kind}/${encodeURIComponent(bookingId)}`;

export type CreateResult = { ok: true; id: string; url: string; expiresAt: string | null } | { ok: false; reason: "limit" | "failed" };

/** POST .../share-link: the token comes back once and becomes the site's own address; a 429 is "limit". */
export async function createShareLink(doFetch: Fetch, o: { kind: ReceiptKind; bookingId: string; days: number; locale: string; origin: string; key: string }): Promise<CreateResult> {
  try {
    const response = await doFetch(`${base(o.kind, o.bookingId)}/share-link`, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": o.key }, body: JSON.stringify({ expires_in_days: o.days }) });
    if (response.status === 429) return { ok: false, reason: "limit" };
    const made = response.ok ? extractNewShareLink(await response.json().catch(() => null)) : null;
    return made ? { ok: true, id: made.id, url: sharedPageUrl(o.origin, o.locale, made.token), expiresAt: made.expiresAt } : { ok: false, reason: "failed" };
  } catch {
    return { ok: false, reason: "failed" };
  }
}

/** GET .../share-links; null when the list could not be read (the screen keeps what it had). */
export async function listShareLinks(doFetch: Fetch, kind: ReceiptKind, bookingId: string): Promise<ShareLinkRow[] | null> {
  try {
    const response = await doFetch(`${base(kind, bookingId)}/share-links`, { cache: "no-store" });
    return response.ok ? extractShareLinks(await response.json().catch(() => null)) : null;
  } catch {
    return null;
  }
}

/** DELETE .../share-links/:id */
export async function revokeShareLink(doFetch: Fetch, kind: ReceiptKind, bookingId: string, linkId: string): Promise<boolean> {
  try {
    return (await doFetch(`${base(kind, bookingId)}/share-links/${encodeURIComponent(linkId)}`, { method: "DELETE" })).ok;
  } catch {
    return false;
  }
}
