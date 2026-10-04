// Q104: POST /pharmacy/orders/:id/payment-intent created a "payment intent"
// with adapter 'sandbox_disabled' that no gateway ever saw (a second, fake
// pharmacy payment path). No client calls it; pharmacy orders pay through
// POST /payments/intent/pharmacy/:id. The route and its writer are removed.
import 'reflect-metadata';
import * as controllers from './pharmacy.controllers';
import { PharmacyPaymentEvidenceService } from './services/pharmacy-payment-evidence.service';

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
