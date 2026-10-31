import { downloadProtected } from '../utils/api';

/** The kinds the backend's /billing/invoice/:kind/:bookingId understands (billing.module.ts bookingModelName). */
export type ReceiptKind = 'appointment' | 'lab' | 'radiology' | 'nursing' | 'pharmacy';

const KIND_OF: Record<string, ReceiptKind> = {
  appointment: 'appointment', consultation: 'appointment',
  lab: 'lab', lab_booking: 'lab',
  radiology: 'radiology',
  nursing: 'nursing', home_care: 'nursing',
  pharmacy: 'pharmacy', order: 'pharmacy',
};

export const receiptKindOf = (bookingKind?: string | null): ReceiptKind | null => KIND_OF[String(bookingKind ?? '').trim().toLowerCase()] ?? null;

export interface ReceiptRow {
  invoiceNo: string;
  kind: ReceiptKind | null;
  bookingId: string;
  total: number;
  vatAmount: number;
  currency: string;
  issuedAt: string | null;
  cancelled: boolean;
}

/** GET /billing/my: a bare array, or `{ data: [...] }`. A row without an invoice number or booking id is not drawn. */
export function parseReceipts(raw: unknown): ReceiptRow[] {
  const list = Array.isArray(raw) ? raw : Array.isArray((raw as { data?: unknown })?.data) ? (raw as { data: unknown[] }).data : [];
  const out: ReceiptRow[] = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    const invoiceNo = typeof r.invoice_no === 'string' ? r.invoice_no : '';
    const bookingId = typeof r.booking_id === 'string' ? r.booking_id : '';
    const total = Number(r.total);
    if (!invoiceNo || !bookingId || !Number.isFinite(total)) continue;
    out.push({
      invoiceNo, bookingId, total,
      kind: receiptKindOf(typeof r.booking_kind === 'string' ? r.booking_kind : null),
      vatAmount: Number.isFinite(Number(r.vat_amount)) ? Number(r.vat_amount) : 0,
      currency: typeof r.currency === 'string' && r.currency ? r.currency : 'SAR',
      issuedAt: typeof r.createdAt === 'string' ? r.createdAt : null,
      cancelled: r.status === 'CANCELLED',
    });
  }
  return out;
}

export const receiptPdfEndpoint = (kind: ReceiptKind, bookingId: string): string => `/billing/invoice/${kind}/${encodeURIComponent(bookingId)}/pdf`;

export interface ReceiptDeps {
  download: (endpoint: string, filename: string) => Promise<string | null>;
  share: (uri: string) => Promise<void>;
}

const defaultDeps: ReceiptDeps = {
  download: downloadProtected,
  share: async (uri) => {
    const { shareAsync } = await import('expo-sharing');
    await shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  },
};

/**
 * Downloads the receipt PDF of a paid booking (the server issues the tax invoice on the first request and returns the same one afterwards)
 * and opens the share sheet (save, print, send). `unavailable` when the server refuses it (not the patient's booking, nothing payable,
 * invoicing not configured) or the sheet cannot open.
 */
export async function shareReceipt(kind: ReceiptKind, bookingId: string, deps: ReceiptDeps = defaultDeps): Promise<'shared' | 'unavailable'> {
  try {
    const uri = await deps.download(receiptPdfEndpoint(kind, bookingId), `receipt-${bookingId.slice(0, 8)}.pdf`);
    if (!uri) return 'unavailable';
    await deps.share(uri);
    return 'shared';
  } catch {
    return 'unavailable';
  }
}
