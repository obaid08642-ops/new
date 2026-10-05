import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { isSpecialtySlug, specialtyLabel, SPECIALTY_SLUGS } from "../lib/specialties";

const locales = ["ar", "en", "ur", "hi", "bn", "fil"] as const;
const names = (locale: string) => JSON.parse(readFileSync(resolve(process.cwd(), `messages/${locale}.json`), "utf8")).SpecialtyNames as Record<string, string>;

describe("specialty names", () => {
  it.each(locales)("%s names every specialty slug and nothing else", (locale) => {
    expect(Object.keys(names(locale)).sort()).toEqual([...SPECIALTY_SLUGS].sort());
    for (const value of Object.values(names(locale))) expect(value.trim().length).toBeGreaterThan(1);
  });

  it("lists the backend's specialty master (GET /care/specialties) exactly", () => {
    const source = readFileSync(resolve(process.cwd(), "../backend/src/common/enums.ts"), "utf8");
    const block = source.slice(source.indexOf("export const SPECIALTY_MASTER"), source.indexOf("// Facility types"));
    const slugs = [...block.matchAll(/slug: '([a-z_]+)'/g)].map((m) => m[1]);
    expect(slugs.length).toBeGreaterThan(30);
    expect([...SPECIALTY_SLUGS].sort()).toEqual(slugs.sort());
  });

  it("labels a known slug in the page language and nothing for an unknown one", () => {
    const en = names("en");
    expect(specialtyLabel((key) => en[key], "cardiology")).toBe("Cardiology");
    expect(specialtyLabel((key) => en[key], " cardiology ")).toBe("Cardiology");
    expect(specialtyLabel((key) => en[key], "general_medicine")).toBeNull();
    expect(specialtyLabel((key) => en[key], "طب عام")).toBeNull();
    expect(specialtyLabel((key) => en[key], null)).toBeNull();
    expect(isSpecialtySlug("ent")).toBe(true);
    expect(isSpecialtySlug("constructor")).toBe(false);
  });
});
