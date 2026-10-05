import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string) => key,
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import { SegmentErrorFallback } from "../components-next/segment-error-fallback";

/**
 * F7 — plan 15.5 wants `error.tsx` per route segment, not just the locale
 * root. Every top-level section under `app/[locale]/` gets its own boundary
 * rendering the shared fallback (try-again + contact-support), and this test
 * fails if a section loses its file or stops naming its own segment.
 */
const LOCALE_DIR = new URL("../app/[locale]/", import.meta.url).pathname;

function sectionDirs(): string[] {
  return readdirSync(LOCALE_DIR).filter((entry) => {
    try {
      return statSync(join(LOCALE_DIR, entry)).isDirectory();
    } catch {
      return false;
    }
  });
}

describe("F7 — every locale section has its own error boundary", () => {
  it("covers every section directory, none missing", () => {
    const sections = sectionDirs();
    expect(sections.length).toBeGreaterThan(50);
    const missing = sections.filter((section) => {
      try {
        readFileSync(join(LOCALE_DIR, section, "error.tsx"), "utf8");
        return false;
      } catch {
        return true;
      }
    });
    expect(missing).toEqual([]);
  });

  it("each section boundary reuses the shared fallback with its own segment name", () => {
    const bad: string[] = [];
    for (const section of sectionDirs()) {
      const source = readFileSync(join(LOCALE_DIR, section, "error.tsx"), "utf8");
      if (!source.includes("SegmentErrorFallback") || !source.includes(`segment="${section}"`)) {
        bad.push(section);
      }
    }
    expect(bad).toEqual([]);
  });

  it("the shared fallback renders try-again, home, contact-support and the digest ref", () => {
    const html = renderToStaticMarkup(
      <SegmentErrorFallback
        error={Object.assign(new Error("section boom"), { digest: "s7" })}
        reset={() => {}}
        segment="payments"
      />,
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain("<button");
    expect(html).toContain("retry");
    expect(html).toContain("returnHome");
    expect(html).toContain("contactSupport");
    expect(html).toContain("/en/support");
    expect(html).toContain("ref: s7");
  });

  it("the shared fallback reports with its own segment name on mount", () => {
    const source = readFileSync(
      new URL("../components-next/segment-error-fallback.tsx", import.meta.url).pathname,
      "utf8",
    );
    expect(source).toContain("reportSegmentError(error, { segment, locale })");
  });
});
