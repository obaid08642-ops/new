# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PROVIDER_INTAKE_BACKEND_ROUTE_MAP_20260818.txt`
- **Member SHA-256:** `4a8b126bf49ab82e7614322046143687ab5773d9bf5b157ad48a62c722f9b9ea`
- **Line count:** 532
- **Read range:** `1-532`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: # Provider intake backend route map`
- `5: '/home-care/bookings/nursing/all`
- `13: '/labs/bookings`
- `28: '/pharmacy/procurement/submit-request`
- `36: '/provider-onboarding/submit`
- `86: '/provider/profile/image/upload`
- `95: '/radiology/bookings`
- `100: ## Backend controller route markers`
- `102: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:544:  @Get('refunds/queue') refundsQueue() { return this.refunds.adminQueue(); }`
- `127: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:70:  @Post('orders/:id/submit-basket') submitBasket(@CurrentUser() u: any, @Param('id') id: string, @Body() b: { note?: string }) { return this.`
- `131: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:89:  @Post('orders/:id/submit-basket') submitBasket(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.submitBask`
- `136: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:104:  @Get('bookings/nursing/all') nursingQueue(@CurrentUser() u: any, @Query() q: any) {`
### backend_consumers_or_contracts
- `5: '/home-care/bookings/nursing/all`
- `6: '/home-care/provider/availability`
- `7: '/home-care/providers?availability=now`
- `12: '/insurance/requests/provider/queue`
- `13: '/labs/bookings`
- `14: '/labs/packages`
- `15: '/labs/provider/inbox`
- `16: '/labs/samples`
- `17: '/labs/services`
- `19: '/nursing/catalog`
- `20: '/nursing/coverage/verify-gps`
- `21: '/nursing/jobs/active`
### auth_ownership
- `38: '/provider/auth/send-otp`
- `42: '/provider/capabilities/doctor-sessions`
- `102: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:544:  @Get('refunds/queue') refundsQueue() { return this.refunds.adminQueue(); }`
- `142: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/admin-web-core/controllers/provider-moderation.controller.ts:8:@Controller('providers')`
- `143: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/admin-web-core/controllers/provider-moderation.controller.ts:45:  @Post('provider-deltas')`
- `144: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/admin-web-core/controllers/provider-moderation.controller.ts:51:  @Post('provider-deltas/:id/approve')`
- `145: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/admin-web-core/controllers/provider-moderation.controller.ts:82:  @Post('provider-deltas/:id/reject')`
- `146: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/admin-governance/admin-governance.module.ts:239:  @Get('providers-performance') perf(@Query() q: any) { return this.svc.providersPerformance({ type: q.type, limit: q.limit ? Number(q.l`
- `147: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/medicines/medicines.controller.ts:152:  @Post('admin/catalog/:id/availability')`
- `153: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/service-catalog/service-catalog.module.ts:200:  @Get('admin/:type') @Roles(UserRole.ADMIN) adminAll(@Param('type') t: 'lab' | 'radiology', @Query() q: any) { return this.svc.adminListA`
- `154: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/service-catalog/service-catalog.module.ts:201:  @Post('admin/:type/:id/approve') @Roles(UserRole.ADMIN) approve(@Param('type') t: 'lab' | 'radiology', @Param('id') id: string, @Body() `
- `155: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/ai/ai.controller.ts:34:  @Post('admin/gateway/provider/:key')`
### state_transitions
- `58: '/provider/jobs/queue?kind=nursing&status=active`
- `59: '/provider/jobs/queue?kind=nursing&status=completed`
- `60: '/provider/jobs/queue?kind=nursing&status=incoming`
- `61: '/provider/jobs/queue?status=active`
- `62: '/provider/jobs/queue?status=active&kind=appointment&today=true`
- `63: '/provider/jobs/queue?status=active&kind=consultation`
- `64: '/provider/jobs/queue?status=incoming&kind=consultation`
- `85: '/provider/profile/image/status`
- `101: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:431:  @Get('requests/provider/queue') providerQueue(@CurrentUser() u: any, @Query('state') state?: string) { return this.svc.providerQueue(u`
- `102: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:544:  @Get('refunds/queue') refundsQueue() { return this.refunds.adminQueue(); }`
- `110: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:45:  @Get('orders/completed') completed(@CurrentUser() u: any) { return this.svc.completed(u); }`
- `128: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:73:  @Post('orders/:id/insurance') setInsurance(@CurrentUser() u: any, @Param('id') id: string, @Body() b: { status: 'approved' | 'rejected' | '`
### payment_insurance_relevance
- `12: '/insurance/requests/provider/queue`
- `20: '/nursing/coverage/verify-gps`
- `76: '/provider/ops/wallet/ledger`
- `77: '/provider/ops/wallet/ledger?limit=50`
- `78: '/provider/payouts/balance`
- `79: '/provider/payouts/mine`
- `80: '/provider/payouts/request`
- `91: '/provider/wallet`
- `92: '/provider/wallet/transactions`
- `101: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:431:  @Get('requests/provider/queue') providerQueue(@CurrentUser() u: any, @Query('state') state?: string) { return this.svc.providerQueue(u`
- `102: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:544:  @Get('refunds/queue') refundsQueue() { return this.refunds.adminQueue(); }`
- `103: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:564:  @Get('ledger/provider/summary') providerSummary(@CurrentUser() u: any) { return this.finance.providerSummary(u.id); }`
### error_empty_loading_retry_cancel
- `128: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:73:  @Post('orders/:id/insurance') setInsurance(@CurrentUser() u: any, @Param('id') id: string, @Body() b: { status: 'approved' | 'rejected' | '`
- `175: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:47:  @Post('bookings/:id/cancel')`
- `212: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/admin-authority/admin-authority.module.ts:256:  @Post('appointments/:id/force-cancel') fca(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.forceCancel`
- `215: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/admin-authority/admin-authority.module.ts:259:  @Post('orders/:id/force-cancel') fco(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.forceCancelOrder(`
- `218: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/admin-authority/admin-authority.module.ts:263:  @Post('labs/:id/force-cancel') fcl(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.forceCancelLab(u, i`
- `221: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/admin-authority/admin-authority.module.ts:267:  @Post('radiology/:id/force-cancel') fcr(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.forceCancelRad`
- `234: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/providers/providers.controller.ts:70:  @Get('admin/pending')`
- `251: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:499:  @Delete('doctor/leave/:id') cancelLeave(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.cancelLeave(u.id, id); }`
- `296: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/orders/orders.controller.ts:35:  @Post(':id/cancel')`
- `412: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/care/appointments.controller.ts:34:  @Patch(':id/cancel')`
- `428: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/radiology/radiology.controller.ts:46:  @Post('bookings/:id/cancel')`
- `439: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/radiology/radiology.controller.ts:99:  @Post('bookings/:id/abort')`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
