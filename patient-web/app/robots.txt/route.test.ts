import { describe, expect, it } from "vitest";
import { GET, renderRobots } from "./route";

describe("robots.txt", () => {
  it("allows search and AI crawlers on public pages and keeps signed-in areas and /api out", async () => {
    const res = GET();
    expect(res.headers.get("content-type")).toContain("text/plain");
    const txt = await res.text();
    expect(txt).toBe(renderRobots());
    for (const bot of ["GPTBot", "ClaudeBot", "Google-Extended", "Applebot-Extended", "Amazonbot", "CCBot", "meta-externalagent", "PerplexityBot"]) {
      expect(txt).toContain(`User-agent: ${bot}`);
    }
    expect(txt).toContain("Content-Signal: search=yes, ai-input=yes, ai-train=yes");
    expect(txt).not.toMatch(/ai-train=no|search=no|ai-input=no|use=reference/);
    expect(txt).not.toMatch(/^Disallow: \/$/m);
    expect(txt).toMatch(/^Disallow: \/api\/$/m);
    expect(txt).toContain("Disallow: /ar/dashboard");
    expect(txt).toContain("Sitemap: https://nabd.plus/sitemap.xml");
    // every group of the file carries the signal
    const groups = txt.split(/\n\n/).filter((g) => g.includes("User-agent:"));
    for (const g of groups) expect(g).toContain("Content-Signal:");
  });
});
