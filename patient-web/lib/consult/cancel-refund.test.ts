import { describe, expect, it } from "vitest";
import { cancelRefund } from "./cancel-refund";

describe("cancelRefund", () => {
  it("reads the three figures the cancel API returns", () => {
    expect(cancelRefund({ booking_id: "a", status: "cancelled", refund_percentage: 50, total_price: 115, payment_status: "paid" })).toEqual({ paid: true, percent: 50, amount: 57.5 });
  });
  it("shows no amount for an appointment that was never paid", () => {
    expect(cancelRefund({ refund_percentage: 100, total_price: 115, payment_status: "pending" })).toEqual({ paid: false, percent: 100, amount: 0 });
  });
  it("is null when the server sent no refund percentage", () => {
    expect(cancelRefund({ booking_id: "a", status: "cancelled" })).toBeNull();
  });
});
