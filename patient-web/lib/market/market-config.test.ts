import { afterEach, describe, expect, it, vi } from "vitest";
import { marketDay, marketHour, parseMarketConfig, SA_MARKET_DEFAULTS } from "./market-defaults";
import { getMarketConfig } from "./market-config";
import { parseRecordRows } from "@/lib/api/dashboard-extras";

/** Pins the launch-market defaults to what the Saudi site hard-wired before lib/market existed. */
describe("SA_MARKET_DEFAULTS == the old Saudi constants", () => {
  it("time zone, currency, phone, emergency number, weekend, locales", () => {
    expect(SA_MARKET_DEFAULTS.timezone).toBe("Asia/Riyadh");
    expect(SA_MARKET_DEFAULTS.currency).toEqual({ code: "SAR", exponent: 2 });
    expect(SA_MARKET_DEFAULTS.phone.default_dial).toBe("+966");
    expect(SA_MARKET_DEFAULTS.emergency_numbers.ambulance).toBe("997");
    expect(SA_MARKET_DEFAULTS.weekend).toEqual(["friday", "saturday"]);
    expect(SA_MARKET_DEFAULTS.locales.enabled).toEqual(["ar", "en", "ur", "hi", "bn", "fil"]);
    expect(SA_MARKET_DEFAULTS.operated_by).toBeNull();
  });
  it("is itself a valid backend answer", () => {
    expect(parseMarketConfig(SA_MARKET_DEFAULTS)).toEqual(SA_MARKET_DEFAULTS);
  });
});

describe("day and hour in the market zone (same as the old inline Intl calls)", () => {
  const oldDay = (at: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh", year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
  const oldHour = (at: Date) => Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Riyadh" }).format(at));
  it("agrees for 500 instants around midnight and noon", () => {
    for (let i = 0; i < 500; i++) {
      const at = new Date(Date.UTC(2026, 0, 1) + i * 97 * 60 * 1000);
      expect(marketDay("Asia/Riyadh", at)).toBe(oldDay(at));
      expect(marketHour("Asia/Riyadh", at)).toBe(oldHour(at));
    }
  });
  it("another zone moves the day boundary: 22:30Z is Jan 16 in Cairo (+2) and Riyadh (+3) but still Jan 15 in São Paulo (-3)", () => {
    const at = new Date("2026-01-15T22:30:00Z");
    expect(marketDay("Africa/Cairo", at)).toBe("2026-01-16");
    expect(marketDay("Asia/Riyadh", at)).toBe("2026-01-16");
    expect(marketDay("America/Sao_Paulo", at)).toBe("2026-01-15");
  });
});

describe("parseRecordRows uses the market zone, SA by default", () => {
  const input = { nutrition: null, vitals: null, mood: { data: [{ logged_at: "2026-01-15T22:30:00Z", mood: 3 }] }, maternity: null };
  const now = new Date("2026-01-16T05:00:00Z");
  it("default zone is Riyadh (unchanged behaviour)", () => {
    expect(parseRecordRows(input, now)).toEqual(parseRecordRows(input, now, "Asia/Riyadh"));
  });
});

describe("getMarketConfig", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("returns the backend answer when it is valid", async () => {
    const eg = { ...SA_MARKET_DEFAULTS, market_id: "EG", country: "EG", timezone: "Africa/Cairo", currency: { code: "EGP", exponent: 2 } };
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(eg), { status: 200 })));
    expect((await getMarketConfig()).timezone).toBe("Africa/Cairo");
  });
  it.each([["non-2xx", async () => new Response("x", { status: 503 })], ["malformed body", async () => new Response(JSON.stringify({ nope: 1 }), { status: 200 })], ["network error", async () => { throw new Error("down"); }]])(
    "falls back to the launch market on %s (a page never fails because of this call)",
    async (_n, impl) => {
      vi.stubGlobal("fetch", vi.fn(impl as never));
      expect(await getMarketConfig()).toEqual(SA_MARKET_DEFAULTS);
    },
  );
});
