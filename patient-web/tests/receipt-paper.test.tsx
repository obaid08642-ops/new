import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ReceiptPaper } from "@/components-next/receipt/receipt-paper";
import type { ReceiptView } from "@/lib/receipt/model";

const labels = { region: "Receipt", simplified: "Simplified tax invoice", paymentReceipt: "Payment receipt", totalPaid: "Total paid", invoiceNo: "Invoice no.", vatNumber: "VAT registration no.", dateTime: "Date and time", subtotal: "Subtotal", vat: "VAT (15%)", total: "Total", qr: "QR", downloadPdf: "Download PDF", share: "Share", shareTitle: "Receipt", brand: "Nabd Plus" };
const receipt: ReceiptView = { invoiceNo: "INV-2026-000001", kind: "lab", bookingId: "b1", issuedAt: "2026-10-31T10:00:00.000Z", subtotal: 100, taxInvoice: true, sellerName: null, vatRate: 0.15, vatAmount: 15, total: 115, currency: "SAR", qr: "AQVOYWJk", seller: { seller: "Nabd Health Platform", vatNumber: "300000000000003", issuedAt: "2026-10-31T10:00:00.000Z", total: 115, vat: 15 } };

describe("ReceiptPaper", () => {
  it("draws the seller block, the amounts, the QR and the PDF link", () => {
    const html = renderToStaticMarkup(<ReceiptPaper locale="en" receipt={receipt} labels={labels} pdfHref="/api/patient/billing/invoice/lab/b1/pdf" pageHref="/en/receipts/lab/b1" />);
    expect(html).toContain("Nabd Health Platform");
    expect(html).toContain("300000000000003");
    expect(html).toContain("INV-2026-000001");
    expect(html).toContain("115");
    expect(html).toContain('aria-label="QR"');
    expect(html).toContain('href="/api/patient/billing/invoice/lab/b1/pdf"');
    expect(html).toContain("download");
  });
  it("draws no VAT-number row and no QR when the invoice has no signed payload", () => {
    const html = renderToStaticMarkup(<ReceiptPaper locale="en" receipt={{ ...receipt, qr: null, seller: null }} labels={labels} pdfHref="/p" pageHref="/r" />);
    expect(html).not.toContain("VAT registration no.");
    expect(html).not.toContain('aria-label="QR"');
    expect(html).toContain("Nabd Plus");
  });
  it("a payment receipt (not VAT-registered): titled as a receipt, the amount paid, no VAT row, no VAT number, no QR", () => {
    const paid: ReceiptView = { ...receipt, invoiceNo: "RCT-2026-000001", taxInvoice: false, subtotal: 115, vatRate: 0, vatAmount: 0, qr: null, seller: null, sellerName: "منصة نبض الطبية" };
    const html = renderToStaticMarkup(<ReceiptPaper locale="en" receipt={paid} labels={labels} pdfHref="/p" pageHref="/r" />);
    expect(html).toContain("Payment receipt");
    expect(html).toContain("Total paid");
    expect(html).toContain("منصة نبض الطبية");
    expect(html).toContain("RCT-2026-000001");
    expect(html).not.toMatch(/Simplified tax invoice|VAT|Subtotal|>Total<|aria-label="QR"/);
  });
  it("shows the paper at once under reduced motion and uses tokens only", () => {
    const css = readFileSync("components-next/receipt/receipt.module.css", "utf8");
    expect(css).toMatch(/prefers-reduced-motion: reduce\)\s*\{\s*\.paper, \.actions \{ animation: none; \}/);
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/);
    // dark: the code is flipped to dark-on-light so it still scans
    expect(css).toMatch(/:global\(\[data-theme="dark"\]\) \.qr \{ filter: invert\(1\); \}/);
  });
});
