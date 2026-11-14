import { describe, expect, it } from "vitest";
import { outcomeOfTransactionStatus, parseVerification } from "@/lib/pharmacy/payment-state";

// A cancelled checkout and an expired checkout session are told apart from a failed payment (lead, 2026-11-12): neutral wording, nothing was charged.
describe("what a payment transaction status means for the patient", () => {
  it("cancelled (either spelling) is its own outcome, not a failure", () => {
    expect(outcomeOfTransactionStatus("cancelled")).toBe("cancelled");
    expect(outcomeOfTransactionStatus("canceled")).toBe("cancelled");
  });

  it("failed with the stable expired-session reason is sessionExpired; any other failed stays failed", () => {
    expect(outcomeOfTransactionStatus("failed", "payment_session_expired")).toBe("sessionExpired");
    expect(outcomeOfTransactionStatus("failed", "DECLINED")).toBe("failed");
    expect(outcomeOfTransactionStatus("failed")).toBe("failed");
  });

  it("paid, refunded and unknown statuses are unchanged (unknown is never read as paid)", () => {
    expect(outcomeOfTransactionStatus("paid")).toBe("paid");
    expect(outcomeOfTransactionStatus("partially_refunded")).toBe("refunded");
    expect(outcomeOfTransactionStatus("initiating")).toBe("pending");
    expect(outcomeOfTransactionStatus(undefined)).toBe("pending");
  });

  it("the verify answer carries the failure reason through", () => {
    expect(parseVerification({ transactionId: "t1", status: "failed", failure_reason: "payment_session_expired" })).toEqual({ outcome: "sessionExpired" });
    expect(parseVerification({ data: { status: "cancelled" } })).toEqual({ outcome: "cancelled" });
    expect(parseVerification({ status: "failed" })).toEqual({ outcome: "failed" });
  });
});
