import { decodeZatcaTlv, type ZatcaPayload } from "./tlv";

/** The kinds of booking the backend invoices (`/billing/invoice/:kind/:id`), as the billing module names them. */
export const RECEIPT_KINDS = ["pharmacy", "order", "appointment", "consultation", "lab", "radiology", "home_care", "nursing"] as const;
export type ReceiptKind = (typeof RECEIPT_KINDS)[number];
export const isReceiptKind = (value: unknown): value is ReceiptKind => typeof value === "string" && (RECEIPT_KINDS as readonly string[]).includes(value);

export type ReceiptView = {
  invoiceNo: string;
  kind: string;
  bookingId: string;
  issuedAt: string | null;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  currency: string;
  qr: string | null;
  /** seller name, VAT registration number and time as signed in the QR; null when the QR is missing or not phase-1 */
  seller: ZatcaPayload | null;
};

const num = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? value : typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value)) ? Number(value) : null);
const text = (value: unknown): string | null => (typeof value === "string" && value.trim() !== "" ? value : null);

/** One invoice of `GET /billing/invoice/:kind/:id` or an element of `GET /billing/my`; null when it lacks the number or an amount (nothing is invented). */
export function extractReceipt(raw: unknown): ReceiptView | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const invoiceNo = text(r.invoice_no);
  const total = num(r.total);
  const vatAmount = num(r.vat_amount);
  const subtotal = num(r.subtotal);
  const bookingId = text(r.booking_id);
  if (!invoiceNo || total === null || vatAmount === null || subtotal === null || !bookingId) return null;
  const qr = text(r.qr_base64);
  const seller = decodeZatcaTlv(qr);
  return {
    invoiceNo,
    kind: text(r.booking_kind) ?? "",
    bookingId,
    issuedAt: seller?.issuedAt ?? text(r.createdAt),
    subtotal,
    vatRate: num(r.vat_rate) ?? 0,
    vatAmount,
    total,
    currency: text(r.currency) ?? "SAR",
    qr,
    seller,
  };
}

export function extractReceipts(raw: unknown): ReceiptView[] {
  const list = Array.isArray(raw) ? raw : raw && typeof raw === "object" && Array.isArray((raw as { data?: unknown }).data) ? (raw as { data: unknown[] }).data : [];
  return list.flatMap((entry) => {
    const view = extractReceipt(entry);
    return view ? [view] : [];
  });
}
