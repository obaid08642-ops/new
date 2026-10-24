import { describe, expect, it } from "vitest";
import { parsePolicyList } from "./policy-list";

describe("parsePolicyList", () => {
  const payload = [
    { key: "patient_terms", title_ar: "الشروط", title_en: "Terms", version: "1.2", applies_to: ["patient"] },
    { key: "provider_terms", title_ar: "شروط المزود", title_en: "Provider terms", version: "1.0", applies_to: ["provider"] },
    { key: "cookies", title_en: "Cookies", version: 2 },
    { key: "Bad Key", title_en: "x" },
  ];
  it("keeps what a patient may read and picks the title by locale", () => {
    expect(parsePolicyList(payload, "ar")).toEqual([
      { key: "patient_terms", title: "الشروط", version: "1.2" },
      { key: "cookies", title: "Cookies", version: "2" },
    ]);
    expect(parsePolicyList(payload, "ur").map((item) => item.title)).toEqual(["Terms", "Cookies"]);
  });
  it("is empty for anything that is not a list", () => {
    expect(parsePolicyList(null, "en")).toEqual([]);
    expect(parsePolicyList({}, "en")).toEqual([]);
  });
});
