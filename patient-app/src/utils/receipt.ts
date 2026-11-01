/**
 * The receipt (simplified tax invoice) of a paid booking or order: the invoice of `GET /billing/invoice/:kind/:id` and
 * `GET /billing/my`, and the seller, VAT number and time inside its ZATCA phase-1 QR. Same rules as patient-web/lib/receipt:
 * nothing is invented; an invoice without a number or an amount is dropped.
 */
export type ZatcaPayload = { seller: string; vatNumber: string; issuedAt: string; total: number; vat: number };

export const RECEIPT_KINDS = ['pharmacy', 'order', 'appointment', 'consultation', 'lab', 'radiology', 'home_care', 'nursing'] as const;
export type ReceiptKind = (typeof RECEIPT_KINDS)[number];
export const isReceiptKind = (value: unknown): value is ReceiptKind => typeof value === 'string' && (RECEIPT_KINDS as readonly string[]).includes(value);

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Base64 to bytes without atob (not in every JS engine); null for text that is not base64. */
function base64Bytes(text: string): number[] | null {
  const clean = text.replace(/\s+/g, '').replace(/=+$/, '');
  if (clean === '' || /[^A-Za-z0-9+/]/.test(clean)) return null;
  const out: number[] = [];
  let bits = 0;
  let acc = 0;
  for (const ch of clean) {
    acc = (acc << 6) | B64.indexOf(ch);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((acc >> bits) & 0xff);
    }
  }
  return out;
}

/** UTF-8 bytes to text; null when the bytes are not valid UTF-8. */
function utf8(bytes: number[]): string | null {
  let out = '';
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i];
    const extra = b < 0x80 ? 0 : b >= 0xc2 && b < 0xe0 ? 1 : b >= 0xe0 && b < 0xf0 ? 2 : b >= 0xf0 && b < 0xf5 ? 3 : -1;
    if (extra < 0 || i + extra >= bytes.length + (extra === 0 ? 1 : 0)) return null;
    let cp = extra === 0 ? b : b & (0x3f >> extra);
    for (let j = 1; j <= extra; j += 1) {
      const next = bytes[i + j];
      if (next === undefined || (next & 0xc0) !== 0x80) return null;
      cp = (cp << 6) | (next & 0x3f);
    }
    out += String.fromCodePoint(cp);
    i += extra + 1;
  }
  return out;
}

/** Decodes the base64 TLV of tags 1 to 5 the backend returns as `qr_base64`; null when it is not a well-formed phase-1 payload. */
export function decodeZatcaTlv(base64: unknown): ZatcaPayload | null {
  if (typeof base64 !== 'string') return null;
  const bytes = base64Bytes(base64.trim());
  if (!bytes) return null;
  const values = new Map<number, string>();
  for (let at = 0; at < bytes.length; ) {
    const length = bytes[at + 1];
    if (length === undefined || at + 2 + length > bytes.length) return null;
    const value = utf8(bytes.slice(at + 2, at + 2 + length));
    if (value === null) return null;
    values.set(bytes[at], value);
    at += 2 + length;
  }
  const total = Number(values.get(4));
  const vat = Number(values.get(5));
  const seller = values.get(1);
  const vatNumber = values.get(2);
  const issuedAt = values.get(3);
  if (!seller || !vatNumber || !issuedAt || !Number.isFinite(total) || !Number.isFinite(vat)) return null;
  return { seller, vatNumber, issuedAt, total, vat };
}

export type ReceiptView = {
  invoiceNo: string;
  kind: string;
  bookingId: string;
  issuedAt: string | null;
  subtotal: number;
  /** false = a payment receipt (the platform is not VAT-registered): no VAT line, no VAT number, no QR */
  taxInvoice: boolean;
  vatRate: number;
  vatAmount: number;
  total: number;
  currency: string;
  qr: string | null;
  seller: ZatcaPayload | null;
  /** the legal name from the document's `seller` block (a receipt has no QR to read it from) */
  sellerName: string | null;
  /** the invoice was cancelled (status CANCELLED): the list says so */
  cancelled: boolean;
};

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : null);
const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v : null);

export function extractReceipt(raw: unknown): ReceiptView | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const invoiceNo = text(r.invoice_no);
  const total = num(r.total);
  const taxInvoice = r.document_kind !== 'receipt';
  // a receipt states no VAT (null) and its subtotal is the total paid; a tax invoice must state both
  const vatAmount = taxInvoice ? num(r.vat_amount) : 0;
  const subtotal = taxInvoice ? num(r.subtotal) : total;
  const bookingId = text(r.booking_id);
  if (!invoiceNo || total === null || vatAmount === null || subtotal === null || !bookingId) return null;
  const qr = text(r.qr_base64);
  const seller = decodeZatcaTlv(qr);
  return { invoiceNo, kind: text(r.booking_kind) ?? '', bookingId, issuedAt: seller?.issuedAt ?? text(r.createdAt), subtotal, taxInvoice, vatRate: num(r.vat_rate) ?? 0, vatAmount, total, currency: text(r.currency) ?? 'SAR', qr: taxInvoice ? qr : null, seller: taxInvoice ? seller : null, sellerName: text((r.seller as Record<string, unknown> | null | undefined)?.legal_name), cancelled: r.status === 'CANCELLED' };
}

export function extractReceipts(raw: unknown): ReceiptView[] {
  const list = Array.isArray(raw) ? raw : raw && typeof raw === 'object' && Array.isArray((raw as { data?: unknown }).data) ? (raw as { data: unknown[] }).data : [];
  return list.flatMap((entry) => {
    const view = extractReceipt(entry);
    return view ? [view] : [];
  });
}
