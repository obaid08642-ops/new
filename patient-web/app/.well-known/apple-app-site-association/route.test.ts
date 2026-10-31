import fs from "fs";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET } from "./route";
import { APP_LINK_LOCALES, PUBLIC_APP_LINK_PATHS, allAppLinkPatterns } from "@/lib/app-links";

type Component = { "/": string; exclude?: boolean; comment?: string };
type Detail = { appID: string; paths: string[]; components: Component[] };

const LOCALE_DIR = path.resolve(__dirname, "../../[locale]");

/** Does a Next.js page under app/[locale] serve this path? ([x] one segment, [...x] one or more, [[...x]] zero or more) */
function webPageExists(dir: string, parts: string[]): boolean {
  if (parts.length === 0) {
    if (fs.existsSync(path.join(dir, "page.tsx"))) return true;
    return fs.readdirSync(dir).some((name) => /^\[\[\.\.\..+\]\]$/.test(name) && fs.existsSync(path.join(dir, name, "page.tsx")));
  }
  const [head, ...rest] = parts;
  return fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).some((entry) => {
    const sub = path.join(dir, entry.name);
    if (/^\(.*\)$/.test(entry.name)) return webPageExists(sub, parts);
    if (/^\[\[?\.\.\..+\]\]?$/.test(entry.name)) return fs.existsSync(path.join(sub, "page.tsx"));
    if (/^\[.+\]$/.test(entry.name) || entry.name === head) return webPageExists(sub, rest);
    return false;
  });
}

// the Team ID comes from the environment only (no default): the file is not served without it (tests/app-links-static.test.ts)
const savedTeam = process.env.APPLE_TEAM_ID;
beforeEach(() => { process.env.APPLE_TEAM_ID = "ABCDE12345"; });
afterEach(() => { if (savedTeam === undefined) delete process.env.APPLE_TEAM_ID; else process.env.APPLE_TEAM_ID = savedTeam; });

describe("apple-app-site-association", () => {
  it("serves JSON with the applinks and webcredentials shape", async () => {
    const response = await GET();
    expect(response.headers.get("content-type")).toContain("application/json");
    const body = await response.json();
    expect(body.applinks.apps).toEqual([]);
    expect(body.applinks.details).toHaveLength(2);
    for (const detail of body.applinks.details as Detail[]) {
      expect(detail.appID).toMatch(/^[A-Z0-9]+\.[\w.]+$/);
      expect(Array.isArray(detail.paths)).toBe(true);
      expect(Array.isArray(detail.components)).toBe(true);
    }
    expect(body.webcredentials.apps).toHaveLength(2);
  });

  it("lists every public path bare and under the six locales, and nothing else", async () => {
    const body = await (await GET()).json();
    const patient = (body.applinks.details as Detail[])[0];
    const expected = allAppLinkPatterns();
    expect(APP_LINK_LOCALES).toEqual(["ar", "en", "ur", "hi", "bn", "fil"]);
    expect(patient.paths).toEqual(["NOT /api/*", "NOT /.well-known/*", "NOT /admin/*", ...expected]);
    for (const entry of PUBLIC_APP_LINK_PATHS) {
      const localized = APP_LINK_LOCALES.map((l) => (entry.path === "/" ? `/${l}` : `/${l}${entry.path}`));
      for (const p of localized) expect(patient.paths).toContain(p);
      if (entry.localeOnly) expect(patient.paths).not.toContain(entry.path);
      else expect(patient.paths).toContain(entry.path);
    }
    expect(new Set(patient.paths).size).toBe(patient.paths.length);
    const included = patient.components.filter((c) => !c.exclude).map((c) => c["/"]);
    expect(included).toEqual(expected);
    // exclusions come first, so they win over any include
    expect(patient.components.slice(0, 3).every((c) => c.exclude)).toBe(true);
  });

  it("covers the required public page types", () => {
    const patterns = allAppLinkPatterns();
    for (const p of [
      "/en", "/p/*", "/c", "/c/*", "/doctor/*", "/consultations/doctors", "/consultations/doctors/*", "/doctors/*",
      "/facility/*", "/consultations/clinics/*", "/pharmacy/*", "/pharmacies/*", "/labs/*", "/diagnostics/labs",
      "/diagnostics/labs/*", "/diagnostics/packages", "/diagnostics/packages/*", "/radiology/*", "/diagnostics/radiology",
      "/diagnostics/radiology/*", "/home-nursing/*", "/nursing/catalog", "/home-care/services/*", "/articles",
      "/articles/*", "/condition/*",
    ]) {
      expect(patterns).toContain(p);
    }
  });

  it("every listed path is a real web page", () => {
    for (const entry of PUBLIC_APP_LINK_PATHS) {
      if (entry.section) {
        // a whole section: its folder exists on the web and holds pages of its own
        const section = entry.path.replace(/\/\*$/, "").split("/").filter(Boolean);
        const dir = path.join(LOCALE_DIR, ...section);
        expect({ path: entry.path, ok: fs.existsSync(dir) && fs.readdirSync(dir, { withFileTypes: true }).some((e) => e.isDirectory() || e.name === "page.tsx") }).toEqual({ path: entry.path, ok: true });
        continue;
      }
      const sample = entry.path.endsWith("/*") ? `${entry.path.slice(0, -1)}test-1` : entry.path;
      const parts = sample.split("/").filter(Boolean);
      // "/x/*" pages that need two segments (/labs/{test}/{city}) are checked with two
      const ok = webPageExists(LOCALE_DIR, parts) || (entry.path.endsWith("/*") && webPageExists(LOCALE_DIR, [...parts, "test-2"]));
      expect({ path: entry.path, ok }).toEqual({ path: entry.path, ok: true });
    }
  });
});
