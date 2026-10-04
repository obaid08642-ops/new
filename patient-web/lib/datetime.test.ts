import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  PROVIDER_TIME_ZONE,
  formatInProviderZone,
  formatServerInstant,
  isPastSlot,
  isValidServerInstant,
  resolveUserTimeZone,
} from "./datetime";
import {
  getServerTimeOffsetMs,
  isServerTimeAnchored,
  noteServerDate,
  resetServerTimeForTests,
  serverNowMs,
} from "./api/net/server-time";

/**
 * P15.9 — a wrong device clock changes nothing server-derived.
 *
 * Device time is moved ±1 day with fake timers while server instants and the
 * anchored offset stay fixed: every server-derived display must be identical.
 * Server-side enforcement of server time lives in backend/ (another agent).
 */

const INSTANT = "2026-10-01T09:00:00.000Z";
const DAY_MS = 86_400_000;

beforeEach(() => {
  vi.useFakeTimers();
  resetServerTimeForTests();
});

afterEach(() => {
  vi.useRealTimers();
  resetServerTimeForTests();
});

describe("P15.9 — server instants ignore the device clock", () => {
  for (const shift of [DAY_MS, -DAY_MS]) {
    it(`formats identically with the device clock ${shift > 0 ? "+1 day" : "−1 day"}`, () => {
      vi.setSystemTime(new Date(INSTANT).getTime());
      const baseline = formatServerInstant(INSTANT, "en");
      expect(baseline).not.toBeNull();

      vi.setSystemTime(new Date(INSTANT).getTime() + shift);
      expect(formatServerInstant(INSTANT, "en")).toBe(baseline);
      expect(formatServerInstant(INSTANT, "ar")).not.toBeNull();
    });
  }

  it("rejects non-instants instead of rendering 'Invalid Date'", () => {
    expect(formatServerInstant("", "en")).toBeNull();
    expect(formatServerInstant(null, "en")).toBeNull();
    expect(formatServerInstant("not-a-date", "en")).toBeNull();
    expect(formatServerInstant(12345, "en")).toBeNull();
    expect(isValidServerInstant(INSTANT)).toBe(true);
    expect(isValidServerInstant("  ")).toBe(false);
  });
});

describe("P15.9 — providers use Asia/Riyadh", () => {
  it("pins the provider zone regardless of device zone", () => {
    expect(PROVIDER_TIME_ZONE).toBe("Asia/Riyadh");
    // 09:00Z is 12:00 in Riyadh, year-round (no DST): assert the wall hour,
    // which is stable no matter where the test machine sits.
    const parts = new Intl.DateTimeFormat("en", {
      hour: "numeric",
      hour12: false,
      timeZone: PROVIDER_TIME_ZONE,
    }).formatToParts(new Date(INSTANT));
    expect(parts.find((p) => p.type === "hour")?.value).toBe("12");
    expect(formatInProviderZone(INSTANT, "en")).not.toBeNull();
    expect(formatInProviderZone("garbage", "en")).toBeNull();
  });

  it("defaults patient display to the user's zone", () => {
    const zone = resolveUserTimeZone();
    expect(typeof zone).toBe("string");
    expect(zone.length).toBeGreaterThan(0);
    const explicit = new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: zone,
    }).format(new Date(INSTANT));
    expect(formatServerInstant(INSTANT, "en")).toBe(explicit);
  });
});

describe("P15.9 — the server-anchored clock", () => {
  // True server time is T. The device believes T+1 day when the response lands.
  const T = Date.parse("2026-10-01T12:00:00.000Z");
  const httpDate = new Date(T).toUTCString();

  function anchorWithDeviceError(deviceErrorMs: number): void {
    resetServerTimeForTests();
    expect(isServerTimeAnchored()).toBe(false);
    expect(noteServerDate(httpDate, T + deviceErrorMs)).toBe(true);
    expect(isServerTimeAnchored()).toBe(true);
  }

  // The device error is a fixed skew E: the device reads trueMs + E. The anchor
  // measures E once, and every later read cancels that same E. (Every settled
  // response re-anchors, so a clock changed afterwards is re-measured on the
  // next response instead of going stale.)
  it("cancels a +1 day device error", () => {
    anchorWithDeviceError(DAY_MS);
    expect(getServerTimeOffsetMs()).toBe(-DAY_MS);
    const deviceNow = (trueMs: number) => trueMs + DAY_MS;
    expect(serverNowMs(deviceNow(T))).toBe(T);
    expect(serverNowMs(deviceNow(T + 3_600_000))).toBe(T + 3_600_000);
    expect(serverNowMs(deviceNow(T - 3_600_000))).toBe(T - 3_600_000);
  });

  it("cancels a −1 day device error", () => {
    anchorWithDeviceError(-DAY_MS);
    expect(getServerTimeOffsetMs()).toBe(DAY_MS);
    const deviceNow = (trueMs: number) => trueMs - DAY_MS;
    expect(serverNowMs(deviceNow(T))).toBe(T);
    expect(serverNowMs(deviceNow(T + 3_600_000))).toBe(T + 3_600_000);
    expect(serverNowMs(deviceNow(T - 3_600_000))).toBe(T - 3_600_000);
  });

  it("ignores missing or garbage Date headers without losing the anchor", () => {
    anchorWithDeviceError(0);
    expect(noteServerDate(null, T)).toBe(false);
    expect(noteServerDate("not a date", T)).toBe(false);
    expect(noteServerDate("", T)).toBe(false);
    expect(getServerTimeOffsetMs()).toBe(0);
  });

  it("falls back to the device clock before the first response", () => {
    expect(serverNowMs(12345)).toBe(12345);
  });

  it("keeps the past-slot guard stable while the naive check flips", () => {
    // Device consistently +1 day: a slot one server-hour in the future.
    anchorWithDeviceError(DAY_MS);
    vi.setSystemTime(T + DAY_MS);
    const slot = T + 3_600_000;
    // Naive Date.now() comparison calls it past; the anchored guard does not.
    expect(slot < Date.now()).toBe(true);
    expect(isPastSlot(slot)).toBe(false);

    // Device consistently −1 day: a slot two server-hours in the past.
    anchorWithDeviceError(-DAY_MS);
    vi.setSystemTime(T - DAY_MS);
    const pastSlot = T - 7_200_000;
    // Naive comparison calls it future; the anchored guard does not.
    expect(pastSlot < Date.now()).toBe(false);
    expect(isPastSlot(pastSlot)).toBe(true);
  });

  it("treats non-finite slots as past (fail closed, as before)", () => {
    expect(isPastSlot(Number.NaN, T)).toBe(true);
  });
});
