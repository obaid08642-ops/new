import { describe, expect, it } from "vitest";
import { decodeZatcaTlv } from "./tlv";
import { extractNewShareLink, extractReceipt, extractReceipts, extractShareLinks, isReceiptKind } from "./model";
import { createShareLink, listShareLinks, revokeShareLink, sharedPageUrl } from "./share-client";

// the backend's encoder (backend/src/modules/billing/billing.module.ts tlvQr), repeated here so the test pins the wire format
function tlvQr(seller: string, vat: string, iso: string, total: number, vatAmount: number): string {
  const tlv = (tag: number, value: string) => {
    const bytes = new TextEncoder().encode(value);
    return Uint8Array.from([tag, bytes.length, ...bytes]);
  };
  const parts = [tlv(1, seller), tlv(2, vat), tlv(3, iso), tlv(4, total.toFixed(2)), tlv(5, vatAmount.toFixed(2))];
  const all = Uint8Array.from(parts.flatMap((p) => [...p]));
  return btoa(String.fromCharCode(...all));
}

describe("decodeZatcaTlv", () => {
  it("reads the five phase-1 tags, Arabic seller name included", () => {
    const qr = tlvQr("منصة نَبْض للرعاية الصحية", "300000000000003", "2026-10-31T10:00:00.000Z", 115, 15);
    expect(decodeZatcaTlv(qr)).toEqual({ seller: "منصة نَبْض للرعاية الصحية", vatNumber: "300000000000003", issuedAt: "2026-10-31T10:00:00.000Z", total: 115, vat: 15 });
  });
  it("is null for text that is not a phase-1 payload", () => {
    expect(decodeZatcaTlv("not base64!!")).toBeNull();
    expect(decodeZatcaTlv("")).toBeNull();
    expect(decodeZatcaTlv(undefined)).toBeNull();
    expect(decodeZatcaTlv(btoa("\u0001\u0009abc"))).toBeNull();
  });
});

describe("extractReceipt", () => {
  const base = { invoice_no: "INV-2026-000001", booking_kind: "lab", booking_id: "b1", subtotal: 100, vat_rate: 0.15, vat_amount: 15, total: 115, currency: "SAR", qr_base64: tlvQr("Nabd", "300000000000003", "2026-10-31T10:00:00.000Z", 115, 15), createdAt: "2026-10-31T10:00:01.000Z" };
  it("takes the amounts as sent and the time and seller from the QR", () => {
    const view = extractReceipt(base);
    expect(view).toMatchObject({ invoiceNo: "INV-2026-000001", total: 115, vatAmount: 15, subtotal: 100, issuedAt: "2026-10-31T10:00:00.000Z" });
    expect(view?.seller?.vatNumber).toBe("300000000000003");
  });
  it("falls back to createdAt and no seller when the QR is missing", () => {
    expect(extractReceipt({ ...base, qr_base64: undefined })).toMatchObject({ issuedAt: "2026-10-31T10:00:01.000Z", seller: null, qr: null });
  });
  it("is null when the number, a booking or an amount is missing", () => {
    expect(extractReceipt({ ...base, invoice_no: "" })).toBeNull();
    expect(extractReceipt({ ...base, total: undefined })).toBeNull();
    expect(extractReceipt(null)).toBeNull();
  });
  it("reads a list, bare or under data, and drops the broken rows", () => {
    expect(extractReceipts([base, { nope: 1 }])).toHaveLength(1);
    expect(extractReceipts({ data: [base] })).toHaveLength(1);
    expect(extractReceipts("x")).toEqual([]);
  });
  it("knows the kinds the backend invoices", () => {
    expect(isReceiptKind("lab")).toBe(true);
    expect(isReceiptKind("home_care")).toBe(true);
    expect(isReceiptKind("../x")).toBe(false);
  });
});

describe("the invoice content of the second receipt PR", () => {
  const base = { invoice_no: "INV-2026-000002", booking_kind: "appointment", booking_id: "b2", subtotal: 100, vat_rate: 0.15, vat_amount: 15, total: 115, currency: "SAR", issued_at: "2026-10-31T10:00:00.000Z" };
  it("reads the company, the provider, the booking number, the state and the credit notes", () => {
    const view = extractReceipt({
      ...base, type: "invoice", state: "partially_refunded", refunded_total: 20, booking_ref: "AB12CD34",
      seller: { legal_name: "Nabd", vat_number: "300000000000003", cr_number: "1010", address: "Riyadh", configured: true },
      provider: { name_ar: "د. سارة", name_en: "Dr Sara", facility_name: null, type: "doctor", license_number: "SC-1" },
      credit_notes: [{ invoice_no: "CN-2026-000001", total: -20, vat_amount: -2.61, issued_at: "2026-11-01T09:00:00.000Z" }, { total: 1 }],
    });
    expect(view).toMatchObject({ state: "partially_refunded", refundedTotal: 20, bookingRef: "AB12CD34", issuedAt: "2026-10-31T10:00:00.000Z" });
    expect(view?.company).toEqual({ legalName: "Nabd", vatNumber: "300000000000003", crNumber: "1010", address: "Riyadh", configured: true });
    expect(view?.provider).toEqual({ nameAr: "د. سارة", nameEn: "Dr Sara", facility: null, type: "doctor", licence: "SC-1" });
    expect(view?.creditNotes).toEqual([{ invoiceNo: "CN-2026-000001", total: -20, vatAmount: -2.61, issuedAt: "2026-11-01T09:00:00.000Z" }]);
  });
  it("keeps 'not configured' as null fields, and invents nothing", () => {
    const view = extractReceipt({ ...base, seller: { legal_name: null, vat_number: null, cr_number: null, address: null, configured: false }, provider: null });
    expect(view?.company).toEqual({ legalName: null, vatNumber: null, crNumber: null, address: null, configured: false });
    expect(view?.provider).toBeNull();
    expect(view?.bookingRef).toBeNull();
  });
  it("reads the share-link view, which carries the QR as an object and no booking id", () => {
    const shared = { ...base, booking_kind: undefined, booking_id: undefined, qr: { format: "zatca-phase1-tlv-base64", payload: "AQVOYWJk" }, booking_ref: "AB12CD34" };
    expect(extractReceipt(shared)).toBeNull();
    expect(extractReceipt(shared, { shared: true })).toMatchObject({ invoiceNo: "INV-2026-000002", bookingId: "", qr: "AQVOYWJk", bookingRef: "AB12CD34" });
  });
});

describe("share links", () => {
  it("lists links without a token and drops rows it cannot read", () => {
    const rows = extractShareLinks([
      { id: "l1", status: "active", created_at: "2026-11-01T10:00:00Z", expires_at: "2026-11-08T10:00:00Z", revoked_at: null, view_count: 3, token: "never" },
      { id: "l2", status: "weird" },
      { status: "active" },
    ]);
    expect(rows).toEqual([{ id: "l1", status: "active", createdAt: "2026-11-01T10:00:00Z", expiresAt: "2026-11-08T10:00:00Z", revokedAt: null, viewCount: 3 }]);
    expect(extractShareLinks({ not: "a list" })).toEqual([]);
  });
  it("reads the new link: the token is needed, nothing else is trusted", () => {
    expect(extractNewShareLink({ id: "l1", token: "abc", expires_at: "2026-11-08T10:00:00Z", url: "https://api/x" })).toEqual({ id: "l1", token: "abc", expiresAt: "2026-11-08T10:00:00Z" });
    expect(extractNewShareLink({ id: "l1" })).toBeNull();
  });
  it("opens the public page under the site's own address and language, never the API", () => {
    expect(sharedPageUrl("https://nabd.plus", "ur", "tok_en-1")).toBe("https://nabd.plus/ur/receipt/shared/tok_en-1");
  });
});

describe("the share-link calls", () => {
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  const o = { kind: "lab" as const, bookingId: "b-1", days: 7, locale: "ar", origin: "https://nabd.plus", key: "k1" };
  it("creates a link with the chosen days and an idempotency key, and returns the site's own address (not the API's)", async () => {
    const calls: Array<[string, RequestInit | undefined]> = [];
    const result = await createShareLink(async (url, init) => { calls.push([url, init]); return json({ id: "l1", token: "tok-abc", expires_at: "2026-11-08T00:00:00Z", url: "https://api.nabd.plus/api/v1/billing/shared/tok-abc/pdf", page_url: "https://api.nabd.plus/api/v1/billing/shared/tok-abc" }, 201); }, o);
    expect(calls[0][0]).toBe("/api/patient/billing/invoice/lab/b-1/share-link");
    expect(calls[0][1]?.method).toBe("POST");
    expect(calls[0][1]?.body).toBe(JSON.stringify({ expires_in_days: 7 }));
    expect((calls[0][1]?.headers as Record<string, string>)["idempotency-key"]).toBe("k1");
    expect(result).toEqual({ ok: true, id: "l1", url: "https://nabd.plus/ar/receipt/shared/tok-abc", expiresAt: "2026-11-08T00:00:00Z" });
  });
  it("tells a rate limit from a failure", async () => {
    expect(await createShareLink(async () => json({}, 429), o)).toEqual({ ok: false, reason: "limit" });
    expect(await createShareLink(async () => json({}, 500), o)).toEqual({ ok: false, reason: "failed" });
    expect(await createShareLink(async () => json({ id: "l1" }, 201), o)).toEqual({ ok: false, reason: "failed" });
    expect(await createShareLink(async () => { throw new Error("offline"); }, o)).toEqual({ ok: false, reason: "failed" });
  });
  it("lists and revokes through the receipt's own paths", async () => {
    const urls: string[] = [];
    const rows = await listShareLinks(async (url) => { urls.push(url); return json([{ id: "l1", status: "revoked", revoked_at: "2026-11-01T10:00:00Z", view_count: 2 }]); }, "lab", "b-1");
    expect(urls[0]).toBe("/api/patient/billing/invoice/lab/b-1/share-links");
    expect(rows?.[0]).toMatchObject({ id: "l1", status: "revoked", viewCount: 2 });
    expect(await listShareLinks(async () => json({}, 500), "lab", "b-1")).toBeNull();
    const seen: Array<[string, string | undefined]> = [];
    expect(await revokeShareLink(async (url, init) => { seen.push([url, init?.method]); return json({ id: "l1", status: "revoked" }); }, "lab", "b-1", "l1")).toBe(true);
    expect(seen[0]).toEqual(["/api/patient/billing/invoice/lab/b-1/share-links/l1", "DELETE"]);
    expect(await revokeShareLink(async () => json({}, 404), "lab", "b-1", "l1")).toBe(false);
  });
});
