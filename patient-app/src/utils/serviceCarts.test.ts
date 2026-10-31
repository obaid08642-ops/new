import { cartRoute, cartTargetFor, diagnosticsCounts, diagnosticsGroups, type CartCounts } from './serviceCarts';

const counts = (c: Partial<CartCounts>): CartCounts => ({ pharmacy: 0, lab: 0, radiology: 0, ...c });

describe('one cart per service', () => {
  it('counts the diagnostics lines per service', () => {
    expect(diagnosticsCounts([{ kind: 'lab', qty: 2 }, { kind: 'radiology', qty: 1 }, { kind: 'lab' }])).toEqual({ lab: 3, radiology: 1 });
  });
  it('a service screen opens its own cart and shows only its own count', () => {
    expect(cartTargetFor('pharmacy', counts({ pharmacy: 2, lab: 5 }))).toEqual({ kind: 'cart', service: 'pharmacy', route: '/pharmacy/cart', count: 2 });
    expect(cartTargetFor('radiology', counts({ pharmacy: 2, lab: 5, radiology: 1 }))).toEqual({ kind: 'cart', service: 'radiology', route: '/diagnostics/cart', count: 1 });
  });
  it('Home and the screens of no service have no cart while every cart is empty', () => {
    expect(cartTargetFor(null, counts({}))).toEqual({ kind: 'none' });
  });
  it('Home with any non-empty cart offers the chooser: only the non-empty carts, each with its count, the badge is the total', () => {
    expect(cartTargetFor(null, counts({ pharmacy: 3, radiology: 1 }))).toEqual({
      kind: 'chooser', count: 4,
      carts: [{ service: 'pharmacy', count: 3, route: '/pharmacy/cart' }, { service: 'radiology', count: 1, route: '/diagnostics/cart' }],
    });
    expect(cartTargetFor(null, counts({ lab: 2 }))).toEqual({ kind: 'chooser', count: 2, carts: [{ service: 'lab', count: 2, route: '/diagnostics/cart' }] });
  });
  it('the routes', () => {
    expect(cartRoute('pharmacy')).toBe('/pharmacy/cart');
    expect(cartRoute('lab')).toBe('/diagnostics/cart');
  });
});

describe('labs and radiology tab: both carts in one sheet', () => {
  it('the badge counts lab tests and scans together and the target is a chooser of the non-empty groups', () => {
    expect(cartTargetFor('diagnostics', counts({ pharmacy: 9, lab: 2, radiology: 1 }))).toEqual({
      kind: 'chooser', count: 3,
      carts: [{ service: 'lab', count: 2, route: '/diagnostics/cart' }, { service: 'radiology', count: 1, route: '/diagnostics/cart' }],
    });
  });
  it('an empty group is left out and both empty opens the cart screen', () => {
    expect(cartTargetFor('diagnostics', counts({ radiology: 4 }))).toMatchObject({ kind: 'chooser', count: 4, carts: [{ service: 'radiology' }] });
    expect(cartTargetFor('diagnostics', counts({}))).toEqual({ kind: 'cart', service: 'lab', route: '/diagnostics/cart', count: 0 });
  });
  it('groups the lines Lab tests then Scans with count and provider, hiding empty ones', () => {
    const g = diagnosticsGroups([{ kind: 'radiology', name: 'MRI', provider: 'City Scan' }, { kind: 'lab', name: 'CBC', qty: 2 }, { kind: 'lab', name: 'TSH', provider: 'Al Noor' }]);
    expect(g.map((x) => [x.kind, x.count, x.provider])).toEqual([['lab', 3, 'Al Noor'], ['radiology', 1, 'City Scan']]);
    expect(diagnosticsGroups([{ kind: 'lab' }]).map((x) => x.kind)).toEqual(['lab']);
    expect(diagnosticsGroups([])).toEqual([]);
  });
});
