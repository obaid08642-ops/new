// R11 §5 lead 10: any pharmacy could claim (and so read) any unassigned
// prescription a patient had uploaded. Only a pharmacy that received the
// patient's order carrying that prescription (broadcast recipient or the
// selected pharmacy) may claim it.
import { NotFoundException } from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service';

describe('claiming an unassigned prescription (R11 §5)', () => {
  function service(linked: { recipient?: string; selected?: string }) {
    const rx = { id: 'rx-1', state: 'UPLOADED_BY_PATIENT', pharmacy_id: undefined as string | undefined, save: jest.fn(), toObject: () => ({}) };
    const model = { findOne: jest.fn(async () => rx) };
    const collections: Record<string, { findOne: jest.Mock }> = {
      pharmacy_orders: { findOne: jest.fn(async () => ({ id: 'order-1', prescription_id: 'rx-1', selected_pharmacy_account_id: linked.selected })) },
      pharmacy_broadcast_recipients: { findOne: jest.fn(async (q: { pharmacy_account_id: { $eq: string } }) => (q.pharmacy_account_id.$eq === linked.recipient ? { order_id: 'order-1' } : null)) },
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
});
