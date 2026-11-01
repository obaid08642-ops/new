import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ReceiptCard, ReceiptPaper } from "@/components-next/receipt/receipt-paper";
import { RECEIPT_LABEL_KEYS, receiptLabels } from "@/lib/receipt/labels";
import type { ReceiptView } from "@/lib/receipt/model";
import en from "@/messages/en.json";

const messages = en.Receipt as Record<string, string>;
const labels = receiptLabels((key, values) => (messages[key] ?? key).replace(/\{(\w+)\}/g, (_, name: string) => String(values?.[name] ?? `{${name}}`)), { invoiceNo: "INV-2026-000001", vatRate: 0.15 }, (n) => String(n));
const receipt: ReceiptView = {
  invoiceNo: "INV-2026-000001", kind: "lab", bookingId: "b1", issuedAt: "2026-10-31T10:00:00.000Z", subtotal: 100, vatRate: 0.15, vatAmount: 15, total: 115, currency: "SAR", qr: "AQVOYWJk",
  seller: { seller: "Nabd Health Platform", vatNumber: "300000000000003", issuedAt: "2026-10-31T10:00:00.000Z", total: 115, vat: 15 },
  type: "invoice", state: "paid", refundedTotal: 0, creditNotes: [],
  company: { legalName: "Nabd Health Platform", vatNumber: "300000000000003", crNumber: "1010000000", address: "Riyadh", configured: true },
  provider: { nameAr: "د. سارة", nameEn: "Dr Sara", facility: null, type: "doctor", licence: "SC-1234" },
  bookingRef: "AB12CD34",
};

describe("ReceiptCard", () => {
  it("has a message for every label", () => {
    for (const key of RECEIPT_LABEL_KEYS) expect(messages[key === "region" ? "title" : key], key).toBeTruthy();
  });
  it("draws the company, the details, the service provider, the amounts and the QR", () => {
    const html = renderToStaticMarkup(<ReceiptCard locale="en" receipt={receipt} labels={labels} />);
    for (const text of ["Nabd Health Platform", "300000000000003", "1010000000", "Riyadh", "INV-2026-000001", "AB12CD34", "Service provider", "Dr Sara", "Doctor", "SC-1234", "115"]) expect(html).toContain(text);
    expect(html).toContain('aria-label="ZATCA e-invoice QR code"');
    expect(html).toContain("data-receipt-card");
  });
  it("names the provider in Arabic for ar and ur, English otherwise", () => {
    expect(renderToStaticMarkup(<ReceiptCard locale="ar" receipt={receipt} labels={labels} />)).toContain("د. سارة");
    expect(renderToStaticMarkup(<ReceiptCard locale="hi" receipt={receipt} labels={labels} />)).toContain("Dr Sara");
  });
  it("says 'not configured' for a company field the owner has not set, and draws no provider block without one", () => {
    const bare: ReceiptView = { ...receipt, qr: null, seller: null, provider: null, company: { legalName: null, vatNumber: null, crNumber: null, address: null, configured: false }, bookingRef: null };
    const html = renderToStaticMarkup(<ReceiptCard locale="en" receipt={bare} labels={labels} />);
    expect(html.match(/Not configured yet/g)).toHaveLength(3);
    expect(html).toContain("Nabd Plus");
    expect(html).not.toContain("Service provider");
    expect(html).not.toContain("Booking / order no.");
    expect(html).not.toContain('aria-label="ZATCA e-invoice QR code"');
  });
  it("shows the refund state and the credit notes", () => {
    const refunded: ReceiptView = { ...receipt, state: "partially_refunded", refundedTotal: 20, creditNotes: [{ invoiceNo: "CN-2026-000001", total: -20, vatAmount: -2.61, issuedAt: null }] };
    const html = renderToStaticMarkup(<ReceiptCard locale="en" receipt={refunded} labels={labels} />);
    expect(html).toContain("Partly refunded");
    expect(html).toContain("Credit note CN-2026-000001");
    expect(html).toContain("Refunded amount");
  });
  it("titles a credit note as one", () => {
    expect(renderToStaticMarkup(<ReceiptCard locale="en" receipt={{ ...receipt, type: "credit_note", state: "credit_note" }} labels={labels} />)).toContain("Credit note");
  });
});

describe("ReceiptPaper", () => {
  it("puts the given actions under the paper", () => {
    const html = renderToStaticMarkup(<ReceiptPaper locale="en" receipt={receipt} labels={labels} actions={<a href="/pdf" download>Download PDF</a>} />);
    expect(html).toContain('href="/pdf"');
    expect(html).toContain("download");
  });
  it("shows the paper at once under reduced motion and uses tokens only", () => {
    const css = readFileSync("components-next/receipt/receipt.module.css", "utf8");
    expect(css).toMatch(/prefers-reduced-motion: reduce\)\s*\{\s*\.paper, \.actions \{ animation: none; \}/);
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/);
    expect(css).toMatch(/:global\(\[data-theme="dark"\]\) \.qr \{ filter: invert\(1\); \}/);
  });
});
