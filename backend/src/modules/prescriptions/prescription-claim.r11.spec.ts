// R11 §5 lead 10: any pharmacy could claim (and so read) any unassigned
// prescription a patient had uploaded. Only a pharmacy that received the
// patient's order carrying that prescription (broadcast recipient or the
// selected pharmacy) may claim it.
import { NotFoundException } from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service';

describe('claiming an unassigned prescription (R11 §5)', () => {
  function service(linked: { recipient?: string; selected?: string; allocations?: Array<{ pharmacy_account_id: string; status: string }> }) {
    const rx = { id: 'rx-1', state: 'UPLOADED_BY_PATIENT', pharmacy_id: undefined as string | undefined, save: jest.fn(), toObject: () => ({}) };
    const model = { findOne: jest.fn(async () => rx) };
    // Independent check: the selected pharmacy is recorded on its allocation
    // (pharmacy_allocations.pharmacy_account_id), not on the order, and a
    // prescription may sit on several orders.
    const orders = [{ id: 'order-0', prescription_id: 'rx-1' }, { id: 'order-1', prescription_id: 'rx-1' }];
    const match = (q: any, row: any) => q.order_id.$in.includes(row.order_id) && q.pharmacy_account_id.$eq === row.pharmacy_account_id;
    const collections: Record<string, any> = {
      pharmacy_orders: { find: jest.fn(() => ({ limit: () => ({ toArray: async () => orders }) })) },
      pharmacy_broadcast_recipients: { findOne: jest.fn(async (q: any) => (linked.recipient && match(q, { order_id: 'order-1', pharmacy_account_id: linked.recipient }) ? { order_id: 'order-1' } : null)) },
      pharmacy_allocations: {
        findOne: jest.fn(async (q: any) => (linked.allocations ?? (linked.selected ? [{ pharmacy_account_id: linked.selected, status: 'confirmed' }] : []))
          .map((a) => ({ order_id: 'order-1', ...a }))
          .find((a) => q.order_id.$in.includes(a.order_id) && !q.status.$nin.includes(a.status)
            && (!q.pharmacy_account_id || q.pharmacy_account_id.$eq === a.pharmacy_account_id)) ?? null),
      },
    };
    const providers = { db: { collection: (n: string) => collections[n] } };
    const svc = new PrescriptionsService(model as never, {} as never, { emit: jest.fn() } as never, {} as never, providers as never);
    jest.spyOn(svc, 'transition').mockResolvedValue({} as never);
    return { svc, rx };
  }

  it('a pharmacy with no link to the patient\'s order cannot claim it', async () => {
    const { svc, rx } = service({ recipient: 'pharm-A' });
    await expect(svc.verifyByPharmacist('rx-1', { id: 'pharm-stranger', role: 'pharmacy' })).rejects.toBeInstanceOf(NotFoundException);
    expect(rx.save).not.toHaveBeenCalled();
  });

  it('a broadcast recipient (or the selected pharmacy) can claim it', async () => {
    const a = service({ recipient: 'pharm-A' });
    await a.svc.verifyByPharmacist('rx-1', { id: 'pharm-A', role: 'pharmacy' });
    expect(a.rx.pharmacy_id).toBe('pharm-A');
    const b = service({ selected: 'pharm-B' });
    await b.svc.verifyByPharmacist('rx-1', { id: 'pharm-B', role: 'pharmacy' });
    expect(b.rx.pharmacy_id).toBe('pharm-B');
  });

  // Second review: an allocation that was rejected, cancelled or expired still
  // let that pharmacy claim, and a broadcast recipient could claim ahead of
  // the pharmacy the patient selected.
  it('a rejected, cancelled or expired allocation does not count', async () => {
    for (const status of ['rejected', 'cancelled', 'expired']) {
      const { svc } = service({ allocations: [{ pharmacy_account_id: 'pharm-B', status }] });
      await expect(svc.verifyByPharmacist('rx-1', { id: 'pharm-B', role: 'pharmacy' })).rejects.toBeInstanceOf(NotFoundException);
    }
  });

  it('once a pharmacy is selected, only it may claim (not the other broadcast recipients)', async () => {
    const { svc } = service({ recipient: 'pharm-A', allocations: [{ pharmacy_account_id: 'pharm-B', status: 'preparing' }] });
    await expect(svc.verifyByPharmacist('rx-1', { id: 'pharm-A', role: 'pharmacy' })).rejects.toBeInstanceOf(NotFoundException);
    const b = service({ recipient: 'pharm-A', allocations: [{ pharmacy_account_id: 'pharm-B', status: 'preparing' }] });
    await b.svc.verifyByPharmacist('rx-1', { id: 'pharm-B', role: 'pharmacy' });
    expect(b.rx.pharmacy_id).toBe('pharm-B');
  });

  // Fourth review: the pharmacy is matched in the query, so many live
  // allocations (a split order) never push the right one out of a page.
  it('the selected pharmacy is found among more than 50 live allocations', async () => {
    const many = Array.from({ length: 60 }, (_, k) => ({ pharmacy_account_id: `pharm-${k}`, status: 'preparing' }));
    const b = service({ allocations: [...many, { pharmacy_account_id: 'pharm-B', status: 'preparing' }] });
    await b.svc.verifyByPharmacist('rx-1', { id: 'pharm-B', role: 'pharmacy' });
    expect(b.rx.pharmacy_id).toBe('pharm-B');
  });
});
