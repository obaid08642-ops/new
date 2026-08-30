import { describe, expect, it } from "vitest";
import robots from "./robots";
import { GET as staticSitemap } from "./sitemaps/static.xml/route";

describe("public discovery policy", () => {
  it("disallows private portal and API paths while publishing the sitemap location", () => {
    const policy = robots();
    const rules = Array.isArray(policy.rules) ? policy.rules[0] : policy.rules;
    expect(rules?.allow).toBe("/");
    expect(rules?.disallow).toEqual(expect.arrayContaining(["/api/", "/ar/dashboard", "/en/profile", "/ur/orders", "/hi/health", "/bn/reminders", "/fil/wishlist"]));
    expect(policy.sitemap).toBe("https://nabd.plus/sitemap.xml");
  });

  it("publishes static indexable entries (home, articles, category clusters) per locale", async () => {
    const res = await staticSitemap();
    const xml = await res.text();
    expect(res.headers.get("content-type")).toContain("application/xml");
    for (const locale of ["ar", "en", "ur", "hi", "bn", "fil"]) {
      expect(xml).toContain(`https://nabd.plus/${locale}<`);
      expect(xml).toContain(`https://nabd.plus/${locale}/articles<`);
      expect(xml).toContain(`https://nabd.plus/${locale}/c<`);
    }
    expect(xml).not.toMatch(/dashboard|orders|profile|medicine-catalog/);
  });
});
