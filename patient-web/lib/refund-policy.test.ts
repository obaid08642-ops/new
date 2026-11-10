import { describe, expect, it, vi } from "vitest";
import { KNOWN_LINES, readRefundSummary, refundSummaryPath, withRefundPolicy } from "./refund-policy";
import ar from "../messages/ar.json";
import bn from "../messages/bn.json";
import en from "../messages/en.json";
import fil from "../messages/fil.json";
import hi from "../messages/hi.json";
import ur from "../messages/ur.json";
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

describe("the per-service refund text", () => {
  it("asks for one service", () => {
    expect(refundSummaryPath("lab")).toBe("/refund-policy/summary?service=lab");
  });
  it("turns the server lines into message keys with their numbers and drops unknown keys", () => {
    const lines = readRefundSummary({ service: "consultation", lines: [
      { key: "refund.policy.consultation.full", params: { hours: 2 } },
      { key: "refund.policy.consultation.late", params: { hours: 2, percent: 50 } },
      { key: "refund.policy.something_new", params: {} },
      { key: "other.key" },
      { key: "refund.policy.card_destination" },
    ] });
    expect(lines).toEqual([
      { key: "consultation_full", params: { hours: 2 } },
      { key: "consultation_late", params: { hours: 2, percent: 50 } },
      { key: "card_destination", params: {} },
    ]);
  });
  it("picks the delivery-fee wording for the pharmacy line", () => {
    expect(readRefundSummary({ lines: [{ key: "refund.policy.pharmacy.before_dispatch", params: { delivery_fee_refunded: true } }] })[0].key).toBe("pharmacy_before_dispatch_fee");
    expect(readRefundSummary({ lines: [{ key: "refund.policy.pharmacy.before_dispatch", params: { delivery_fee_refunded: false } }] })[0].key).toBe("pharmacy_before_dispatch");
  });
  it("reads nothing from a broken answer", () => {
    expect(readRefundSummary(null)).toEqual([]);
    expect(readRefundSummary({ lines: "x" })).toEqual([]);
  });
});

describe("the 2-hour table lines (lab, radiology, nursing)", () => {
  const SERVICES = ["lab", "radiology", "nursing"] as const;
  it("keeps each line the server sends for the three services, with its numbers", () => {
    for (const service of SERVICES) {
      const lines = readRefundSummary({ service, lines: [
        { key: `refund.policy.${service}.full`, params: { hours: 2 } },
        { key: `refund.policy.${service}.late`, params: { hours: 2, percent: 50 } },
      ] });
      expect(lines).toEqual([
        { key: `${service}_full`, params: { hours: 2 } },
        { key: `${service}_late`, params: { hours: 2, percent: 50 } },
      ]);
    }
  });
  it("has a message for every line key the reader accepts, in all six languages, with the server's numbers in it", () => {
    const files = { ar, bn, en, fil, hi, ur } as Record<string, { RefundPolicy: Record<string, string> }>;
    for (const [lang, file] of Object.entries(files)) {
      for (const key of KNOWN_LINES) {
        const text = file.RefundPolicy[`policy_${key.replace(/\./g, "_")}`];
        expect(text, `${lang} ${key}`).toBeTruthy();
      }
      for (const service of SERVICES) {
        expect(file.RefundPolicy[`policy_${service}_full`], `${lang} ${service}.full`).toContain("{hours}");
        expect(file.RefundPolicy[`policy_${service}_late`], `${lang} ${service}.late`).toContain("{percent}");
      }
    }
  });
});
