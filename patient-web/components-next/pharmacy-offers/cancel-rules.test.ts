import { describe, expect, it } from "vitest";
import { pharmacyCancelRules } from "./cancel-rules";

const text = { prep: "prep", refundDays: (min: number, max: number) => `refund ${min}-${max}`, returnDays: (days: number) => `return ${days}` };

describe("pharmacyCancelRules", () => {
  it("writes only what the server sent", () => {
    expect(pharmacyCancelRules({ cancellation_policy: { pharmacy_prep_cancellable: false }, returns_policy: { unused_days: 7, wallet_refund_days_min: 2, wallet_refund_days_max: 5 } }, text)).toEqual(["prep", "return 7", "refund 2-5"]);
    expect(pharmacyCancelRules({ cancellation_policy: { pharmacy_prep_cancellable: true }, returns_policy: { wallet_refund_days_min: 2 } }, text)).toEqual([]);
    expect(pharmacyCancelRules(null, text)).toEqual([]);
  });
});
