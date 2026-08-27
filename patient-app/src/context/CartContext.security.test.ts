import { sanitizePharmacyCartItem } from './CartContext';

describe('pharmacy cart runtime boundary', () => {
  it('drops legacy client-money fields before an item reaches local pharmacy-cart state', () => {
    const item = sanitizePharmacyCartItem({ id: 'sku-1', name: 'Medicine', rx: false, qty: 2, price: 99, payment_method: 'card', loyalty_points: 5 } as any);
    expect(item).toEqual({ id: 'sku-1', name: 'Medicine', rx: false, qty: 2, image: undefined, icon: undefined, iconColor: undefined, iconBg: undefined, activeIngredient: undefined });
    expect(item).not.toHaveProperty('price');
    expect(item).not.toHaveProperty('payment_method');
    expect(item).not.toHaveProperty('loyalty_points');
  });
});
