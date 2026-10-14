import { describe, expect, it } from "vitest";
import { governedStep } from "./governed-step";

describe("governedStep", () => {
  it("keeps the screens of the newer server states and passes the others through", () => {
    expect(governedStep("PAYMENT_PENDING")).toBe("FINAL_QUOTE_ACCEPTED");
    expect(governedStep("CO_PAY_PENDING")).toBe("INSURANCE_DECISION_READY");
    expect(governedStep("OFFER_SELECTED")).toBe("OFFER_SELECTED");
    expect(governedStep("")).toBeUndefined();
    expect(governedStep(null)).toBeUndefined();
  });
});
