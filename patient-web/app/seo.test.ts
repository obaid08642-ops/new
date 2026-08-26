import { describe, expect, it } from "vitest";
import robots from "./robots";
import sitemap from "./sitemap";

describe("public discovery policy", () => {
  it("disallows private portal and API paths while publishing the sitemap location", () => {
    const policy = robots();
    const rules = Array.isArray(policy.rules) ? policy.rules[0] : policy.rules;
    expect(rules?.allow).toBe("/");
    expect(rules?.disallow).toEqual(expect.arrayContaining(["/api/", "/ar/dashboard", "/en/profile", "/ur/orders", "/hi/health", "/bn/reminders", "/fil/medicines"]));
    expect(policy.sitemap).toBe("https://nabd.plus/sitemap.xml");
  });

  // I-wave1: public discovery surfaces joined the sitemap alongside locale homes.
  it("lists locale homes plus public catalog surfaces while private portals stay out", () => {
    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);
    for (const locale of ["ar", "en", "ur", "hi", "bn", "fil"]) {
      expect(urls).toContain(`https://nabd.plus/${locale}`);
      expect(urls).toContain(`https://nabd.plus/${locale}/medicine-catalog`);
      expect(urls).toContain(`https://nabd.plus/${locale}/specialties`);
      expect(urls).toContain(`https://nabd.plus/${locale}/articles`);
    }
    expect(entries.some((entry) => entry.url.includes("dashboard") || entry.url.includes("orders") || entry.url.includes("profile"))).toBe(false);
  });
});
