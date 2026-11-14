/**
 * "My orders and results": the third tab lists the patient's ready results from two existing endpoints, and the badge counts
 * the unseen ones. Pure reading; a field the server did not send is not drawn.
 *
 *   GET /lab-results/mine        lab results (`id`, `booking_id`, `service_name_ar/en` | `name`, `reported_at` | `createdAt`,
 *                                `viewed_by_patient` (false until GET /lab-results/:id opens it), `source`: 'lab_booking' = a report file on the booking)
 *   GET /radiology/reports/mine  radiology bookings whose report is ready (`id`, `items[].name_ar/en`, `updatedAt`); the server has no "seen" flag for them
 */
import { listOf } from './orderCenter';
import { pickBookingName } from './bookingName';

export type ResultKind = 'lab' | 'radiology';
export type OrdersTab = 'current' | 'results' | 'previous';

export interface ResultItem {
  key: string;
  kind: ResultKind;
  id: string;
  /** The booking the result belongs to, when the server says so. */
  bookingId: string | null;
  title: string | null;
  at: string | null;
  /** True only when the server said `viewed_by_patient: false`. */
  isNew: boolean;
  /** A lab report file on a booking, which the protected report API serves as a PDF. */
  pdfPath: { bookingId: string; reportId: string } | null;
}

const text = (value: unknown): string | null => (typeof value === 'string' && value.trim() !== '' ? value.trim() : null);

function names(items: unknown): string | null {
  if (!Array.isArray(items)) return null;
  const parts = items
    .map((item) => (item && typeof item === 'object' ? pickBookingName(undefined, (item as Record<string, unknown>).name_ar, (item as Record<string, unknown>).name_en) : null))
    .map(text)
    .filter((x): x is string => x !== null);
  return parts.length > 0 ? parts.join(' + ') : null;
}

export function labResultItems(response: unknown): ResultItem[] {
  const out: ResultItem[] = [];
  for (const raw of listOf(response)) {
    const id = text(raw.id);
    if (!id) continue;
    const bookingId = text(raw.booking_id);
    const title = text(pickBookingName(undefined, raw.service_name_ar, raw.service_name_en)) ?? text(raw.name);
    out.push({
      key: `lab-${id}`,
      kind: 'lab',
      id,
      bookingId,
      title,
      at: text(raw.reported_at) ?? text(raw.uploaded_at) ?? text(raw.createdAt),
      isNew: raw.viewed_by_patient === false,
      pdfPath: raw.source === 'lab_booking' && bookingId ? { bookingId, reportId: id } : null,
    });
  }
  return out;
}

export function radiologyResultItems(response: unknown): ResultItem[] {
  const out: ResultItem[] = [];
  for (const raw of listOf(response)) {
    const id = text(raw.id);
    if (!id) continue;
    out.push({ key: `rad-${id}`, kind: 'radiology', id, bookingId: id, title: names(raw.items), at: text(raw.updatedAt) ?? text(raw.scheduled_at), isNew: false, pdfPath: null });
  }
  return out;
}

/** Newest first; an item without a date goes last. */
export function sortResults(items: ResultItem[]): ResultItem[] {
  const time = (item: ResultItem) => (item.at ? Date.parse(item.at) || 0 : 0);
  return [...items].sort((a, b) => time(b) - time(a));
}

/** The badge: the lab results the server has not yet marked as opened by the patient. */
export function newResultsCount(labResponse: unknown): number {
  return labResultItems(labResponse).filter((item) => item.isNew).length;
}

export const parseOrdersTab = (value: unknown): OrdersTab => (value === 'results' || value === 'previous' ? value : 'current');
