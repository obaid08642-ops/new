import type { ReceiptKind } from "@/lib/receipt/model";
import { callPatientApi } from "@/lib/api/upstream";

/** Server-only BFF boundary for the patient's invoices (backend/src/modules/billing/billing.module.ts). */
export function getMyInvoices(accessToken: string) {
  return callPatientApi("/billing/my", {}, accessToken);
}

export function getInvoice(accessToken: string, kind: ReceiptKind, bookingId: string) {
  return callPatientApi(`/billing/invoice/${kind}/${encodeURIComponent(bookingId)}`, {}, accessToken);
}

/** The public, read-only view a share link opens (no login, no cookie): the invoice and no other account data. */
export function getSharedInvoice(token: string) {
  return callPatientApi(`/billing/shared/${encodeURIComponent(token)}`);
}

export function getSharedInvoicePdf(token: string) {
  return callPatientApi(`/billing/shared/${encodeURIComponent(token)}/pdf`);
}

/** A share token is 32 random bytes in base64url (43 characters); anything else cannot be a link and is not sent to the backend. */
export const isShareToken = (value: string) => /^[A-Za-z0-9_-]{20,100}$/.test(value);
