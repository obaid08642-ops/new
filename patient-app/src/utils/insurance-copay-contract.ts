export type InsuranceCopayState = 'PENDING_PROVIDER_REVIEW' | 'APPROVED_FULL' | 'COPAY_PENDING' | 'COPAY_PAID' | 'REJECTED' | 'SELF_PAY_PENDING' | 'SELF_PAY_PAID' | 'EXPIRED' | 'CANCELLED';

export type InsuranceCopayRequest = {
  id: string;
  booking_id: string;
  booking_kind: string;
  state: InsuranceCopayState;
  price: number;
  copay_amount: number;
  self_pay_amount: number;
  policy?: { company_name?: string };
};

export function parseInsuranceCopayRequest(value: unknown): InsuranceCopayRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('insurance request not found');
  const request = value as Record<string, unknown>;
  const id = typeof request.id === 'string' ? request.id.trim() : '';
  const bookingId = typeof request.booking_id === 'string' ? request.booking_id.trim() : '';
  const state = typeof request.state === 'string' ? request.state : '';
  const price = Number(request.price);
  const copay = Number(request.copay_amount ?? 0);
  const selfPay = Number(request.self_pay_amount ?? 0);
  const allowed = new Set<InsuranceCopayState>(['PENDING_PROVIDER_REVIEW', 'APPROVED_FULL', 'COPAY_PENDING', 'COPAY_PAID', 'REJECTED', 'SELF_PAY_PENDING', 'SELF_PAY_PAID', 'EXPIRED', 'CANCELLED']);
  if (!id || !bookingId || !allowed.has(state as InsuranceCopayState) || !Number.isFinite(price) || price <= 0 || !Number.isFinite(copay) || copay < 0 || !Number.isFinite(selfPay) || selfPay < 0) {
    throw new Error('invalid insurance request contract');
  }
  return { id, booking_id: bookingId, booking_kind: typeof request.booking_kind === 'string' ? request.booking_kind : '', state: state as InsuranceCopayState, price, copay_amount: copay, self_pay_amount: selfPay, policy: request.policy as InsuranceCopayRequest['policy'] };
}

export function insurancePaymentAction(request: InsuranceCopayRequest): 'provider_review' | 'covered' | 'checkout_copay' | 'accept_self_pay' | 'checkout_self_pay' | 'paid' | 'unavailable' {
  if (request.state === 'PENDING_PROVIDER_REVIEW') return 'provider_review';
  if (request.state === 'APPROVED_FULL' && request.copay_amount === 0) return 'covered';
  if (request.state === 'COPAY_PENDING' && request.copay_amount > 0) return 'checkout_copay';
  if (request.state === 'REJECTED') return 'accept_self_pay';
  if (request.state === 'SELF_PAY_PENDING' && request.self_pay_amount > 0) return 'checkout_self_pay';
  if (request.state === 'COPAY_PAID' || request.state === 'SELF_PAY_PAID') return 'paid';
  return 'unavailable';
}

export function insuranceSelfPayHeaders(requestId: string): Record<string, string> {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
  return { 'Idempotency-Key': `insurance-self-pay-${requestId}-${random}`.slice(0, 128) };
}
