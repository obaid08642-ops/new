import { describe, expect, it } from "vitest";
import { parseInsuranceRequest } from "./insurance-request";

const id = "33333333-3333-4333-8333-333333333333";
describe("insurance request response guard", () => {
  it("keeps only an owned request state and server-derived payment amounts", () => {
    expect(parseInsuranceRequest({ id, state: "COPAY_PENDING", copay_amount: 75, patient_id: "private", provider_id: "private" })).toEqual({ id, state: "COPAY_PENDING", copayAmount: 75, selfPayAmount: undefined, rejectionReason: undefined, approvalCode: undefined, copayPercent: undefined });
  });
  it("reads the approval number and the co-pay percent only when the provider recorded them", () => {
    expect(parseInsuranceRequest({ id, state: "COPAY_PENDING", copay_amount: 20, approval_code: "AP-1234", copay_percent: 20 })).toMatchObject({ approvalCode: "AP-1234", copayPercent: 20 });
    expect(parseInsuranceRequest({ id, state: "APPROVED_FULL", approval_code: null, copay_percent: null })).toMatchObject({ approvalCode: undefined, copayPercent: undefined });
    expect(parseInsuranceRequest({ id, state: "APPROVED_FULL", approval_code: 5, copay_percent: "x" })).toMatchObject({ id, approvalCode: undefined, copayPercent: undefined });
  });
  it("reads the approval number the insurance engine stores as insurer_approval_code", () => {
    expect(parseInsuranceRequest({ id, state: "COPAY_PENDING", insurer_approval_code: "ENG-9" })).toMatchObject({ approvalCode: "ENG-9" });
  });
  it("rejects an unknown state or an invalid request identifier", () => {
    expect(parseInsuranceRequest({ id, state: "PAID" })).toBeNull();
    expect(parseInsuranceRequest({ id: "not-a-request", state: "APPROVED_FULL" })).toBeNull();
  });
});
