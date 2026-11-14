import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, CSP_NONCE_PLACEHOLDER } from "../lib/security/csp";

// QA row P2 "cloudflareinsights": the edge-injected Cloudflare Web Analytics beacon is NOT part of the product (the web has
// its own web-vitals beacon); owner decision pending, so the policy keeps refusing it. This pins that, and the nonce policy.
describe("the policy and the Cloudflare Web Analytics beacon", () => {
  const csp = contentSecurityPolicy(CSP_NONCE_PLACEHOLDER, false);
  const directives = Object.fromEntries(csp.split("; ").map((part) => [part.split(" ")[0], part.split(" ").slice(1)]));
  it("allows no cloudflareinsights host anywhere", () => {
    expect(csp).not.toContain("cloudflareinsights");
  });
  it("keeps the nonce + strict-dynamic script policy", () => {
    expect(directives["script-src"]).toEqual(expect.arrayContaining(["'self'", `'nonce-${CSP_NONCE_PLACEHOLDER}'`, "'strict-dynamic'"]));
  });
});
