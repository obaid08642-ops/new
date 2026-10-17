import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({ useLocale: () => "ar", useTranslations: () => (key: string) => key }));

import LocaleError from "./error";
// owner decision 43 (issue 427): no skeleton at the root; a section that reads the patient's data has its own
import SectionLoading from "./orders/loading";

describe("locale route states", () => {
  it("does not serialize an upstream error message in the recovery boundary", () => {
    const html = renderToStaticMarkup(<LocaleError error={new Error("upstream-token-and-stack-must-not-render")} reset={vi.fn()} />);

    expect(html).not.toContain("upstream-token-and-stack-must-not-render");
    expect(html).toContain('role="alert"');
    expect(html).toContain('href="/ar"');
  });

  it("a section's skeleton is a polite loading state without route data", () => {
    const html = renderToStaticMarkup(<SectionLoading />);

    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('role="status"');
    expect(html).toContain("loadingTitle");
  });
});
