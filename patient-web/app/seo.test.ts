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

  it("lists public home and article families while the mixed catalogue remains noindex", () => {
    const entries = sitemap();
    expect(entries).toHaveLength(12);
    expect(entries.map((entry) => entry.url)).toEqual(expect.arrayContaining(["https://nabd.plus/ar", "https://nabd.plus/en", "https://nabd.plus/ur", "https://nabd.plus/hi", "https://nabd.plus/bn", "https://nabd.plus/fil", "https://nabd.plus/ar/articles", "https://nabd.plus/en/articles", "https://nabd.plus/ur/articles", "https://nabd.plus/hi/articles", "https://nabd.plus/bn/articles", "https://nabd.plus/fil/articles"]));
    expect(entries.some((entry) => entry.url.includes("dashboard") || entry.url.includes("orders") || entry.url.includes("profile") || entry.url.includes("medicine-catalog"))).toBe(false);
  });
});
