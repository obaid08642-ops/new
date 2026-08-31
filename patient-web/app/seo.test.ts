import { describe, expect, it } from "vitest";
import robots from "./robots";
import { GET as staticSitemap } from "./sitemaps/static.xml/route";

describe("public discovery policy", () => {
  it("disallows private portal and API paths while keeping public listings crawlable", () => {
    const policy = robots();
    const rules = Array.isArray(policy.rules) ? policy.rules[0] : policy.rules;
    const allow = Array.isArray(rules?.allow) ? rules.allow : (rules?.allow ? [rules.allow] : []);
    const disallow = Array.isArray(rules?.disallow) ? rules.disallow : [];

    expect(allow).toContain("/");
    expect(allow).toEqual(expect.arrayContaining(["/ar/diagnostics/labs", "/ar/diagnostics/radiology", "/ar/diagnostics/packages"]));

    expect(disallow).toEqual(expect.arrayContaining([
      "/api/", "/ar/dashboard", "/en/profile", "/ur/orders", "/hi/health", "/bn/reminders", "/fil/wishlist",
      "/ar/wallet", "/en/reports", "/ur/programs", "/hi/returns", "/bn/support",
      "/ar/consultations/share-report", "/en/consultations/video-call",
      "/ar/nursing/visits", "/ar/insurance", "/ar/home-care",
    ]));
    // Public service listings must NOT be disallowed by a parent prefix.
    expect(disallow).not.toContain("/ar/diagnostics/labs");
    expect(disallow).not.toContain("/ar/diagnostics/radiology");
    expect(disallow).not.toContain("/ar/nursing/catalog");

    expect(policy.sitemap).toBe("https://nabd.plus/sitemap.xml");
  });

  it("publishes static indexable entries (home, articles, category clusters, public service listings) per locale", async () => {
    const res = await staticSitemap();
    const xml = await res.text();
    expect(res.headers.get("content-type")).toContain("application/xml");
    for (const locale of ["ar", "en", "ur", "hi", "bn", "fil"]) {
      expect(xml).toContain(`https://nabd.plus/${locale}<`);
      expect(xml).toContain(`https://nabd.plus/${locale}/articles<`);
      expect(xml).toContain(`https://nabd.plus/${locale}/c<`);
      expect(xml).toContain(`https://nabd.plus/${locale}/consultations/doctors<`);
      expect(xml).toContain(`https://nabd.plus/${locale}/diagnostics/labs<`);
      expect(xml).toContain(`https://nabd.plus/${locale}/diagnostics/radiology<`);
    }
    expect(xml).not.toMatch(/dashboard|orders|profile|medicine-catalog|wallet|share-report/);
  });
});
