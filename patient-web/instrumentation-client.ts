// P20.4: browser errors to Sentry, loaded on the first error only.
//
// Next with Turbopack loads only instrumentation-client.ts in the browser (the old sentry.client.config.ts was never
// bundled, so no browser error ever reached Sentry). The SDK is ~55 KB gzip and the pages' script budget (Lighthouse,
// F82) has no room for it, so it is not in the page: this file only listens for uncaught errors and rejections, and
// the first one loads the SDK (its own chunk), starts it and reports that error with its stack. From then on the SDK's
// own handlers report. A page without errors never downloads it. The DSN is inlined at build time
// (Dockerfile.patient-web); the release (SENTRY_RELEASE, the git SHA) is injected by withSentryConfig.

type SentryModule = typeof import("@sentry/nextjs");

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
let sdk: Promise<SentryModule> | null = null;
let started = false;

function start(): Promise<SentryModule> {
  sdk ??= import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({ dsn: DSN, environment: process.env.NODE_ENV, debug: false });
    started = true;
    return Sentry;
  });
  return sdk;
}

function report(error: unknown) {
  if (started) return; // the SDK's own handlers report from here on; errors while it loads are reported below
  start()
    .then((Sentry) => Sentry.captureException(error))
    .catch(() => undefined);
}

if (DSN && typeof window !== "undefined") {
  window.addEventListener("error", (event) => report(event.error ?? event.message));
  window.addEventListener("unhandledrejection", (event) => report(event.reason));
}

export {};
