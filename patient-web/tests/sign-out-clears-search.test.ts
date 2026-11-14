// Privacy: every sign-out path forgets this device's recent searches (a shared tablet must not show the last person's terms).
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");
const signOutFiles = [
  "components-next/account/sign-out-action.tsx",
  "components-next/sign-out-button.tsx",
  "components-next/session-actions.tsx",
];

describe("sign-out forgets recent searches", () => {
  for (const file of signOutFiles) {
    it(`${file} calls forgetRecentSearches next to clearSwr`, () => {
      const source = readFileSync(path.join(root, file), "utf8");
      expect(source).toContain("forgetRecentSearches()");
      expect(source).toMatch(/clearSwr\(\);\s*forgetRecentSearches\(\);/);
    });
  }
});
