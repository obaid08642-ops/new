/**
 * 15.3 — the wishlist request behind the heart, apart from the screen so its failure paths can be tested.
 * The heart is optimistic (it changes before this answers); the caller puts it back unless the answer is `ok`.
 */
export type WishlistToggle =
  | { state: "ok"; inList: boolean }
  | { state: "signed_out" }
  | { state: "failed" };

type Fetcher = (input: string, init: RequestInit) => Promise<Pick<Response, "ok" | "status" | "json">>;

/** `was` is the state before the press: the answer to use when the server does not say which way it went. */
export async function requestWishlistToggle(itemId: string, was: boolean, key: string, fetcher: Fetcher = fetch): Promise<WishlistToggle> {
  try {
    const response = await fetcher(`/api/patient/users/me/wishlist/${encodeURIComponent(itemId)}`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "idempotency-key": key },
    });
    if (response.status === 401) return { state: "signed_out" };
    if (!response.ok) return { state: "failed" };
    const body = (await response.json().catch(() => null)) as { in_wishlist?: unknown } | null;
    return { state: "ok", inList: typeof body?.in_wishlist === "boolean" ? body.in_wishlist : !was };
  } catch {
    return { state: "failed" };
  }
}
