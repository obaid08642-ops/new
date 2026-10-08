export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
    // F82-3: the public pages are static/ISR, so their HTML carries no nonce; server/nonce-server.mjs (the Docker CMD) stamps
    // one on every response. Without it the browser's CSP refuses every script of those pages.
    if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build" && process.env.NABD_CSP_EDGE_NONCE !== "1") {
      console.warn("[csp] patient-web is not running behind server/nonce-server.mjs: the static public pages will have no script nonce and the browser will refuse their scripts. Start it with `node server/nonce-server.mjs`.");
    }
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}
