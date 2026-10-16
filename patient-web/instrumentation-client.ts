import * as Sentry from "@sentry/nextjs";

// P20.4: the browser SDK. Next with Turbopack loads only instrumentation-client.ts in the browser (the old
// sentry.client.config.ts was never bundled, so no browser error ever reached Sentry). The DSN is inlined at build
// time (Dockerfile.patient-web); the release (SENTRY_RELEASE, the git SHA) is injected by withSentryConfig.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || undefined,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  debug: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
