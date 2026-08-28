import { describe, expect, it } from "vitest";
import { parseInsuranceRequest } from "./insurance-request";

const id = "33333333-3333-4333-8333-333333333333";
describe("insurance request response guard", () => {
  it("keeps only an owned request state and server-derived payment amounts", () => {
    expect(parseInsuranceRequest({ id, state: "COPAY_PENDING", copay_amount: 75, patient_id: "private", provider_id: "private" })).toEqual({ id, state: "COPAY_PENDING", copayAmount: 75, selfPayAmount: undefined, rejectionReason: undefined });
  });
  it("rejects an unknown state or an invalid request identifier", () => {
    expect(parseInsuranceRequest({ id, state: "PAID" })).toBeNull();
    expect(parseInsuranceRequest({ id: "not-a-request", state: "APPROVED_FULL" })).toBeNull();
  });
});
