# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PROVIDER_AUTH_CONTROLLER_SOURCE_20260818.txt`
- **Member SHA-256:** `a56bc215014ae822585276e26186fd720280046c522f7c42d38d96253438ad2e`
- **Line count:** 105
- **Read range:** `1-105`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/auth/auth.controller.ts:52:  @Post('register')`
- `9: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/auth/auth.controller.ts:59:  @Post('login')`
- `12: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/auth/auth.controller.ts:97:  @Post('login/verify-2fa')`
- `15: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/auth/auth.controller.ts:163:  @Post('logout-all')`
- `17: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/auth/auth.controller.ts:179:  @Post('logout')`
- `21: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/auth/auth.controller.ts:217:  @Post('social-login')`
- `25: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/auth/passkey.controller.ts:44:  @Post('login/verify')`
- `53: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/simulated-features.controller.ts:128:  @Post('home-care/bookings/:id/check-in')`
- `54: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/simulated-features.controller.ts:147:  @Post('home-care/reports/:id/submit')`
- `55: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/simulated-features.controller.ts:169:  @Post('radiology/bookings/:id/upload-report')`
- `56: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/simulated-features.controller.ts:187:  @Post('radiology/bookings/:id/publish-report')`
- `69: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/auth/auth.service.ts:193:  async login(identifier: string, password: string, ctx?: { deviceToken?: string; ua?: string; ip?: string }) {`
### backend_consumers_or_contracts
- `1: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:83:@Controller('provider/pharmacy')`
- `7: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/auth/auth.controller.ts:45:@Controller('auth')`
- `8: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/auth/auth.controller.ts:52:  @Post('register')`
- `9: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/auth/auth.controller.ts:59:  @Post('login')`
- `10: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/auth/auth.controller.ts:85:  @Post('guest')`
- `11: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/auth/auth.controller.ts:90:  @Post('convert-guest')`
- `12: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/auth/auth.controller.ts:97:  @Post('login/verify-2fa')`
- `13: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/auth/auth.controller.ts:139:  @Post('heartbeat')`
- `14: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/auth/auth.controller.ts:157:  @Post('refresh')`
- `15: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/auth/auth.controller.ts:163:  @Post('logout-all')`
- `16: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/auth/auth.controller.ts:169:  @Post('consent')`
- `17: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/auth/auth.controller.ts:179:  @Post('logout')`
### auth_ownership
- `2: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/admin-web-core/controllers/provider-moderation.controller.ts:8:@Controller('providers')`
- `3: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/admin-web-core/controllers/provider-moderation.controller.ts:45:  @Post('provider-deltas')`
- `4: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/admin-web-core/controllers/provider-moderation.controller.ts:51:  @Post('provider-deltas/:id/approve')`
- `5: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/admin-web-core/controllers/provider-moderation.controller.ts:82:  @Post('provider-deltas/:id/reject')`
- `6: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/ai/ai.controller.ts:34:  @Post('admin/gateway/provider/:key')`
- `9: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/auth/auth.controller.ts:59:  @Post('login')`
- `12: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/auth/auth.controller.ts:97:  @Post('login/verify-2fa')`
- `14: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/auth/auth.controller.ts:157:  @Post('refresh')`
- `15: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/auth/auth.controller.ts:163:  @Post('logout-all')`
- `17: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/auth/auth.controller.ts:179:  @Post('logout')`
- `18: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/auth/auth.controller.ts:192:  @Post('send-otp')`
- `19: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/auth/auth.controller.ts:200:  @Post('verify-otp')`
### state_transitions
- `41: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/livekit/livekit.controller.ts:23:  @Post('provider/no-show')`
### payment_insurance_relevance
- `36: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/payouts/provider-payouts.controller.ts:16:@Controller('provider/payouts')`
- `37: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/payouts/provider-payouts.controller.ts:34:  @Post('request')`
- `73: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/payouts/provider-payouts.controller.ts:16:@Controller('provider/payouts')`
- `89: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.controllers.ts:390:@Controller('provider/wallet')`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
