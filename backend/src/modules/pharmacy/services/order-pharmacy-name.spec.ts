/** #366/#375/#514: the order detail names the pharmacy filling it (display name only). */
import { PharmacyOrderService } from './pharmacy-order.service';

describe('order detail pharmacy name', () => {
  const svcWith = (allocs: any[], profiles: any[]) => {
    const svc: any = Object.create(PharmacyOrderService.prototype);
    svc.orders = { findOne: () => ({ lean: async () => ({ id: 'o1', patient_account_id: 'pat', status: 'confirmed' }) }) };
    svc.allocs = { find: () => ({ lean: async () => allocs }) };
    svc.conn = { collection: () => ({ find: (q: any) => ({ toArray: async () => profiles.filter((p) => q.account_id.$in.includes(p.account_id)) }) }) };
    return svc;
  };

  it('one pharmacy: the order and its allocation carry its names; nothing else from the profile', async () => {
    const out = await svcWith([{ id: 'a1', pharmacy_account_id: 'ph1', status: 'confirmed' }], [{ account_id: 'ph1', display_name_ar: 'صيدلية النور', display_name_en: 'Al Noor Pharmacy', phone: '+9665', iban: 'SA1' }])
      .detail({ id: 'pat', role: 'patient' }, 'o1');
    expect(out).toMatchObject({ pharmacy_name_ar: 'صيدلية النور', pharmacy_name_en: 'Al Noor Pharmacy' });
    expect(out.allocations_detail[0]).toMatchObject({ pharmacy_name_ar: 'صيدلية النور', pharmacy_name_en: 'Al Noor Pharmacy' });
    expect(JSON.stringify(out)).not.toMatch(/\+9665|SA1/);
  });

  it('a split order names each allocation and leaves the single name empty; a registered name fills in', async () => {
    const out = await svcWith(
      [{ id: 'a1', pharmacy_account_id: 'ph1' }, { id: 'a2', pharmacy_account_id: 'ph2' }],
      [{ account_id: 'ph1', business_name: 'Shifa' }, { account_id: 'ph2', name_ar: 'دواء' }],
    ).detail({ id: 'pat', role: 'patient' }, 'o1');
    expect(out.pharmacy_name_ar).toBeNull();
    expect(out.allocations_detail.map((a: any) => a.pharmacy_name_en)).toEqual(['Shifa', 'دواء']);
  });
});
