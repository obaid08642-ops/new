# Phase 0B semantic evidence — paymob.controller.ts

**Archive member:** `src/modules/payments/paymob.controller.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–30; full 30-line member covered.

Lines 2–6 import guards/controller decorators, Public and PaymobService. Lines 8–10 apply JwtAuthGuard at controller scope and define `payments/paymob`.

Lines 13–17 mark GET `payments/paymob/methods` public and delegate to `getMethods`, exposing the static method list from the service. Lines 19–23 define POST `payments/paymob/initiate`; it remains subject to controller JwtAuthGuard, accepts `payload: any`, and delegates directly to PaymobService.initiate. No CurrentUser is injected, no DTO validation is visible, and no IdempotencyInterceptor is applied at this route.

Lines 25–29 define POST `payments/paymob/verify`; it is also subject to JwtAuthGuard, accepts `payload: any`, and delegates directly to PaymobService.verify. It is not marked Public and is not a webhook route in this controller. No DTO, idempotency, transaction binding, amount reconciliation or settlement application is visible.

**Audit judgment:** Authentication exists at controller scope for initiate/verify and methods is explicitly public, but the payment mutation surface is weakly typed and not visibly idempotent; the service accepts client-controlled payload amount and has no local booking/user binding. The verify endpoint returns HMAC verification result but does not establish payment state or order settlement.

No product code was changed and no tests were executed during this semantic read.
