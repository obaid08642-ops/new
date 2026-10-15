import { describe, expect, it } from "vitest";
import { cancelRefund } from "@/lib/consult/cancel-refund";
import { cancelledMessage } from "@/components-next/appointment-actions";

// journeys#44: after cancelling, the page says what comes back, from the cancelled appointment the server returns.
const text = { refunded: "back {amount} ({percent}%)", noRefund: "no refund", notCharged: "not charged" };

describe("cancellation refund", () => {
  it("reads the server's refund on the cancelled appointment", () => {
    expect(cancelRefund({ refund_percentage: 50, total_price: 200, payment_status: "paid" })).toEqual({ paid: true, percent: 50, amount: 100 });
    expect(cancelRefund({ data: { refund_percentage: 100, total_price: 150, payment_status: "pending" } })).toEqual({ paid: false, percent: 100, amount: 0 });
    expect(cancelRefund({ status: "CANCELLED" })).toBeNull();
  });

  it("says the amount, nothing due, or nothing charged", () => {
    expect(cancelledMessage({ paid: true, percent: 50, amount: 100 }, text, "en")).toMatch(/^back SAR\s100\.00 \(50%\)$/u);
    expect(cancelledMessage({ paid: true, percent: 0, amount: 0 }, text, "en")).toBe("no refund");
    expect(cancelledMessage({ paid: false, percent: 100, amount: 0 }, text, "en")).toBe("not charged");
    expect(cancelledMessage(null, text, "en")).toBeNull();
  });
});
