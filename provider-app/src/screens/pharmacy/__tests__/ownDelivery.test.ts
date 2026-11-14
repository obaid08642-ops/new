import { EMPTY_OWN_DELIVERY, ownDeliveryError, ownDeliveryFromServer, ownDeliveryPayload } from '../ownDelivery';

const on = (o: Partial<typeof EMPTY_OWN_DELIVERY> = {}) => ({ ...EMPTY_OWN_DELIVERY, enabled: true, radius: '6', ...o });

describe('pharmacy own couriers form', () => {
  it('"no" sends only enabled:false and is always valid', () => {
    expect(ownDeliveryPayload(EMPTY_OWN_DELIVERY)).toEqual({ enabled: false });
    expect(ownDeliveryError({ ...EMPTY_OWN_DELIVERY, radius: 'x' })).toBeNull();
  });
  it('a radius zone sends radius, fee (0 allowed) and an empty threshold as null', () => {
    expect(ownDeliveryPayload(on({ fee: '0' }))).toEqual({ enabled: true, zone_type: 'radius', radius_km: 6, fee_sar: 0, free_over_sar: null });
    expect(ownDeliveryPayload(on({ fee: '7.5', freeOver: '120' }))).toMatchObject({ fee_sar: 7.5, free_over_sar: 120 });
  });
  it('a district zone sends the codes and no radius', () => {
    expect(ownDeliveryPayload(on({ zoneType: 'districts', districts: ['d1', 'd2'] }))).toEqual({ enabled: true, zone_type: 'districts', district_codes: ['d1', 'd2'], fee_sar: 0, free_over_sar: null });
  });
  it('names the first problem', () => {
    expect(ownDeliveryError(on({ radius: '' }))).toBe('pharmacy.ownDelivery.errRadius');
    expect(ownDeliveryError(on({ radius: '101' }))).toBe('pharmacy.ownDelivery.errRadius');
    expect(ownDeliveryError(on({ zoneType: 'districts' }))).toBe('pharmacy.ownDelivery.errDistricts');
    expect(ownDeliveryError(on({ fee: '-1' }))).toBe('pharmacy.ownDelivery.errFee');
    expect(ownDeliveryError(on({ freeOver: 'abc' }))).toBe('pharmacy.ownDelivery.errFreeOver');
    expect(ownDeliveryError(on())).toBeNull();
  });
  it('reads the saved config back without inventing defaults', () => {
    expect(ownDeliveryFromServer(undefined)).toEqual(EMPTY_OWN_DELIVERY);
    expect(ownDeliveryFromServer({ enabled: true, zone_type: 'districts', district_codes: ['a'], fee_sar: 0, free_over_sar: null }))
      .toEqual({ enabled: true, zoneType: 'districts', radius: '', districts: ['a'], fee: '0', freeOver: '' });
  });
});
