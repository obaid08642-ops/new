import { ledgerTypeLabel, serviceLabel } from '../ledgerLabels';

describe('ledger labels', () => {
  it('names every ledger type the provider wallet can hold, in both languages', () => {
    for (const t of ['provider_earning', 'payout', 'provider_debit', 'penalty', 'chargeback', 'bonus', 'referral', 'commission', 'vat', 'refund', 'adjustment', 'other']) {
      expect(ledgerTypeLabel(t, false)).not.toMatch(/_/);
      expect(ledgerTypeLabel(t, true)).not.toBe(t);
    }
    expect(ledgerTypeLabel('provider_earning', false)).toBe('Service earnings');
    expect(ledgerTypeLabel('other', true)).toBe('أخرى');
  });
  it('shows an unmapped id as words, never the raw id', () => {
    expect(ledgerTypeLabel('some_new_type', false)).toBe('Some new type');
    expect(serviceLabel('home_care', false)).toBe('Home care');
    expect(serviceLabel('mystery_service', true)).toBe('Mystery service');
  });
});
