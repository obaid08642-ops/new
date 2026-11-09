import { describe, expect, it, vi } from "vitest";
import { withRefundPolicy } from "./refund-policy";
import { sendBroadcast } from "./pharmacy/broadcast";

const ADDRESS = { id: "a1", lat: 24.7, lng: 46.7, city: "Riyadh", district: "Test", street: "Test street" } as never;
const UUID = "91047ef2-ad36-422a-a184-629693e7c729";

describe("the refund policy agreement", () => {
  it("adds refund_policy_accepted: true to a body and keeps the rest", () => {
    expect(withRefundPolicy({ doctor_id: "d1", payment_method: "card" })).toEqual({ doctor_id: "d1", payment_method: "card", refund_policy_accepted: true });
  });
  it("never produces false, even over a body that carried it", () => {
    expect(withRefundPolicy({ refund_policy_accepted: false } as Record<string, unknown>).refund_policy_accepted).toBe(true);
  });
  it("a pharmacy order carries it on the create call (the only call that makes the order)", async () => {
    const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
    const doFetch = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, body: JSON.parse(String(init?.body ?? "{}")) });
      return new Response(JSON.stringify({ id: UUID }), { status: 201 });
    });
    const result = await sendBroadcast({ kind: "manual", name: "Test medicine", details: "", qty: 1 }, ADDRESS, "key-1", doFetch as never);
    expect(result).toEqual({ ok: true, orderId: UUID });
    expect(calls[0].url).toBe("/api/patient/patient/pharmacy/orders");
    expect(calls[0].body.refund_policy_accepted).toBe(true);
  });
});
