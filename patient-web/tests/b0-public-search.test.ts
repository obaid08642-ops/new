import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, CSP_NONCE_PLACEHOLDER } from "../lib/security/csp";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("issue 439: the search is public", () => {
  it("the search page asks for no session and searches through the public route", () => {
    expect(read("app/[locale]/search/page.tsx")).not.toContain("requirePatientAccess");
    expect(read("app/[locale]/search/search-client.tsx")).toContain("/api/search/public?q=");
  });
});

describe("issue 430: Google sign-in can open its popup", () => {
  it("the opener policy allows popups and the policy names only Google's gsi path", () => {
    expect(read("next.config.ts")).toContain('"Cross-Origin-Opener-Policy", value: "same-origin-allow-popups"');
    const policy = contentSecurityPolicy(CSP_NONCE_PLACEHOLDER, false);
    expect(policy).toContain("connect-src 'self' https://api.nabd.plus wss://live.nabd.plus https://cdn.nabd.plus https://accounts.google.com/gsi/");
    expect(policy).not.toMatch(/accounts\.google\.com(?!\/gsi\/)/);
  });
});
