import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string) => key,
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import LocaleError from "../app/[locale]/error";
import GlobalError from "../app/global-error";

/**
 * P15.5 — a thrown render error shows the fallback, not a white screen.
 * (Effects do not run in static markup, so the Sentry half is covered by
 * lib/error-report.test.ts; the wiring between them — error.tsx calling
 * reportSegmentError on mount — is pinned by source assertion below, the same
 * technique login-form.test.tsx uses.)
 */

describe("P15.5 — locale segment fallback", () => {
  it("renders try-again, home, and contact-support actions with the digest ref", () => {
    const html = renderToStaticMarkup(
      <LocaleError error={Object.assign(new Error("boom"), { digest: "d123" })} reset={() => {}} />,
    );
    expect(html).not.toBe("");
    expect(html).toContain('role="alert"');
    expect(html).toContain("<button");
    expect(html).toContain("retry");
    expect(html).toContain("returnHome");
    expect(html).toContain("contactSupport");
    expect(html).toContain("/en/support");
    expect(html).toContain("ref: d123");
  });

  it("reports the crash through the shared reporter on mount", async () => {
    const { readFile } = await import("node:fs/promises");
    const source = await readFile(new URL("../app/[locale]/error.tsx", import.meta.url), "utf8");
    expect(source).toContain("reportSegmentError(error, { segment: \"locale\"");
  });
});

describe("P15.5 — global fallback", () => {
  it("renders its own document with try-again and both support links", () => {
    const html = renderToStaticMarkup(
      <GlobalError error={Object.assign(new Error("root boom"), { digest: "g9" })} reset={() => {}} />,
    );
    expect(html).toContain("<html");
    expect(html).toContain("<button");
    expect(html).toContain("Try again");
    expect(html).toContain("Contact support");
    expect(html).toContain("تواصل مع الدعم");
    expect(html).toContain("/en/support");
    expect(html).toContain("/ar/support");
    expect(html).toContain("ref: g9");
    expect(html).toContain('role="alert"');
  });

  it("reports the crash through the shared reporter on mount", async () => {
    const { readFile } = await import("node:fs/promises");
    const source = await readFile(new URL("../app/global-error.tsx", import.meta.url), "utf8");
    expect(source).toContain('reportSegmentError(error, { segment: "global" }');
  });
});
