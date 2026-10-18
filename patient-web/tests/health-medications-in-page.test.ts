import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// A 403 or 404 from the API is an in-page state (the page's own error), not the 404 page: the screen's
// "not ok" branch draws it.
describe("in-page state for a forbidden or missing read", () => {
  it("does not send the reader to the 404 page on 403 or 404", () => {
    const source = readFileSync(resolve(process.cwd(), "app/[locale]/health/medications/page.tsx"), "utf8");
    expect(source).not.toMatch(/status === 403 \|\| [\w.]+\.status === 404\) notFound\(\)/);
  });
});
