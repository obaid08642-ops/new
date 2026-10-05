import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { postLoginDestination, rememberDeepLinkFromQuery } from "./post-login";

// 7d27a4e / R18: a deep link that needs a session continues after sign-in.
function memoryStorage() {
  const map = new Map<string, string>();
  return { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v), removeItem: (k: string) => void map.delete(k) };
}

beforeEach(() => { vi.stubGlobal("window", { sessionStorage: memoryStorage() }); });
afterEach(() => { vi.unstubAllGlobals(); });

describe("post-login deep link (R18 web)", () => {
  it("continues to the remembered page once, then to the dashboard", () => {
    rememberDeepLinkFromQuery("?next=%2Far%2Forders%2F91047ef2-ad36-422a-a184-629693e7c729%2Ftracking");
    expect(postLoginDestination("ar")).toBe("/ar/orders/91047ef2-ad36-422a-a184-629693e7c729/tracking");
    expect(postLoginDestination("ar")).toBe("/ar/dashboard");
  });

  it("accepts an app link and resolves it to its website page", () => {
    rememberDeepLinkFromQuery("?next=nabdplus%3A%2F%2Fdoctor%2Fen%2Fdr-reem");
    expect(postLoginDestination("en")).toBe("/en/doctor/dr-reem");
  });

  it("ignores unsafe targets", () => {
    for (const bad of ["https://evil.example/x", "//evil.example", "/api/auth/logout", "javascript:alert(1)"]) {
      rememberDeepLinkFromQuery(`?next=${encodeURIComponent(bad)}`);
      expect(postLoginDestination("ar")).toBe("/ar/dashboard");
    }
  });

  it("the login and OTP screens use it", () => {
    for (const file of ["login-form.tsx", "otp-screen.tsx"]) {
      const src = readFileSync(join(__dirname, "..", "..", "components-next", file), "utf8");
      expect(src).toContain("postLoginDestination(locale)");
      expect(src).not.toContain("router.replace(`/${locale}/dashboard`)");
    }
    expect(readFileSync(join(__dirname, "..", "..", "components-next", "login-form.tsx"), "utf8")).toContain("rememberDeepLinkFromQuery(window.location.search)");
  });
});
