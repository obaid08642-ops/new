/** Helpers for capability-gated consultation checkout; never treat a client redirect as payment success. */
export function isHttpsCheckout(value: unknown): value is string {
  try {
    return new URL(String(value)).protocol === 'https:';
  } catch {
    return false;
  }
}

export function appointmentMutationHeaders(doctorId: unknown, slotStart: unknown): Record<string, string> {
  return consultationMutationHeaders('create', `${String(doctorId)}-${String(slotStart)}`);
}

export function consultationMutationHeaders(action: 'create' | 'cancel', resource: unknown): Record<string, string> {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
  return { 'Idempotency-Key': `appointment-${action}-${String(resource)}-${random}`.slice(0, 128) };
}
