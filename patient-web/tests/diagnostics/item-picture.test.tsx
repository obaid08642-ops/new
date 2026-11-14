import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ItemPicture, resolveItemImage } from "@/components-next/diagnostics/item-picture";

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

describe("resolveItemImage", () => {
  it("uses the item's own image first", () => {
    expect(resolveItemImage("https://cdn.nabd.plus/labs/hiv.png")).toEqual({ kind: "own", src: "https://cdn.nabd.plus/labs/hiv.png" });
  });
  it("falls back to the art when there is no image or the host is not allowed", () => {
    for (const v of [undefined, null, "", "http://cdn.nabd.plus/a.png", "https://evil.example/a.png"]) expect(resolveItemImage(v)).toEqual({ kind: "fallback" });
  });
});

describe("ItemPicture", () => {
  it("draws the own image, and only the fallback when there is none", () => {
    const fb = createElement("b", { "data-fallback": true }, "art");
    expect(renderToStaticMarkup(createElement(ItemPicture, { imageUrl: "https://cdn.nabd.plus/labs/hiv.png", fallback: fb }))).toContain("<img");
    const none = renderToStaticMarkup(createElement(ItemPicture, { fallback: fb }));
    expect(none).toContain("data-fallback");
    expect(none).not.toContain("<img");
  });
  it("is used by the hub card and the item page (own image first, art as the fallback)", () => {
    expect(read("../../components-next/diagnostics/item-card.tsx")).toContain("<ItemPicture imageUrl={imageUrl}");
    expect(read("../../app/[locale]/labs/[testSlug]/page.tsx")).toContain("<ItemPicture imageUrl={item.imageUrl}");
    expect(read("../../lib/ordering/item.ts")).toMatch(/imageUrl: s\.imageUrl[\s\S]*imageUrl: s\.imageUrl/);
  });
});
