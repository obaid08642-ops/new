import { describe, expect, it } from "vitest";
import { chiInquiryUrl } from "./chi";

describe("chiInquiryUrl", () => {
  const ok = "https://www.chi.gov.sa/ServicesDirectory/Pages/CheckInsurance.aspx";
  it("takes the https chi.gov.sa address of /config", () => {
    expect(chiInquiryUrl({ links: { chi_inquiry: ok } })).toBe(ok);
  });
  it.each([null, undefined, {}, { links: {} }, { links: { chi_inquiry: 5 } }, { links: { chi_inquiry: "http://www.chi.gov.sa/x" } }, { links: { chi_inquiry: "https://chi.gov.sa.evil.example/x" } }, { links: { chi_inquiry: "javascript:alert(1)" } }])(
    "shows no link for %p",
    (config) => {
      expect(chiInquiryUrl(config)).toBeNull();
    },
  );
});
