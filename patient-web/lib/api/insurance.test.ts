import { describe, expect, it } from "vitest";
import { parseInsuranceSummary } from "./insurance";

describe("insurance parser", () => {
  it("keeps the policy summary the card shows (the app's policy rows) and nothing else", () => {
    expect(parseInsuranceSummary({ has_policy: true, policy: { company_name: "Verified insurer", plan_class: "Gold", policy_number: "P-1", member_name: "Test Member", national_id: "N-1", network: "Net", member_id: "M-1", verified: true, card_image_url: "private-file" }, claims: [{ id: "private-claim" }] })).toEqual({
      hasPolicy: true, companyName: "Verified insurer", planClass: "Gold", memberId: "M-1", policyNumber: "P-1", memberName: "Test Member", nationalId: "N-1", network: "Net", verified: true, expiryDate: undefined, logoUrl: undefined,
    });
  });

  it("#838: the card reads the membership number, the expiry and only an https verified logo; the card image stays out; verified is false unless the server says true", () => {
    const out = parseInsuranceSummary({ has_policy: true, policy: { company_name: "I", member_id: "M-1", expiry_date: "2027-01-01", company_logo_url: "https://cdn.example.test/l.png", card_image_url: "f" } });
    expect(out).toMatchObject({ hasPolicy: true, companyName: "I", memberId: "M-1", expiryDate: "2027-01-01", logoUrl: "https://cdn.example.test/l.png", verified: false });
    expect(out).not.toHaveProperty("cardImageUrl");
    expect(parseInsuranceSummary({ has_policy: true, policy: { company_logo_url: "http://x.test/l.png" } })?.logoUrl).toBeUndefined();
  });

  it("handles no policy honestly", () => {
    expect(parseInsuranceSummary({ has_policy: false, policy: null })).toMatchObject({ hasPolicy: false, verified: false, companyName: undefined, policyNumber: undefined });
  });
});
