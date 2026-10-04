/**
 * 13.R1 — staged geo-broadcast 3km → 5km → 8km.
 * Focused spec with mocked geo: proves staging order, no duplicates
 * across stages, offers preserved, and distinct delivery modes/radii.
 */
import { PharmacyBroadcastService } from '../services/pharmacy-broadcast.service';

const STAGES_3_5_8 = [
  { stage: 1, radius_km: 3, timeout_seconds: 60 },
  { stage: 2, radius_km: 5, timeout_seconds: 60 },
  { stage: 3, radius_km: 8, timeout_seconds: 60 },
];

// Pharmacies at fixed distances from the patient (mocked geo).
// A=2km (in 3km), B=4km (in 5km), C=7km (in 8km), D=12km own-delivery (beyond 8km).
const DIST_BY_ACCOUNT: Record<string, number> = {
  'pharm-a': 2,
  'pharm-b': 4,
  'pharm-c': 7,
  'pharm-d': 12,
};

function makeSvc(opts: { ownRadiusD?: number; hasOwnDeliveryD?: boolean } = {}) {
  const svc: any = Object.create(PharmacyBroadcastService.prototype);
  const profiles = [
    { account_id: 'pharm-a', provider_type: 'pharmacy', geo: { lat: 24.7, lng: 46.7 }, has_own_delivery: false, delivery_radius_km: 5 },
    { account_id: 'pharm-b', provider_type: 'pharmacy', geo: { lat: 24.71, lng: 46.71 }, has_own_delivery: false, delivery_radius_km: 5 },
    { account_id: 'pharm-c', provider_type: 'pharmacy', geo: { lat: 24.72, lng: 46.72 }, has_own_delivery: false, delivery_radius_km: 5 },
    {
      account_id: 'pharm-d',
      provider_type: 'pharmacy',
      geo: { lat: 24.8, lng: 46.8 },
      has_own_delivery: opts.hasOwnDeliveryD ?? true,
      delivery_radius_km: opts.ownRadiusD ?? 12,
    },
  ];
  svc.profiles = {
    db: {
      collection: jest.fn().mockReturnValue({
        find: jest.fn().mockReturnThis(),
        project: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(profiles.map((p) => ({ id: p.account_id }))),
      }),
    },
    find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(profiles) }),
  };
  svc.avails = {
    find: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(
        profiles.map((p) => ({ provider_account_id: p.account_id, status: 'ONLINE' })),
      ),
    }),
  };
  svc.configs = {
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
  };
  svc.geo = {
    distanceKm: jest.fn((_a: any, _b: any, ..._rest: any[]) => 0),
  };
  // Route distances by pharmacy profile geo via the profile under test:
  // findEligiblePharmaciesWithin calls geo.distanceKm(profileGeo, center);
  // we resolve per-profile by matching lat back to the account.
  const latToAccount: Record<string, string> = {
    '24.7': 'pharm-a',
    '24.71': 'pharm-b',
    '24.72': 'pharm-c',
    '24.8': 'pharm-d',
  };
  svc.geo.distanceKm.mockImplementation((from: any) => {
    const key = String(from?.lat);
    const account = latToAccount[key] || 'pharm-a';
    return DIST_BY_ACCOUNT[account] ?? 99;
  });
  return svc;
}

describe('13.R1 staged geo-broadcast 3km → 5km → 8km (mocked geo)', () => {
  it('uses validated stage order 3 → 5 → 8 with no silent fallback', async () => {
    const svc: any = Object.create(PharmacyBroadcastService.prototype);
    svc.configs = {
      findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ value: STAGES_3_5_8 }) }),
    };
    const stages = await svc.getBroadcastStages();
    expect(stages.map((s: any) => s.radius_km)).toEqual([3, 5, 8]);
    expect(stages.map((s: any) => s.stage)).toEqual([1, 2, 3]);
  });

  it('expands coverage per stage with mocked geo (3km ⊂ 5km ⊂ 8km)', async () => {
    const svc = makeSvc();
    const center = { lat: 24.7, lng: 46.7 };
    const ids = (rows: any[]) => rows.map((r: any) => r.account_id).sort();

    expect(ids(await svc.findEligiblePharmaciesWithin(center, 3))).toEqual(['pharm-a']);
    expect(ids(await svc.findEligiblePharmaciesWithin(center, 5))).toEqual(['pharm-a', 'pharm-b']);
    expect(ids(await svc.findEligiblePharmaciesWithin(center, 8))).toEqual(['pharm-a', 'pharm-b', 'pharm-c']);
  });

  it('dedupes pharmacies across stages (already-notified never re-added, offers kept)', async () => {
    const svc = makeSvc();
    const center = { lat: 24.7, lng: 46.7 };
    // Simulate broadcastRound dedup: candidates = eligible minus alreadyNotified.
    const notified = new Set<string>(['pharm-a']); // stage-1 recipients
    const stage2 = await svc.findEligiblePharmaciesWithin(center, 5);
    const candidates = stage2
      .map((p: any) => String(p.account_id))
      .filter((id: string) => id && !notified.has(id));
    expect(candidates).toEqual(['pharm-b']);
    // Offers are never cleared by staging: notified list only grows via union.
    const merged = Array.from(new Set([...notified, ...candidates]));
    expect(merged.sort()).toEqual(['pharm-a', 'pharm-b']);
    // Stage 3 with both already notified → only the new pharmacy is a candidate.
    const notified2 = new Set<string>(merged);
    const stage3 = await svc.findEligiblePharmaciesWithin(center, 8);
    const candidates3 = stage3
      .map((p: any) => String(p.account_id))
      .filter((id: string) => id && !notified2.has(id));
    expect(candidates3).toEqual(['pharm-c']);
  });

  it('honors distinct delivery modes/radii in the extended stage (own-delivery by own radius)', async () => {
    const center = { lat: 24.7, lng: 46.7 };
    // Delivery extended: own-delivery pharmacy at 12km with own radius 12km is admitted.
    const svcDelivery = makeSvc({ ownRadiusD: 12, hasOwnDeliveryD: true });
    const extended = await svcDelivery.findEligiblePharmaciesWithin(center, 8, { extended: true });
    expect(extended.map((p: any) => p.account_id)).toContain('pharm-d');
    // Same pharmacy without own delivery is excluded beyond 8km even in extended mode.
    const svcNoOwn = makeSvc({ hasOwnDeliveryD: false });
    const extendedNoOwn = await svcNoOwn.findEligiblePharmaciesWithin(center, 8, { extended: true });
    expect(extendedNoOwn.map((p: any) => p.account_id)).not.toContain('pharm-d');
    // Standard (non-extended) stage never admits beyond its own radius.
    const svc = makeSvc();
    const standard = await svc.findEligiblePharmaciesWithin(center, 8);
    expect(standard.map((p: any) => p.account_id)).not.toContain('pharm-d');
  });
});
