
## [P5.3c] F38 dead controllers deleted (2026-09-26)
- `payments/paymob.controller.ts` (`payments/paymob`) and `care/doctor-integration.controller.ts` (`provider/doctor-engine`): zero client/backend callers AND not registered in any module — pure dead code. Deleted; `paymob.service` kept (used via `paymob.module`). `tour.controller.ts` / `insurance.controller.ts` already gone. tsc 0.

## [P5.4] F41 auth aliases log deprecation (2026-09-26)
- Canonical `otp/request`, `otp/verify`, `password/reset` unchanged; legacy `send-otp`/`verify-otp`/`reset-password` already carried `Deprecation: true` headers — added `Logger.warn` on each alias call per plan ("aliases logging deprecation"). tsc 0.
