import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { describeSkinResult, describeTriageResult, extractAiDisclaimer } from "./ai-health";

// a95be9a: AI health results carry the server's bilingual medical disclaimer;
// the web forms show it, and they read the real structured result shape.
const DISCLAIMER = { ar: "هذه النتيجة مولّدة بالذكاء الاصطناعي وليست استشارة طبية.", en: "This output is NOT medical advice." };

describe("extractAiDisclaimer", () => {
  it("returns the page-language text from the payload", () => {
    expect(extractAiDisclaimer({ care_level: "consultation", disclaimer: DISCLAIMER }, "ar")).toBe(DISCLAIMER.ar);
    expect(extractAiDisclaimer({ data: { disclaimer: DISCLAIMER } }, "en")).toBe(DISCLAIMER.en);
    expect(extractAiDisclaimer({ disclaimer: { ar: DISCLAIMER.ar } }, "ur")).toBe(DISCLAIMER.ar);
    expect(extractAiDisclaimer({ care_level: "consultation" }, "ar")).toBeNull();
  });
});

describe("result guidance from the real backend shape", () => {
  it("describes triage care levels (the previous form expected a free-text reply and always failed)", () => {
    expect(describeTriageResult({ care_level: "emergency", notice: "x", disclaimer: DISCLAIMER }, "ar")).toContain("997");
    expect(describeTriageResult({ care_level: "consultation" }, "en")).toContain("Consult a doctor");
    expect(describeTriageResult({ reply: "free text" }, "ar")).toBe("free text");
    expect(describeTriageResult({}, "ar")).toBeNull();
  });

  it("describes skin care levels instead of dumping JSON", () => {
    expect(describeSkinResult({ care_level: "clinical_assessment" }, "ar")).toContain("تقييم مختص");
    expect(describeSkinResult({ care_level: "self_observation" }, "en")).toContain("does not rule out");
    expect(describeSkinResult({}, "ar")).toBeNull();
  });
});

describe("the AI result forms use the server disclaimer", () => {
  for (const file of ["app/[locale]/ai/triage-form.tsx", "components-next/skin-analysis-form.tsx"]) {
    it(file, () => {
      const src = readFileSync(join(__dirname, "..", "..", file), "utf8");
      expect(src).toContain("extractAiDisclaimer(");
    });
  }
});
