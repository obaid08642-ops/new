import * as Sentry from "@sentry/nextjs";
import { getSentryRelease } from "./lib/sentry-release";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || undefined,
  environment: process.env.NODE_ENV,
  // P15.5: every event carries the release it shipped in.
  release: getSentryRelease(),
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  debug: false,
});
