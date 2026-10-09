import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReturnsService } from './returns.service';

/** P7: a pharmacy reads and answers the returns of its own orders only; the admin still decides the refund. */
describe('ReturnsService provider return detail and response (P7)', () => {
  const make = (row: any, owner: 'legacy' | 'alloc' | 'none') => {
    const updateOne = jest.fn(async () => ({}));
    const db = {
      collection: (name: string) => ({
        findOne: jest.fn(async () => ((name === 'orders' && owner === 'legacy') || (name === 'pharmacy_allocations' && owner === 'alloc') ? { _id: 1 } : null)),
      }),
    };
    const returnModel: any = { db, findOne: () => ({ lean: async () => row }), updateOne };
    const svc = new ReturnsService(returnModel, {} as any, {} as any);
    return { svc, updateOne };
  };
  const row = { id: 'r1', order_id: 'o1', patient_id: 'p1', status: 'processing', attached_docs: [] };

  it('the pharmacy that received the order reads the return (legacy order or governed allocation)', async () => {
    await expect(make(row, 'legacy').svc.providerReturnDetail('r1', 'ph1')).resolves.toMatchObject({ id: 'r1' });
    await expect(make(row, 'alloc').svc.providerReturnDetail('r1', 'ph1')).resolves.toMatchObject({ id: 'r1' });
  });

  it('another pharmacy gets 404', async () => {
    await expect(make(row, 'none').svc.providerReturnDetail('r1', 'ph2')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('the pharmacy records agree/dispute while the return is processing; never after the decision', async () => {
    const { svc, updateOne } = make(row, 'alloc');
    await expect(svc.providerRespond('r1', 'ph1', false, '  box was opened  ')).resolves.toMatchObject({ ok: true, pharmacy_response: { agree: false, note: 'box was opened', by: 'ph1' } });
    expect(updateOne).toHaveBeenCalledWith({ id: 'r1' }, { $set: { pharmacy_response: expect.objectContaining({ agree: false }) } });
    await expect(make({ ...row, status: 'approved' }, 'alloc').svc.providerRespond('r1', 'ph1', true)).rejects.toBeInstanceOf(BadRequestException);
    await expect(make(row, 'none').svc.providerRespond('r1', 'ph2', true)).rejects.toBeInstanceOf(NotFoundException);
  });
});
