import { describe, expect, it } from "vitest";
import { decodeZatcaTlv } from "./tlv";
import { extractReceipt, extractReceipts, isReceiptKind } from "./model";

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
  it("a payment receipt (document_kind receipt, VAT null, no QR) is still a receipt: amount paid, no VAT, the seller name from the document", () => {
    const rc = { invoice_no: "RCT-2026-000001", document_kind: "receipt", booking_kind: "lab", booking_id: "b1", subtotal: 115, vat_rate: null, vat_amount: null, total: 115, qr_base64: null, seller: { legal_name: "منصة نبض الطبية", vat_number: null }, createdAt: "2026-10-31T10:00:01.000Z" };
    expect(extractReceipt(rc)).toMatchObject({ taxInvoice: false, total: 115, subtotal: 115, vatAmount: 0, qr: null, seller: null, sellerName: "منصة نبض الطبية" });
    expect(extractReceipt({ ...base, vat_amount: null })).toBeNull(); // a tax invoice without its VAT is still refused
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
