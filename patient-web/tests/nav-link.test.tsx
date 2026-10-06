import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// next/link is replaced by an anchor that shows the props NavLink hands it.
vi.mock("next/link", () => ({
  default: ({ href, prefetch, children, ...rest }: { href: string; prefetch?: boolean | null; children?: unknown; className?: string }) => (
    <a href={href} data-prefetch={String(prefetch)} className={rest.className}>{children as never}</a>
  ),
}));

import { NavLink } from "@/components-next/nav/nav-link";

describe("NavLink", () => {
  it("starts on Next's default prefetch (null) for a listed route, and for any other route", () => {
    const listed = renderToStaticMarkup(<NavLink href="/ar/consultations/doctors" prefetch="viewport">Doctors</NavLink>);
    expect(listed).toContain('href="/ar/consultations/doctors"');
    expect(listed).toContain('data-prefetch="null"');
    const other = renderToStaticMarkup(<NavLink href="/ar/orders">Orders</NavLink>);
    expect(other).toContain('data-prefetch="null"');
  });

  it("passes the class and the children through", () => {
    const html = renderToStaticMarkup(<NavLink href="/ar/c" className="tile">Pharmacy</NavLink>);
    expect(html).toContain('class="tile"');
    expect(html).toContain("Pharmacy");
  });

  it("never turns prefetch off, and only a listed route can reach a full prefetch", () => {
    const source = readFileSync(resolve(process.cwd(), "components-next/nav/nav-link.tsx"), "utf8");
    expect(source).not.toContain("prefetch={false}");
    expect(source).toContain("isFullPrefetchRoute(href");
    expect(source).toContain("if (eligible) setFull(true)");
  });
});

describe("no link turns prefetch off", () => {
  it("no page or component sets prefetch={false} (the main routes keep Next's prefetch)", () => {
    const hits = execSync(`grep -rln "prefetch={false}" app components-next lib --include=*.tsx --include=*.ts || true`, { cwd: process.cwd(), encoding: "utf8" }).trim();
    expect(hits.split("\n").filter((line) => line && !line.includes(".test."))).toEqual([]);
  });
});
