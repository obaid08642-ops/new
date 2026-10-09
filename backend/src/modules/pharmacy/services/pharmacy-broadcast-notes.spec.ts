import { PharmacyBroadcastService } from './pharmacy-broadcast.service';

// Needs-review issue 541: the pharmacy pricing a request sees the patient's notes.
describe('PharmacyBroadcastService provider DTO notes', () => {
  it('carries the order note and each line note', async () => {
    const service = Object.create(PharmacyBroadcastService.prototype) as PharmacyBroadcastService;
    const order = { payment_method: 'cash', patient_notes: 'بدون سكر إن أمكن', items: [{ id: 'i1', raw_name: 'Panadol', qty: 1, notes: 'العلبة الكبيرة' }, { id: 'i2', raw_name: 'Brufen', qty: 2 }] };
    const dto: any = await (service as any).providerBroadcastDto({ id: 'b1', order_id: 'o1' }, order);
    expect(dto.patient_notes).toBe('بدون سكر إن أمكن');
    expect(dto.items.map((i: any) => i.notes)).toEqual(['العلبة الكبيرة', null]);
  });
});

// Needs-review issue 1134: the radar knows which orders this pharmacy already answered.
describe('PharmacyBroadcastService.listForPharmacy my_offer_status', () => {
  it('marks a sent offer as submitted and an unanswered order as null', async () => {
    const service = Object.create(PharmacyBroadcastService.prototype) as any;
    service.assertActiveNotifiedPharmacy = jest.fn().mockResolvedValue({});
    service.viewerProfile = jest.fn().mockResolvedValue(null);
    service.broadcasts = { find: () => ({ sort: () => ({ lean: async () => [{ id: 'b1', order_id: 'o1' }, { id: 'b2', order_id: 'o2' }] }) }) };
    service.orders = { find: () => ({ lean: async () => [{ id: 'o1', items: [] }, { id: 'o2', items: [] }] }) };
    service.profiles = { db: { collection: () => ({ find: () => ({ toArray: async () => [{ order_id: 'o1', status: 'draft' }, { order_id: 'o1', status: 'submitted' }] }) }) } };
    const out = await service.listForPharmacy({ id: 'ph-1' });
    expect(out.map((b: any) => [b.order_id, b.my_offer_status])).toEqual([['o1', 'submitted'], ['o2', null]]);
  });
});
