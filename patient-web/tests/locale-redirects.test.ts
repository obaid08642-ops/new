import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { localeOnlyRedirects } from "@/lib/routing/locale-redirects";

/** The source pattern's first segment as next.config matches it: ":locale(a|b)" is the group "(a|b)". */
const firstSegment = (source: string) => new RegExp(`^/${/^\/:locale\(([^)]*)\)\//.exec(source)?.[1] ?? "[^/]+"}$`);

describe("old-address redirects only match a real locale", () => {
  it("does not catch the website's own /api routes (POST /api/family/join went to a page)", () => {
    const [join, other] = localeOnlyRedirects([
      { source: "/:locale/family/join", destination: "/:locale/family/add?tab=join", permanent: false },
      { source: "/legacy", destination: "/ar", permanent: true },
    ]);
    expect(firstSegment(join.source).test("/api")).toBe(false);
    for (const locale of ["ar", "en", "ur", "hi", "bn", "fil"]) expect(firstSegment(join.source).test(`/${locale}`)).toBe(true);
    expect(join.source.endsWith("/family/join")).toBe(true);
    expect(other.source).toBe("/legacy");
  });
  it("is applied to every redirect in next.config", () => {
    expect(readFileSync(new URL("../next.config.ts", import.meta.url), "utf8")).toMatch(/async redirects\(\) \{\s*return localeOnlyRedirects\(\[/);
  });
});
