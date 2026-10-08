import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Batch 13 (F82-3 rules): the 13 public landing and legal pages are static/ISR, so they are the same HTML for every visitor:
 * they opt in with `generateStaticParams`, have a `revalidate` window, and read no cookie, header, search parameter or
 * no-store fetch. The proxy must also mark their paths as public pages (it decides the nonce path and the cache headers;
 * tests/static-public-pages.test.ts proves it for every page that opts in).
 */
const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const PAGES = [
  "condition/[slug]",
  "doctor/[slug]",
  "doctor/[slug]/[city]",
  "doctors/[specialty]/[city]",
  "doctors/[specialty]/[city]/[neighborhood]",
  "facility/[slug]",
  "home-nursing/[citySlug]",
  "labs/[testSlug]/[citySlug]",
  "radiology/[serviceSlug]/[citySlug]",
  "services/[serviceSlug]/[citySlug]",
  "pharmacies/[citySlug]",
  "privacy",
  "terms",
  "provider-info",
].map((p) => `app/[locale]/${p}/page.tsx`);

describe("the landing and legal pages are static", () => {
  it.each(PAGES)("%s opts in with a revalidate window and generateStaticParams, and reads no request", (file) => {
    const src = read(file);
    expect(src).toMatch(/export const revalidate = \d+;/);
    expect(src).toContain("export function generateStaticParams");
    expect(src).not.toMatch(/\bcookies\(|\bheaders\(|searchParams|no-store/);
  });

  it("the proxy marks the legal pages, the provider page and the doctor in a city as public pages (a cached page needs the stamping path)", () => {
    const proxy = read("proxy.ts");
    const line = proxy.split("\n").find((l) => l.includes("const PUBLIC_INDEXABLE")) ?? "";
    for (const part of ["privacy", "terms", "provider-info", "doctor\\\\/[^/]+(?:\\\\/[^/]+)?"]) expect(line).toContain(part);
  });
});
