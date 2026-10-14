/**
 * F82-3: every server-side read of public data gives up after this long. A backend that does not answer must not hang a
 * page render, nor the build (static pages are prerendered at build time): the read then counts as failed, and the page
 * keeps its last good copy or shows its error state. PUBLIC_READ_TIMEOUT_MS overrides it (milliseconds).
 */
export function publicReadSignal(): AbortSignal {
  const ms = Number(process.env.PUBLIC_READ_TIMEOUT_MS || 8000);
  return AbortSignal.timeout(Number.isFinite(ms) && ms > 0 ? ms : 8000);
}
