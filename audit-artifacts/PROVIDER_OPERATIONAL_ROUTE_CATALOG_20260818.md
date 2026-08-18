# Provider operational route catalog

المصدر: provider.controllers.ts وprovider-ops/provider-ops.module.ts وprovider-jobs/provider-jobs.module.ts وservice-specific controllers. هذا catalog مصدرّي؛ لا يعني نجاحاً حياً.

## /tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.controllers.ts
24:@Controller('provider/auth')
27:  @Public() @Post('register')
29:  @Public() @Post('login')
31:  @Public() @Post('refresh')
33:  @Post('logout')
35:  @Public() @Post('send-otp')
40:  @Public() @Post('verify-email')
42:  @Public() @Post('forgot-password')
44:  @Public() @Post('verify-reset-code')
46:  @Public() @Post('reset-password')
48:  @Get('me')
52:@Controller('provider')
58:  @Get('profile') get(@CurrentUser() u: any) { return this.svc.getProfile(u); }
59:  @Patch('profile') update(@CurrentUser() u: any, @Body() body: any) { return this.svc.updateProfile(u, body); }
60:  @Post('profile/phones') addPhone(@CurrentUser() u: any, @Body() body: any) { return this.svc.addPhone(u, body); }
61:  @Delete('profile/phones/:phone_id') removePhone(@CurrentUser() u: any, @Param('phone_id') pid: string) { return this.svc.removePhone(u, pid); }
63:  @Post('kyc/documents') uploadDoc(@CurrentUser() u: any, @Body() body: any) { return this.svc.uploadDocument(u, body); }
64:  @Get('kyc/documents') listDocs(@CurrentUser() u: any) { return this.svc.listDocuments(u); }
66:  @Get('directory') directory() { return this.svc.directory(); }
68:  @Post('bank-account') upsertBank(@CurrentUser() u: any, @Body() body: any) { return this.svc.upsertBank(u, body); }
69:  @Get('bank-account') getBank(@CurrentUser() u: any) { return this.svc.getBank(u); }
70:  @Public() @Get('banks') banks() { return this.svc.banks_list(); }
72:  @Post('profile/image/upload')
83:  @Get('profile/image/status')
88:  @Post('onboarding/submit') submit(@CurrentUser() u: any) { return this.svc.submitForApproval(u); }
90:  @Post('settings/delta')
96:@Controller('provider/operators')
99:  @Get() list(@CurrentUser() u: any) { return this.svc.list(u); }
100:  @Post('invite') invite(@CurrentUser() u: any, @Body() body: any) { return this.svc.invite(u, body); }
101:  @Public() @Post('accept-invite') accept(@Body() body: any) { return this.svc.acceptInvite(body); }
102:  @Patch(':id') update(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.update(u, id, body); }
103:  @Post(':id/disable') disable(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.disable(u, id, body?.reason); }
104:  @Post(':id/enable') enable(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.enable(u, id); }
105:  @Delete(':id') revoke(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.revoke(u, id); }
108:@Controller('admin/providers')
114:  @Get() list(@CurrentUser() u: any, @Query() q: any): Promise<any> { return this.svc.list(u, q); }
117:  @Get('by-user/:userId') byUser(@CurrentUser() u: any, @Param('userId') userId: string) { return this.svc.detailByUser(u, userId); }
118:  @Get(':id') detail(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.detail(u, id); }
119:  @Post(':id/approve') approve(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.approve(u, id, body); }
120:  @Post(':id/reject') reject(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.reject(u, id, body); }
122:  @Post(':id/reprocess-image')
127:  @Post(':id/replace-image')
132:  @Post(':id/retry-image-jobs')
137:  @Get(':id/image-logs')
141:  @Post(':id/request-changes') needsChanges(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.requestChanges(u, id, body); }
142:  @Post(':id/suspend') suspend(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.suspend(u, id, body); }
156:@Controller('provider/requests')
164:  @Get() list(@CurrentUser() u: any, @Query() q: any) { return this.svc.list(u, q); }
165:  @Get(':id') detail(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.detail(u, id); }
166:  @Post(':id/accept') accept(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.accept(u, id, body || {}); }
167:  @Post(':id/reject') reject(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.reject(u, id, body || {}); }
168:  @Post(':id/start') start(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.start(u, id, body || {}); }
169:  @Post(':id/complete') complete(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.complete(u, id, body || {}); }
170:  @Post(':id/cancel') cancel(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.cancel(u, id, body || {}); }
171:  @Post(':id/assign-staff') assignStaff(@CurrentUser() u: any, @Param('id') id: string, @Body() body: { staff_id: string; notes?: string }) { return this.svc.assignStaff(u, id, body); }
173:  @Get(':id/orders')
183:  @Post(':id/end')
240:  @Post(':id/insurance-copay')
306:  @Post(':id/sick-leave')
356:  @Post(':id/medical-report')
390:@Controller('provider/wallet')
404:  @Post('withdraw')
465:@Controller('provider/notifications')
468:  @Get() list(@CurrentUser() u: any, @Query() q: any) { return this.svc.list(u, q); }
469:  @Post(':id/read') markRead(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.markRead(u, id); }
470:  @Post('read-all') markAllRead(@CurrentUser() u: any) { return this.svc.markAllRead(u); }
473:@Controller('provider/schedule')
476:  @Get() view(@CurrentUser() u: any, @Query() q: any) { return this.svc.view(u, q); }
479:@Controller('provider')
485:  @Get('me') me(@CurrentUser() u: any) { return this.dash.me(u); }
486:  @Get('dashboard/stats') stats(@CurrentUser() u: any) { return this.dash.stats(u); }
487:  @Get('dashboard/recent') recent(@CurrentUser() u: any, @Query('limit') limit?: string) {
490:  @Get('availability') getAvail(@CurrentUser() u: any) { return this.dash.getAvailability(u); }
491:  @Post('availability') setAvail(@CurrentUser() u: any, @Body() body: any) { return this.dash.setAvailability(u, body); }
492:  @Post('seed') seed(@CurrentUser() u: any) { return this.seedSvc.seed(u); }
493:  @Post('seed/reset') seedReset(@CurrentUser() u: any) { return this.seedSvc.resetSeed(u); }
501:@Controller('provider/capabilities')
505:  @Get('pharmacy') listPharma(@CurrentUser() u: any) { return this.svc.listPharmacy(u); }
506:  @Post('pharmacy') upsertPharma(@CurrentUser() u: any, @Body() body: any) { return this.svc.upsertPharmacy(u, body); }
507:  @Delete('pharmacy/:id') delPharma(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.deletePharmacy(u, id); }
509:  @Get('lab') listLab(@CurrentUser() u: any) { return this.svc.listLab(u); }
510:  @Post('lab') upsertLab(@CurrentUser() u: any, @Body() body: any) { return this.svc.upsertLab(u, body); }
511:  @Delete('lab/:id') delLab(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.deleteLab(u, id); }
513:  @Get('radiology') listRad(@CurrentUser() u: any) { return this.svc.listRadiology(u); }
514:  @Post('radiology') upsertRad(@CurrentUser() u: any, @Body() body: any) { return this.svc.upsertRadiology(u, body); }
515:  @Delete('radiology/:id') delRad(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.deleteRadiology(u, id); }
517:  @Get('doctor-sessions') listDoc(@CurrentUser() u: any) { return this.svc.listDoctorSessions(u); }
518:  @Post('doctor-sessions') upsertDoc(@CurrentUser() u: any, @Body() body: any) { return this.svc.upsertDoctorSession(u, body); }
519:  @Delete('doctor-sessions/:id') delDoc(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.deleteDoctorSession(u, id); }
521:  @Get('home-care') listHc(@CurrentUser() u: any) { return this.svc.listHomeCare(u); }
522:  @Post('home-care') upsertHc(@CurrentUser() u: any, @Body() body: any) { return this.svc.upsertHomeCare(u, body); }
523:  @Delete('home-care/:id') delHc(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.deleteHomeCare(u, id); }
526:@Controller('provider/zones')
529:  @Get() list(@CurrentUser() u: any) { return this.svc.listZones(u); }
530:  @Post() upsert(@CurrentUser() u: any, @Body() body: any) { return this.svc.upsertZone(u, body); }
531:  @Delete(':id') del(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.deleteZone(u, id); }
534:@Controller('provider/schedule-slots')
537:  @Get() list(@CurrentUser() u: any) { return this.svc.listSlots(u); }
538:  @Post() upsert(@CurrentUser() u: any, @Body() body: any) { return this.svc.upsertSlot(u, body); }
539:  @Delete(':id') del(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.deleteSlot(u, id); }
542:@Controller('provider/score')
545:  @Get() me(@CurrentUser() u: any) { return this.svc.getMy(u); }
546:  @Post('recompute') recompute(@CurrentUser() u: any) { return this.svc.recompute(u.id); }
549:@Controller('admin/matching')
557:  @Get('preview/:requestId') preview(@CurrentUser() u: any, @Param('requestId') id: string, @Query('limit') limit?: string) {
561:  @Post('preview') previewAdHoc(@CurrentUser() u: any, @Body() body: any) {
565:  @Post('dispatch/:requestId') dispatch(@CurrentUser() u: any, @Param('requestId') id: string, @Body() body: any) {
569:  @Post('assign/:requestId/:providerId') assign(@CurrentUser() u: any, @Param('requestId') rid: string, @Param('providerId') pid: string) {
573:  @Get('attempts/:requestId') attempts(@CurrentUser() u: any, @Param('requestId') id: string) {
577:  @Post('expire-stale') expireStale(@CurrentUser() u: any) {
582:  @Post('seed-unassigned') seedUnassigned(@CurrentUser() u: any, @Body() body: any) {
## /tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts
491:@Controller('provider/ops')
497:  @Post('doctor/leave') addLeave(@CurrentUser() u: any, @Body() b: any) { return this.svc.addLeave(u.id, b); }
498:  @Get('doctor/leave') leaves(@CurrentUser() u: any): Promise<any[]> { return this.svc.myLeaves(u.id); }
499:  @Delete('doctor/leave/:id') cancelLeave(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.cancelLeave(u.id, id); }
502:  @Post('doctor/templates') saveTemplate(@CurrentUser() u: any, @Body() b: any) { return this.svc.saveTemplate(u.id, b); }
503:  @Get('doctor/templates') templates(@CurrentUser() u: any): Promise<any[]> { return this.svc.myTemplates(u.id); }
504:  @Delete('doctor/templates/:id') delTemplate(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.deleteTemplate(u.id, id); }
505:  @Post('doctor/diagnoses') saveDx(@CurrentUser() u: any, @Body() b: any) { return this.svc.saveDiagnosis(u.id, b); }
506:  @Get('doctor/diagnoses') diagnoses(@CurrentUser() u: any, @Query('search') s?: string): Promise<any[]> { return this.svc.myDiagnoses(u.id, s); }
507:  @Post('doctor/blacklist/:patientId') block(@CurrentUser() u: any, @Param('patientId') p: string, @Body() b: any) { return this.svc.blacklistPatient(u.id, p, b?.reason); }
508:  @Delete('doctor/blacklist/:patientId') unblock(@CurrentUser() u: any, @Param('patientId') p: string) { return this.svc.unblacklistPatient(u.id, p); }
509:  @Get('doctor/blacklist') blacklist(@CurrentUser() u: any): Promise<any[]> { return this.svc.myBlacklist(u.id); }
510:  @Get('doctor/patient-crm/:patientId') getCrm(@CurrentUser() u: any, @Param('patientId') p: string) { return this.svc.getPatientCrm(u.id, p); }
511:  @Put('doctor/patient-crm/:patientId') putCrm(@CurrentUser() u: any, @Param('patientId') p: string, @Body() b: any) { return this.svc.putPatientCrm(u.id, p, b || {}); }
514:  @Post('lab/bookings/:id/qc/:action') qc(@CurrentUser() u: any, @Param('id') id: string, @Param('action') action: string, @Body() b: any) { return this.svc.labQc(u, id, action, b); }
517:  @Post('nursing/bookings/:id/checklist/:phase') checklist(@CurrentUser() u: any, @Param('id') id: string, @Param('phase') phase: string, @Body() b: any) { return this.svc.nursingChecklist(u, id, phase as any, b?.items || {}); }
518:  @Post('nursing/bookings/:id/sign') sign(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.nursingSign(u, id, b?.signature, b?.signer_name); }
519:  @Post('nursing/bookings/:id/track') track(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.nursingTrack(u, id, b?.lat, b?.lng); }
520:  @Post('nursing/bookings/:id/escalate') escalate(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.nursingEscalate(u, id, b?.reason); }
523:  @Get('ambulance/:id/eta') eta(@Param('id') id: string, @Query('lat') lat: string, @Query('lng') lng: string) { return this.svc.ambulanceEta(id, parseFloat(lat), parseFloat(lng)); }
524:  @Post('ambulance/:id/handover') handover(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.ambulanceHandover(u, id, b); }
525:  @Post('ambulance/:id/complete') complete(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.ambulanceComplete(u, id, b); }
528:  @Get('invoice/:orderId/pdf') async invoice(@CurrentUser() u: any, @Param('orderId') id: string, @Res({ passthrough: true }) res: any) {
534:  @Get('wallet/ledger') wallet(@CurrentUser() u: any, @Query('limit') l?: string): Promise<any> { return this.svc.walletLedger(u.id, l ? parseInt(l) : 100); }
539:@Controller('provider')
545:  @Get('wallet') async wallet(@CurrentUser() u: any) {
550:  @Get('wallet/transactions') async walletTx(@CurrentUser() u: any) {
562:  @Get('stats/today') async statsToday(@CurrentUser() u: any): Promise<any> {
567:  @Get('reviews') async myReviews(@CurrentUser() u: any): Promise<any[]> {
571:  @Post('reviews/:id/reply') replyReview(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) {
576:  @Get('working-hours') async getHours(@CurrentUser() u: any) {
579:  @Put('working-hours') async putHours(@CurrentUser() u: any, @Body() b: any) {
584:  @Get('schedule/settings') async getSched(@CurrentUser() u: any) {
587:  @Post('schedule/settings') async postSched(@CurrentUser() u: any, @Body() b: any) {
592:  @Post('consultation/end') endConsultation(@CurrentUser() u: any, @Body() b: any) {
## /tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider-jobs/provider-jobs.module.ts
254:@Controller('provider/jobs')
258:  @Get('queue') queue(@CurrentUser() u: any, @Query() q: any) { return this.svc.queue(u, (q.status as any) || 'incoming', q.kind); }
259:  @Get('my-capabilities') async myCaps(@CurrentUser() u: any) {
263:  @Post(':type/:id/accept') accept(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string, @Body() b: any) { return this.svc.accept(u, t, id, b?.reason); }
264:  @Post(':type/:id/reject') reject(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string, @Body() b: any) { return this.svc.reject(u, t, id, b?.reason); }
265:  @Post(':type/:id/start') start(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string, @Body() b: any) { return this.svc.start(u, t, id, b?.reason); }
266:  @Post(':type/:id/complete') complete(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string, @Body() b: any) { return this.svc.complete(u, t, id, b?.reason); }
267:  @Post(':type/:id/insurance') insurance(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string, @Body() b: any) { return this.svc.updateInsurance(u, t, id, b); }
## /tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts
18:@Controller('patient/pharmacy')
23:  @Post('orders') create(@CurrentUser() u: any, @Body() b: any) { return this.orders.create(u, b); }
24:  @Get('orders') list(@CurrentUser() u: any, @Query('status') status?: string) { return this.orders.list(u, status); }
25:  @Get('orders/:id') detail(@CurrentUser() u: any, @Param('id') id: string) { return this.orders.detail(u, id); }
26:  @Patch('orders/:id') update(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.orders.update(u, id, b); }
27:  @Post('orders/:id/submit') submit(@CurrentUser() u: any, @Param('id') id: string) { return this.orders.submit(u, id); }
28:  @Post('orders/:id/cancel') cancel(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.orders.cancel(u, id, b?.reason || ''); }
34:@Controller('provider/pharmacy')
43:  @Get('allocations') list(@CurrentUser() u: any, @Query('status') status?: string) {
47:  @Get('allocations/:id') detail(@CurrentUser() u: any, @Param('id') id: string) {
51:  @Post('allocations/:id/items/:itemId') itemAction(@CurrentUser() u: any, @Param('id') id: string, @Param('itemId') itemId: string, @Body() b: any) {
54:  @Post('allocations/:id/confirm') confirm(@CurrentUser() u: any, @Param('id') id: string) { return this.allocs.confirm(u, id); }
55:  @Post('allocations/:id/preparing') preparing(@CurrentUser() u: any, @Param('id') id: string) { return this.allocs.preparing(u, id); }
56:  @Post('allocations/:id/ready') ready(@CurrentUser() u: any, @Param('id') id: string) { return this.allocs.ready(u, id); }
57:  @Post('allocations/:id/out-for-delivery') out(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.allocs.outForDelivery(u, id, b); }
58:  @Post('allocations/:id/delivered') delivered(@CurrentUser() u: any, @Param('id') id: string) { return this.allocs.delivered(u, id); }
59:  @Post('allocations/:id/insurance') updateInsurance(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.allocs.updateInsurance(u, id, b); }
60:  @Post('allocations/:id/cancel') cancel(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.allocs.cancel(u, id, b?.reason || ''); }
65:  @Post('orders/:id/accept')
70:  @Post('orders/:id/submit-basket')
75:  @Post('orders/:id/insurance')
80:  @Post('orders/:id/preparing')
85:  @Post('orders/:id/ready')
90:  @Post('orders/:id/dispatch')
99:@Controller('provider/inventory')
103:  @Get('search') search(@CurrentUser() u: any, @Query('q') q?: string, @Query('barcode') bc?: string) { return this.svc.search(u, q, bc); }
104:  @Post(':id/restock') restock(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.restock(u, id, Number(b?.qty) || 0); }
105:  @Get('low-stock-alerts') alerts(@CurrentUser() u: any) { return this.svc.listLowStockAlerts(u); }
106:  @Post('low-stock-alerts/:id/ack') ack(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.acknowledgeAlert(u, id); }
112:@Controller('admin/pharmacy')
128:  @Post('seed') seed(@CurrentUser() u: any) { this.assertTestSeedAllowed(); return this.seedSvc.seed(u); }
129:  @Post('seed/sample-order') sampleOrder(@CurrentUser() u: any, @Body() b: any) { this.assertTestSeedAllowed(); return this.seedSvc.seedSampleOrder(b?.patient_account_id || u.id); }
130:  @Post('split/:orderId') async manualSplit(@Param('orderId') id: string) {
135:  @Post('expire-stale-allocations') expireStale() { return this.allocs.expireStale(); }
141:@Controller('provider/pharmacy/broadcasts')
145:  @Get() list(@CurrentUser() u: any) { return this.bc.listForPharmacy(u); }
146:  @Get(':id') detail(@CurrentUser() u: any, @Param('id') id: string) { return this.bc.detail(u, id); }
147:  @Post(':orderId/i-have-all') haveAll(@CurrentUser() u: any, @Param('orderId') oid: string, @Body() b: any) { return this.bc.claimHaveAll(u, oid, b); }
148:  @Post(':orderId/i-have-partial') havePartial(@CurrentUser() u: any, @Param('orderId') oid: string, @Body() b: any) { return this.bc.respondPartial(u, oid, b); }
149:  @Post(':orderId/reject') reject(@CurrentUser() u: any, @Param('orderId') oid: string, @Body() b: any) { return this.bc.respondReject(u, oid, b); }
152:@Controller('admin/pharmacy/broadcasts')
157:  @Post(':orderId/advance') advance(@Param('orderId') id: string) { return this.bc.advanceRound(id); }
158:  @Post(':orderId/fallback-split') fallback(@Param('orderId') id: string) { return this.bc.fallbackSplit(id); }
159:  @Post('expire-stale') expireStale() { return this.bc.expireStaleBroadcasts(); }
162:@Controller('pharmacy/chat')
166:  @Get('threads') list(@CurrentUser() u: any, @Query('order_id') oid?: string) { return this.chat.listThreads(u, oid); }
167:  @Get('threads/:id/messages') msgs(@CurrentUser() u: any, @Param('id') id: string) { return this.chat.listMessages(u, id); }
168:  @Post('threads/:id/messages') post(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.chat.postMessage(u, id, b); }
169:  @Post('threads/:id/accept-substitute/:msgId') accept(@CurrentUser() u: any, @Param('id') id: string, @Param('msgId') mid: string) { return this.chat.acceptSubstitute(u, id, mid); }
170:  @Post('threads/:id/reject') reject(@CurrentUser() u: any, @Param('id') id: string) { return this.chat.rejectOrRemove(u, id, 'rejected'); }
171:  @Post('threads/:id/remove-item') remove(@CurrentUser() u: any, @Param('id') id: string) { return this.chat.rejectOrRemove(u, id, 'removed'); }
174:@Controller('admin/pharmacy/chat')
179:  @Post('sweep-auto-close') sweep() { return this.chat.sweepAutoClose(); }
182:@Controller('provider/pharmacy/shortage-flags')
186:  @Post() report(@CurrentUser() u: any, @Body() b: any) { return this.svc.reportByPharmacy(u, b); }
187:  @Get() list(@CurrentUser() u: any, @Query('status') st?: string) { return this.svc.list(u, st); }
190:@Controller('admin/pharmacy/shortage-flags')
195:  @Post() create(@CurrentUser() u: any, @Body() b: any) { return this.svc.createByAdmin(u, b); }
196:  @Get() list(@CurrentUser() u: any, @Query('status') st?: string) { return this.svc.list(u, st); }
197:  @Get('dashboard') getDashboard(@CurrentUser() u: any) { return this.svc.getShortageDashboard(u); }
198:  @Post(':id/mark') markShortage(@CurrentUser() u: any, @Param('id') medicineId: string, @Body() b: any) { return this.svc.adminMarkShortage(u, medicineId, b); }
199:  @Post(':id/approve') approve(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.approve(u, id); }
200:  @Post(':id/reject') reject(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.reject(u, id, b?.reason); }
201:  @Post(':id/resolve') resolve(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.resolve(u, id); }
204:@Controller('patient/pharmacy/shortage-flags')
209:  @Get('lookup') lookup(@Query('sku') sku?: string, @Query('generic_name') gn?: string) { return this.svc.lookupForPatient(sku, gn); }
