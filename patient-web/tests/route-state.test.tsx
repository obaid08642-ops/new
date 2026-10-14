import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RouteState } from "@/components-next/core/route-state";
import { EmptyState, ErrorState } from "@/components-next/ui-generated/components/Feedback";

// RouteState draws the board's state card without importing the design-system components (they are 17 KB gz of
// shared JS on every route, issue #286). This keeps its markup identical to theirs.

describe("RouteState", () => {
  it("error card is the design system's ErrorState, markup for markup", () => {
    const ours = renderToStaticMarkup(createElement(RouteState, { kind: "error", locale: "ar", title: "T", body: "B", primaryLabel: "Retry", returnHomeLabel: "Home" }));
    const theirs = renderToStaticMarkup(createElement(ErrorState, { title: "T", body: "B", retryLabel: "Retry" }));
    const strip = (h: string) => h.replace(/ role="alert"| data-kind="error"|class="nabd-state"/g, "").replace(/\s+/g, " ");
    const inner = (h: string) => strip(h.slice(h.indexOf(">") + 1, h.lastIndexOf("</div>")));
    const ourCard = ours.slice(ours.indexOf('<div data-kind="error"'), ours.indexOf('</div></div>') + '</div></div>'.length);
    expect(inner(ourCard)).toBe(inner(theirs));
    expect(ourCard).toContain('role="alert"');
    expect(ours).toContain('href="/ar"');
  });

  it("not-found card is the design system's EmptyState glyph, title and body, with the home link as the primary button", () => {
    const ours = renderToStaticMarkup(createElement(RouteState, { kind: "not-found", locale: "en", title: "T", body: "B", primaryLabel: "Go", returnHomeLabel: "Home" }));
    const theirs = renderToStaticMarkup(createElement(EmptyState, { icon: "map-trifold", tone: "amber", title: "T", body: "B" }));
    const glyph = (h: string) => h.match(/<span data-icon[\s\S]*?<\/span>/)?.[0] ?? "";
    expect(glyph(ours)).toBe(glyph(theirs));
    expect(ours).toContain('<h2 class="nabd-state__title">T</h2><p class="nabd-state__body">B</p>');
    expect(ours).toContain('<a class="nabd-button nabd-button--primary nabd-button--lg nabd-button--full" href="/en">');
  });

  it("carries no style attribute and no colour of its own (CSP, tokens)", () => {
    const html = renderToStaticMarkup(createElement(RouteState, { kind: "error", locale: "ar", title: "T", body: "B", primaryLabel: "Retry", returnHomeLabel: "Home" }));
    expect(html).not.toMatch(/ style=/);
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
