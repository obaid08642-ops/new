import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// The network tab lists the providers of the patient's insurer, network and class (the app passes all three; the
// backend reads insurance_network and insurance_class in providers.controller.ts).
describe("insurance network tab: provider filters", () => {
  it("passes the patient's network and class with the insurer", () => {
    const source = readFileSync(resolve(process.cwd(), "app/[locale]/insurance/page.tsx"), "utf8");
    expect(source).toContain('qs.set("insurance_network", insurance.network)');
    expect(source).toContain('qs.set("insurance_class", insurance.class)');
    expect(source).toContain('insurance_company: companyId');
  });

  it("the backend reads the same query names", () => {
    const controller = readFileSync(resolve(process.cwd(), "../backend/src/modules/provider/providers.controller.ts"), "utf8");
    expect(controller).toContain("@Query('insurance_network')");
    expect(controller).toContain("@Query('insurance_class')");
  });
});
