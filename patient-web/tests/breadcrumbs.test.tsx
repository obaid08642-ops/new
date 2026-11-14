// 17.1: the visible trail. Every item before the page is a link; the page itself is not, and carries aria-current.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Breadcrumbs } from "@/components-next/navigation/breadcrumbs";

const items = [
  { label: "Home", href: "/en" },
  { label: "Health articles", href: "/en/articles" },
  { label: "Iron basics" },
];

describe("Breadcrumbs", () => {
  it("is a named navigation landmark with an ordered list", () => {
    const html = renderToStaticMarkup(<Breadcrumbs label="Breadcrumb" items={items} />);
    expect(html).toContain('<nav aria-label="Breadcrumb"');
    expect(html).toContain("<ol");
  });

  it("links every item before the page, and marks the page as the current one", () => {
    const html = renderToStaticMarkup(<Breadcrumbs label="Breadcrumb" items={items} />);
    expect(html).toContain('href="/en"');
    expect(html).toContain('href="/en/articles"');
    expect(html).toContain('aria-current="page"');
    expect(html.match(/aria-current/g)).toHaveLength(1);
    expect(html).not.toMatch(/href="[^"]*"[^>]*>Iron basics</);
  });

  it("draws nothing for a single item (the page is the whole trail)", () => {
    expect(renderToStaticMarkup(<Breadcrumbs label="Breadcrumb" items={[{ label: "Home" }]} />)).toBe("");
  });
});
