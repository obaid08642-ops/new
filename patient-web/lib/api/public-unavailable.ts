/**
 * F82-3: what a static/ISR public page throws when the data it is made of could not be read (no answer, or a 5xx).
 *
 * A page that is rendered once and cached (Next's ISR cache, then the edge) must never turn an outage into a cached
 * "empty" or "error" page. Throwing makes Next keep the last good copy and retry on the next request (stale-if-error,
 * the decision of #302: no time cap), and when there is no copy at all the answer is a 5xx, which the nonce server
 * replaces with the translated unavailable page (503, never cached) at the same URL.
 */
export class PublicDataUnavailableError extends Error {
  constructor(readonly what: string) {
    super(`public data unavailable: ${what}`);
    this.name = "PublicDataUnavailableError";
  }
}
