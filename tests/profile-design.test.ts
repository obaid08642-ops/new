import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(process.cwd(), "app/[locale]/profile/profile.module.css"), "utf8");

describe("profile design", () => {
  it("provides accessible quick links and responsive profile domains", () => {
    expect(css).toContain(".quickCard:focus-visible");
    expect(css).toContain("repeat(3, minmax(0, 1fr))");
    expect(css).toContain(".domain");
    expect(css).toContain("@media (max-width: 860px)");
  });

  it("limits hover motion and honours reduced-motion preferences", () => {
    expect(css).toContain("@media (hover: hover) and (pointer: fine)");
    expect(css).toContain("prefers-reduced-motion: reduce");
  });
});
