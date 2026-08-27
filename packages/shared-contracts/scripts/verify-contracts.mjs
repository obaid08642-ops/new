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
  assertTransition(PHARMACY_TRANSITIONS, PharmacyOrderState.OFFER_SELECTED, PharmacyOrderState.PAYMENT_PENDING, 'PATIENT', { paymentMethod: 'COD' }).ok,
  false,
);
assert.deepEqual(
  assertTransition(PHARMACY_TRANSITIONS, PharmacyOrderState.OFFER_SELECTED, PharmacyOrderState.INSURANCE_PROCESSING, 'SYSTEM', { hasPolicy: true }),
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
