import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(process.cwd(), "app/[locale]/reminders/reminders.module.css"), "utf8");

describe("reminders design", () => {
  it("provides an explicit dose summary, responsive cards, and honest states", () => {
    expect(css).toContain(".summary");
    expect(css).toContain("repeat(auto-fit, minmax(16rem, 1fr))");
    expect(css).toContain(".state");
    expect(css).toContain("border: 1px dashed");
  });

  it("limits hover movement and honours reduced-motion preferences", () => {
    expect(css).toContain("@media (hover: hover) and (pointer: fine)");
    expect(css).toContain("prefers-reduced-motion: reduce");
  });
});
