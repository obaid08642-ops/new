/**
 * P22.11 — fraud/risk scoring (pure math, no I/O).
 *
 * Five scorers, each 0..1 with reasons. Thresholds are conservative
 * defaults; live tuning with real traffic is ops work (see notes).
 */

export interface FakeOrderSignals {
  isCod: boolean;
  accountAgeDays: number;
  orderTotal: number;
  priorCompletedOrders: number;
  addressChangesLast24h: number;
  phonesOnSameDevice: number;
}

export interface Scored {
  score: number;
  flagged: boolean;
  reasons: string[];
}

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

export function scoreFakeOrder(s: FakeOrderSignals): Scored {
  const reasons: string[] = [];
  let score = 0;
  if (s.isCod && s.accountAgeDays < 3 && s.priorCompletedOrders === 0) {
    score += 0.45;
    reasons.push('cod_first_order_new_account');
  }
  if (s.isCod && s.orderTotal >= 500) {
    score += 0.25;
    reasons.push('cod_high_value');
  }
  if (s.addressChangesLast24h >= 3) {
    score += 0.2;
    reasons.push('address_churn');
  }
  if (s.phonesOnSameDevice > 3) {
    score += 0.25;
    reasons.push('device_account_farm');
  }
  if (s.priorCompletedOrders > 0) score -= 0.3;
  const final = clamp01(score);
  return { score: Math.round(final * 100) / 100, flagged: final >= 0.6, reasons };
}

export interface CodHistory {
  codOrders: number;
  codCancelled: number;
  codUnpaid: number;
}

export function scoreCodAbuse(h: CodHistory): Scored {
  const reasons: string[] = [];
  let score = 0;
  if (h.codOrders >= 5 && h.codCancelled / h.codOrders >= 0.5) {
    score += 0.6;
    reasons.push('cod_cancel_rate_high');
  }
  if (h.codUnpaid >= 2) {
    score += 0.35;
    reasons.push('cod_unpaid_repeat');
  }
  if (h.codOrders >= 10 && h.codCancelled / h.codOrders >= 0.3) {
    score += 0.2;
    reasons.push('cod_volume_with_cancels');
  }
  const final = clamp01(score);
  return { score: Math.round(final * 100) / 100, flagged: final >= 0.6, reasons };
}

export interface FarmSignals {
  accountsOnDevice: number;
  accountsSamePhonePrefix: number;
  registrationsLast24h: number;
}

export function scoreAccountFarm(s: FarmSignals): Scored {
  const reasons: string[] = [];
  let score = 0;
  if (s.accountsOnDevice > 3) {
    score += 0.65;
    reasons.push('device_over_limit');
  }
  if (s.accountsSamePhonePrefix >= 5) {
    score += 0.3;
    reasons.push('phone_prefix_cluster');
  }
  if (s.registrationsLast24h >= 5) {
    score += 0.25;
    reasons.push('registration_burst');
  }
  const final = clamp01(score);
  return { score: Math.round(final * 100) / 100, flagged: final >= 0.6, reasons };
}

export interface PromoSignals {
  couponFailuresLast1h: number;
  distinctCodesFailed: number;
  usagesLast24h: number;
}

export function scorePromoAbuse(s: PromoSignals): Scored {
  const reasons: string[] = [];
  let score = 0;
  if (s.couponFailuresLast1h >= 5) {
    score += 0.55;
    reasons.push('coupon_guessing');
  }
  if (s.distinctCodesFailed >= 5) {
    score += 0.2;
    reasons.push('code_enumeration');
  }
  if (s.usagesLast24h >= 5) {
    score += 0.25;
    reasons.push('promo_velocity');
  }
  const final = clamp01(score);
  return { score: Math.round(final * 100) / 100, flagged: final >= 0.6, reasons };
}

export interface PaymentSignals {
  failedLast1h: number;
  distinctCardsFailed: number;
  duplicatePaidForBooking: boolean;
  amountVsMedianRatio: number;
}

export function scorePaymentFraud(s: PaymentSignals): Scored {
  const reasons: string[] = [];
  let score = 0;
  if (s.failedLast1h >= 5) {
    score += 0.6;
    reasons.push('card_testing_velocity');
  }
  if (s.distinctCardsFailed >= 3) {
    score += 0.25;
    reasons.push('multi_card_cycling');
  }
  if (s.duplicatePaidForBooking) {
    score += 0.5;
    reasons.push('duplicate_paid_booking');
  }
  if (s.amountVsMedianRatio >= 5) {
    score += 0.2;
    reasons.push('amount_outlier');
  }
  const final = clamp01(score);
  return { score: Math.round(final * 100) / 100, flagged: final >= 0.6, reasons };
}

export type RiskAction = 'allow' | 'review' | 'block';

export function aggregateRisk(scores: Scored[]): { score: number; action: RiskAction } {
  const top = Math.max(0, ...scores.map((s) => s.score));
  const flags = scores.filter((s) => s.flagged).length;
  const combined = clamp01(top + flags * 0.1);
  const action: RiskAction = combined >= 0.85 || flags >= 3 ? 'block' : combined >= 0.6 || flags >= 1 ? 'review' : 'allow';
  return { score: Math.round(combined * 100) / 100, action };
}

// ── 3-D Secure capability matrix (read-only gateway inspection) ──────────
// Sources: PaymentGateway contract + PAYMENT_PROVIDER selection
// (payments/payment-gateway.ts); Moyasar hosted checkout w/ payment_url
// redirect + HMAC webhooks (moyasar.module.ts). No gateway code is modified.

export interface Gateway3DSCapability {
  provider: string;
  supports3DS: boolean;
  mode: string;
  hook: string;
}

const GATEWAY_3DS_MATRIX: Gateway3DSCapability[] = [
  {
    provider: 'moyasar',
    supports3DS: true,
    mode: 'hosted',
    hook: 'Moyasar hosted checkout (payment_url redirect) runs cardholder authentication on the Moyasar page; require hosted flow for high-risk card orders, verify via webhook/status sync before fulfilling.',
  },
  {
    provider: 'stripe',
    supports3DS: true,
    mode: 'payment-intent',
    hook: 'Stripe PaymentIntent (client_secret) triggers automatic 3DS challenge when the card requires it; require PaymentMethod + return_url handling for high-risk card orders.',
  },
  {
    provider: 'tap',
    supports3DS: true,
    mode: 'hosted',
    hook: 'Tap hosted checkout runs 3DS on the Tap page; require hosted/checkout_url flow for high-risk card orders and verify before fulfilling.',
  },
  {
    provider: 'hyperpay',
    supports3DS: false,
    mode: 'unavailable',
    hook: 'HyperPay has no adapter in this codebase (selectGateway fails loudly) — not selectable, no 3DS path exists.',
  },
];

export function gateway3DSCapabilities(): Gateway3DSCapability[] {
  return GATEWAY_3DS_MATRIX.map((r) => ({ ...r }));
}

export function activeGateway(): string {
  return (process.env['PAYMENT_PROVIDER'] || '').trim().toLowerCase() || 'auto';
}

export interface ThreeDSDecision {
  required: boolean;
  provider: string;
  reason: string;
}

export function threeDSHook(input: {
  paymentMethod: string;
  riskScore: number;
  orderTotal: number;
  provider?: string;
}): ThreeDSDecision {
  const provider = (input.provider || activeGateway()).toLowerCase();
  const cap = GATEWAY_3DS_MATRIX.find((g) => g.provider === provider);
  const isCard = ['card', 'creditcard', 'credit_card', 'mada', 'applepay'].includes(
    String(input.paymentMethod).toLowerCase(),
  );
  if (!isCard) return { required: false, provider, reason: 'non_card_no_3ds' };
  if (!cap || !cap.supports3DS) return { required: false, provider, reason: 'gateway_no_3ds_path' };
  if (input.riskScore >= 0.6 || input.orderTotal >= 1000) {
    return { required: true, provider, reason: input.riskScore >= 0.6 ? 'high_risk_score' : 'high_value' };
  }
  return { required: false, provider, reason: 'low_risk' };
}
