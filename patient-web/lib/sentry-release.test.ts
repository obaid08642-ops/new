import { describe, expect, it, vi, afterEach } from "vitest";
import { PATIENT_WEB_SENTRY_APP_ID, getSentryRelease } from "./sentry-release";

/** P15.5 — the release attached to every event is never empty or accidental. */

afterEach(() => vi.unstubAllGlobals());

describe("P15.5 — sentry release resolution", () => {
  it("prefers an explicit SENTRY_RELEASE (the full contracted name CI sets)", () => {
    expect(getSentryRelease({ SENTRY_RELEASE: "patient-web@1.2.3+9f2c1ab", NODE_ENV: "production" })).toBe(
      "patient-web@1.2.3+9f2c1ab",
    );
  });

  it("reads the legacy NEXT_PUBLIC_SENTRY_RELEASE when SENTRY_RELEASE is absent", () => {
    expect(
      getSentryRelease({ NEXT_PUBLIC_SENTRY_RELEASE: "patient-web@1.2.3+9f2c1ab", NODE_ENV: "production" }),
    ).toBe("patient-web@1.2.3+9f2c1ab");
  });

  it("F8 — implements the shared contract {appId}@{version}+{build} with appId patient-web", () => {
    expect(PATIENT_WEB_SENTRY_APP_ID).toBe("patient-web");
    expect(
      getSentryRelease({ NEXT_PUBLIC_APP_VERSION: "1.2.3", SENTRY_BUILD: "9f2c1ab", NODE_ENV: "production" }),
    ).toBe("patient-web@1.2.3+9f2c1ab");
  });

  it("F8 — dev builds append +dev instead of colliding with production releases", () => {
    expect(
      getSentryRelease({ NEXT_PUBLIC_APP_VERSION: "1.2.3", SENTRY_BUILD: "9f2c1ab", NODE_ENV: "development" }),
    ).toBe("patient-web@1.2.3+9f2c1ab+dev");
  });

  it("falls back to a distinguishable dev release rather than an empty string", () => {
    const fallback = getSentryRelease({ NODE_ENV: "development" });
    expect(fallback.startsWith("patient-web@")).toBe(true);
    expect(fallback).toContain("+");
    expect(fallback.endsWith("+dev")).toBe(true);
    expect(getSentryRelease({ SENTRY_RELEASE: "   ", NODE_ENV: "development" })).toBe(fallback);
  });

  it("ignores blank legacy values instead of shipping an empty release", () => {
    const fallback = getSentryRelease({ NODE_ENV: "development" });
    expect(getSentryRelease({ NEXT_PUBLIC_SENTRY_RELEASE: "  ", NEXT_PUBLIC_APP_VERSION: "" })).toBe(fallback);
  });
});
