import { PHARMACY_RETURN_REASONS, pharmacyReasonCode, returnErrorKey } from '../pharmacyReturn';

describe('the pharmacy return rules', () => {
  it('offers only the four defect reasons, with the server codes', () => {
    expect(PHARMACY_RETURN_REASONS.map(pharmacyReasonCode)).toEqual(['wrong_item', 'damaged', 'expired', 'not_as_described']);
  });
  it("maps the server's two refusals to a message key and leaves others alone", () => {
    expect(returnErrorKey(new Error('pharmacy_return_needs_a_defect_reason'))).toBe('returns.err.defectReason');
    expect(returnErrorKey(new Error('photo_evidence_required'))).toBe('returns.err.photoRequired');
    expect(returnErrorKey(new Error('other'))).toBeNull();
    expect(returnErrorKey(undefined)).toBeNull();
  });
});

import { offerErrorKey } from '../pharmacyOffers';
describe('cancelling a pharmacy order that is being prepared', () => {
  it('has its own message', () => {
    expect(offerErrorKey(new Error('cancel_not_allowed_after_preparation'))).toBe('pharmacy.offers.err.cancelAfterPreparation');
  });
});
