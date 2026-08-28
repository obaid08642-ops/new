import { callPatientApi } from "@/lib/api/upstream";
import { parsePaymentType } from "./payments";

export function createPatientPaymentIntent(accessToken: string, type: string, bookingId: string, idempotencyKey: string, method: "card" | "apple-pay" | "google-pay") {
  const kind = parsePaymentType(type); if (!kind.success || !bookingId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[4-9][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) return null;
  return callPatientApi(`/payments/intent/${kind.data}/${bookingId}`, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": idempotencyKey }, body: JSON.stringify({ method }) }, accessToken);
}
