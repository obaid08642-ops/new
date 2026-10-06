import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(process.cwd(), "app/[locale]/notifications/notifications.module.css"), "utf8");
const page = readFileSync(resolve(process.cwd(), "app/[locale]/notifications/page.tsx"), "utf8");

// Rebuilt on canvas/Notifications (Batch 0): the old assertions encoded the pre-board markup
// (a bespoke settings pill, hover lift and reduced-motion override); these encode the board's.
describe("notifications design", () => {
  it("is drawn inside the shared shell with the board's states and a translated settings link", () => {
    expect(page).toContain("<CoreShell");
    expect(page).toContain('t("settings")');
    expect(page).toContain("<EmptyState");
    expect(page).toContain("<RetryErrorState");
    expect(css).toContain(".settingsLink:focus-visible");
  });

  it("groups rows into today and earlier cards, with an unread dot and tint from tokens", () => {
    expect(page).toContain('t("today")');
    expect(page).toContain('t("earlier")');
    expect(css).toContain(".unread");
    expect(css).toContain(".dot");
  });

  it("uses tokens and logical properties only", () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/\b(margin|padding)-(left|right)\b|(^|[\s{;])(left|right)\s*:/);
    expect(css).not.toMatch(/\b100vh\b/);
    expect(css).not.toMatch(/font-size:\s*[\d.]+(px|rem)/);
  });
});
