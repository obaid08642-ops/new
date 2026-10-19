import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const LOCALES = ["ar", "en", "ur", "hi", "bn", "fil"] as const;

// A member who did not share is an in-page state, not the 404 page. A missing member or an error keeps the page's error.
describe("family member: records not shared or missing", () => {
  it("does not send the reader to the 404 page on 403 or 404 from the records read", () => {
    const source = readFileSync(resolve(process.cwd(), "app/[locale]/family/[memberRef]/page.tsx"), "utf8");
    expect(source).not.toMatch(/status === 403 \|\| [\w.]+\.status === 404\) notFound\(\)/);
    expect(source).toContain('recordsResponse.status === 403) return frame(<ConsultState kind="empty"');
  });

  it.each(LOCALES)("%s has the not-shared title and text", (locale) => {
    const messages = JSON.parse(readFileSync(resolve(process.cwd(), `messages/${locale}.json`), "utf8"));
    expect(String(messages.FamilyWeb.notSharedTitle).trim()).not.toBe("");
    expect(String(messages.FamilyWeb.notShared).trim()).not.toBe("");
  });
});
