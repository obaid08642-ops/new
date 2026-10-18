import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// The old payment-split link without a request id opens the newest request; it no longer ends on the 404 page.
describe("insurance payment split: the request is optional", () => {
  it("does not call notFound() for a missing request id", () => {
    const source = readFileSync(resolve(process.cwd(), "app/[locale]/insurance/payment-split/page.tsx"), "utf8");
    expect(source).toContain("if (!UUID.test(requestId)) notFound();");
    expect(source).not.toMatch(/if \(!isLocale\(locale\) \|\| !requestId/);
    expect(source).toContain("/insurance/requests/my");
    expect(source).toContain("parseRequestRows(await response.json().catch(() => null))[0]");
  });
});
