jest.mock('../../../context', () => ({
  useTheme: () => ({ theme: new Proxy({}, { get: () => 'transparent' }) }),
  useLang: () => ({ lang: 'en', isRTL: false, t: (k: string) => k }),
  useAuth: () => ({ user: { isOnline: false } }),
  useToast: () => ({ show: jest.fn() }),
}));
jest.mock('../../../api/client', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

import { PHARMACY_MENU, buildSetupItems } from '../PharmacyMore';

describe('Pharmacy More menu (P1)', () => {
  it('has no duplicate routes and covers the owner-listed screens', () => {
    const routes = PHARMACY_MENU.flatMap(s => s.rows.map(r => r.route));
    expect(new Set(routes).size).toBe(routes.length);
    for (const r of ['product_catalog', 'wallet', 'withdrawal_workflow', 'order_history', 'reviews', 'working_hours',
      'notifications', 'support', 'insurance_config', 'certificates_config', 'scanner', 'shortage']) {
      expect(routes).toContain(r);
    }
  });
});

describe('Pharmacy first-login checklist (P9)', () => {
  const base = { hours: undefined, profile: undefined, progress: undefined, stockCount: undefined, bank: undefined, isOnline: false };

  it('never reports an unreachable check as done', () => {
    const items = buildSetupItems(base);
    expect(items.map(i => i.done)).toEqual([null, null, null, null, false]);
  });

  it('marks each step from the server data', () => {
    const items = buildSetupItems({
      hours: { sun: { open: '09:00', close: '22:00' } },
      profile: { delivery_fee: 12, max_delivery_radius_km: 8 },
      progress: {},
      stockCount: 3,
      bank: { iban: 'SA0000000000000000000000' },
      isOnline: true,
    });
    expect(items.every(i => i.done === true)).toBe(true);
  });

  it('treats empty hours, zero stock, missing iban and missing radius as not done', () => {
    const items = buildSetupItems({
      hours: null, profile: { delivery_fee: 0 }, progress: {}, stockCount: 0, bank: {}, isOnline: false,
    });
    expect(items.map(i => i.done)).toEqual([false, false, false, false, false]);
  });

  it('falls back to the onboarding progress record for fee and radius', () => {
    const items = buildSetupItems({ ...base, profile: {}, progress: { delivery_fee: 15, coverage_radius_km: 10 } });
    expect(items.find(i => i.key === 'delivery')?.done).toBe(true);
  });
});
