import { PaymentsService } from './payments.module';
import { BadGatewayException } from '@nestjs/common';

/** E5-F2 regression: payment listing/verify must enforce ownership (IDOR). */
describe('PaymentsService ownership guards (E5-F2)', () => {
  let svc: any;
  let txns: any;
  let orders: any;

  beforeEach(() => {
    txns = {
      find: jest.fn(() => ({ sort: () => ({ lean: async () => [{ id: 'tx1' }] }) })),
      findOne: jest.fn(async (q: any) => ({ id: q.id, patient_id: 'patient-1', gateway_intent_id: 'pi_1' })),
    };
    orders = { findOne: jest.fn(() => ({ lean: async () => ({ id: 'b1', patient_id: 'patient-1' }) })) };
    svc = Object.create(PaymentsService.prototype);
    svc.txns = txns;
    svc.events = { emit: jest.fn() };
    svc.realtime = { emitToUser: jest.fn() };
    svc.fraud = { detectDuplicatePayments: jest.fn(), checkPaymentVelocity: jest.fn() };
    svc.adapter = { verify: jest.fn(async () => ({ status: 'failed', raw: {} })), name: 'moyasar' };
    svc.logger = { error: jest.fn() };
    svc.modelFor = jest.fn(() => orders);
  });

  it('listForBooking rejects a non-owner patient (IDOR closed)', async () => {
    await expect(svc.listForBooking({ id: 'attacker', role: 'patient' }, 'order', 'b1'))
      .rejects.toThrow('not_authorized');
  });

  it('listForBooking allows the owner', async () => {
    const res = await svc.listForBooking({ id: 'patient-1', role: 'patient' }, 'order', 'b1');
    expect(res).toEqual([{ id: 'tx1' }]);
  });

  it('listForBooking allows staff roles', async () => {
    const res = await svc.listForBooking({ id: 'admin-1', role: 'admin' }, 'order', 'b1');
    expect(res).toEqual([{ id: 'tx1' }]);
  });

  it('verifyPayment rejects a non-owner patient', async () => {
    await expect(svc.verifyPayment({ id: 'attacker', role: 'patient' }, 'tx1'))
      .rejects.toThrow('not_authorized');
    expect(svc.adapter.verify).not.toHaveBeenCalled();
  });

  it('refundPayment rejects non-admin roles (admin-only refunds)', async () => {
    await expect(svc.refundPayment({ id: 'prov-1', role: 'provider' }, 'tx1'))
      .rejects.toThrow('not_authorized');
    await expect(svc.refundPayment({ id: 'ph-1', role: 'pharmacy' }, 'tx1'))
      .rejects.toThrow('not_authorized');
  });

  it('maps gateway intent failures to a safe 502 without exposing PSP text', async () => {
    svc.modelFor = jest.fn(() => ({
      findOne: jest.fn(() => ({ lean: async () => ({ id: 'b1', patient_id: 'patient-1', total: 12, payment_status: 'pending', payment_method: 'card' }) })),
    }));
    svc.txns.findOne = jest.fn(() => ({ lean: async () => null }));
    svc.adapter.createIntent = jest.fn(async () => { throw new Error('Entity not activated to use live account'); });

    const error = await svc.createPaymentIntent({ id: 'patient-1', role: 'patient' }, 'pharmacy', 'b1')
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BadGatewayException);
    expect(error.getStatus()).toBe(502);
    expect(error.getResponse()).toEqual({
      code: 'payment_gateway_unavailable',
      message: 'الدفع غير متاح حالياً',
    });
    expect(JSON.stringify(error.getResponse())).not.toContain('Entity not activated');
    expect(svc.logger.error).toHaveBeenCalledWith(expect.stringContaining('Entity not activated'));
  });
});
