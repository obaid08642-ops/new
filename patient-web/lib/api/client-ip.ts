/**
 * The visitor's address for a call the web server makes on the visitor's behalf (a BFF route under app/api).
 *
 * The backend reads the client address from `req.ip`, which Express resolves from the X-Forwarded-For chain with the number of trusted hops
 * (TRUST_PROXY_HOPS, 2: the web server counts as one, nginx/the CDN as the other). A call from the web server carries no chain at all, so the
 * backend sees the web server's own address for every visitor and every per-address limit becomes one limit for the whole site.
 *
 * Forward the chain exactly as it arrived (the CDN and nginx wrote it; a caller can only prepend entries that sit outside the trusted hops):
 *
 *   callPatientApi("/catalogue/ranking/events", { method: "POST", headers: { ...forwardedForHeaders(request) }, body })
 *
 * Nothing else is forwarded (no cookie, no user agent beyond what the route already passes), and a value that is not a plausible chain is dropped.
 */
const CHAIN = /^[0-9a-fA-F:., ]{1,255}$/;

export function forwardedForHeaders(request: Request): Record<string, string> {
  const chain = request.headers.get("x-forwarded-for")?.trim();
  return chain && CHAIN.test(chain) ? { "x-forwarded-for": chain } : {};
}
