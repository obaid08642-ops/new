import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isFullPrefetchRoute } from "./prefetch-routes";

describe("isFullPrefetchRoute", () => {
  it("allows the public lists and detail pages in every locale", () => {
    for (const locale of ["ar", "en", "ur", "hi", "bn", "fil"]) {
      for (const path of ["/consultations/doctors", "/c", "/c/medicines", "/c/medicines/pain", "/diagnostics/labs", "/nursing/catalog", "/map", "/articles", "/articles/some-slug", "/p/panadol", "/consultations/doctors/doc-1"]) {
        expect(isFullPrefetchRoute(`/${locale}${path}`), `/${locale}${path}`).toBe(true);
      }
    }
  });

  it("allows a query string and a trailing slash on a public route", () => {
    expect(isFullPrefetchRoute("/ar/consultations/doctors?sort=rating")).toBe(true);
    expect(isFullPrefetchRoute("/ar/c/")).toBe(true);
  });

  it("never allows a page that reads the patient's own data", () => {
    for (const path of ["/dashboard", "/cart", "/cart/checkout", "/orders", "/orders/1", "/profile", "/notifications", "/appointments", "/home-care", "/chat", "/settings", "/family", "/prescriptions", "/reports", "/loyalty", "/search", "/login", "/diagnostics/labs/book", "/diagnostics/bookings", "/diagnostics/results", "/articles/bookmarks", "/consultations/book/doc-1", "/pharmacy", "/"]) {
      expect(isFullPrefetchRoute(`/ar${path}`, { signedIn: false }), path).toBe(false);
    }
  });

  it("allows the diagnostics hub for a visitor without a session only (signed in, it lists the patient's bookings)", () => {
    expect(isFullPrefetchRoute("/ar/diagnostics")).toBe(true);
    expect(isFullPrefetchRoute("/ar/diagnostics", { signedIn: false })).toBe(true);
    expect(isFullPrefetchRoute("/ar/diagnostics", { signedIn: true })).toBe(false);
    expect(isFullPrefetchRoute("/ar/diagnostics/labs", { signedIn: true })).toBe(true);
  });

  it("never allows the Saved tab of the articles (it reads the patient's bookmarks), only the public list", () => {
    expect(isFullPrefetchRoute("/ar/articles?tab=saved")).toBe(false);
    expect(isFullPrefetchRoute("/ar/articles?q=sleep&tab=saved")).toBe(false);
    expect(isFullPrefetchRoute("/ar/articles?tab=all")).toBe(true);
    expect(isFullPrefetchRoute("/ar/articles?category=Wellness")).toBe(true);
  });

  it("refuses anything that is not a path of this site", () => {
    for (const href of ["https://example.com/ar/c", "//example.com/ar/c", "ar/c", "", "/api/patient/orders", "/ar/api/auth/logout"]) {
      expect(isFullPrefetchRoute(href), href).toBe(false);
    }
  });
});

/** The page files behind the allowed routes: a full prefetch renders them for a visitor, so they must not read the session. */
const PUBLIC_PAGES = [
  "app/[locale]/consultations/doctors/page.tsx",
  "app/[locale]/consultations/doctors/[doctorId]/page.tsx",
  "app/[locale]/c/[[...category]]/page.tsx",
  "app/[locale]/diagnostics/labs/page.tsx",
  "app/[locale]/nursing/catalog/page.tsx",
  "app/[locale]/map/page.tsx",
  "app/[locale]/articles/page.tsx",
  "app/[locale]/articles/[slug]/page.tsx",
  "app/[locale]/p/[slug]/page.tsx",
];

describe("pages behind a full prefetch", () => {
  it.each(PUBLIC_PAGES)("%s reads no session and writes nothing", (file) => {
    const source = readFileSync(resolve(process.cwd(), file), "utf8");
    expect(source).not.toMatch(/requirePatientAccess|getOptionalPatientAccessToken|authCookieNames|cookies\(\)/);
    expect(source).not.toMatch(/method:\s*["'](?:POST|PUT|PATCH|DELETE)["']/);
  });

  it("the diagnostics hub reads the session, which is why it is listed for signed-out visitors only", () => {
    const source = readFileSync(resolve(process.cwd(), "app/[locale]/diagnostics/page.tsx"), "utf8");
    expect(source).toContain("requirePatientAccess");
  });
});
