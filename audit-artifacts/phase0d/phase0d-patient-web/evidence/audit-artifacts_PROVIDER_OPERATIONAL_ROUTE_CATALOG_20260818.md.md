# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PROVIDER_OPERATIONAL_ROUTE_CATALOG_20260818.md`
- **Member SHA-256:** `59e4ac7556c6fb7d49642006a5cefcc266af06f83e9a7a41574eda5d2d052eb5`
- **Line count:** 228
- **Read range:** `1-228`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: # Provider operational route catalog`
- `7: 27:  @Public() @Post('register')`
- `8: 29:  @Public() @Post('login')`
- `10: 33:  @Post('logout')`
- `22: 63:  @Post('kyc/documents') uploadDoc(@CurrentUser() u: any, @Body() body: any) { return this.svc.uploadDocument(u, body); }`
- `28: 72:  @Post('profile/image/upload')`
- `30: 88:  @Post('onboarding/submit') submit(@CurrentUser() u: any) { return this.svc.submitForApproval(u); }`
- `48: 132:  @Post(':id/retry-image-jobs')`
- `59: 170:  @Post(':id/cancel') cancel(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.cancel(u, id, body || {}); }`
- `121: 499:  @Delete('doctor/leave/:id') cancelLeave(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.cancelLeave(u.id, id); }`
- `132: 514:  @Post('lab/bookings/:id/qc/:action') qc(@CurrentUser() u: any, @Param('id') id: string, @Param('action') action: string, @Body() b: any) { return this.svc.labQc(u, id, action, b); }`
- `133: 517:  @Post('nursing/bookings/:id/checklist/:phase') checklist(@CurrentUser() u: any, @Param('id') id: string, @Param('phase') phase: string, @Body() b: any) { return this.svc.nursingChecklist(u, id, phase as any, b?.items || {}); }`
### backend_consumers_or_contracts
- `6: 24:@Controller('provider/auth')`
- `61: 173:  @Get(':id/orders')`
- `63: 240:  @Post(':id/insurance-copay')`
- `66: 390:@Controller('provider/wallet')`
- `68: 465:@Controller('provider/notifications')`
- `132: 514:  @Post('lab/bookings/:id/qc/:action') qc(@CurrentUser() u: any, @Param('id') id: string, @Param('action') action: string, @Body() b: any) { return this.svc.labQc(u, id, action, b); }`
- `133: 517:  @Post('nursing/bookings/:id/checklist/:phase') checklist(@CurrentUser() u: any, @Param('id') id: string, @Param('phase') phase: string, @Body() b: any) { return this.svc.nursingChecklist(u, id, phase as any, b?.items || {}); }`
- `134: 518:  @Post('nursing/bookings/:id/sign') sign(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.nursingSign(u, id, b?.signature, b?.signer_name); }`
- `135: 519:  @Post('nursing/bookings/:id/track') track(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.nursingTrack(u, id, b?.lat, b?.lng); }`
- `136: 520:  @Post('nursing/bookings/:id/escalate') escalate(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.nursingEscalate(u, id, b?.reason); }`
- `161: 267:  @Post(':type/:id/insurance') insurance(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string, @Body() b: any) { return this.svc.updateInsurance(u, t, id, b); }`
- `162: ## /tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts`
### auth_ownership
- `8: 29:  @Public() @Post('login')`
- `9: 31:  @Public() @Post('refresh')`
- `10: 33:  @Post('logout')`
- `11: 35:  @Public() @Post('send-otp')`
- `40: 108:@Controller('admin/providers')`
- `92: 517:  @Get('doctor-sessions') listDoc(@CurrentUser() u: any) { return this.svc.listDoctorSessions(u); }`
- `93: 518:  @Post('doctor-sessions') upsertDoc(@CurrentUser() u: any, @Body() body: any) { return this.svc.upsertDoctorSession(u, body); }`
- `94: 519:  @Delete('doctor-sessions/:id') delDoc(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.deleteDoctorSession(u, id); }`
- `109: 549:@Controller('admin/matching')`
- `113: 569:  @Post('assign/:requestId/:providerId') assign(@CurrentUser() u: any, @Param('requestId') rid: string, @Param('providerId') pid: string) {`
- `127: 507:  @Post('doctor/blacklist/:patientId') block(@CurrentUser() u: any, @Param('patientId') p: string, @Body() b: any) { return this.svc.blacklistPatient(u.id, p, b?.reason); }`
- `128: 508:  @Delete('doctor/blacklist/:patientId') unblock(@CurrentUser() u: any, @Param('patientId') p: string) { return this.svc.unblacklistPatient(u.id, p); }`
### state_transitions
- `29: 83:  @Get('profile/image/status')`
- `48: 132:  @Post(':id/retry-image-jobs')`
- `59: 170:  @Post(':id/cancel') cancel(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.cancel(u, id, body || {}); }`
- `121: 499:  @Delete('doctor/leave/:id') cancelLeave(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.cancelLeave(u.id, id); }`
- `155: 258:  @Get('queue') queue(@CurrentUser() u: any, @Query() q: any) { return this.svc.queue(u, (q.status as any) || 'incoming', q.kind); }`
- `165: 24:  @Get('orders') list(@CurrentUser() u: any, @Query('status') status?: string) { return this.orders.list(u, status); }`
- `169: 28:  @Post('orders/:id/cancel') cancel(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.orders.cancel(u, id, b?.reason || ''); }`
- `171: 43:  @Get('allocations') list(@CurrentUser() u: any, @Query('status') status?: string) {`
- `178: 58:  @Post('allocations/:id/delivered') delivered(@CurrentUser() u: any, @Param('id') id: string) { return this.allocs.delivered(u, id); }`
- `180: 60:  @Post('allocations/:id/cancel') cancel(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.allocs.cancel(u, id, b?.reason || ''); }`
- `212: 170:  @Post('threads/:id/reject') reject(@CurrentUser() u: any, @Param('id') id: string) { return this.chat.rejectOrRemove(u, id, 'rejected'); }`
- `218: 187:  @Get() list(@CurrentUser() u: any, @Query('status') st?: string) { return this.svc.list(u, st); }`
### payment_insurance_relevance
- `63: 240:  @Post(':id/insurance-copay')`
- `66: 390:@Controller('provider/wallet')`
- `140: 528:  @Get('invoice/:orderId/pdf') async invoice(@CurrentUser() u: any, @Param('orderId') id: string, @Res({ passthrough: true }) res: any) {`
- `141: 534:  @Get('wallet/ledger') wallet(@CurrentUser() u: any, @Query('limit') l?: string): Promise<any> { return this.svc.walletLedger(u.id, l ? parseInt(l) : 100); }`
- `143: 545:  @Get('wallet') async wallet(@CurrentUser() u: any) {`
- `144: 550:  @Get('wallet/transactions') async walletTx(@CurrentUser() u: any) {`
- `161: 267:  @Post(':type/:id/insurance') insurance(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string, @Body() b: any) { return this.svc.updateInsurance(u, t, id, b); }`
- `179: 59:  @Post('allocations/:id/insurance') updateInsurance(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.allocs.updateInsurance(u, id, b); }`
- `183: 75:  @Post('orders/:id/insurance')`
### error_empty_loading_retry_cancel
- `48: 132:  @Post(':id/retry-image-jobs')`
- `59: 170:  @Post(':id/cancel') cancel(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.cancel(u, id, body || {}); }`
- `121: 499:  @Delete('doctor/leave/:id') cancelLeave(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.cancelLeave(u.id, id); }`
- `169: 28:  @Post('orders/:id/cancel') cancel(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.orders.cancel(u, id, b?.reason || ''); }`
- `180: 60:  @Post('allocations/:id/cancel') cancel(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.allocs.cancel(u, id, b?.reason || ''); }`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
