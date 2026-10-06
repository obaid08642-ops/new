import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  nabdUrlToWebPath,
  toHttpsFallback,
  normalizeDeepLink,
  savePendingDeepLink,
  peekPendingDeepLink,
  consumePendingDeepLink,
  clearPendingDeepLink,
  stashCurrentLocationAsDeferred,
  isSafeRelativePath,
  openNabdLink,
} from "./nabd-links";

const mockSessionStorage = {
  store: new Map<string, string>(),
  getItem(key: string) { return this.store.get(key) || null; },
  setItem(key: string, value: string) { this.store.set(key, value); },
  removeItem(key: string) { this.store.delete(key); },
  clear() { this.store.clear(); },
};

const mockWindow = {
  location: { href: "about:blank" },
  sessionStorage: mockSessionStorage,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  setTimeout: vi.fn((fn, ms) => setTimeout(fn, ms)),
  clearTimeout: vi.fn(),
  dispatchEvent: vi.fn(),
  pagehide: new Event("pagehide"),
};

describe("13.R18 nabd:// fallback + deferred deep links", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockSessionStorage.clear();
    globalThis.window = mockWindow;
    mockWindow.location.href = "about:blank";
    mockWindow.addEventListener.mockClear?.();
    mockWindow.addEventListener.mockImplementation((event, handler) => {
      mockWindow[event] = handler;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("nabdUrlToWebPath", () => {
    it("maps nabd://doctor/en/abc123 to /en/doctor/abc123", () => {
      expect(nabdUrlToWebPath("nabd://doctor/en/abc123")).toBe("/en/doctor/abc123");
    });

    it("maps nabd://medicine/ar/panadol to /ar/medicine/panadol", () => {
      expect(nabdUrlToWebPath("nabd://medicine/ar/panadol")).toBe("/ar/medicine/panadol");
    });

    it("maps nabd://p/abc123 to /p/abc123 (no locale)", () => {
      expect(nabdUrlToWebPath("nabd://p/abc123")).toBe("/p/abc123");
    });

    it("returns null for unknown hosts", () => {
      expect(nabdUrlToWebPath("nabd://unknown/abc123")).toBeNull();
    });

    it("returns null for non-nabd:// URLs", () => {
      expect(nabdUrlToWebPath("https://nabd.plus/doctor/abc123")).toBeNull();
    });

    it("strips sensitive query params", () => {
      expect(nabdUrlToWebPath("nabd://doctor/en/abc123?token=secret&foo=bar")).toBe("/en/doctor/abc123?foo=bar");
    });

    it("preserves safe query params", () => {
      expect(nabdUrlToWebPath("nabd://doctor/en/abc123?foo=bar&baz=qux")).toBe("/en/doctor/abc123?foo=bar&baz=qux");
    });

    it("handles path without locale correctly", () => {
      expect(nabdUrlToWebPath("nabd://doctor/abc123")).toBe("/doctor/abc123");
    });

    it("rejects excluded prefixes", () => {
      expect(nabdUrlToWebPath("nabd://admin/dashboard")).toBeNull();
    });
  });

  describe("toHttpsFallback", () => {
    it("converts nabd:// to https fallback", () => {
      expect(toHttpsFallback("nabd://doctor/en/abc123", "https://nabd.plus", "ar")).toBe("https://nabd.plus/en/doctor/abc123");
    });

    it("falls back to locale home for unknown hosts", () => {
      expect(toHttpsFallback("nabd://unknown/abc", "https://nabd.plus", "ar")).toBe("https://nabd.plus/ar");
    });

    it("uses default locale when invalid and no locale in path", () => {
      // When no locale in path, default locale is prepended
      expect(toHttpsFallback("nabd://doctor/abc123", "https://nabd.plus", "xx")).toBe("https://nabd.plus/ar/doctor/abc123");
      // When locale is in path, it's preserved (not replaced by default)
      expect(toHttpsFallback("nabd://doctor/en/abc123", "https://nabd.plus", "xx")).toBe("https://nabd.plus/en/doctor/abc123");
    });
  });

  describe("normalizeDeepLink", () => {
    it("converts nabd:// to https fallback", () => {
      expect(normalizeDeepLink("nabd://doctor/en/abc123", "https://nabd.plus", "ar")).toBe("https://nabd.plus/en/doctor/abc123");
    });

    it("passes through safe relative paths", () => {
      expect(normalizeDeepLink("/ar/doctor/abc123", "https://nabd.plus", "ar")).toBe("/ar/doctor/abc123");
    });

    it("strips sensitive params from same-origin absolute URLs", () => {
      expect(normalizeDeepLink("https://nabd.plus/ar/doctor/abc?token=secret", "https://nabd.plus", "ar")).toBe("/ar/doctor/abc");
    });

    it("falls back to locale home for unknown links", () => {
      expect(normalizeDeepLink("https://evil.com/phish", "https://nabd.plus", "ar")).toBe("/ar");
    });
  });

  describe("isSafeRelativePath", () => {
    it("accepts valid relative paths", () => {
      expect(isSafeRelativePath("/ar/doctor/abc")).toBe(true);
    });

    it("rejects absolute URLs", () => {
      expect(isSafeRelativePath("https://nabd.plus/ar")).toBe(false);
    });

    it("rejects protocol-relative URLs", () => {
      expect(isSafeRelativePath("//nabd.plus/ar")).toBe(false);
    });

    it("rejects paths with backslashes", () => {
      expect(isSafeRelativePath("/ar\\doctor")).toBe(false);
    });

    it("rejects excluded prefixes", () => {
      expect(isSafeRelativePath("/api/v1/users")).toBe(false);
      expect(isSafeRelativePath("/admin/dashboard")).toBe(false);
      expect(isSafeRelativePath("/.well-known/apple-app-site-association")).toBe(false);
    });
  });

  describe("Deferred deep links", () => {
    // sessionStorage is already mocked and cleared in outer beforeEach

    it("saves and consumes a valid path", () => {
      savePendingDeepLink("/ar/doctor/abc123");
      expect(peekPendingDeepLink()).toBe("/ar/doctor/abc123");
      expect(consumePendingDeepLink()).toBe("/ar/doctor/abc123");
      expect(peekPendingDeepLink()).toBeNull();
    });

    it("converts nabd:// to web path when saving", () => {
      savePendingDeepLink("nabd://doctor/en/abc123");
      expect(consumePendingDeepLink()).toBe("/en/doctor/abc123");
    });

    it("scrubs sensitive params when saving", () => {
      savePendingDeepLink("/ar/doctor/abc?token=secret&foo=bar");
      expect(consumePendingDeepLink()).toBe("/ar/doctor/abc?foo=bar");
    });

    it("clears pending link", () => {
      savePendingDeepLink("/ar/doctor/abc");
      clearPendingDeepLink();
      expect(peekPendingDeepLink()).toBeNull();
    });

    it("rejects unsafe paths", () => {
      savePendingDeepLink("/api/v1/users");
      expect(peekPendingDeepLink()).toBeNull();
    });

    it("converts absolute same-origin URLs to path+scrubbed-query", () => {
      savePendingDeepLink("https://nabd.plus/ar/doctor/abc?token=secret&foo=bar");
      expect(consumePendingDeepLink()).toBe("/ar/doctor/abc?foo=bar");
    });
  });

  describe("openNabdLink", () => {
    beforeEach(() => {
      mockWindow.location.href = "about:blank";
    });

it("navigates to fallback for non-nabd:// links", () => {
      openNabdLink("https://nabd.plus/ar/doctor/abc", "https://nabd.plus", "ar");
      expect(mockWindow.location.href).toBe("/ar/doctor/abc");
    });

    it("attempts nabd:// and falls back after timeout", () => {
      openNabdLink("nabd://doctor/en/abc", "https://nabd.plus", "ar", 100);
      expect(mockWindow.location.href).toBe("nabd://doctor/en/abc");
      vi.advanceTimersByTime(1200);
      expect(mockWindow.location.href).toBe("https://nabd.plus/en/doctor/abc");
    });

    it("clears timer on pagehide", () => {
      openNabdLink("nabd://doctor/en/abc", "https://nabd.plus", "ar", 100);
      expect(mockWindow.addEventListener).toHaveBeenCalledWith("pagehide", expect.any(Function), { once: true });
    });
  });
});