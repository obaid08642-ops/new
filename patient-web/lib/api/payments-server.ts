import { callPatientApi } from "@/lib/api/upstream";
import { parsePaymentType } from "./payments";

export function createPatientPaymentIntent(accessToken: string, type: string, bookingId: string, idempotencyKey: string) {
  const kind = parsePaymentType(type); if (!kind.success || !bookingId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[4-9][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) return null;
  return callPatientApi(`/payments/intent/${kind.data}/${bookingId}`, { method: "POST", headers: { "idempotency-key": idempotencyKey } }, accessToken);
}
