/**
 * P15.10 — minimum browsers and OS versions (patient-web, code part).
 *
 * Floors (documented in docs/MINIMUM_BROWSERS.md):
 *   iOS 16.4+ (all iOS browsers are WebKit; the OS version IS the engine),
 *   Android 7+, Chrome/Edge 109+, Samsung Internet 20+, Firefox 109+,
 *   desktop Safari 16.4+.
 * The browser floors are era-matched to the OS floors (early 2023, Baseline
 * widely-available): nothing newer than the OS floors demands, so the minima
 * stay one coherent story instead of five independent guesses.
 *
 * Unknown, empty, or bot user-agents PASS (fail open): locking out a crawler
 * or a browser released next year would be worse than serving it.
 */

export const MIN_IOS_MAJOR = 16;
export const MIN_IOS_MINOR = 16 * 100 + 4; // 16.4 encoded for one comparison
export const MIN_ANDROID_MAJOR = 7;
export const MIN_CHROME_MAJOR = 109;
export const MIN_EDGE_MAJOR = 109;
export const MIN_SAMSUNG_MAJOR = 20;
export const MIN_FIREFOX_MAJOR = 109;
export const MIN_SAFARI_MAJOR = 16;
export const MIN_SAFARI_MINOR = 16 * 100 + 4;

export type DeviceOs = "ios" | "android" | "desktop" | "unknown";
export type DeviceBrowser = "safari" | "chrome" | "edge" | "samsung" | "firefox" | "unknown";

export type ParsedAgent = {
  os: DeviceOs;
  osMajor: number | null;
  osMinor: number | null;
  browser: DeviceBrowser;
  browserMajor: number | null;
  browserMinor: number | null;
};

export type SupportVerdict =
  | { supported: true; reason: "ok" | "unknown_ua" }
  | { supported: false; reason: "ios_too_old" | "android_too_old" | "browser_too_old" };

function num(match: RegExpMatchArray | null, index: number): number | null {
  if (!match) return null;
  const value = Number.parseInt(match[index] ?? "", 10);
  return Number.isFinite(value) ? value : null;
}

/** Parses the pieces the floors need; never throws, even on garbage. */
export function parseUserAgent(ua: string): ParsedAgent {
  const agent: ParsedAgent = { os: "unknown", osMajor: null, osMinor: null, browser: "unknown", browserMajor: null, browserMinor: null };
  if (typeof ua !== "string" || !ua) return agent;

  const iosOs = ua.match(/CPU (?:iPhone )?OS (\d+)_(\d+)/);
  // iPadOS 13+ in desktop mode reports Macintosh + Mobile.
  const ipadDesktop = /Macintosh/.test(ua) && /Mobile/.test(ua);
  const androidOs = ua.match(/Android (\d+)/);

  if (iosOs || ipadDesktop) {
    agent.os = "ios";
    if (iosOs) {
      agent.osMajor = num(iosOs, 1);
      agent.osMinor = num(iosOs, 2);
    } else {
      // Desktop-mode iPad: the OS number is gone, but the Safari Version/ is the engine.
      const version = ua.match(/Version\/(\d+)(?:\.(\d+))?/);
      agent.osMajor = num(version, 1);
      agent.osMinor = num(version, 2);
    }
    agent.browser = "safari";
    const version = ua.match(/Version\/(\d+)/);
    agent.browserMajor = num(version, 1);
    // Chrome/Firefox/Edge on iOS are still WebKit: the OS floor already gates them.
    return agent;
  }

  if (androidOs) {
    agent.os = "android";
    agent.osMajor = num(androidOs, 1);
  } else if (/Windows NT|Macintosh|Linux|X11/.test(ua)) {
    agent.os = "desktop";
  }

  const samsung = ua.match(/SamsungBrowser\/(\d+)/);
  const edge = ua.match(/Edg(?:e|A|iOS)?\/(\d+)/);
  const chrome = ua.match(/(?:Chrome|CriOS)\/(\d+)/);
  const firefox = ua.match(/(?:Firefox|FxiOS)\/(\d+)/);
  const safariVersion = ua.match(/Version\/(\d+)(?:\.(\d+))?/);

  if (samsung) {
    agent.browser = "samsung";
    agent.browserMajor = num(samsung, 1);
  } else if (edge) {
    agent.browser = "edge";
    agent.browserMajor = num(edge, 1);
  } else if (chrome) {
    agent.browser = "chrome";
    agent.browserMajor = num(chrome, 1);
  } else if (firefox) {
    agent.browser = "firefox";
    agent.browserMajor = num(firefox, 1);
  } else if (safariVersion && /Safari/.test(ua)) {
    agent.browser = "safari";
    agent.browserMajor = num(safariVersion, 1);
    agent.browserMinor = num(safariVersion, 2);
  }
  return agent;
}

function versionAtOrAbove(major: number | null, minor: number | null, floor: number): boolean {
  if (major === null) return false;
  return major * 100 + (minor ?? 0) >= floor;
}

/** The gate. Unknown agents pass; everything else must clear its floor. */
export function isSupportedBrowser(userAgent: string): SupportVerdict {
  if (typeof userAgent !== "string" || !userAgent.trim()) return { supported: true, reason: "unknown_ua" };
  // Crawlers and bots get the site, not the gate.
  if (/bot|crawl|spider|slurp|mediapartners|facebookexternalhit|embedly|quora|outbrain/i.test(userAgent)) {
    return { supported: true, reason: "unknown_ua" };
  }
  // Trident cannot run this stack (no modules, no fetch, no modern CSS) — the
  // only engine rejected by name rather than by version floor.
  if (/MSIE|Trident\//.test(userAgent)) {
    return { supported: false, reason: "browser_too_old" };
  }
  const agent = parseUserAgent(userAgent);

  if (agent.os === "ios") {
    if (!versionAtOrAbove(agent.osMajor, agent.osMinor, MIN_IOS_MINOR)) {
      return { supported: false, reason: "ios_too_old" };
    }
    return { supported: true, reason: "ok" };
  }

  if (agent.os === "android") {
    if (agent.osMajor !== null && agent.osMajor < MIN_ANDROID_MAJOR) {
      return { supported: false, reason: "android_too_old" };
    }
    if (agent.browser === "samsung") {
      return agent.browserMajor !== null && agent.browserMajor >= MIN_SAMSUNG_MAJOR
        ? { supported: true, reason: "ok" }
        : { supported: false, reason: "browser_too_old" };
    }
    if (agent.browser === "chrome" || agent.browser === "edge") {
      const floor = agent.browser === "edge" ? MIN_EDGE_MAJOR : MIN_CHROME_MAJOR;
      return agent.browserMajor !== null && agent.browserMajor >= floor
        ? { supported: true, reason: "ok" }
        : { supported: false, reason: "browser_too_old" };
    }
    if (agent.browser === "firefox") {
      return agent.browserMajor !== null && agent.browserMajor >= MIN_FIREFOX_MAJOR
        ? { supported: true, reason: "ok" }
        : { supported: false, reason: "browser_too_old" };
    }
    // An Android WebView or unknown browser with a new-enough OS: fail open.
    return { supported: true, reason: agent.browser === "unknown" ? "unknown_ua" : "ok" };
  }

  if (agent.os === "desktop") {
    if (agent.browser === "chrome" || agent.browser === "edge") {
      const floor = agent.browser === "edge" ? MIN_EDGE_MAJOR : MIN_CHROME_MAJOR;
      return agent.browserMajor !== null && agent.browserMajor >= floor
        ? { supported: true, reason: "ok" }
        : { supported: false, reason: "browser_too_old" };
    }
    if (agent.browser === "firefox") {
      return agent.browserMajor !== null && agent.browserMajor >= MIN_FIREFOX_MAJOR
        ? { supported: true, reason: "ok" }
        : { supported: false, reason: "browser_too_old" };
    }
    if (agent.browser === "safari") {
      return versionAtOrAbove(agent.browserMajor, agent.browserMinor, MIN_SAFARI_MINOR)
        ? { supported: true, reason: "ok" }
        : { supported: false, reason: "browser_too_old" };
    }
    return { supported: true, reason: "unknown_ua" };
  }

  return { supported: true, reason: "unknown_ua" };
}
