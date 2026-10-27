import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const css = read("components-next/consult/doctor-schedule.module.css");
const bar = read("components-next/consult/doctor-booking-bar.tsx");
const page = read("app/[locale]/consultations/doctors/[doctorId]/page.tsx");
const rule = (selector: string) => css.split("\n").find((l) => l.startsWith(selector)) ?? "";

describe("doctor profile render fixes (G3)", () => {
  it("the summary line has no list bullets and its separator cannot start a line", () => {
    expect(rule(".summaryList {")).toContain("list-style: none");
    expect(css).not.toMatch(/li \+ li::before/);
    expect(css).toMatch(/li:not\(:last-child\)::after[^}]*position: absolute[^}]*inset-inline-end/);
  });
  it("rating, reviews and fee are not repeated in the stat tiles", () => {
    expect(page).not.toContain('c("statRating")');
    expect(page).not.toContain('c("statReviews")');
    expect(page).not.toContain('c("statPrice")');
    expect(page).toContain('c("statYears")');
    expect(page).toContain("summaryItems(");
  });
  it("the in-card Book button is gone; the sticky bar is the only Book action", () => {
    expect(page).not.toMatch(/<ButtonLink[^>]*chooseDayTime/);
    expect(bar).toContain("ButtonLink");
  });
  it("the sticky bar is one compact row with a 48 px, end-side button and a single-line hint", () => {
    expect(rule(".bar.bar")).toMatch(/flex-direction: row/);
    expect(rule(".bar.bar")).toMatch(/flex-wrap: nowrap/);
    expect(css).toMatch(/block-size: 48px/);
    expect(rule(".hint")).toContain("white-space: nowrap");
    expect(bar).not.toContain("fullWidth");
    expect(bar).not.toContain("nabd-button--lg");
  });
  it("the disabled Book uses text.primary on bg.sunken (a declared contrast pair), not half-opacity red", () => {
    const off = rule(".bar.bar .bookOff");
    expect(off).toContain("background: var(--nabd-color-bg-sunken)");
    expect(off).toContain("color: var(--nabd-color-text-primary)");
    expect(off).toContain("opacity: 1");
    expect(bar).not.toContain("nabd-button--disabled");
    expect(bar).not.toContain("nabd-button--primary");
    const tokens = JSON.parse(readFileSync(join(root, "../packages/design-tokens/tokens.json"), "utf8")) as { contrast: Array<{ id: string; min: number }> };
    expect(tokens.contrast.some((p) => p.id === "text.primary on bg.sunken" && p.min >= 4.5)).toBe(true);
  });
});
