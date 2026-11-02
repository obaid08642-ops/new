import { BadRequestException } from '@nestjs/common';
import { deliveryTerms, normalizeOwnDelivery, ownDeliveryOf, ownZoneCovers, legacyFields, PharmacyDeliveryService } from './pharmacy-delivery';
import { PharmacyBroadcastService } from './services/pharmacy-broadcast.service';

const radius = (over: Record<string, unknown> = {}) => normalizeOwnDelivery({ enabled: true, zone_type: 'radius', radius_km: 6, fee_sar: 8, ...over });
const districts = (codes: string[]) => normalizeOwnDelivery({ enabled: true, zone_type: 'districts', district_codes: codes, fee_sar: 0 });

describe('normalizeOwnDelivery', () => {
  it('"no" drops the zone, the fee and the threshold', () => {
    expect(normalizeOwnDelivery({ enabled: false, radius_km: 9, fee_sar: 5 })).toEqual({ enabled: false, zone_type: 'radius', radius_km: null, district_codes: [], fee_sar: 0, free_over_sar: null });
    expect(normalizeOwnDelivery(undefined).enabled).toBe(false);
  });
  it('"yes" with a radius needs the radius; a fee of 0 is allowed; the threshold is optional', () => {
    expect(radius({ fee_sar: 0 })).toEqual({ enabled: true, zone_type: 'radius', radius_km: 6, district_codes: [], fee_sar: 0, free_over_sar: null });
    expect(radius({ free_over_sar: 150 }).free_over_sar).toBe(150);
    expect(() => normalizeOwnDelivery({ enabled: true, zone_type: 'radius' })).toThrow(new BadRequestException('own_delivery_radius_required'));
    expect(() => radius({ radius_km: 0 })).toThrow('own_delivery_radius_required');
    expect(() => radius({ radius_km: 101 })).toThrow('own_delivery_radius_required');
  });
  it('"yes" with districts needs at least one, removes duplicates and blanks', () => {
    expect(districts(['d1', ' d1 ', '', 'd2']).district_codes).toEqual(['d1', 'd2']);
    expect(() => districts([])).toThrow('own_delivery_districts_required');
  });
  it('refuses a negative or absurd fee and threshold', () => {
    expect(() => radius({ fee_sar: -1 })).toThrow('own_delivery_fee_invalid');
    expect(() => radius({ fee_sar: 501 })).toThrow('own_delivery_fee_invalid');
    expect(() => radius({ free_over_sar: -5 })).toThrow('own_delivery_free_over_invalid');
  });
});

describe('ownZoneCovers', () => {
  const pharmacy = { lat: 24.7136, lng: 46.6753 };
  it('a radius covers a point inside and not one outside', () => {
    const od = radius({ radius_km: 5 });
    expect(ownZoneCovers(od, pharmacy, { lat: 24.7236, lng: 46.6853 }, null)).toBe(true);   // about 1.5 km
    expect(ownZoneCovers(od, pharmacy, { lat: 24.9, lng: 46.9 }, null)).toBe(false);          // about 30 km
  });
  it('a radius never covers an order or a pharmacy without a location', () => {
    expect(ownZoneCovers(radius(), pharmacy, undefined, null)).toBe(false);
    expect(ownZoneCovers(radius(), {}, { lat: 1, lng: 1 }, null)).toBe(false);
  });
  it('districts match the order district code, ignoring case, and nothing else', () => {
    const od = districts(['RUH-OLAYA']);
    expect(ownZoneCovers(od, pharmacy, { lat: 0, lng: 0 }, 'ruh-olaya')).toBe(true);
    expect(ownZoneCovers(od, pharmacy, pharmacy, 'RUH-MALAZ')).toBe(false);
    expect(ownZoneCovers(od, pharmacy, pharmacy, undefined)).toBe(false);
  });
});

describe('deliveryTerms', () => {
  it('a pharmacy without own couriers: the platform delivers at the platform fee', () => {
    expect(deliveryTerms({}, 100, false, 12)).toEqual({ mode: 'platform', fee: 12, source: 'platform_pricing_config' });
    expect(deliveryTerms(null, 100, false, 0)).toEqual({ mode: 'platform', fee: 0, source: 'no_active_server_delivery_policy' });
  });
  it('own couriers: the pharmacy fee, 0 allowed, free at or above the threshold', () => {
    const p = { own_delivery: radius({ fee_sar: 9, free_over_sar: 100 }) };
    expect(deliveryTerms(p, 50, false, 12)).toEqual({ mode: 'pharmacy_own', fee: 9, source: 'pharmacy_own' });
    expect(deliveryTerms(p, 100, false, 12)).toEqual({ mode: 'pharmacy_own', fee: 0, source: 'pharmacy_own_free_over' });
    expect(deliveryTerms({ own_delivery: radius({ fee_sar: 0 }) }, 10, false, 12).fee).toBe(0);
  });
  it('pickup has no delivery mode', () => {
    expect(deliveryTerms({ own_delivery: radius() }, 50, true, 12)).toEqual({ mode: null, fee: 0, source: 'pickup' });
    expect(deliveryTerms({}, 50, true, 12).mode).toBeNull();
  });
  it('a disabled config is no own delivery', () => {
    expect(ownDeliveryOf({ own_delivery: normalizeOwnDelivery({ enabled: false }) })).toBeNull();
  });
});

describe('legacyFields', () => {
  it('keeps the older fields in step', () => {
    expect(legacyFields(radius({ radius_km: 7, fee_sar: 4 }))).toMatchObject({ has_own_delivery: true, has_own_drivers: true, delivery_mode: 'self_delivery', delivery_fee: 4, delivery_radius_km: 7, max_delivery_radius_km: 7 });
    expect(legacyFields(normalizeOwnDelivery({ enabled: false }))).toEqual({ has_own_delivery: false, has_own_drivers: false, delivery_mode: 'external_delivery_required' });
  });
});

describe('PharmacyDeliveryService', () => {
  function svc(matched = 1, doc: any = null) {
    const updateOne = jest.fn().mockResolvedValue({ matchedCount: matched });
    const findOne = jest.fn().mockResolvedValue(doc);
    const conn: any = { collection: jest.fn(() => ({ updateOne, findOne, insertOne: jest.fn().mockResolvedValue({}) })) };
    return { s: new PharmacyDeliveryService(conn), updateOne, findOne };
  }
  it('saves the config and the older fields on the pharmacy profile only', async () => {
    const { s, updateOne } = svc();
    const r = await s.set('ph-1', { enabled: true, zone_type: 'radius', radius_km: 4, fee_sar: 6 }, { id: 'ph-1', role: 'pharmacy' });
    expect(r.own_delivery.fee_sar).toBe(6);
    const [filter, update] = updateOne.mock.calls[0];
    expect(filter).toEqual({ account_id: { $eq: 'ph-1' }, provider_type: 'pharmacy' });
    expect(update.$set).toMatchObject({ own_delivery: { enabled: true, radius_km: 4 }, has_own_delivery: true, delivery_fee: 6 });
  });
  it('switching off removes the free threshold and 404s for a profile that is not a pharmacy', async () => {
    const off = svc();
    await off.s.set('ph-1', { enabled: false }, { id: 'a', role: 'admin' });
    expect(off.updateOne.mock.calls[0][1].$unset).toEqual({ free_delivery_above: '' });
    await expect(svc(0).s.set('x', { enabled: false }, {})).rejects.toThrow('pharmacy_profile_not_found');
    await expect(svc(1, null).s.get('x')).rejects.toThrow('pharmacy_profile_not_found');
  });
  it('get returns a disabled config when nothing was saved', async () => {
    expect((await svc(1, {}).s.get('ph-1')).own_delivery.enabled).toBe(false);
  });
});

describe('broadcast recipients with own couriers', () => {
  const center = { lat: 24.7136, lng: 46.6753 };
  function broadcast(profiles: any[]) {
    const svc: any = Object.create(PharmacyBroadcastService.prototype);
    svc.profiles = { db: { collection: jest.fn().mockReturnValue({ find: jest.fn().mockReturnThis(), project: jest.fn().mockReturnThis(), toArray: jest.fn().mockResolvedValue(profiles.map((p) => ({ id: p.account_id }))) }) }, find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(profiles) }) };
    svc.avails = { find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(profiles.map((p) => ({ provider_account_id: p.account_id, status: 'ONLINE' }))) }) };
    svc.configs = { findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) };
    svc.geo = { distanceKm: (a: any, b: any) => Math.hypot(a.lat - b.lat, a.lng - b.lng) * 111 };
    return svc;
  }
  const near = { account_id: 'plain-near', geo: { lat: 24.72, lng: 46.68 } };
  const ownInside = { account_id: 'own-in', geo: { lat: 24.75, lng: 46.7 }, own_delivery: radius({ radius_km: 10 }) };
  const ownOutside = { account_id: 'own-out', geo: { lat: 24.75, lng: 46.7 }, own_delivery: radius({ radius_km: 2 }) };

  it('a pharmacy with own couriers gets the order only inside its zone, whatever the broadcast radius; others keep the distance rule', async () => {
    const ids = (await broadcast([near, ownInside, ownOutside]).findEligiblePharmaciesWithin(center, 3, {})).map((p: any) => p.account_id);
    expect(ids).toEqual(['plain-near', 'own-in']);
  });
  it('a district zone matches the order district', async () => {
    const dz = { account_id: 'own-dz', geo: { lat: 24.9, lng: 46.9 }, own_delivery: districts(['olaya']) };
    expect((await broadcast([dz]).findEligiblePharmaciesWithin(center, 3, { district: 'OLAYA' })).map((p: any) => p.account_id)).toEqual(['own-dz']);
    expect(await broadcast([dz]).findEligiblePharmaciesWithin(center, 3, { district: 'malaz' })).toEqual([]);
  });
  it('a pickup order ignores the delivery zone and follows the distance rule', async () => {
    const ids = (await broadcast([ownOutside]).findEligiblePharmaciesWithin(center, 6, { pickup: true })).map((p: any) => p.account_id);
    expect(ids).toEqual(['own-out']);   // about 4.6 km away, inside the 6 km pickup radius though outside its own 2 km zone
  });
});
