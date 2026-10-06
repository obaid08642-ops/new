import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(process.cwd(), "app/[locale]/notifications/settings/settings.module.css"), "utf8");
const client = readFileSync(resolve(process.cwd(), "app/[locale]/notifications/settings/notification-settings-client.tsx"), "utf8");
const page = readFileSync(resolve(process.cwd(), "app/[locale]/notifications/settings/page.tsx"), "utf8");

// Rebuilt on canvas/Settings (Batch 0): the old assertions encoded read-only value pills
// (.value / .locked) and the old shadow tokens; the page now has Segmented, Radio and Toggle rows.
describe("notification settings design", () => {
  it("is built from the board's Segmented, Radio and Toggle rows inside the shared shell", () => {
    expect(client).toContain("<Segmented");
    expect(client).toContain("<Radio");
    expect(client).toContain("<Toggle");
    expect(page).toContain("<CoreShell");
    expect(css).toContain(".switchRow");
  });

  it("saves through the real PATCH, and puts a switch back when the save fails", () => {
    expect(client).toContain('"/api/patient/users/me/notification-settings"');
    expect(client).toContain('method: "PATCH"');
    expect(client).toContain('"idempotency-key"');
    expect(client).toContain("setValues((v) => ({ ...v, [id]: !next }))");
  });

  it("uses tokens and logical properties only", () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/\b(margin|padding)-(left|right)\b|(^|[\s{;])(left|right)\s*:/);
    expect(css).not.toMatch(/font-size:\s*[\d.]+(px|rem)/);
  });
});
