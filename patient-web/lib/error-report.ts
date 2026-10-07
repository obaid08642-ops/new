import * as Sentry from "@sentry/nextjs";
import { getSentryRelease } from "./sentry-release";

export type SegmentErrorContext = {
  /** Which route boundary caught this (e.g. "locale", "global"). */
  segment: string;
  locale?: string;
};

/**
 * P15.5 — one reporting call for every route-segment fallback.
 *
 * The release is attached explicitly (not left to Sentry's auto-detect, which
 * reads it from build-time globals that standalone/Docker builds often lack),
 * and the Next.js error digest travels as the support reference so a user
 * quoting it can be matched to exactly one event.
 */
export function reportSegmentError(error: unknown, context: SegmentErrorContext): string | undefined {
  const release = getSentryRelease();
  try {
    const eventId = Sentry.captureException(error, {
      tags: { release, segment: context.segment },
      contexts: {
        segment: { name: context.segment, locale: context.locale ?? "unknown" },
      },
    });
    return typeof eventId === "string" ? eventId : undefined;
  } catch {
    // Reporting must never break the fallback UI itself.
    return undefined;
  }
}
