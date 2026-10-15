import { afterEach, describe, expect, it, vi } from "vitest";
import { formatLastUpdated, getOnlineSnapshot, getServerOnlineSnapshot, subscribeOnline, validRenderedAt } from "./offline-status";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("online state", () => {
  it("is online on the server and before the browser answers, so the HTML never carries a banner", () => {
    expect(getServerOnlineSnapshot()).toBe(true);
    vi.stubGlobal("navigator", undefined);
    expect(getOnlineSnapshot()).toBe(true);
  });

  it("follows navigator.onLine in the browser", () => {
    vi.stubGlobal("navigator", { onLine: false });
    expect(getOnlineSnapshot()).toBe(false);
    vi.stubGlobal("navigator", { onLine: true });
    expect(getOnlineSnapshot()).toBe(true);
  });

  it("listens to the online and offline events and stops listening on cleanup", () => {
    const target = new EventTarget();
    vi.stubGlobal("window", target);
    const onChange = vi.fn();
    const stop = subscribeOnline(onChange);
    target.dispatchEvent(new Event("offline"));
    target.dispatchEvent(new Event("online"));
    expect(onChange).toHaveBeenCalledTimes(2);
    stop();
    target.dispatchEvent(new Event("offline"));
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});

describe("last updated", () => {
  const now = Date.UTC(2026, 9, 15, 12, 0, 0);

  it("keeps a real render time, also an old one (a copy kept through an outage)", () => {
    expect(validRenderedAt(now - 60_000, now)).toBe(now - 60_000);
    expect(validRenderedAt(now - 3 * 24 * 3600_000, now)).toBe(now - 3 * 24 * 3600_000);
  });

  it("refuses a missing, broken or future render time instead of inventing one", () => {
    expect(validRenderedAt(undefined, now)).toBeNull();
    expect(validRenderedAt(Number.NaN, now)).toBeNull();
    expect(validRenderedAt(0, now)).toBeNull();
    expect(validRenderedAt(now + 24 * 3600_000, now)).toBeNull();
  });

  it("shows only the time for today, and the date too for an older copy, in the visitor's language", () => {
    const today = formatLastUpdated("en", now - 30 * 60_000, now, "UTC");
    expect(today).toMatch(/11:30/);
    expect(today).not.toMatch(/2026/);
    const older = formatLastUpdated("en", now - 2 * 24 * 3600_000, now, "UTC");
    expect(older).toMatch(/2026/);
    expect(older).toMatch(/12:00/);
    const arabic = formatLastUpdated("ar", now - 30 * 60_000, now, "UTC");
    expect(arabic).not.toBe(today);
  });
});
