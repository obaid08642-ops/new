export type InsuranceCopayState = 'PENDING_PROVIDER_REVIEW' | 'APPROVED_FULL' | 'COPAY_PENDING' | 'COPAY_PAID' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';

export type InsuranceCopayRequest = {
  id: string;
  booking_id: string;
  booking_kind: string;
  state: InsuranceCopayState;
  price: number;
  copay_amount: number;
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
  const allowed = new Set<InsuranceCopayState>(['PENDING_PROVIDER_REVIEW', 'APPROVED_FULL', 'COPAY_PENDING', 'COPAY_PAID', 'REJECTED', 'EXPIRED', 'CANCELLED']);
  if (!id || !bookingId || !allowed.has(state as InsuranceCopayState) || !Number.isFinite(price) || price <= 0 || !Number.isFinite(copay) || copay < 0) {
    throw new Error('invalid insurance request contract');
  }
  return { id, booking_id: bookingId, booking_kind: typeof request.booking_kind === 'string' ? request.booking_kind : '', state: state as InsuranceCopayState, price, copay_amount: copay, policy: request.policy as InsuranceCopayRequest['policy'] };
}

export function insurancePaymentAction(request: InsuranceCopayRequest): 'provider_review' | 'settle_zero_copay' | 'checkout_copay' | 'paid' | 'unavailable' {
  if (request.state === 'PENDING_PROVIDER_REVIEW') return 'provider_review';
  if (request.state === 'APPROVED_FULL' && request.copay_amount === 0) return 'settle_zero_copay';
  if (request.state === 'COPAY_PENDING' && request.copay_amount > 0) return 'checkout_copay';
  if (request.state === 'COPAY_PAID') return 'paid';
  return 'unavailable';
}
