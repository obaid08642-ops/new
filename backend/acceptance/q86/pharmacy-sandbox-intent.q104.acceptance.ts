// ACCEPTANCE — Q86 + Q104 + Q99 (REVIEW_REAUDIT Round 12 Phase A #3). Written by
// the reviewer before the fix; the implementing agent makes it pass and may not
// edit it. One payment path (Moyasar, POST /payments/intent/:type/:id) and ONE
// Moyasar webhook receiver, POST /payments/webhook/moyasar, that authenticates
// Moyasar's `secret_token` (body) against MOYASAR_WEBHOOK_SECRET in every
// environment, staging included, and takes the payment status from the gateway.
// Q104: POST /pharmacy/orders/:id/payment-intent created a "payment intent"
// with adapter 'sandbox_disabled' that no gateway ever saw (a second, fake
// pharmacy payment path). No client calls it; pharmacy orders pay through
// POST /payments/intent/pharmacy/:id. The route and its writer are removed.
import 'reflect-metadata';
import * as controllers from '../../src/modules/pharmacy/pharmacy.controllers';
import { PharmacyPaymentEvidenceService } from '../../src/modules/pharmacy/services/pharmacy-payment-evidence.service';

describe('no sandbox pharmacy payment intent (Q104)', () => {
  it('no pharmacy controller maps orders/:id/payment-intent', () => {
    for (const C of Object.values(controllers) as Function[]) {
      if (typeof C !== 'function' || !C.prototype) continue;
      for (const name of Object.getOwnPropertyNames(C.prototype)) {
        const h = Object.getOwnPropertyDescriptor(C.prototype, name)?.value;
        if (typeof h === 'function') expect(Reflect.getMetadata('path', h)).not.toBe('orders/:id/payment-intent');
      }
    }
  });
  it('the evidence service no longer mints intents', () => {
    expect((PharmacyPaymentEvidenceService.prototype as unknown as Record<string, unknown>).createPaymentIntent).toBeUndefined();
  });
});
