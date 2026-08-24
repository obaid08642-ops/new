import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(process.cwd(), "app/[locale]/notifications/settings/settings.module.css"), "utf8");

describe("notification settings design", () => {
  it("provides protected value states and a responsive preference layout", () => {
    expect(css).toContain(".value");
    expect(css).toContain(".locked");
    expect(css).toContain(".state");
    expect(css).toContain("@media (max-width: 560px)");
  });

  it("uses shared visual tokens for card hierarchy", () => {
    expect(css).toContain("var(--radius-xl)");
    expect(css).toContain("var(--shadow-md)");
  });
});
