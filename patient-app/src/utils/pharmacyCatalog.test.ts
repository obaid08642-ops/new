// the language manager reads a native module; the promo rules below do not use it
jest.mock('./localize', () => ({ pickDbField: () => undefined }));
jest.mock('./imageUrl', () => ({ resolveGallery: () => [] }));

import { canShowPromo, discountPercent, needsRx, oldPriceOf, onlineOnly, productNote, type Med } from './pharmacyCatalog';

const otc: Med = { id: 'a', price: 80, old_price: 100 };
const rx: Med = { id: 'b', price: 80, old_price: 100, discount_percent: 20, requires_prescription: true };
const rxFlag: Med = { id: 'c', price: 80, old_price: 100, rx: true };

describe('canShowPromo (owner decision 10: no offer, discount or crossed price on a prescription item)', () => {
  it('allows a promo on an item that needs no prescription', () => {
    expect(canShowPromo(otc)).toBe(true);
    expect(discountPercent(otc)).toBe(20);
    expect(oldPriceOf(otc)).toBe(100);
  });

  it('withholds every promo from an item that needs a prescription, even when the row still carries an old price', () => {
    for (const med of [rx, rxFlag]) {
      expect(needsRx(med)).toBe(true);
      expect(canShowPromo(med)).toBe(false);
      expect(discountPercent(med)).toBe(0);
      expect(oldPriceOf(med)).toBeNull();
    }
  });

  it('shows no crossed-out price without a real discount', () => {
    expect(oldPriceOf({ id: 'd', price: 100, old_price: 100 })).toBeNull();
    expect(oldPriceOf({ id: 'e', price: 100 })).toBeNull();
  });
});

describe('productNote (the prescription and online-only labels under a price)', () => {
  const labels = { rx: 'RX', online: 'ONLINE' };

  it('joins the two labels and says nothing when neither applies', () => {
    expect(productNote({ id: 'a' }, labels)).toBeUndefined();
    expect(productNote({ id: 'a', requires_prescription: true }, labels)).toBe('RX');
    expect(productNote({ id: 'a', online_exclusive: true }, labels)).toBe('ONLINE');
    expect(productNote({ id: 'a', requires_prescription: true, online_exclusive: true }, labels)).toBe('RX · ONLINE');
  });

  it('counts only a real true as online only', () => {
    expect(onlineOnly({ online_exclusive: true })).toBe(true);
    expect(onlineOnly({ online_exclusive: false })).toBe(false);
    expect(onlineOnly({})).toBe(false);
  });
});
