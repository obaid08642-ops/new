import { isOfferViewStatus, minutesLeft, OFFER_STATUS_LABEL, OFFER_VIEW_STATUSES } from '../offerView';

describe('offerView', () => {
  it('knows exactly the server view statuses and labels each one', () => {
    expect(isOfferViewStatus('not_chosen')).toBe(true);
    expect(isOfferViewStatus('selected')).toBe(false);
    expect(isOfferViewStatus(undefined)).toBe(false);
    for (const s of OFFER_VIEW_STATUSES) {
      expect(OFFER_STATUS_LABEL[s].ar.length).toBeGreaterThan(0);
      expect(OFFER_STATUS_LABEL[s].en.length).toBeGreaterThan(0);
    }
  });

  it('counts the minutes left of a quote, never below zero', () => {
    const now = new Date('2026-10-09T10:00:00.000Z');
    expect(minutesLeft('2026-10-09T10:07:30.000Z', now)).toBe(8);
    expect(minutesLeft('2026-10-09T09:59:00.000Z', now)).toBe(0);
    expect(minutesLeft(null, now)).toBeNull();
    expect(minutesLeft('not a date', now)).toBeNull();
  });
});
