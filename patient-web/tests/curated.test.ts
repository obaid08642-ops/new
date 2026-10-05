import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { curatedHref, WEB_ROUTE_ROOTS } from "../lib/curated";
import { allowedImageUrl, IMAGE_HOSTS } from "../lib/image-hosts";

const localeDir = resolve(process.cwd(), "app/[locale]");
// The auth and onboarding screens are not places a curated banner sends anyone.
const NOT_LINKABLE = new Set(["forgot-password", "login", "otp", "password-reset", "register", "welcome", "onboarding"]);

describe("curated home links", () => {
  it("lists exactly the pages that exist under app/[locale] (minus the sign-in screens)", () => {
    for (const root of WEB_ROUTE_ROOTS) expect(existsSync(join(localeDir, root)), root).toBe(true);
    const folders = readdirSync(localeDir).filter((name) => statSync(join(localeDir, name)).isDirectory() && !NOT_LINKABLE.has(name));
    expect([...WEB_ROUTE_ROOTS].sort()).toEqual(folders.sort());
  });

  it("puts an internal app route under the page's locale", () => {
    expect(curatedHref("/pharmacy/offers", "en")).toBe("/en/pharmacy/offers");
    expect(curatedHref("/consultations/doctors?sort=rating", "ur")).toBe("/ur/consultations/doctors?sort=rating");
    expect(curatedHref("  /offers  ", "ar")).toBe("/ar/offers");
  });

  it("replaces a locale the link already carries and sends the bare root home", () => {
    expect(curatedHref("/ar/medicines", "en")).toBe("/en/medicines");
    expect(curatedHref("/fil", "hi")).toBe("/hi");
    expect(curatedHref("/", "bn")).toBe("/bn");
  });

  it("refuses schemes, hosts, protocol-relative and traversal links, and pages the web does not have", () => {
    for (const link of ["https://evil.test/x", "javascript:alert(1)", "//evil.test/x", "/\\evil.test", "/pharmacy/../admin", "/./x", "data:text/html,x", "mailto:a@b.c", "/tracking/lab/1", "/admin/users", "/login", "offers", "", "/" + "a".repeat(200)]) {
      expect(curatedHref(link, "en"), link).toBeNull();
    }
    expect(curatedHref(undefined, "en")).toBeNull();
    expect(curatedHref(null, "en")).toBeNull();
  });
});

describe("curated home images", () => {
  it("accepts only https images on the hosts next/image is configured for", () => {
    expect(allowedImageUrl("https://cdn.nabd.plus/banners/a.webp")).toBe("https://cdn.nabd.plus/banners/a.webp");
    expect(allowedImageUrl("https://res.cloudinary.com/nabd/image/upload/x.jpg")).toContain("res.cloudinary.com");
  });

  it("returns null (the card shows without its image, the page does not break) for any other host or form", () => {
    for (const url of ["https://evil.test/a.jpg", "http://cdn.nabd.plus/a.jpg", "//cdn.nabd.plus/a.jpg", "https://cdn.nabd.plus.evil.test/a.jpg", "https://user:pw@cdn.nabd.plus/a.jpg", "data:image/png;base64,AAAA", "not a url", "", "https://cdn.nabd.plus/" + "a".repeat(800)]) {
      expect(allowedImageUrl(url), url).toBeNull();
    }
    expect(allowedImageUrl(undefined)).toBeNull();
  });

  it("is the same allowlist next.config.ts gives next/image (not widened)", () => {
    expect([...IMAGE_HOSTS]).toEqual(["cdn.nabd.plus", "res.cloudinary.com"]);
    const config = readFileSync(resolve(process.cwd(), "next.config.ts"), "utf8");
    expect(config).toContain("IMAGE_HOSTS.map");
    expect(config).not.toMatch(/hostname:\s*"/);
  });
});
