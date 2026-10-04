// 7cf3e9f (REVIEW_P13): the reorder proxy answered { ok: true } and dropped
// the new draft id, so the button always landed on /orders, and the website
// had no way to submit a draft (a dead end). Strings were ar/en only on a
// 6-language site, and components-next/order-reorder-button.tsx was orphaned.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "access-token" }) }) }));
const calls: Array<[string, RequestInit]> = [];
vi.mock("@/lib/api/upstream", () => ({
  callPatientApi: async (path: string, init: RequestInit) => {
    calls.push([path, init]);
    return new Response(JSON.stringify({ id: "11111111-2222-4333-8444-555555555555", status: path.endsWith("/submit") ? "submitted" : "draft" }), { status: 201 });
  },
}));

const ORDER = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const req = (url: string) => new Request(url, { method: "POST", headers: { "idempotency-key": "web-key-1234567890abcd" } });

describe("7cf3e9f: reorder opens the draft and the draft can be submitted", () => {
  afterEach(() => { calls.length = 0; });

  it("the reorder proxy returns the new draft id", async () => {
    const { POST } = await import("../app/api/orders/[orderId]/reorder/route");
    const res = await POST(req(`https://web.test/api/orders/${ORDER}/reorder`), { params: Promise.resolve({ orderId: ORDER }) });
    expect(await res.json()).toEqual({ id: "11111111-2222-4333-8444-555555555555" });
  });

  it("a submit proxy forwards to POST /patient/pharmacy/orders/:id/submit with the idempotency key", async () => {
    const { POST } = await import("../app/api/patient/pharmacy/orders/[orderId]/submit/route");
    const res = await POST(req(`https://web.test/api/patient/pharmacy/orders/${ORDER}/submit`), { params: Promise.resolve({ orderId: ORDER }) });
    expect(res.status).toBe(201);
    expect(calls[0][0]).toBe(`/patient/pharmacy/orders/${ORDER}/submit`);
    expect(new Headers(calls[0][1].headers).get("idempotency-key")).toBe("web-key-1234567890abcd");
  });

  it("the order page offers Submit for a draft, and the orphan button is gone", () => {
    const page = readFileSync(join(__dirname, "../app/[locale]/orders/[orderId]/page.tsx"), "utf8");
    expect(page).toMatch(/SubmitDraftButton/);
    expect(existsSync(join(__dirname, "../components-next/order-reorder-button.tsx"))).toBe(false);
  });

  it("reorder and submit labels exist in all six languages", () => {
    for (const l of ["ar", "en", "ur", "hi", "bn", "fil"]) {
      const o = JSON.parse(readFileSync(join(__dirname, `../messages/${l}.json`), "utf8")).Orders;
      for (const k of ["reorder", "reordering", "reorderFailed", "submitDraft", "submitting", "submitFailed", "draftNotice"]) expect(typeof o[k], `${l}.${k}`).toBe("string");
    }
  });
});
