import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/*
 * Handoff §1: Readex Pro in all six languages with Noto fallbacks, self-hosted.
 * app/fonts.ts loads the faces through next/font/local; app/globals.css puts them
 * first on .shell, per locale. The order must stay the one in tokens.json
 * (font.family.locale), which is the single place a font stack is written down.
 */

const web = (p: string) => resolve(process.cwd(), p);
const css = readFileSync(web("app/globals.css"), "utf8");
const fontsTs = readFileSync(web("app/fonts.ts"), "utf8");
const mirror = readFileSync(web("app/design-tokens/fonts.css"), "utf8");
const tokens = JSON.parse(readFileSync(web("../packages/design-tokens/tokens.json"), "utf8")) as {
  font: { family: { locale: Record<string, string> } };
};

/** Token family name -> the CSS variable next/font sets for its self-hosted face. */
const SELF_HOSTED: Record<string, string> = {
  "Readex Pro": "--font-readex-pro",
  "Noto Sans Arabic": "--font-noto-sans-arabic",
  "Noto Nastaliq Urdu": "--font-noto-nastaliq-urdu",
  "Noto Sans Devanagari": "--font-noto-sans-devanagari",
  "Noto Sans Bengali": "--font-noto-sans-bengali",
};

const families = (stack: string) => stack.split(",").map((f) => f.trim().replace(/^['"]|['"]$/g, ""));

describe("self-hosted fonts", () => {
  it("loads every face from this origin, with its licence next to it", () => {
    const files = [...fontsTs.matchAll(/src:\s*"\.\/fonts\/([^"]+)"/g)].map((m) => m[1]);
    expect(files).toHaveLength(Object.keys(SELF_HOSTED).length);
    for (const file of files) expect(existsSync(web(`app/fonts/${file}`)), file).toBe(true);
    for (const variable of Object.values(SELF_HOSTED)) expect(fontsTs).toContain(`variable: "${variable}"`);
    for (const licence of ["ReadexPro", "NotoSansArabic", "NotoNastaliqUrdu", "NotoSansDevanagari", "NotoSansBengali"]) {
      expect(existsSync(web(`app/fonts/OFL-${licence}.txt`)), licence).toBe(true);
    }
    expect(fontsTs).not.toContain("next/font/google");
  });

  it("does not ask Google Fonts for anything (the CSP would block it)", () => {
    expect(mirror).not.toMatch(/fonts\.googleapis\.com/);
    expect(css).not.toMatch(/fonts\.googleapis\.com|Tajawal|--font-tajawal/);
  });

  it("puts the self-hosted faces first on .shell, in the token order for each locale", () => {
    for (const [locale, stack] of Object.entries(tokens.font.family.locale)) {
      const rule = css.match(new RegExp(`\\.shell\\[lang="${locale}"\\]\\s*\\{\\s*font-family:\\s*([^;]+);`));
      expect(rule, `.shell[lang="${locale}"] font-family`).not.toBeNull();
      const used = [...(rule?.[1] ?? "").matchAll(/var\((--[a-z-]+)\)/g)].map((m) => m[1]);
      const expected = families(stack).filter((f) => f in SELF_HOSTED).map((f) => SELF_HOSTED[f]);
      // the self-hosted faces in token order, then the token stack itself as the fallback
      expect(used, locale).toEqual([...expected, `--nabd-font-${locale}`]);
    }
  });
});
