import type { ReceiptKind } from "@/lib/receipt/model";
import { callPatientApi } from "@/lib/api/upstream";

/** Server-only BFF boundary for the patient's invoices (backend/src/modules/billing/billing.module.ts). */
export function getMyInvoices(accessToken: string) {
  return callPatientApi("/billing/my", {}, accessToken);
}

export function getInvoice(accessToken: string, kind: ReceiptKind, bookingId: string) {
  return callPatientApi(`/billing/invoice/${kind}/${encodeURIComponent(bookingId)}`, {}, accessToken);
}
