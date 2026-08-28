import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(process.cwd(), "app/[locale]/notifications/notifications.module.css"), "utf8");
const page = readFileSync(resolve(process.cwd(), "app/[locale]/notifications/page.tsx"), "utf8");

describe("notifications design", () => {
  it("provides translated settings access, explicit states, and an accessible focus treatment", () => {
    expect(page).toContain('t("settings")');
    expect(css).toContain(".settingsLink:focus-visible");
    expect(css).toContain(".state");
    expect(css).toContain("border: 1px dashed");
  });

  it("limits hover movement and honours reduced-motion preferences", () => {
    expect(css).toContain("@media (hover: hover) and (pointer: fine)");
    expect(css).toContain("prefers-reduced-motion: reduce");
  });
});
