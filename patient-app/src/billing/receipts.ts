/** The kinds the backend's /billing/invoice/:kind/:bookingId understands (billing.module.ts bookingModelName). */
export type ReceiptKind = 'appointment' | 'lab' | 'radiology' | 'nursing' | 'pharmacy';

const KIND_OF: Record<string, ReceiptKind> = {
  appointment: 'appointment', consultation: 'appointment',
  lab: 'lab', lab_booking: 'lab',
  radiology: 'radiology',
  nursing: 'nursing', home_care: 'nursing',
  pharmacy: 'pharmacy', order: 'pharmacy',
};

/** The invoicing kind of an app booking kind; null for a kind the invoicing does not cover. */
export const receiptKindOf = (bookingKind?: string | null): ReceiptKind | null => KIND_OF[String(bookingKind ?? '').trim().toLowerCase()] ?? null;
