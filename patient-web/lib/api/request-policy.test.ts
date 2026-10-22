import { describe, expect, it } from "vitest";
import {
  AI_TIMEOUT_MS, DEFAULT_TIMEOUT_MS, UPLOAD_TIMEOUT_MS, parseRetryAfter, planRetries, retryAfterTooLong, retryDelayMs, shouldRetryStatus, timeoutFor,
} from "./request-policy";

describe("web BFF request policy (15.1)", () => {
  it("15 s by default, 60 s for an upload, 45 s for the AI routes, or the caller's value", () => {
    expect(timeoutFor("/orders/mine", undefined)).toBe(DEFAULT_TIMEOUT_MS);
    expect(timeoutFor("/storage/upload", "x")).toBe(UPLOAD_TIMEOUT_MS);
    expect(timeoutFor("/profile/photo", new FormData())).toBe(UPLOAD_TIMEOUT_MS);
    expect(timeoutFor("/ai/assistant", "{}")).toBe(AI_TIMEOUT_MS);
    expect(timeoutFor("/airport", undefined)).toBe(DEFAULT_TIMEOUT_MS);
    expect(timeoutFor("/ai/assistant", "{}", 2000)).toBe(2000);
  });

  it("a read, or a write with the browser's own key, may be tried again; a write without one may not", () => {
    expect(planRetries("GET", false).retryTransport).toBe(true);
    expect(planRetries(undefined, false).retryTransport).toBe(true);
    expect(planRetries("POST", true).retryTransport).toBe(true);
    expect(planRetries("POST", false)).toEqual({ retryTransport: false, retryGateway: false });
  });

  it("429 is retried for everyone; 502, 503, 504 only when allowed; 500 and 4xx never", () => {
    const no = planRetries("POST", false);
    const yes = planRetries("GET", false);
    expect(shouldRetryStatus(429, no)).toBe(true);
    expect(shouldRetryStatus(503, no)).toBe(false);
    for (const status of [502, 503, 504]) expect(shouldRetryStatus(status, yes)).toBe(true);
    expect(shouldRetryStatus(500, yes)).toBe(false);
    expect(shouldRetryStatus(404, yes)).toBe(false);
  });

  it("reads Retry-After as seconds or a date; waits that long (up to 5 s), else backs off with jitter", () => {
    expect(parseRetryAfter("3")).toBe(3000);
    const now = Date.parse("2026-10-22T10:00:00Z");
    expect(parseRetryAfter("Thu, 22 Oct 2026 10:00:02 GMT", now)).toBe(2000);
    expect(parseRetryAfter("later")).toBeNull();
    expect(retryDelayMs(0, "2")).toBe(2000);
    expect(retryDelayMs(0, "60")).toBe(5000);
    expect(retryAfterTooLong("60")).toBe(true);
    expect(retryAfterTooLong("4")).toBe(false);
    expect(retryDelayMs(0, null, () => 0.999)).toBeLessThan(300);
    expect(retryDelayMs(10, null, () => 0.999)).toBeLessThan(2000);
  });
});
