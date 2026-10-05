// ACCEPTANCE — Q86 + Q104 + Q99 (REVIEW_REAUDIT Round 12 Phase A #3). Written by
// the reviewer before the fix; the implementing agent makes it pass and may not
// edit it. One payment path (Moyasar, POST /payments/intent/:type/:id) and ONE
// Moyasar webhook receiver, POST /payments/webhook/moyasar, that authenticates
// Moyasar's `secret_token` (body) against MOYASAR_WEBHOOK_SECRET in every
// environment, staging included, and takes the payment status from the gateway.
// Q104 follow-up: patient-web's payment result page (Moyasar redirects there
// with ?id=<payment id>) calls GET /payments/status/:ref, which did not exist,
// so every returning patient saw "processing" and a card payment only reached
// the booking when a webhook arrived. The route now reconciles the caller's
// own transaction with the gateway (F60) and returns its status.
import 'reflect-metadata';
import { NotFoundException } from '@nestjs/common';
import { PaymentsController, PaymentsService } from '../../src/modules/payments/payments.module';

describe('GET /payments/status/:ref (Q104)', () => {
  let svc: any;
  let txn: any;
  beforeEach(() => {
    txn = { id: 'tx1', patient_id: 'p1', status: 'pending', gateway_intent_id: 'pay_1', booking_kind: 'consultation', booking_id: 'b1', amount: 150 };
    svc = Object.create(PaymentsService.prototype);
    svc.txns = { findOne: jest.fn(() => ({ lean: async () => txn })) };
    svc.verifyPayment = jest.fn(async () => ({ ...txn, status: 'paid' }));
  });

  it('the route exists on the payments controller', () => {
    expect(Reflect.getMetadata('path', (PaymentsController.prototype as any).status)).toBe('status/:ref');
  });

  it('a pending transaction is reconciled with the gateway before answering', async () => {
    const out = await svc.paymentStatus({ id: 'p1', role: 'patient' }, 'pay_1');
    expect(svc.verifyPayment).toHaveBeenCalledWith({ id: 'p1', role: 'patient' }, 'tx1');
    expect(out).toEqual({ status: 'paid', transaction_id: 'tx1', booking_kind: 'consultation', booking_id: 'b1', amount: 150 });
  });

  it('a settled transaction is answered without calling the gateway', async () => {
    txn.status = 'refunded';
    const out = await svc.paymentStatus({ id: 'p1', role: 'patient' }, 'tx1');
    expect(svc.verifyPayment).not.toHaveBeenCalled();
    expect(out.status).toBe('refunded');
  });

  it('another patient\'s payment reads as not found', async () => {
    await expect(svc.paymentStatus({ id: 'p2', role: 'patient' }, 'pay_1')).rejects.toBeInstanceOf(NotFoundException);
    expect(svc.verifyPayment).not.toHaveBeenCalled();
  });
});
