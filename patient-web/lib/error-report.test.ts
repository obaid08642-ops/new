import { describe, expect, it, vi, beforeEach } from "vitest";

const sentryState = vi.hoisted(() => ({ captureException: vi.fn(), throwOnCapture: false }));

vi.mock("@sentry/nextjs", () => ({
  captureException: (error: unknown, context: unknown) => {
    if (sentryState.throwOnCapture) throw new Error("sentry is down");
    return sentryState.captureException(error, context);
  },
}));

import { reportSegmentError } from "./error-report";
import { getSentryRelease } from "./sentry-release";

/**
 * P15.5 — a thrown render error reaches Sentry WITH the release. The mock
 * stands in for the Sentry backend (the live send needs the owner DSN and is
 * BLOCKED); what is asserted here is exactly what this slice owns: that the
 * report call carries the release tag, the segment context, and never throws
 * back into the fallback UI.
 */

beforeEach(() => {
  sentryState.captureException.mockReset().mockReturnValue("event-1");
  sentryState.throwOnCapture = false;
});

describe("P15.5 — segment error reporting", () => {
  it("sends the error with the release tag and segment context", () => {
    const error = Object.assign(new Error("boom"), { digest: "abc" });
    const eventId = reportSegmentError(error, { segment: "locale", locale: "ar" });

    expect(eventId).toBe("event-1");
    expect(sentryState.captureException).toHaveBeenCalledTimes(1);
    const [sentError, context] = sentryState.captureException.mock.calls[0];
    expect(sentError).toBe(error);
    expect(context).toMatchObject({
      tags: { release: getSentryRelease(), segment: "locale" },
      contexts: { segment: { name: "locale", locale: "ar" } },
    });
    // The release tag is never empty — an empty release ungroups everything.
    expect((context as { tags: { release: string } }).tags.release.length).toBeGreaterThan(0);
  });

  it("defaults an unknown locale instead of sending undefined", () => {
    reportSegmentError(new Error("x"), { segment: "global" });
    const [, context] = sentryState.captureException.mock.calls[0];
    expect(context).toMatchObject({ contexts: { segment: { name: "global", locale: "unknown" } } });
  });

  it("never throws back into the fallback UI, even if Sentry is down", () => {
    sentryState.throwOnCapture = true;
    expect(() => reportSegmentError(new Error("x"), { segment: "locale" })).not.toThrow();
    expect(reportSegmentError(new Error("x"), { segment: "locale" })).toBeUndefined();
  });
});
