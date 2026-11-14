import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// The decision row reads the booking's insurance_decision or coverage_decision (outcome, else decision), as the app does.
describe("nursing insurance status: the decision fields", () => {
  it("reads insurance_decision / coverage_decision and their outcome or decision", () => {
    const source = readFileSync(resolve(process.cwd(), "app/[locale]/nursing/insurance-status/page.tsx"), "utf8");
    expect(source).toContain("booking.insurance_decision ?? booking.coverage_decision");
    expect(source).toContain("decisionRecord.outcome");
    expect(source).toContain("decisionRecord.decision");
    expect(source).not.toMatch(/typeof booking\.decision === "string"/);
  });

  it("the app reads the same fields", () => {
    const app = readFileSync(resolve(process.cwd(), "../patient-app/app/nursing/insurance-status.tsx"), "utf8");
    expect(app).toContain("booking?.insurance_decision ?? booking?.coverage_decision");
    expect(app).toContain("decisionRec.outcome ?? decisionRec.decision");
  });
});
