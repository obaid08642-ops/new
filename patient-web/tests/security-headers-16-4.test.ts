import { describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** 16.4: the website sends the full set of security headers on its documents, HSTS with preload, and publishes security.txt. */
describe("patient-web security headers (16.4)", () => {
  async function headersFor(env: string, source: string) {
    vi.stubEnv("NODE_ENV", env);
    vi.resetModules();
    const { default: config } = await import("../next.config");
    const rules = await (config as unknown as { headers: () => Promise<{ source: string; headers: { key: string; value: string }[] }[]> }).headers();
    const merged = new Map<string, string>();
    for (const rule of rules) {
      // the same matching as Next: a plain "/:path*" matches everything; the document rule excludes /_next/static/
      const matches = rule.source === "/:path*" || (rule.source.includes("(?!_next/static/)") && !source.startsWith("/_next/static/"));
      if (matches) for (const h of rule.headers) merged.set(h.key, h.value);
    }
    vi.unstubAllEnvs();
    return merged;
  }

  it("a page carries HSTS (two years, subdomains, preload), framing, referrer, permissions and opener policy", async () => {
    const h = await headersFor("production", "/ar");
    expect(h.get("Strict-Transport-Security")).toBe("max-age=63072000; includeSubDomains; preload");
    expect(h.get("X-Frame-Options")).toBe("DENY");
    expect(h.get("X-Content-Type-Options")).toBe("nosniff");
    expect(h.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(h.get("Permissions-Policy")).toContain("camera=(self)");
    expect(h.get("Cross-Origin-Opener-Policy")).toBe("same-origin-allow-popups");
    expect(h.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
  });

  it("a hashed build asset still carries HSTS and nosniff", async () => {
    const h = await headersFor("production", "/_next/static/chunks/a.js");
    expect(h.get("Strict-Transport-Security")).toContain("preload");
    expect(h.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("publishes security.txt (RFC 9116): a contact, an expiry that is not near, and the canonical address", () => {
    const file = join(__dirname, "..", "public", ".well-known", "security.txt");
    expect(existsSync(file)).toBe(true);
    const text = readFileSync(file, "utf8");
    expect(text).toMatch(/^Contact: (mailto:|https:)/m);
    expect(text).toMatch(/^Canonical: https:\/\/nabd\.plus\/\.well-known\/security\.txt$/m);
    const expires = new Date(/^Expires: (.+)$/m.exec(text)![1]).getTime();
    // renew it at least 30 days before it lapses (a file past its date is ignored by researchers' tools)
    expect(expires - Date.now()).toBeGreaterThan(30 * 24 * 3600 * 1000);
  });
});
