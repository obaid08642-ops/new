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
  /**
   * P22.11+ — 3-D Secure outcome for the user's latest card payment.
   * Optional for backward compatibility; absent ⇒ 'unavailable' (neutral).
   */
  threeDS?: ThreeDSOutcome;
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
  const tds: ThreeDSOutcome = s.threeDS ?? 'unavailable';
  if (tds !== 'unavailable') {
    score += THREE_DS_WEIGHTS[tds];
    reasons.push(`three_ds_${tds}`);
  } else {
    reasons.push('three_ds_unavailable');
  }
  const final = clamp01(score);
  return { score: Math.round(final * 100) / 100, flagged: final >= 0.6, reasons };
}

// ── 3-D Secure outcome signal (P22.11+/Phase 1.1) ─────────────────────
// Consumes the payment 3DS outcome as a weighted fraud signal.
//
// Documented weights (deltas applied to the payment-fraud sub-score, plus a
// standalone `three_ds` sub-score of BASE + delta):
//   authenticated: −0.25  (challenge passed ⇒ lowers risk; −0.10 combined
//                           dampening in aggregateRisk)
//   failed:        +0.45  (challenge failed ⇒ strong fraud signal)
//   bypassed:      +0.35  (3DS skipped/exempted on a card payment ⇒ elevated)
//   unavailable:    0.00  (no 3DS data — cash/COD, non-card method, gateway
//                           without a 3DS path, or live PSP ECI/CAVV fields not
//                           stored. NEUTRAL: never treated as fraud.)
//
// Field sources (read-only, no gateway code modified):
//   - Paymob webhook txn: `is_3d_secure` + `is_auth`
//     (see payments/paymob.service.ts HMAC field list).
//   - Explicit outcome fields when present: `three_ds_outcome` /
//     `three_ds` / `three_ds_status` (also checked inside `raw_response`
//     and `source` nests), plus explicit bypass markers
//     (`three_ds_bypassed`, `three_ds_exemption`, `three_ds_skipped`).
//   - Moyasar hosted checkout runs cardholder authentication on the Moyasar
//     page; the current `moyasar_payments` schema stores NO per-payment 3DS
//     fields (no ECI/CAVV/enrollment), so Moyasar rows ⇒ 'unavailable' until
//     the PSP sync persists them (remaining gap, see return message).

export type ThreeDSOutcome = 'authenticated' | 'failed' | 'bypassed' | 'unavailable';

export const THREE_DS_WEIGHTS: Record<ThreeDSOutcome, number> = {
  authenticated: -0.25,
  failed: 0.45,
  bypassed: 0.35,
  unavailable: 0,
};

/** Standalone sub-score base: score = clamp01(BASE + weight). */
export const THREE_DS_STANDALONE_BASE = 0.3;

/** Below-threshold scores are informational; ≥0.6 joins the flagged set. */
export const THREE_DS_FLAG_THRESHOLD = 0.6;

const strLower = (v: unknown): string => (typeof v === 'string' ? v.trim().toLowerCase() : '');

export function normalizeThreeDSOutcome(raw: unknown): ThreeDSOutcome {
  const v = strLower(raw);
  if (['authenticated', 'auth_ok', 'success', 'passed', 'challenge_passed', 'y', 'true'].includes(v)) {
    return 'authenticated';
  }
  if (['failed', 'failure', 'challenge_failed', 'rejected', 'declined', 'n'].includes(v)) return 'failed';
  if (
    ['bypassed', 'bypass', 'exemption', 'exempted', 'frictionless_bypass', 'skip', 'skipped', 'waived', 'tra_exemption'].includes(
      v,
    )
  ) {
    return 'bypassed';
  }
  return 'unavailable';
}

const isTruthyFlag = (v: unknown): boolean =>
  v === true || v === 1 || strLower(v) === 'true' || strLower(v) === 'yes' || strLower(v) === '1';

/**
 * Derive the 3DS outcome from a stored payment row. Pure + defensive:
 * unknown shapes ⇒ 'unavailable' (neutral, never fraud).
 */
export function deriveThreeDSOutcome(row: Record<string, unknown> | null | undefined): ThreeDSOutcome {
  if (!row || typeof row !== 'object') return 'unavailable';
  const nests: Array<Record<string, unknown>> = [row];
  for (const key of ['raw_response', 'source']) {
    const nested = row[key];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      nests.push(nested as Record<string, unknown>);
      const deep = (nested as Record<string, unknown>)['source'];
      if (deep && typeof deep === 'object' && !Array.isArray(deep)) {
        nests.push(deep as Record<string, unknown>);
      }
    }
  }
  const pick = (...keys: string[]): unknown => {
    for (const obj of nests) {
      for (const k of keys) {
        const v = obj[k];
        if (v !== undefined && v !== null && v !== '') return v;
      }
    }
    return undefined;
  };
  // 1. Explicit outcome fields win (any PSP that persists them in future).
  const explicit = pick('three_ds_outcome', 'threeDSOutcome', 'three_ds', 'threeDS', 'three_ds_status');
  if (explicit !== undefined) {
    const normalized = normalizeThreeDSOutcome(explicit);
    if (normalized !== 'unavailable') return normalized;
  }
  // 2. Explicit bypass/exemption markers.
  const bypassMarker = pick('three_ds_bypassed', 'three_ds_exemption', 'three_ds_skipped', 'three_ds_exempt');
  if (isTruthyFlag(bypassMarker)) return 'bypassed';
  // 3. Paymob shape: is_3d_secure + is_auth.
  const s3 = pick('is_3d_secure');
  const auth = pick('is_auth');
  if (s3 !== undefined || auth !== undefined) {
    if (isTruthyFlag(s3) && isTruthyFlag(auth)) return 'authenticated';
    if (isTruthyFlag(s3) && !isTruthyFlag(auth)) return 'failed';
    // is_3d_secure false/absent: 3DS did not run (non-enrolled card,
    // non-card method, no 3DS path) ⇒ neutral, NOT fraud.
    return 'unavailable';
  }
  return 'unavailable';
}

export function scoreThreeDS(outcome: ThreeDSOutcome): Scored {
  const delta = THREE_DS_WEIGHTS[outcome] ?? 0;
  const final = clamp01(Math.round((THREE_DS_STANDALONE_BASE + delta) * 100) / 100);
  return {
    score: final,
    flagged: final >= THREE_DS_FLAG_THRESHOLD,
    reasons: [`three_ds_${outcome}`],
  };
}

/**
 * Authenticated 3DS dampens the combined score (−0.10, floored at 0).
 * Failed/bypassed already raise risk via their sub-scores + flag count,
 * so no upward adjustment is applied here (weights live in the scorers).
 */
export function applyThreeDSAdjustment(combined: number, outcome: ThreeDSOutcome): number {
  if (outcome === 'authenticated') return Math.round(clamp01(combined - 0.1) * 100) / 100;
  return combined;
}

export type RiskAction = 'allow' | 'review' | 'block';

export function aggregateRisk(
  scores: Scored[],
  threeDSOutcome: ThreeDSOutcome = 'unavailable',
): { score: number; action: RiskAction } {
  const top = Math.max(0, ...scores.map((s) => s.score));
  const flags = scores.filter((s) => s.flagged).length;
  const combined = applyThreeDSAdjustment(clamp01(top + flags * 0.1), threeDSOutcome);
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
