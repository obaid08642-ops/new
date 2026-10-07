import { afterEach, describe, expect, it, vi } from "vitest";
import { IMAGE_QUALITY, getConnectionQuality, imageQualityFor, shouldStartAudioOnly } from "./connection";

/**
 * P15.4 — connection quality from the browser's Network Information API,
 * guarded so SSR and browsers without the API (Safari, Firefox) report
 * "unknown, assume fine" instead of crashing.
 */

afterEach(() => vi.unstubAllGlobals());

describe("P15.4 — connection quality", () => {
  it("reports unknown and not-slow when there is no navigator (SSR, node)", () => {
    expect(getConnectionQuality()).toEqual({ effectiveType: "unknown", saveData: false, slow: false, rttMs: null });
  });

  it("reports slow on 2g and slow-2g links", () => {
    for (const effectiveType of ["2g", "slow-2g"]) {
      vi.stubGlobal("navigator", { connection: { effectiveType, saveData: false, rtt: 1800 } });
      const quality = getConnectionQuality();
      expect(quality.slow).toBe(true);
      expect(quality.rttMs).toBe(1800);
      vi.unstubAllGlobals();
    }
  });

  it("reports slow when data-saver is on, even on 4g", () => {
    vi.stubGlobal("navigator", { connection: { effectiveType: "4g", saveData: true, rtt: 120 } });
    expect(getConnectionQuality().slow).toBe(true);
  });

  it("reports fast on a plain 4g link", () => {
    vi.stubGlobal("navigator", { connection: { effectiveType: "4g", saveData: false, rtt: 120 } });
    const quality = getConnectionQuality();
    expect(quality).toEqual({ effectiveType: "4g", saveData: false, slow: false, rttMs: 120 });
  });

  it("drops image quality only on slow links", () => {
    expect(IMAGE_QUALITY).toEqual({ full: 75, low: 50 });
    expect(imageQualityFor({ effectiveType: "4g", saveData: false, slow: false, rttMs: 100 })).toBe(75);
    expect(imageQualityFor({ effectiveType: "2g", saveData: false, slow: true, rttMs: 1800 })).toBe(50);
    expect(imageQualityFor({ effectiveType: "4g", saveData: true, slow: true, rttMs: 100 })).toBe(50);
  });

  it("starts calls audio-only exactly when the link is slow", () => {
    expect(shouldStartAudioOnly({ effectiveType: "4g", saveData: false, slow: false, rttMs: 100 })).toBe(false);
    expect(shouldStartAudioOnly({ effectiveType: "slow-2g", saveData: false, slow: true, rttMs: 2500 })).toBe(true);
  });

  it("ignores a non-numeric rtt instead of propagating NaN", () => {
    vi.stubGlobal("navigator", { connection: { effectiveType: "3g", saveData: false, rtt: Number.NaN } });
    expect(getConnectionQuality().rttMs).toBeNull();
  });
});
