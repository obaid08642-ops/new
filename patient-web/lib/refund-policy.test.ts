import { describe, expect, it, vi } from "vitest";
import { KNOWN_LINES, noteRefundPolicyChanged, noteRefundPolicyChangedError, policyHashField, readRefundSummary, readRefundSummaryHash, refundSummaryPath, rememberShownPolicy, shownPolicyHash, withRefundPolicy } from "./refund-policy";
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

describe("the pharmacy preparation lines and the rescheduled-visit line", () => {
  it("shows the delivery-fee wording only when the delivery fee is refunded", () => {
    expect(readRefundSummary({ lines: [{ key: "refund.policy.pharmacy.before_preparation", params: { delivery_fee_refunded: true } }] })[0].key).toBe("pharmacy_before_preparation_fee");
    expect(readRefundSummary({ lines: [{ key: "refund.policy.pharmacy.before_preparation", params: { delivery_fee_refunded: false } }] })[0].key).toBe("pharmacy_before_preparation");
    expect(readRefundSummary({ lines: [{ key: "refund.policy.pharmacy.after_preparation", params: {} }] })[0].key).toBe("pharmacy_after_preparation");
  });
  it("keeps the late-rescheduled consultation line with its percent", () => {
    expect(readRefundSummary({ lines: [{ key: "refund.policy.consultation.late_rescheduled", params: { percent: 50 } }] })).toEqual([{ key: "consultation_late_rescheduled", params: { percent: 50 } }]);
  });
});

describe("refund policy hash echo", () => {
  const HASH = "a".repeat(64);
  it("reads the hash of a summary answer and ignores anything that is not 64 hex", () => {
    expect(readRefundSummaryHash({ hash: HASH, lines: [] })).toBe(HASH);
    expect(readRefundSummaryHash({ hash: "abc" })).toBeUndefined();
    expect(readRefundSummaryHash(null)).toBeUndefined();
  });
  it("sends the hash of the text that was shown for that service, and only that service", () => {
    rememberShownPolicy("lab", HASH);
    expect(withRefundPolicy({ x: 1 }, "lab")).toEqual({ x: 1, refund_policy_accepted: true, refund_policy_hash: HASH });
    expect(withRefundPolicy({ x: 1 }, "radiology")).toEqual({ x: 1, refund_policy_accepted: true });
    expect(withRefundPolicy({ x: 1 })).toEqual({ x: 1, refund_policy_accepted: true });
    expect(policyHashField("lab")).toEqual({ refund_policy_hash: HASH });
    expect(policyHashField("nursing")).toEqual({});
  });
  it("a card that showed nothing (failed load, compact) forgets the hash: nothing stale is sent", () => {
    rememberShownPolicy("lab", HASH);
    rememberShownPolicy("lab", undefined);
    expect(shownPolicyHash("lab")).toBeUndefined();
    expect(withRefundPolicy({}, "lab")).toEqual({ refund_policy_accepted: true });
  });
  it("409 refund_policy_changed drops the hash and tells the card (once per event); other errors do nothing", () => {
    const events: Array<{ service?: string }> = [];
    const g = globalThis as unknown as { window?: unknown };
    const before = g.window;
    g.window = { dispatchEvent: (e: CustomEvent) => { events.push(e.detail); return true; } };
    try {
      rememberShownPolicy("pharmacy", HASH);
      expect(noteRefundPolicyChanged("pharmacy", 409, { message: "slot_taken" })).toBe(false);
      expect(noteRefundPolicyChanged("pharmacy", 400, { message: "refund_policy_changed" })).toBe(false);
      expect(shownPolicyHash("pharmacy")).toBe(HASH);
      expect(noteRefundPolicyChanged("pharmacy", 409, { message: "refund_policy_changed" })).toBe(true);
      expect(shownPolicyHash("pharmacy")).toBeUndefined();
      expect(events).toEqual([{ service: "pharmacy" }]);
      const err = Object.assign(new Error("refund_policy_changed"), { status: 409 });
      expect(noteRefundPolicyChangedError("lab", err)).toBe(true);
      expect(noteRefundPolicyChangedError("lab", new Error("x"))).toBe(false);
    } finally { g.window = before; }
  });
  it("the broadcast sends the shown hash and, on 409 refund_policy_changed, tells the card instead of only failing", async () => {
    rememberShownPolicy("pharmacy", HASH);
    const sent: string[] = [];
    const res = { ok: false, status: 409, clone: () => ({ json: async () => ({ message: "refund_policy_changed" }) }), json: async () => ({}) };
    const doFetch = vi.fn(async (_url: string, init?: { body?: unknown }) => { sent.push(String(init?.body)); return res as never; });
    const out = await sendBroadcast({ kind: "manual", name: "Test medicine", details: "", qty: 1 }, ADDRESS, "k".repeat(20), doFetch as never);
    expect(out).toMatchObject({ ok: false, reason: "create_failed", status: 409 });
    expect(sent[0]).toContain(HASH);
    expect(shownPolicyHash("pharmacy")).toBeUndefined();
  });
});

describe("refund policy changed message", () => {
  it("exists, non-empty, in all six languages", () => {
    for (const m of [ar, bn, en, fil, hi, ur] as Array<{ RefundPolicy: Record<string, string> }>) expect(m.RefundPolicy.changed.length).toBeGreaterThan(10);
  });
});
