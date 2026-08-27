import { BadRequestException } from '@nestjs/common';
import { calculatePharmacyQuote } from './pharmacy-offer.service';

describe('calculatePharmacyQuote', () => {
  it('prices available inventory lines server-side and preserves the delivery fee', () => {
    expect(calculatePharmacyQuote([
      { requested_qty: 2, offered_qty: 2, available: true, unit_price: 12.5 },
      { requested_qty: 1, offered_qty: 0, available: false, unit_price: 100 },
    ], 7.5)).toEqual({ subtotal: 25, delivery_fee: 7.5, total: 32.5, currency: 'SAR' });
  });

  it('rejects negative delivery fees rather than trusting a provider price payload', () => {
    expect(() => calculatePharmacyQuote([], -1)).toThrow(BadRequestException);
  });
});
