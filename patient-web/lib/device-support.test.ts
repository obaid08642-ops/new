import { describe, expect, it } from "vitest";
import { isSupportedBrowser, parseUserAgent } from "./device-support";

/**
 * P15.10 — the minimum-OS/old-device gate. Real user-agent strings, era-matched
 * floors (iOS 16.4+, Android 7+, Chrome/Edge 109+, Samsung Internet 20+,
 * Firefox 109+, desktop Safari 16.4+). Unknown and bot agents pass (fail open).
 */

const UA = {
  ios154: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1",
  ios164: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Mobile/15E148 Safari/604.1",
  ios17: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
  iosChrome: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/112.0.5615.70 Mobile/15E148 Safari/604.1",
  ipadDesktop: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15 Mobile/15E148",
  android6: "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36",
  android7old: "Mozilla/5.0 (Linux; Android 7.0; SM-G930V Build/NRD90M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.125 Mobile Safari/537.36",
  android7new: "Mozilla/5.0 (Linux; Android 7.0; SM-G930V Build/NRD90M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Mobile Safari/537.36",
  android13: "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  samsung19: "Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/19.0 Chrome/102.0.0.0 Mobile Safari/537.36",
  samsung22: "Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/22.0 Chrome/111.0.0.0 Mobile Safari/537.36",
  firefoxAndroid: "Mozilla/5.0 (Android 13; Mobile; rv:120.0) Gecko/120.0 Firefox/120.0",
  desktopChrome: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  desktopChromeOld: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36",
  desktopFirefox: "Mozilla/5.0 (X11; Linux x86_64; rv:115.0) Gecko/20100101 Firefox/115.0",
  desktopSafari17: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
  desktopSafari15: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Safari/605.1.15",
  ie11: "Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko",
  googlebot: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
};

describe("P15.10 — iOS floor 16.4", () => {
  it("rejects iOS 15, accepts 16.4 and 17", () => {
    expect(isSupportedBrowser(UA.ios154)).toEqual({ supported: false, reason: "ios_too_old" });
    expect(isSupportedBrowser(UA.ios164)).toEqual({ supported: true, reason: "ok" });
    expect(isSupportedBrowser(UA.ios17)).toEqual({ supported: true, reason: "ok" });
  });

  it("gates iOS Chrome by OS, not by CriOS version (all iOS browsers are WebKit)", () => {
    expect(isSupportedBrowser(UA.iosChrome)).toEqual({ supported: true, reason: "ok" });
  });

  it("reads desktop-mode iPads as iOS via the Safari version", () => {
    expect(parseUserAgent(UA.ipadDesktop).os).toBe("ios");
    expect(isSupportedBrowser(UA.ipadDesktop)).toEqual({ supported: true, reason: "ok" });
  });
});

describe("P15.10 — Android floor 7", () => {
  it("rejects Android 6 outright", () => {
    expect(isSupportedBrowser(UA.android6)).toEqual({ supported: false, reason: "android_too_old" });
  });

  it("rejects Android 7 with an era-older browser, accepts it current", () => {
    expect(isSupportedBrowser(UA.android7old)).toEqual({ supported: false, reason: "browser_too_old" });
    expect(isSupportedBrowser(UA.android7new)).toEqual({ supported: true, reason: "ok" });
    expect(isSupportedBrowser(UA.android13)).toEqual({ supported: true, reason: "ok" });
  });

  it("gates Samsung Internet at 20 and Firefox Android at 109", () => {
    expect(isSupportedBrowser(UA.samsung19)).toEqual({ supported: false, reason: "browser_too_old" });
    expect(isSupportedBrowser(UA.samsung22)).toEqual({ supported: true, reason: "ok" });
    expect(isSupportedBrowser(UA.firefoxAndroid)).toEqual({ supported: true, reason: "ok" });
  });
});

describe("P15.10 — desktop browsers", () => {
  it("accepts current Chrome, Firefox, Safari; rejects old Chrome/Safari and IE", () => {
    expect(isSupportedBrowser(UA.desktopChrome)).toEqual({ supported: true, reason: "ok" });
    expect(isSupportedBrowser(UA.desktopFirefox)).toEqual({ supported: true, reason: "ok" });
    expect(isSupportedBrowser(UA.desktopSafari17)).toEqual({ supported: true, reason: "ok" });
    expect(isSupportedBrowser(UA.desktopChromeOld)).toEqual({ supported: false, reason: "browser_too_old" });
    expect(isSupportedBrowser(UA.desktopSafari15)).toEqual({ supported: false, reason: "browser_too_old" });
    expect(isSupportedBrowser(UA.ie11).supported).toBe(false);
  });
});

describe("P15.10 — fail open", () => {
  it("passes empty, garbage, unknown, and bot agents", () => {
    expect(isSupportedBrowser("")).toEqual({ supported: true, reason: "unknown_ua" });
    expect(isSupportedBrowser("curl/8.0")).toEqual({ supported: true, reason: "unknown_ua" });
    expect(isSupportedBrowser(UA.googlebot)).toEqual({ supported: true, reason: "unknown_ua" });
  });

  it("never throws on garbage input", () => {
    for (const ua of ["", "\0", "Mozilla/5.0 ((((", "a".repeat(5000)]) {
      expect(() => isSupportedBrowser(ua)).not.toThrow();
      expect(() => parseUserAgent(ua)).not.toThrow();
    }
  });
});
