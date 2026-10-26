import { cartRoute, cartTargetFor, diagnosticsCounts, type CartCounts } from './serviceCarts';

const counts = (c: Partial<CartCounts>): CartCounts => ({ pharmacy: 0, lab: 0, radiology: 0, ...c });

describe('one cart per service', () => {
  it('counts the diagnostics lines per service', () => {
    expect(diagnosticsCounts([{ kind: 'lab', qty: 2 }, { kind: 'radiology', qty: 1 }, { kind: 'lab' }])).toEqual({ lab: 3, radiology: 1 });
  });
  it('a service screen opens its own cart and shows only its own count', () => {
    expect(cartTargetFor('pharmacy', counts({ pharmacy: 2, lab: 5 }))).toEqual({ kind: 'cart', service: 'pharmacy', route: '/pharmacy/cart', count: 2 });
    expect(cartTargetFor('radiology', counts({ pharmacy: 2, lab: 5, radiology: 1 }))).toEqual({ kind: 'cart', service: 'radiology', route: '/diagnostics/cart', count: 1 });
  });
  it('Home with two non-empty carts offers the chooser with each count and the total', () => {
    const t = cartTargetFor(null, counts({ pharmacy: 3, radiology: 1 }));
    expect(t).toEqual({
      kind: 'chooser', count: 4,
      carts: [{ service: 'pharmacy', count: 3, route: '/pharmacy/cart' }, { service: 'radiology', count: 1, route: '/diagnostics/cart' }],
    });
  });
  it('Home with one non-empty cart opens it, with none the pharmacy cart', () => {
    expect(cartTargetFor(null, counts({ lab: 2 }))).toEqual({ kind: 'cart', service: 'lab', route: '/diagnostics/cart', count: 2 });
    expect(cartTargetFor(null, counts({}))).toEqual({ kind: 'cart', service: 'pharmacy', route: '/pharmacy/cart', count: 0 });
  });
  it('the routes', () => {
    expect(cartRoute('pharmacy')).toBe('/pharmacy/cart');
    expect(cartRoute('lab')).toBe('/diagnostics/cart');
  });
});
