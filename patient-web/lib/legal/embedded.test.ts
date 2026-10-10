import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
// @ts-expect-error the generator is a plain Node script
import { parsePolicyFile, render } from "../../scripts/embed-legal-policies.mjs";
import { PublicDataUnavailableError } from "@/lib/api/public-unavailable";
import { embeddedLegalPolicy, isPublishable, readLegalPolicyOrEmbedded } from "./embedded";
import { EMBEDDED_POLICIES, type EmbeddedPolicy } from "./embedded-policies";

const approved: EmbeddedPolicy = { version: "1.0", effective_date: "2026-11-01", draft: false, content: "## 1\nالنص المعتمد\n" };

describe("the embedded copy of the official texts (issue 755/783)", () => {
  it("is generated from docs/legal and the generated file is current", () => {
    const current = readFileSync(resolve(process.cwd(), "lib/legal/embedded-policies.ts"), "utf8");
    expect(current).toBe(render());
  });

  it("the generator takes the version and the date out of the header and keeps the page title out of the body", () => {
    const parsed = parsePolicyFile("# شروط\n\n**الإصدار:** 2.1\n**تاريخ السريان:** 2026-11-01\n\n## 1. بند\nنص\n");
    expect(parsed).toEqual({ version: "2.1", effective_date: "2026-11-01", draft: false, content: "## 1. بند\nنص\n" });
    expect(parsePolicyFile("# t\n**الإصدار:** 1.0 (مسودة)\n**تاريخ السريان:** [يحدد عند النشر]\nx").draft).toBe(true);
  });

  it("is used only when it is approved: a draft or a text with an unfilled [placeholder] is not", () => {
    expect(isPublishable(approved)).toBe(true);
    expect(isPublishable({ ...approved, draft: true })).toBe(false);
    expect(isPublishable({ ...approved, content: "تديرها [الاسم التجاري المسجل]" })).toBe(false);
    expect(isPublishable({ ...approved, content: "  " })).toBe(false);
  });

  it("follows the state of docs/legal: off while a text is a draft or has a placeholder, on once it is approved and embedded", () => {
    for (const key of ["patient_terms", "privacy_policy"] as const) {
      const ar = EMBEDDED_POLICIES[key].ar;
      expect(ar).toBeDefined();
      for (const locale of ["ar", "en", "ur"]) expect(embeddedLegalPolicy(key, locale) !== null).toBe(isPublishable(ar as EmbeddedPolicy));
    }
  });
});

describe("reading a policy with the embedded fallback", () => {
  it("returns the service's answer, and null for a policy the service does not have", async () => {
    const read = vi.fn().mockResolvedValue({ content: "from the service", version: 3 });
    expect(await readLegalPolicyOrEmbedded("patient_terms", "en", read)).toEqual({ content: "from the service", version: 3 });
    expect(await readLegalPolicyOrEmbedded("patient_terms", "en", vi.fn().mockResolvedValue(null))).toBeNull();
  });

  it("when the service is down and nothing approved is embedded, the outage stays an outage (the unavailable page)", async () => {
    const read = vi.fn().mockRejectedValue(new PublicDataUnavailableError("legal"));
    await expect(readLegalPolicyOrEmbedded("patient_terms", "en", read)).rejects.toBeInstanceOf(PublicDataUnavailableError);
  });

  it("any other error is not hidden", async () => {
    await expect(readLegalPolicyOrEmbedded("patient_terms", "en", vi.fn().mockRejectedValue(new TypeError("bug")))).rejects.toThrow("bug");
  });
});
