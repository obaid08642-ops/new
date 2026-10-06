import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({ useLocale: () => "ar", useTranslations: () => (key: string) => key }));

import LocaleError from "./error";
import LocaleLoading from "./loading";

describe("locale route states", () => {
  it("does not serialize an upstream error message in the recovery boundary", () => {
    const html = renderToStaticMarkup(<LocaleError error={new Error("upstream-token-and-stack-must-not-render")} reset={vi.fn()} />);

    expect(html).not.toContain("upstream-token-and-stack-must-not-render");
    expect(html).toContain('role="alert"');
    expect(html).toContain('href="/ar"');
  });

  it("exposes a polite loading state without route data", () => {
    const html = renderToStaticMarkup(<LocaleLoading />);

    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('role="status"');
    expect(html).toContain("loadingTitle");
  });
});
