import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("app/globals.css", "utf8");
const shellsCss = readFileSync("components-next/ui-generated/shells/shells.css", "utf8");

describe("the tab bar ends the page (render check 2026-10-28, 390 wide)", () => {
  it("the phone .shell reserve (4.6rem for the legacy fixed bar) is dropped under <AppShell> pages", () => {
    expect(css).toMatch(/@media \(max-width: 768px\) \{\s*\.shell \{\s*padding-bottom: calc\(4\.6rem \+ env\(safe-area-inset-bottom\)\);/);
    expect(css).toMatch(/\.shell:has\(> \.nabd-core\) \{ padding-bottom: 0; \}/);
  });
  it("AppShell's bottom area is a sticky grid row after the main area, so it needs no extra padding on the page", () => {
    expect(shellsCss).toContain('grid-template-areas: "top" "main" "bottom";');
    expect(shellsCss).toMatch(/\.nabd-shell__bottom \{[^}]*position: sticky;[^}]*inset-block-end: 0;/);
  });
});
