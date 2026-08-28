/**
 * Master-spec pharmacy journey tests (broadcast DTO + staged eligibility + extended stage).
 */
import { PharmacyBroadcastService } from './pharmacy-broadcast.service';

describe('Pharmacy journey — master spec', () => {
  const geo = { distanceKm: (a: any) => a.lat }; // test trick: distance encoded in lat

  const makeProfiles = (profiles: any[], accounts?: any[]) => ({
    find: () => ({ lean: async () => profiles }),
    db: {
      collection: () => ({
        find: () => ({ project: () => ({ toArray: async () => accounts ?? profiles.map((p) => ({ id: p.account_id })) }) }),
      }),
    },
  });
  const availsOf = (ids: string[]) => ({ find: () => ({ lean: async () => ids.map((id) => ({ provider_account_id: id, status: 'accepting_orders' })) }) });
  const configs = { findOne: () => ({ lean: async () => null }) };

  const svc = (profiles: any[], availIds?: string[]) =>
    new (PharmacyBroadcastService as any)(
      {}, {}, {}, {}, makeProfiles(profiles), availsOf(availIds ?? profiles.map((p) => p.account_id)),
      configs, {}, {}, geo, {}, {}, {}, {}, {}, {},
    );

  const order = {
    id: 'o1',
    payment_method: 'insurance',
    insurance_details: { company_name_ar: 'التأمين', company_name_en: 'InsCo', category: 'A', policy_number: 'P-1' },
    delivery: { method: 'delivery' },
    delivery_address: { geo: { lat: 3.2, lng: 0 }, district: 'حي النرجس', city: 'الرياض', street: '123 Secret St', phone: '+966500000000' },
    prescription_attachments: [
      { type: 'image', uri: 'https://cdn/rx1.jpg' },
      { type: 'pdf', uri: 'https://cdn/rx2.pdf' },
      { type: 'voice', uri: 'https://cdn/note.m4a' },
    ],
    items: [{ id: 'i1', name_ar: 'بانادول', qty: 2 }],
  };

  it('broadcast DTO shows insurance company/category, image+pdf attachments, approx distance (0.5km rounding) and area', () => {
    const s = svc([]);
    const dto = s.providerBroadcastDto({ id: 'b1', order_id: 'o1', current_round: 1, current_radius_km: 3, lock_state: 'open' }, order, { geo: { lat: 3.2, lng: 0 } });
    expect(dto.insurance).toEqual({ company_name_ar: 'التأمين', company_name_en: 'InsCo', category: 'A' });
    expect(dto.attachments).toEqual([
      { type: 'image', uri: 'https://cdn/rx1.jpg' },
      { type: 'pdf', uri: 'https://cdn/rx2.pdf' },
    ]);
    expect(dto.approx_distance_km).toBe(3); // 3.2 rounds to 3.0 on 0.5 grid
    expect(dto.approx_area).toBe('حي النرجس');
    expect(dto.items[0].name_ar).toBe('بانادول');
  });

  it('broadcast DTO never exposes patient phone or exact street address', () => {
    const s = svc([]);
    const dto = s.providerBroadcastDto({ id: 'b1', order_id: 'o1', current_round: 1, lock_state: 'open' }, order, { geo: { lat: 1, lng: 0 } });
    const json = JSON.stringify(dto);
    expect(json).not.toContain('+966500000000');
    expect(json).not.toContain('Secret St');
    expect(dto.delivery_address).toBeUndefined();
  });

  it('standard stage excludes an own-delivery pharmacy beyond the stage radius', async () => {
    const s = svc([
      { account_id: 'near', geo: { lat: 5, lng: 0 } },
      { account_id: 'far-own', geo: { lat: 12, lng: 0 }, has_own_delivery: true, delivery_radius_km: 20 },
    ]);
    const out = await s.findEligiblePharmaciesWithin({ lat: 0, lng: 0 }, 8, { extended: false });
    expect(out.map((p: any) => p.account_id)).toEqual(['near']);
  });

  it('extended stage admits own-delivery pharmacies by their own radius only', async () => {
    const s = svc([
      { account_id: 'r20', geo: { lat: 15, lng: 0 }, has_own_delivery: true, delivery_radius_km: 20 },
      { account_id: 'r10', geo: { lat: 15, lng: 0 }, has_own_delivery: true, delivery_radius_km: 10 },
      { account_id: 'noown', geo: { lat: 15, lng: 0 } },
    ]);
    const out = await s.findEligiblePharmaciesWithin({ lat: 0, lng: 0 }, 8, { extended: true });
    expect(out.map((p: any) => p.account_id)).toEqual(['r20']);
  });

  it('extended self-pickup stage covers 15km radius (14km in, 16km out)', async () => {
    const s = svc([
      { account_id: 'in14', geo: { lat: 14, lng: 0 } },
      { account_id: 'out16', geo: { lat: 16, lng: 0 } },
    ]);
    const out = await s.findEligiblePharmaciesWithin({ lat: 0, lng: 0 }, 15, { extended: true });
    expect(out.map((p: any) => p.account_id)).toEqual(['in14']);
  });
});
