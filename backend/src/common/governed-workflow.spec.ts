import { BadRequestException } from '@nestjs/common';
import { PharmacyOrderState, ServiceBookingState } from '@nabd/shared-contracts';
import { assertGovernedPharmacyTransition, assertGovernedServiceTransition } from './governed-workflow';

describe('governed workflow guard', () => {
  it('requires an offer before a patient can select it', () => {
    expect(() => assertGovernedPharmacyTransition(
      PharmacyOrderState.OFFERS_READY,
      PharmacyOrderState.OFFER_SELECTED,
      'PATIENT',
      {},
    )).toThrow(BadRequestException);

    expect(() => assertGovernedPharmacyTransition(
      PharmacyOrderState.OFFERS_READY,
      PharmacyOrderState.OFFER_SELECTED,
      'PATIENT',
      { offerId: 'offer_1' },
    )).not.toThrow();
  });

  it('requires service-kind eligibility for a cash booking transition', () => {
    expect(() => assertGovernedServiceTransition(
      ServiceBookingState.DRAFT,
      ServiceBookingState.PAYMENT_PENDING,
      'PATIENT',
      { coverage: 'CASH', serviceKind: 'LAB' },
    )).not.toThrow();

    expect(() => assertGovernedServiceTransition(
      ServiceBookingState.DRAFT,
      ServiceBookingState.PAYMENT_PENDING,
      'PATIENT',
      { coverage: 'CASH', serviceKind: 'UNKNOWN' as any },
    )).toThrow(BadRequestException);
  });
});
