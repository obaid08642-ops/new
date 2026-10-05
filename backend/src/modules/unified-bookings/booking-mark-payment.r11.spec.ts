// R11 §5 lead 10: a provider could mark its own card booking "paid" (with any
// transaction id) through POST /booking/flow/payment/:type/:id/mark. Card
// payments are confirmed by the gateway only; a provider may record cash it
// collected on a cash/COD booking.
import { ForbiddenException } from '@nestjs/common';
import { BookingOpsService } from './booking-ops.module';

function service(booking: Record<string, unknown>) {
  const model = {
    findOne: jest.fn(() => ({ lean: jest.fn().mockResolvedValue(booking) })),
    updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 }),
  };
  const svc = new BookingOpsService(model as never, model as never, model as never, model as never, model as never, {} as never, {} as never);
  return { svc, model };
}
const lab = { id: 'lab-1', role: 'lab' };

describe('marking a booking paid (R11 §5)', () => {
  it('a provider cannot mark a card booking paid', async () => {
    const { svc, model } = service({ id: 'b1', provider_account_id: 'lab-1', payment_method: 'card' });
    await expect(svc.markPayment(lab, 'lab', 'b1', { status: 'paid', transaction_id: 'forged' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(model.updateOne).not.toHaveBeenCalled();
  });

  it('a provider records cash collected on a cash booking, without a transaction id', async () => {
    const { svc, model } = service({ id: 'b2', provider_account_id: 'lab-1', payment_method: 'cash' });
    await svc.markPayment(lab, 'lab', 'b2', { status: 'paid', transaction_id: 'forged' });
    const set = (model.updateOne.mock.calls[0] as unknown[])[1] as { $set: Record<string, unknown> };
    expect(set.$set).toEqual(expect.objectContaining({ payment_status: 'paid', transaction_id: null }));
  });

  it('an admin may still correct any payment status', async () => {
    const { svc, model } = service({ id: 'b3', payment_method: 'card' });
    await svc.markPayment({ id: 'adm', role: 'admin' }, 'lab', 'b3', { status: 'paid', transaction_id: 'tx-1' });
    expect(model.updateOne).toHaveBeenCalled();
  });

  it('a booking with no recorded payment method is not treated as cash (independent check)', async () => {
    const { svc, model } = service({ id: 'b4', provider_account_id: 'lab-1' });
    await expect(svc.markPayment(lab, 'lab', 'b4', { status: 'paid' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(model.updateOne).not.toHaveBeenCalled();
  });
});
