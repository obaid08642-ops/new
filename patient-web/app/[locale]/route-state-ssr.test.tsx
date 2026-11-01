import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({ useLocale: () => "ar", useTranslations: () => (key: string) => key }));

import LocaleError from "./error";
import { RouteState } from "@/components-next/core/route-state";
// owner decision 43 (issue 427): no skeleton at the root; a section that reads the patient's data has its own
import SectionLoading from "./orders/loading";

describe("locale route states", () => {
  it("does not serialize an upstream error message in the recovery boundary", () => {
    // the boundary fetches the screen on the first error (React.lazy), so the screen is rendered here with the boundary's own props
    const source = readFileSync("app/[locale]/error.tsx", "utf8");
    expect(source).toMatch(/lazy\(\(\) => import\("@\/components-next\/core\/route-state"\)/);
    expect(source).not.toMatch(/\berror\.(message|stack|digest)/);
    expect(source).not.toMatch(/\{\s*error\s*[,}]/);
    const html = renderToStaticMarkup(<RouteState kind="error" locale="ar" title="t" body="b" primaryLabel="retry" returnHomeLabel="home" onRetry={vi.fn()} />);

    expect(html).toContain('role="alert"');
    expect(html).toContain('href="/ar"');
  });

  it("shows the recovery state at once, before (or without) the lazily fetched screen: an error while offline cannot fetch a chunk", () => {
    const html = renderToStaticMarkup(<LocaleError error={new Error("upstream-token-and-stack-must-not-render")} reset={vi.fn()} />);

    expect(html).not.toContain("upstream-token-and-stack-must-not-render");
    expect(html).toContain('role="alert"');
    expect(html).toContain("errorTitle");
    expect(html).toContain("retry");
    expect(html).toContain('href="/ar"');
  });

  it("a section's skeleton is a polite loading state without route data", () => {
    const html = renderToStaticMarkup(<SectionLoading />);

    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('role="status"');
    expect(html).toContain("loadingTitle");
  });
});
