import { BadRequestException } from '@nestjs/common';
import { PharmacyOrderService } from './pharmacy-order.service';
import { PharmacyOrderState } from '../schemas/pharmacy.schema';

// Owner decision 2026-11-10: everything back until the pharmacy starts preparing; after that only a wrong / damaged / expired item (a return with a photo and an admin review).
function make() {
  const svc: any = Object.create(PharmacyOrderService.prototype);
  svc.engine = { transition: jest.fn(async () => ({ ok: true })) };
  return svc;
}
const order = (status: string) => ({ id: 'o1', status, patient_account_id: 'p1', timeline: [], save: jest.fn() });

describe('a patient cancelling a pharmacy order', () => {
  it('is refused once the pharmacy is preparing it or it is out for delivery; nothing moves', async () => {
    for (const status of [PharmacyOrderState.IN_FULFILLMENT, PharmacyOrderState.OUT_FOR_DELIVERY]) {
      const svc = make();
      await expect(svc.cancelOrder(order(status), { id: 'p1', role: 'patient' }, 'changed my mind')).rejects.toThrow(new BadRequestException('cancel_not_allowed_after_preparation'));
      expect(svc.engine.transition).not.toHaveBeenCalled();
    }
  });
  it('still works before the preparation starts (paid and confirmed, awaiting payment, broadcasting)', async () => {
    for (const status of [PharmacyOrderState.CONFIRMED, PharmacyOrderState.CASH_CARD_PAYMENT_PENDING, PharmacyOrderState.BROADCASTING]) {
      const svc = make();
      await svc.cancelOrder(order(status), { id: 'p1', role: 'patient' }, 'changed my mind');
      expect(svc.engine.transition).toHaveBeenCalledTimes(1);
    }
  });
  it('an admin can still cancel at any stage before delivery (the refund is the full total)', async () => {
    const svc = make();
    await svc.cancelOrder(order(PharmacyOrderState.OUT_FOR_DELIVERY), { id: 'adm', role: 'admin' }, 'pharmacy could not deliver');
    expect(svc.engine.transition).toHaveBeenCalledTimes(1);
  });
  it('a delivered or completed order cannot be cancelled by anyone (as before)', async () => {
    const svc = make();
    await expect(svc.cancelOrder(order(PharmacyOrderState.DELIVERED), { id: 'adm', role: 'admin' }, 'x')).rejects.toThrow('cannot_cancel_in_delivered');
  });
});
