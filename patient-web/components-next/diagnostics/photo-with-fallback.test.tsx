import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const failed = vi.hoisted(() => ({ value: false }));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual, useState: (initial: unknown) => (typeof initial === "boolean" ? [failed.value, vi.fn()] : actual.useState(initial)) };
});

import { PhotoWithFallback } from "./photo-with-fallback";

const render = () => renderToStaticMarkup(createElement(PhotoWithFallback, { src: "https://cdn.nabd.plus/radiology/hsg.png", sizes: "48px", wrapClassName: "w", className: "i", fallback: createElement("b", { "data-fallback": true }, "tile") }));

describe("PhotoWithFallback", () => {
  it("draws a decorative picture without an inline style while it has not failed", () => {
    failed.value = false;
    const html = render();
    expect(html).toContain("<img");
    expect(html).toContain('alt=""');
    expect(html).not.toContain("style=");
    expect(html).not.toContain("data-fallback");
  });
  it("draws the service tile instead of a broken picture once the picture failed", () => {
    failed.value = true;
    const html = render();
    expect(html).toContain("data-fallback");
    expect(html).not.toContain("<img");
  });
});
