// 17.1 navigation: the back-to-top rule, the reading ratio, and the server markup of the two client components.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BACK_TO_TOP_AFTER_PX, readingRatio, showBackToTop } from "../lib/navigation/scroll";
import { BackToTop } from "../components-next/navigation/back-to-top";
import { ReadingProgress } from "../components-next/navigation/reading-progress";

describe("back-to-top rule", () => {
  it("is hidden at the top and shown only past the threshold", () => {
    expect(showBackToTop(0)).toBe(false);
    expect(showBackToTop(BACK_TO_TOP_AFTER_PX)).toBe(false);
    expect(showBackToTop(BACK_TO_TOP_AFTER_PX + 1)).toBe(true);
  });

  it("renders no button on the server, so it never shows before the reader scrolls", () => {
    expect(renderToStaticMarkup(<BackToTop label="Back to top" />)).toBe("");
  });
});

describe("reading ratio", () => {
  it("is 0 at the top, 1 at the end, and in between in proportion", () => {
    expect(readingRatio(0, 3000, 1000)).toBe(0);
    expect(readingRatio(2000, 3000, 1000)).toBe(1);
    expect(readingRatio(1000, 3000, 1000)).toBe(0.5);
  });

  it("does not divide by zero for a page that fits on screen", () => {
    expect(readingRatio(0, 800, 1000)).toBe(0);
    expect(readingRatio(0, 1000, 1000)).toBe(0);
  });

  it("stays within 0..1 when the scroll position is out of range", () => {
    expect(readingRatio(-50, 3000, 1000)).toBe(0);
    expect(readingRatio(9999, 3000, 1000)).toBe(1);
  });
});

describe("reading progress markup", () => {
  it("is a labelled progress bar starting at 0", () => {
    const html = renderToStaticMarkup(<ReadingProgress label="Reading progress" />);
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-label="Reading progress"');
    expect(html).toContain('aria-valuenow="0"');
  });
});
