import { describe, expect, it, vi, afterEach } from "vitest";
import { DEV_RELEASE, getSentryRelease } from "./sentry-release";

/** P15.5 — the release attached to every event is never empty or accidental. */

afterEach(() => vi.unstubAllGlobals());

describe("P15.5 — sentry release resolution", () => {
  it("prefers the CI release (git SHA) over everything else", () => {
    vi.stubGlobal("process", { ...process, env: { NEXT_PUBLIC_SENTRY_RELEASE: "abc123", NEXT_PUBLIC_APP_VERSION: "9.9.9" } });
    expect(getSentryRelease()).toBe("abc123");
  });

  it("falls back to the public app version", () => {
    expect(getSentryRelease({ NEXT_PUBLIC_APP_VERSION: "1.2.3" })).toBe("1.2.3");
  });

  it("ignores blank values instead of shipping an empty release", () => {
    expect(getSentryRelease({ NEXT_PUBLIC_SENTRY_RELEASE: "  ", NEXT_PUBLIC_APP_VERSION: "" })).toBe(DEV_RELEASE);
  });

  it("marks dev explicitly when nothing is configured", () => {
    expect(DEV_RELEASE).toBe("patient-web-dev");
    expect(getSentryRelease({})).toBe(DEV_RELEASE);
  });
});
