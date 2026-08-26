/**
 * Generates a bounded, per-tap idempotency key for a payment-intent mutation.
 * This is a replay-safety identifier, never authentication material.
 */
export function paymentIntentHeaders(kind: string, bookingId: string): Record<string, string> {
  const uuid = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
  return { 'Idempotency-Key': `payment-${kind}-${bookingId}-${uuid}`.slice(0, 128) };
}
