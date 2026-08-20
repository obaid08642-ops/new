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

  it("lists only public homepage families while the mixed catalogue remains noindex", () => {
    const entries = sitemap();
    expect(entries.map((entry) => entry.url)).toEqual(["https://nabd.plus/ar", "https://nabd.plus/en", "https://nabd.plus/ur", "https://nabd.plus/hi", "https://nabd.plus/bn", "https://nabd.plus/fil"]);
    expect(entries.some((entry) => entry.url.includes("dashboard") || entry.url.includes("orders") || entry.url.includes("profile") || entry.url.includes("medicine-catalog"))).toBe(false);
  });
});
