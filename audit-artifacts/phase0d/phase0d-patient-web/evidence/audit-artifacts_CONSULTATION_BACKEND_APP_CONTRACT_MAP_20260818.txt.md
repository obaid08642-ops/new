# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/CONSULTATION_BACKEND_APP_CONTRACT_MAP_20260818.txt`
- **Member SHA-256:** `4bf00cc79e81c4f6c40496e8e99db55a711995d7de5aa2eadb07ebbdf7a254b8`
- **Line count:** 1026
- **Read range:** `1-1026`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `13: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/analytics/analytics.module.ts:83:    const cancelledAppts = await this.col('appointments').countDocuments({ status: { $in: ['CANCELLED', 'cancelled', 'NO_SHOW'] } });`
- `16: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/analytics/analytics.module.ts:113:      appointment_cancellation_rate: appointments > 0 ? +(cancelledAppts / appointments * 100).toFixed(1) : null,`
- `25: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/storage/storage.module.ts:351:  @Post('upload')`
- `28: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/storage/storage.module.ts:383:  @Post('upload-suggestion-image')`
- `29: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/storage/storage.module.ts:401:  @Post('upload-cloudinary')`
- `65: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:33:  @Prop() booking_id?: string;          // linked booking/appointment/order`
- `66: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:34:  @Prop() booking_kind?: string;        // consultation | home_care | pharmacy | lab | radiology | nursing`
- `69: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:170:@Controller('bookings')`
- `80: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:276:    this.events.emit('insurance.resubmitted', { request_id: req.id, patient_id: req.patient_id, provider_id: req.provider_id, count: res`
- `95: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:426:  @Post('requests/:id/cancel') cancel(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.cancel(u, id); }`
- `96: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:427:  @Post('requests/:id/resubmit') resubmit(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.resubmit(u, `
- `101: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:439:  // M4 alias: patient claim-tracking screens call /insurance/claims/*`
### backend_consumers_or_contracts
- `57: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.insurance.controller.ts:5:@Controller('users/me/insurance')`
- `63: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:4: * BR-2 (owner-approved insurance flow): patient picks "insurance" → system checks`
- `64: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:19:import { InsuranceCompanySchema, InsuranceCompanyDocument } from '../../schemas/insurance.schema';`
- `65: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:33:  @Prop() booking_id?: string;          // linked booking/appointment/order`
- `66: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:34:  @Prop() booking_kind?: string;        // consultation | home_care | pharmacy | lab | radiology | nursing`
- `67: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:93:  @Prop({ default: 'online' }) payment_method: string; // online | cash | insurance`
- `68: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:111:  consultation: 0.15, video: 0.15, audio: 0.15, chat: 0.15,`
- `69: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:170:@Controller('bookings')`
- `70: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:173:  @Get('quote') quote(@Query() q: any) {`
- `71: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:176:    const withInsurance = q?.with_insurance === 'true' || q?.with_insurance === '1';`
- `72: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:180:    if (withInsurance) allowed_methods.push('insurance');`
- `73: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:185:      service_type: q?.service_type || 'consultation',`
### auth_ownership
- `17: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/analytics/analytics.module.ts:120:@Controller('admin/analytics')`
- `43: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.controller.ts:72:  @Get('me/sessions')`
- `44: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.controller.ts:76:  @Delete('me/sessions/:jti')`
- `63: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:4: * BR-2 (owner-approved insurance flow): patient picks "insurance" → system checks`
- `115: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:536:@Controller('admin/finance')`
- `117: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:544:  @Get('refunds/queue') refundsQueue() { return this.refunds.adminQueue(); }`
- `119: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:550:@Controller('admin/insurance')`
- `120: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:554:  @Get('requests') all(@Query('state') state?: string) { return this.svc.adminAll(state); }`
- `121: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:555:  @Get('stats') stats() { return this.svc.adminStats(); }`
- `131: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/support/support.controller.ts:19:  @Get('admin/requests') @Roles(UserRole.ADMIN) adminList(@Query('status') status?: string) { return this.svc.adminList(status); }`
- `132: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/support/support.controller.ts:20:  @Patch('admin/requests/:id') @Roles(UserRole.ADMIN) adminUpdate(@Param('id') id: string, @Body() b: any) { return this.svc.adminUpdateStatus(id, b.st`
- `150: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/community/community.controller.ts:53:  @Get('admin/pending')`
### state_transitions
- `4: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/analytics/analytics.module.ts:39:  // ── Top doctors (by completed+total appointments) ──────────────`
- `6: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/analytics/analytics.module.ts:42:      { $group: { _id: { $ifNull: ['$doctor_name', '$provider_id'] }, appointments: { $sum: 1 }, completed: { $sum: { $cond: [{ $in: ['$status', ['COMP`
- `8: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/analytics/analytics.module.ts:45:      { $project: { _id: 0, doctor: '$_id', appointments: 1, completed: 1 } },`
- `13: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/analytics/analytics.module.ts:83:    const cancelledAppts = await this.col('appointments').countDocuments({ status: { $in: ['CANCELLED', 'cancelled', 'NO_SHOW'] } });`
- `16: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/analytics/analytics.module.ts:113:      appointment_cancellation_rate: appointments > 0 ? +(cancelledAppts / appointments * 100).toFixed(1) : null,`
- `63: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:4: * BR-2 (owner-approved insurance flow): patient picks "insurance" → system checks`
- `82: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:360:    this.events.emit('insurance.decided', { request_id: req.id, patient_id: req.patient_id, state: req.state, copay_amount: req.copay_am`
- `95: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:426:  @Post('requests/:id/cancel') cancel(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.cancel(u, id); }`
- `98: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:431:  @Get('requests/provider/queue') providerQueue(@CurrentUser() u: any, @Query('state') state?: string) { return this.svc.providerQueue(u`
- `108: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:477:    if (!scheduledAt) return REFUND_WINDOWS[0];`
- `111: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:524:@Controller('refunds')`
- `113: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:529:  @Get('my') my(@CurrentUser() u: any) { return this.svc.myRefunds(u); }`
### payment_insurance_relevance
- `4: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/analytics/analytics.module.ts:39:  // ── Top doctors (by completed+total appointments) ──────────────`
- `15: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/analytics/analytics.module.ts:110:      totals: { users, orders, appointments, carts },`
- `48: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/user.insurance.controller.ts:5:@Controller('user')`
- `49: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/user.insurance.controller.ts:12:  @Get('insurance')`
- `50: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/user.insurance.controller.ts:15:    return { policies: profile?.insurance_policies || [] };`
- `51: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.module.ts:6:import { UsersInsuranceController } from './users.insurance.controller';`
- `57: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.insurance.controller.ts:5:@Controller('users/me/insurance')`
- `58: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.insurance.controller.ts:10:  @Get()`
- `59: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.insurance.controller.ts:13:    return profile.insurance || null;`
- `60: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.insurance.controller.ts:16:  @Post()`
- `61: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.insurance.controller.ts:20:      ...profile.insurance,`
- `62: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.insurance.controller.ts:24:    await this.users.updatePatientProfile(id, { insurance: updatedInsurance });`
### error_empty_loading_retry_cancel
- `13: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/analytics/analytics.module.ts:83:    const cancelledAppts = await this.col('appointments').countDocuments({ status: { $in: ['CANCELLED', 'cancelled', 'NO_SHOW'] } });`
- `16: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/analytics/analytics.module.ts:113:      appointment_cancellation_rate: appointments > 0 ? +(cancelledAppts / appointments * 100).toFixed(1) : null,`
- `95: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:426:  @Post('requests/:id/cancel') cancel(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.cancel(u, id); }`
- `150: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/community/community.controller.ts:53:  @Get('admin/pending')`
- `191: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:73:  @Post('orders/:id/insurance') setInsurance(@CurrentUser() u: any, @Param('id') id: string, @Body() b: { status: 'approved' | 'rejected' | '`
- `238: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/admin-web-core/controllers/admin-extended-operations.controller.ts:12:  @Get('procurement/pending')`
- `252: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/admin-web-core/controllers/finance.controller.ts:37:  @Get('withdrawals/pending')`
- `350: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/admin-governance/admin-governance.module.ts:191:    const activeCon = domainStatesFor('consultation', ServiceState.CANCELLED).concat(domainStatesFor('consultation', ServiceState.COMPLE`
- `434: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/medicines/medicines.controller.ts:299:  @Get('admin/pending-review')`
- `460: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/service-catalog/service-catalog.module.ts:154:    this.bus.emit({ type: 'provider.schedule_updated', entity_type: 'provider_schedule', entity_id: r.id, actor_account_id: user.id, actor`
- `509: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/patient-ux/patient-ux.module.ts:161:  @Get('pending') pending() { return this.svc.adminListRefunds('requested'); }`
- `513: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/patient-ux/patient-ux.module.ts:277:  @Post('cancel') cancel(@CurrentUser() u: any, @Body() body: { kind: string; id: string; reason: string }) {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
