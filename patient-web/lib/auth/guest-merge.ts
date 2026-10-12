/**
 * Phase 21.2 — which guest session is this request starting from?
 *
 * The browser holds the guest access token in an HttpOnly cookie. When the user
 * signs in with a password, a code or a provider, the backend needs PROOF that
 * the caller is that guest, so it can move the guest's cart, orders and
 * bookings into the new account.
 *
 * The token travels, never the guest id: an id is visible to the pharmacy, in
 * logs and in screenshots, and would let anybody who ever saw it claim that
 * guest's data. The backend verifies the signature, checks the account is still
 * a live guest, and burns the token so it cannot be replayed.
 */
import { cookies } from "next/headers";
import { authCookieNames } from "./cookies";
import { hintFromAccessToken } from "./session-hint";

/** The guest session token held by this browser, or null. */
export async function guestTokenFromCookies(): Promise<string | null> {
  try {
    const access = (await cookies()).get(authCookieNames.access)?.value;
    if (!access) return null;
    const hint = hintFromAccessToken(access);
    return hint && hint.kind === "user" && hint.isGuest ? access : null;
  } catch {
    return null;
  }
}

/** Upstream headers for a sign-in request, carrying the guest token when there is one. */
export async function guestMergeHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const token = await guestTokenFromCookies();
  return { ...extra, ...(token ? { "x-guest-token": token } : {}) };
}