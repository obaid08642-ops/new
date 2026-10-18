// 17.1: the 404 page offers a way forward: a search form that sends the words to the search page, and the popular sections
// as links in the locale of the page.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NotFoundHelp, type NotFoundHelpLabels } from "@/components-next/core/not-found-help";

const labels: NotFoundHelpLabels = {
  searchLabel: "Search Nabd",
  searchButton: "Search",
  popularTitle: "Popular sections",
  searchPlaceholder: "Search for a doctor",
  category: {
    catPharmacy: "Pharmacy",
    catConsult: "Consultation",
    catLab: "Lab tests",
    catRadiology: "Radiology",
    catNursing: "Nursing",
    catMind: "Mental health",
  },
};

describe("NotFoundHelp", () => {
  it("sends the search to the search page of the same locale, with the q parameter", () => {
    const html = renderToStaticMarkup(<NotFoundHelp locale="en" labels={labels} />);
    expect(html).toContain('action="/en/search"');
    expect(html).toContain('method="get"');
    expect(html).toContain('name="q"');
    expect(html).toContain('minLength="2"');
  });

  it("links the popular sections in the page's locale", () => {
    const html = renderToStaticMarkup(<NotFoundHelp locale="ur" labels={labels} />);
    expect(html).toContain('href="/ur/pharmacy"');
    expect(html).toContain('href="/ur/diagnostics/labs"');
    expect(html).toContain(">Mental health<");
  });

  it("labels the help block with its heading", () => {
    const html = renderToStaticMarkup(<NotFoundHelp locale="en" labels={labels} />);
    expect(html).toContain('aria-labelledby="not-found-help-title"');
    expect(html).toContain('id="not-found-help-title"');
  });
});
