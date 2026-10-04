// R11 §5 lead 4: verifyPayment overwrote any stored status with the gateway's
// answer, so re-verifying a refunded (or captured, or cancelled) transaction
// turned it back into "paid"/"pending" and could re-run the paid side effects.
// A settled transaction is returned as it is, without calling the gateway.
import { PaymentsService } from './payments.module';

describe('verifyPayment never rewrites a settled transaction (R11 §5 lead 4)', () => {
  for (const status of ['paid', 'refunded', 'partially_refunded', 'cancelled']) {
    it(`leaves a ${status} transaction alone`, async () => {
      const t: any = { id: 'tx1', patient_id: 'p1', status, gateway_intent_id: 'pay_1', booking_kind: 'consultation', booking_id: 'b1', save: jest.fn(), toObject() { return { id: this.id, status: this.status }; } };
      const svc: any = Object.create(PaymentsService.prototype);
      svc.txns = { findOne: jest.fn(async () => t) };
      svc.adapter = { verify: jest.fn(async () => ({ status: 'pending', raw: {} })) };
      svc.events = { emit: jest.fn() };
      const out = await svc.verifyPayment({ id: 'p1', role: 'patient' }, 'tx1');
      expect(out.status).toBe(status);
      expect(svc.adapter.verify).not.toHaveBeenCalled();
      expect(t.save).not.toHaveBeenCalled();
      expect(svc.events.emit).not.toHaveBeenCalled();
    });
  }
});
