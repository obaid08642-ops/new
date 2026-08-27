import assert from 'node:assert/strict';
import contracts from '../dist/index.js';

const {
  assertTransition,
  PharmacyOrderState,
  PHARMACY_TRANSITIONS,
  ServiceBookingState,
  SERVICE_TRANSITIONS,
} = contracts;

assert.deepEqual(
  assertTransition(PHARMACY_TRANSITIONS, PharmacyOrderState.OFFERS_READY, PharmacyOrderState.OFFER_SELECTED, 'PATIENT', { offerId: 'offer_1' }),
  { ok: true },
);
assert.equal(
  assertTransition(PHARMACY_TRANSITIONS, PharmacyOrderState.OFFER_SELECTED, PharmacyOrderState.PAYMENT_PENDING, 'PATIENT', { paymentMethod: 'CARD', paymentMethodEnabled: true }).ok,
  false,
);
assert.deepEqual(
  assertTransition(PHARMACY_TRANSITIONS, PharmacyOrderState.OFFER_SELECTED, PharmacyOrderState.FINAL_QUOTE_ACCEPTED, 'PATIENT', { negotiationRequired: false, quoteHash: 'quote-hash', quoteRevision: 1 }),
  { ok: true },
);
assert.equal(
  assertTransition(PHARMACY_TRANSITIONS, PharmacyOrderState.FINAL_QUOTE_ACCEPTED, PharmacyOrderState.PAYMENT_PENDING, 'PATIENT', { paymentMethod: 'WALLET', paymentMethodEnabled: true }).ok,
  false,
);
assert.deepEqual(
  assertTransition(PHARMACY_TRANSITIONS, PharmacyOrderState.FINAL_QUOTE_ACCEPTED, PharmacyOrderState.PAYMENT_PENDING, 'PATIENT', { paymentMethod: 'APPLE_PAY', paymentMethodEnabled: true }),
  { ok: true },
);
assert.deepEqual(
  assertTransition(PHARMACY_TRANSITIONS, PharmacyOrderState.FINAL_QUOTE_ACCEPTED, PharmacyOrderState.INSURANCE_PROCESSING, 'SYSTEM', { hasPolicy: true, insuranceReady: true }),
  { ok: true },
);
assert.deepEqual(
  assertTransition(PHARMACY_TRANSITIONS, PharmacyOrderState.INSURANCE_PROCESSING, PharmacyOrderState.INSURANCE_DECISION_READY, 'PHARMACY', { insuranceItemsDecided: true, decision: 'APPROVED_PARTIAL' }),
  { ok: true },
);
assert.equal(
  assertTransition(SERVICE_TRANSITIONS, ServiceBookingState.DRAFT, ServiceBookingState.PAYMENT_PENDING, 'PATIENT', { coverage: 'CASH', serviceKind: 'LAB' }).ok,
  true,
);
assert.equal(
  assertTransition(SERVICE_TRANSITIONS, ServiceBookingState.DRAFT, ServiceBookingState.PAYMENT_PENDING, 'PATIENT', { coverage: 'CASH', serviceKind: 'UNKNOWN' }).ok,
  false,
);

console.log('governed contract transitions verified');
