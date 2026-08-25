# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PATIENT_CONSUMER_BACKEND_ROUTE_MAP_20260818.txt`
- **Member SHA-256:** `62f8f0073c3aff5d2a3e3984d3d3215e7e613254e3caac9921c933e4f379d1fe`
- **Line count:** 1450
- **Read range:** `1-1450`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: # Patient consumer/backend route reconciliation`
- `3: ## Backend route declarations`
- `12: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/storage/storage.module.ts:351:  @Post('upload')`
- `15: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/storage/storage.module.ts:383:  @Post('upload-suggestion-image')`
- `16: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/storage/storage.module.ts:401:  @Post('upload-cloudinary')`
- `45: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:170:@Controller('bookings')`
- `57: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:426:  @Post('requests/:id/cancel') cancel(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.cancel(u, id); }`
- `58: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:427:  @Post('requests/:id/resubmit') resubmit(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.resubmit(u, `
- `67: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:524:@Controller('refunds')`
- `69: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:529:  @Get('my') my(@CurrentUser() u: any) { return this.svc.myRefunds(u); }`
- `73: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:544:  @Get('refunds/queue') refundsQueue() { return this.refunds.adminQueue(); }`
- `74: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:545:  @Post('refunds/:id/decide') decideRefund(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) {`
### backend_consumers_or_contracts
- `42: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.insurance.controller.ts:5:@Controller('users/me/insurance')`
- `45: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:170:@Controller('bookings')`
- `46: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:173:  @Get('quote') quote(@Query() q: any) {`
- `47: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:395:@Controller('insurance')`
- `48: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:401:  @Get('companies') companies() { return this.svc.companiesList(); }`
- `49: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:402:  @Post('save-policy') savePolicy(@CurrentUser() u: any, @Body() b: any) { return this.svc.savePolicy(u, b); }`
- `50: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:403:  @Get('my-policy') myPolicy(@CurrentUser() u: any) { return this.svc.myPolicy(u); }`
- `51: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:405:  @Get('coverage-check') async coverageCheck(@CurrentUser() u: any, @Query() q: any) {`
- `52: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:417:  @Get('benefits-summary') async benefits(@CurrentUser() u: any) {`
- `53: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:422:  @Post('requests') createRequest(@CurrentUser() u: any, @Body() b: any) { return this.svc.createRequest(u, b); }`
- `54: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:423:  @Get('requests/my') myRequests(@CurrentUser() u: any) { return this.svc.myRequests(u); }`
- `55: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:424:  @Get('requests/:id') one(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.getOne(id, u); }`
### auth_ownership
- `4: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/analytics/analytics.module.ts:120:@Controller('admin/analytics')`
- `30: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.controller.ts:72:  @Get('me/sessions')`
- `31: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.controller.ts:76:  @Delete('me/sessions/:jti')`
- `71: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:536:@Controller('admin/finance')`
- `73: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:544:  @Get('refunds/queue') refundsQueue() { return this.refunds.adminQueue(); }`
- `75: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:550:@Controller('admin/insurance')`
- `76: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:554:  @Get('requests') all(@Query('state') state?: string) { return this.svc.adminAll(state); }`
- `77: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:555:  @Get('stats') stats() { return this.svc.adminStats(); }`
- `87: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/support/support.controller.ts:19:  @Get('admin/requests') @Roles(UserRole.ADMIN) adminList(@Query('status') status?: string) { return this.svc.adminList(status); }`
- `88: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/support/support.controller.ts:20:  @Patch('admin/requests/:id') @Roles(UserRole.ADMIN) adminUpdate(@Param('id') id: string, @Body() b: any) { return this.svc.adminUpdateStatus(id, b.st`
- `106: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/community/community.controller.ts:53:  @Get('admin/pending')`
- `107: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/community/community.controller.ts:58:  @Put('admin/:id/moderate')`
### state_transitions
- `57: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:426:  @Post('requests/:id/cancel') cancel(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.cancel(u, id); }`
- `60: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:431:  @Get('requests/provider/queue') providerQueue(@CurrentUser() u: any, @Query('state') state?: string) { return this.svc.providerQueue(u`
- `67: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:524:@Controller('refunds')`
- `69: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:529:  @Get('my') my(@CurrentUser() u: any) { return this.svc.myRefunds(u); }`
- `73: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:544:  @Get('refunds/queue') refundsQueue() { return this.refunds.adminQueue(); }`
- `74: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:545:  @Post('refunds/:id/decide') decideRefund(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) {`
- `76: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:554:  @Get('requests') all(@Query('state') state?: string) { return this.svc.adminAll(state); }`
- `87: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/support/support.controller.ts:19:  @Get('admin/requests') @Roles(UserRole.ADMIN) adminList(@Query('status') status?: string) { return this.svc.adminList(status); }`
- `88: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/support/support.controller.ts:20:  @Patch('admin/requests/:id') @Roles(UserRole.ADMIN) adminUpdate(@Param('id') id: string, @Body() b: any) { return this.svc.adminUpdateStatus(id, b.st`
- `106: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/community/community.controller.ts:53:  @Get('admin/pending')`
- `111: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/community/community.controller.ts:80:  @Put('live-sessions/:id/status')`
- `128: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:45:  @Get('orders/completed') completed(@CurrentUser() u: any) { return this.svc.completed(u); }`
### payment_insurance_relevance
- `35: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/user.insurance.controller.ts:5:@Controller('user')`
- `36: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/user.insurance.controller.ts:12:  @Get('insurance')`
- `42: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.insurance.controller.ts:5:@Controller('users/me/insurance')`
- `43: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.insurance.controller.ts:10:  @Get()`
- `44: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.insurance.controller.ts:16:  @Post()`
- `45: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:170:@Controller('bookings')`
- `46: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:173:  @Get('quote') quote(@Query() q: any) {`
- `47: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:395:@Controller('insurance')`
- `48: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:401:  @Get('companies') companies() { return this.svc.companiesList(); }`
- `49: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:402:  @Post('save-policy') savePolicy(@CurrentUser() u: any, @Body() b: any) { return this.svc.savePolicy(u, b); }`
- `50: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:403:  @Get('my-policy') myPolicy(@CurrentUser() u: any) { return this.svc.myPolicy(u); }`
- `51: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:405:  @Get('coverage-check') async coverageCheck(@CurrentUser() u: any, @Query() q: any) {`
### error_empty_loading_retry_cancel
- `57: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:426:  @Post('requests/:id/cancel') cancel(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.cancel(u, id); }`
- `106: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/community/community.controller.ts:53:  @Get('admin/pending')`
- `146: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:73:  @Post('orders/:id/insurance') setInsurance(@CurrentUser() u: any, @Param('id') id: string, @Body() b: { status: 'approved' | 'rejected' | '`
- `190: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/admin-web-core/controllers/admin-extended-operations.controller.ts:12:  @Get('procurement/pending')`
- `200: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/admin-web-core/controllers/finance.controller.ts:37:  @Get('withdrawals/pending')`
- `322: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/medicines/medicines.controller.ts:299:  @Get('admin/pending-review')`
- `379: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/patient-ux/patient-ux.module.ts:161:  @Get('pending') pending() { return this.svc.adminListRefunds('requested'); }`
- `382: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/patient-ux/patient-ux.module.ts:277:  @Post('cancel') cancel(@CurrentUser() u: any, @Body() body: { kind: string; id: string; reason: string }) {`
- `384: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/patient-ux/patient-ux.module.ts:287:  @Post('payment') markPayment(@CurrentUser() u: any, @Body() body: { kind: string; id: string; payment_status: 'paid' | 'refunded' | 'failed'; amou`
- `508: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/health/health.controller.ts:49:  @Post('reminders/:id/refill/cancel')`
- `547: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:47:  @Post('bookings/:id/cancel')`
- `619: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/admin-authority/admin-authority.module.ts:256:  @Post('appointments/:id/force-cancel') fca(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.forceCancel`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
