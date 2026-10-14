/**
 * Did the service FAIL (no answer at all, or a 5xx)? That is different from an answer with nothing in it (an empty 200, a
 * 404 for an optional part), which a page simply hides. Home and the dashboard show the error state with a retry for a
 * failure and never mistake an outage for an account without data. A 401 is handled by the page (sign in again).
 */
export function isOutage(response: Pick<Response, "status"> | null | undefined): boolean {
  return !response || response.status >= 500;
}
