import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NABD_APP_SCHEME, nabdUrlToWebPath, normalizeDeepLink } from "./nabd-links";

// 7d27a4e / R18: nabd-links had no importer and used the wrong scheme ("nabd"
// while the patient app registers "nabdplus"). The admin-curated home cards
// (deep_link) are its web consumer: an app link must fall back to the website.
// d2b9874 / R17: the unused in-site badge component (internal link, status-only
// gate, raw colours) is removed rather than left as dead code.
const ROOT = join(__dirname, "..", "..");
const ORIGIN = "https://nabd.plus";

describe("nabdplus:// deep links on the web", () => {
  it("uses the scheme the patient app registers", () => {
    const app = JSON.parse(readFileSync(join(ROOT, "..", "patient-app", "app.json"), "utf8"));
    expect(NABD_APP_SCHEME).toBe(app.expo.scheme);
    expect(NABD_APP_SCHEME).toBe("nabdplus");
  });

  it("maps an app link to its website page, keeping or adding the locale", () => {
    expect(nabdUrlToWebPath("nabdplus://doctor/dr-sara")).toBe("/doctor/dr-sara");
    expect(normalizeDeepLink("nabdplus://doctor/dr-sara", ORIGIN, "ar")).toBe("https://nabd.plus/ar/doctor/dr-sara");
    expect(normalizeDeepLink("nabdplus://facility/en/kfsh", ORIGIN, "ar")).toBe("https://nabd.plus/en/facility/kfsh");
  });

  it("keeps safe relative links, drops unsafe ones to the locale home", () => {
    expect(normalizeDeepLink("/ar/offers", ORIGIN, "ar")).toBe("/ar/offers");
    expect(normalizeDeepLink("javascript:alert(1)", ORIGIN, "ar")).toBe("/ar");
    expect(normalizeDeepLink("https://evil.example/x", ORIGIN, "en")).toBe("/en");
    expect(normalizeDeepLink("nabdplus://admin/users", ORIGIN, "ar")).toBe("https://nabd.plus/ar");
    expect(normalizeDeepLink(undefined, ORIGIN, "ar")).toBe("/ar");
  });

  it("the home page's curated cards go through normalizeDeepLink", () => {
    const src = readFileSync(join(ROOT, "app", "[locale]", "page.tsx"), "utf8");
    expect(src).toContain("normalizeDeepLink(item.deep_link");
    expect(src).not.toContain("href={item.deep_link ||");
  });
});

describe("dead verified-provider badge (R17)", () => {
  it("is removed", () => {
    expect(existsSync(join(ROOT, "components-next", "verified-provider-badge.tsx"))).toBe(false);
  });
});
