import { describe, expect, it } from "vitest";
import { benefitRows, coverageView } from "./insurance-f2";

describe("F2 insurance presentation (server data only)", () => {
  it("coverage: providers that accept the insurer, in the patient's language", () => {
    const v = coverageView({ covered: true, accepting_providers: 3, company: { name_ar: "بوبا العربية", name_en: "Bupa Arabia" }, final_decision_by: "provider" }, "lab", "ar");
    expect(v).toEqual({ covered: true, title: "3 مقدم خدمة يقبل تأمينك في تحاليل", company: "بوبا العربية", reason: null, acceptingProviders: 3 });
    expect(coverageView({ covered: true, company: { name_en: "Bupa Arabia" } }, "consultation", "en")?.title).toBe("This provider accepts your insurer");
  });

  it("coverage: a refusal carries the server's reason, translated", () => {
    expect(coverageView({ covered: false, reason: "no_insurance_policy" }, "lab", "ar")?.reason).toBe("لا توجد وثيقة تأمين مسجلة في ملفك");
    expect(coverageView(null, "lab", "ar")).toBeNull();
  });

  it("benefits: per-service request summary, nothing invented", () => {
    expect(benefitRows([{ service: "consultation", requests: 4, approved: 2, partially_approved: 1, rejected: 1, pending: 1, copay_paid: 60, copay_due: 0, icon: "stethoscope" }, { bogus: true }])).toEqual([
      { service: "consultation", requests: 4, approved: 2, partiallyApproved: 1, rejected: 1, pending: 1, copayPaid: 60, copayDue: 0 },
    ]);
    expect(benefitRows({ policy: {} })).toEqual([]);
  });
});
