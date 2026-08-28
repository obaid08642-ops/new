import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LocaleSelector } from "./locale-selector";

describe("LocaleSelector", () => {
  it("renders all six route-localized choices and marks the active locale", () => {
    const html = renderToStaticMarkup(<LocaleSelector current="ur" label="Language" />);

    for (const locale of ["ar", "en", "ur", "hi", "bn", "fil"]) expect(html).toContain(`href="/${locale}"`);
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("اردو");
  });
});
