# Provider specialty contract map
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
## /tmp/nabdah-appointment-work/nabdah-backend/src/modules/radiology/controllers/radiology-provider.controller.ts
25:@Controller('radiology/provider')
56:  @Get('queue')
73:  @Post(':id/respond')
98:  @Post('allocate-machine/:id')
130:  @Post('finalize-scan/:id')
161:  @Get('wallet')
192:  @Get('catalog')
197:  @Post('catalog/:id')
206:  @Get('inventory')
213:  @Post('inventory')
## /tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:5:@Controller('labs')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:9:  @Public() @Get('services')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:29:  @Public() @Get('packages')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:32:  @Public() @Get('categories')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:35:  @Public() @Get('services/:id')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:38:  @Post('bookings')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:41:  @Get('bookings/mine')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:44:  @Get('bookings/:id')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:47:  @Post('bookings/:id/cancel')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:50:  @Patch('bookings/:id/state')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:55:  @Post('bookings/:id/documents')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:60:  @Patch('bookings/:id/insurance')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:65:  @Patch('bookings/:id/items/:serviceId/opt-in-cash')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:70:  @Get('provider/inbox')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:75:  @Post('bookings/:id/assign-technician')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:80:  @Post('bookings/:id/upload-report')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:86:  @Patch('bookings/:id/reschedule')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:91:  @Post('bookings/:id/gps')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:96:  @Get('bookings/:id/tracking')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:101:  @Post('bookings/:id/emergency')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:106:  @Post('bookings/:id/reassign')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:111:  @Get('admin/all')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:124:  @Post('samples/register')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:130:  @Patch('samples/:id/stage')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:136:  @Get('samples')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:143:  @Post('admin/catalog')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:149:  @Put('admin/catalog/:id')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:155:  @Delete('admin/catalog/:id')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:162:  @Patch('admin/bookings/:id/force-state')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:168:  @Public() @Get('packages/:id')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:173:  @Public() @Get('compatible-providers')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/controllers/labs-engine.controller.ts:7:@Controller('labs/bookings')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/controllers/labs-engine.controller.ts:14:  @Get('queue')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/controllers/labs-engine.controller.ts:23:  @Post(':id/respond')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/controllers/labs-engine.controller.ts:42:  @Post('collect-sample/:id')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/controllers/labs-engine.controller.ts:70:  @Post('finalize-test/:id')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/controllers/labs-engine.controller.ts:100:  @Get('catalog')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/controllers/labs-engine.controller.ts:106:  @Post('catalog')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/controllers/labs-engine.controller.ts:121:  @Get('wallet')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/lab-results.controller.ts:8:@Controller('lab-results')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/lab-results.controller.ts:11:  @Post() create(@CurrentUser() u: any, @Body() b: any) { return this.svc.create(u, b); }
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/lab-results.controller.ts:12:  @Get('mine') mine(@CurrentUser() u: any) { return this.svc.mineFor(u); }
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/lab-results.controller.ts:13:  @Get('by-booking/:bid') byBkg(@CurrentUser() u: any, @Param('bid') bid: string) { return this.svc.byBooking(u, bid); }
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/lab-results.controller.ts:14:  @Get(':id') one(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.one(u, id); }
## /tmp/nabdah-appointment-work/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts
21:@Controller('home-care')
33:  @Get('services') servicesList(@Query() q: any) {
39:  @Get('services/:id') async serviceOne(@Param('id') id: string) {
45:  @Get('providers') async providers(@Query() q: any) {
53:  @Get('providers/:id') async provider(@Param('id') id: string) {
74:  @Post('bookings') async createBooking(@CurrentUser() u: any, @Body() body: any) {
98:  @Get('bookings/my') myBookings(@CurrentUser() u: any, @Query() q: any) {
104:  @Get('bookings/nursing/all') nursingQueue(@CurrentUser() u: any, @Query() q: any) {
141:  @Post('bookings/:id/respond') respond(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
151:  @Post('bookings/:id/assign') async assign(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
158:  @Post('bookings/:id/check-in') checkIn(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
162:  @Post('bookings/:id/gps') async gps(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
170:  @Post('bookings/:id/visit-report') visitReport(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
183:  @Get('care-plans/:patientId') async listCarePlans(@CurrentUser() u: any, @Param('patientId') patientId: string) {
189:  @Post('care-plans/:patientId') async createCarePlan(@CurrentUser() u: any, @Param('patientId') patientId: string, @Body() body: any) {
209:  @Post('provider/availability') async setAvailability(@CurrentUser() u: any, @Body() body: any) {
215:  @Post('inventory/request') async inventoryRequest(@CurrentUser() u: any, @Body() body: any) {
265:@Controller('provider/nursing')
268:  @Get('checklist') checklist(@Query('category') category?: string) {
271:  @Get('supplies') supplies() { return { items: NURSING_SUPPLIES }; }
276:@Controller()
281:  @Get('chats/provider') providerThreads(@CurrentUser() u: any, @Query() q: any) {
285:  @Get('chat/channels') channels(@CurrentUser() u: any, @Query() q: any) {
289:  @Get('chats/:id/messages') getMessages(@CurrentUser() u: any, @Param('id') id: string, @Query() q: any) {
293:  @Post('chats/:id/messages') postMessage(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
298:  @Post('chat/messages/:threadId') postLegacy(@CurrentUser() u: any, @Param('threadId') threadId: string, @Body() body: any) {
303:  @Post('provider/chat/send') providerSend(@CurrentUser() u: any, @Body() body: any) {

## Client specialty paths
provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:221:      client.get('/provider/pharmacy/broadcasts') // real open broadcasts for this pharmacy
provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:256:      const res = await client.post(`/provider/pharmacy/orders/${orderId}/accept`);
provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:275:      await client.post(`/pharmacy/orders/${rejectOrderId}/reject`, { reason: reasonId });
provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:384:      const res = await client.get(`/pharmacy/prescriptions/${encodeURIComponent(rxNumber.trim())}`);
provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:405:      await client.post(`/pharmacy/orders/${order.id}/ready`);
provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:510:    client.get('/pharmacy/returns/provider/list')
provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:527:      const res: any = await client.get('/pharmacy/procurement/my-requests');
provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:536:      const res: any = await client.post('/pharmacy/procurement/analyze-file', payload);
provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:575:      await client.post('/pharmacy/procurement/submit-request', {
provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:770:        client.get('/provider/wallet'),
provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:771:        client.get('/provider/wallet/transactions').catch(() => ({ data: [] })),
provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:793:      const res = await client.post('/pharmacy/reports/eod');
provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:932:    client.get('/pharmacy/returns/provider/list')
provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:999:        client.get('/provider/pharmacy/allocations', { params: { status: 'ready_for_pickup' } }),
provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:1000:        client.get('/provider/pharmacy/allocations', { params: { status: 'out_for_delivery' } }),
provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:1025:      await client.post(`/provider/pharmacy/orders/${selected.order_id}/dispatch`, {
provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:1046:      await client.post(`/provider/pharmacy/allocations/${alloc.id}/delivered`);
provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:1160:    client.get('/provider/pharmacy/allocations')
provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:1197:      client.get('/provider/inventory/search', { params: { q: subSearch } })
provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:1215:      const res = await client.post(`/provider/pharmacy/orders/${orderId}/insurance`, { policyNo: nphiesData.policyNo, authCode: nphiesData.authCode, copay: Number(nphiesData.copay) || 0, status: 'APPROVED' });
provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:1239:      await client.post(`/provider/pharmacy/orders/${orderId}/submit-basket`, { basket, insuranceStatus, copay });
provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:1401:    client.get('/provider/pharmacy/orders', { params: { status: 'completed' } })
provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:1453:      const res = await client.get('/provider/capabilities/pharmacy');
provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:1466:      await client.post('/provider/capabilities/pharmacy', { ...item, ...patch });
provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:1568:      const res = await client.get(`/pharmacy/chat/threads/${threadId}/messages`);
provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:1576:    client.get('/pharmacy/chat/threads')
provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:1593:      await client.post(`/pharmacy/chat/threads/${activeThread.id}/messages`, { text: input.trim() });
provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:1669:      await client.post('/provider/settings/delta', { 
provider-app/src/screens/lab/LabQcActions.tsx:27:      await client.post(`/provider/ops/lab/bookings/${booking.id}/qc/${action}`, body);
provider-app/src/screens/lab/LabDashboard.tsx:56:    client.get('/labs/provider/inbox')
provider-app/src/screens/lab/LabDashboard.tsx:224: const inboxRes = await client.get('/labs/provider/inbox');
provider-app/src/screens/lab/LabDashboard.tsx:241: const resSamples = await client.get('/labs/samples');
provider-app/src/screens/lab/LabDashboard.tsx:373:      await client.patch(`/labs/bookings/${order.id}/state`, { state: 'SAMPLE_REJECTED' });
provider-app/src/screens/lab/LabDashboard.tsx:383:      await client.patch(`/labs/bookings/${order.id}/state`, { state: 'WAITING_COPAY', note: `nphies_code: ${nphiesCode}, copay: ${copay}` });
provider-app/src/screens/lab/LabDashboard.tsx:397:      await client.patch(`/labs/bookings/${order.id}/state`, { state: 'CONFIRMED' });
provider-app/src/screens/lab/LabDashboard.tsx:410:      await client.post(`/labs/bookings/${order.id}/assign-technician`, { technician_id: techName });
provider-app/src/screens/lab/LabDashboard.tsx:425:      await client.patch(`/labs/bookings/${order.id}/reschedule`, { new_date: rescheduleDate, reason: 'Provider Reschedule' });
provider-app/src/screens/lab/LabDashboard.tsx:440:      await client.patch(`/labs/bookings/${order.id}/state`, { state: 'PROCESSING', note: `Barcode: ${barcode}. ${notes}` });
provider-app/src/screens/lab/LabDashboard.tsx:614: const res = await client.get('/labs/samples');
provider-app/src/screens/lab/LabDashboard.tsx:629: await client.patch(`/labs/samples/${sam.id}/stage`, { stage: 'analyzing' });
provider-app/src/screens/lab/LabDashboard.tsx:741:   await client.post(`/labs/bookings/${sample.lab_order_id || sample.id}/upload-report`, { file: 'lab_report_signature.pdf' });
provider-app/src/screens/lab/LabDashboard.tsx:826:            await client.patch(`/labs/samples/${sample.id}/stage`, { stage: 'result_uploaded', approved_by_supervisor: true });
provider-app/src/screens/lab/LabDashboard.tsx:849:              await client.patch(`/labs/samples/${sample.id}/stage`, { stage: 'sample_rejected', reason: rejectReason });
provider-app/src/screens/lab/LabDashboard.tsx:882: await client.post(`/labs/bookings/${sample.lab_order_id || sample.id}/upload-report`, { results: RESULTS, send_to: sendTo });
provider-app/src/screens/lab/LabDashboard.tsx:883: await client.patch(`/labs/samples/${sample.id}/stage`, { stage: 'sent' });
provider-app/src/screens/lab/LabDashboard.tsx:943: useEffect(() => { client.get('/labs/packages').then(r => setBundlesList(r.data || [])).catch(() => {}); }, []);
provider-app/src/screens/lab/LabDashboard.tsx:1009:    await client.post('/approval-workflow/requests', {
provider-app/src/screens/lab/LabDashboard.tsx:1045:          await client.post(`/labs/bookings/${order.id}/gps`, { eta, distance });
provider-app/src/screens/lab/LabDashboard.tsx:1081:              await client.patch(`/labs/bookings/${order?.id}/state`, { state: 'IN_LAB', note: 'ARRIVED at location' });
provider-app/src/screens/lab/LabDashboard.tsx:1091:              await client.patch(`/labs/bookings/${order?.id}/state`, { state: 'IN_TRANSIT' });
provider-app/src/screens/lab/LabDashboard.tsx:1102:            await client.post(`/labs/bookings/${order?.id}/emergency`, { reason: 'PATIENT_ABSENT' });
provider-app/src/screens/lab/LabDashboard.tsx:1107:            await client.post(`/labs/bookings/${order?.id}/emergency`, { reason: 'WRONG_LOCATION' });
provider-app/src/screens/lab/LabDashboard.tsx:1112:            await client.post(`/labs/bookings/${order?.id}/reassign`);
provider-app/src/screens/lab/LabDashboard.tsx:1140:                    await client.post(`/labs/bookings/${order.id}/assign-technician`, { technician_id: col.id });
provider-app/src/screens/lab/LabDashboard.tsx:1242: const res = await client.get('/labs/provider/inbox');
provider-app/src/screens/lab/LabDashboard.tsx:1256: await client.patch(`/labs/bookings/${selectedOrder.id}/insurance`, {
provider-app/src/screens/lab/LabDashboard.tsx:1508:      const res = await client.get('/provider/capabilities/lab-services');
provider-app/src/screens/lab/LabDashboard.tsx:1520:      await client.post('/approval-workflow/requests', {
provider-app/src/screens/lab/LabDashboard.tsx:1541:      await client.post('/approval-workflow/requests', {
provider-app/src/screens/radiology/RadiologyDashboard.tsx:91:      const res = await client.get('/radiology/provider/inbox');
provider-app/src/screens/radiology/RadiologyDashboard.tsx:141:  const fetch = useCallback(async () => { try { setLoading(true); const res = await client.get('/radiology/provider/inbox'); setOrders(res.data || []); } catch {} finally { setLoading(false); } }, []);
provider-app/src/screens/radiology/RadiologyDashboard.tsx:194:  const refresh = async () => { try { const res = await client.get(`/radiology/bookings/${order.id}`); setCurrentOrder(res.data); } catch {} };
provider-app/src/screens/radiology/RadiologyDashboard.tsx:197:    try { await client.post(`/radiology/bookings/${currentOrder.id}/${action}`, body || {}); show(AR ? 'تم بنجاح' : 'Done', 'success'); await refresh(); }
provider-app/src/screens/radiology/RadiologyDashboard.tsx:205:    try { await client.post(`/radiology/bookings/${currentOrder.id}/insurance-approval`, { approval_code: nphiesCode, copay: parseFloat(copay) || 0 }); show(AR ? 'تم إرسال التأمين للمريض' : 'Insurance approval sent', 'success'); setShowNphies(false); await refresh(); }
provider-app/src/screens/radiology/RadiologyDashboard.tsx:212:    try { await client.post(`/radiology/bookings/${currentOrder.id}/abort`, { reason: abortReason }); show(AR ? 'تم إلغاء الفحص وإنشاء طلب استرداد' : 'Scan aborted. Refund ticket created.', 'info'); setShowAbort(false); await refresh(); }
provider-app/src/screens/radiology/RadiologyDashboard.tsx:228:      await client.patch(`/radiology/bookings/${currentOrder.id}/reschedule`, { new_date: newDate, reason: 'reschedule_after_abort' });
provider-app/src/screens/radiology/RadiologyDashboard.tsx:270:          <NBtn label={AR?' تأكيد الطلب (كاش)':' Confirm Order (Cash)'} loading={loading} onPress={async () => { setLoading(true); try { await client.patch(`/radiology/bookings/${currentOrder.id}/state`, { state:'CONFIRMED', note:'Cash confirmed' }); show(AR?'تم التأكيد':'Confirmed','success'); await refresh(); } catch(e:any){show(e.message,'error');} finally{setLoading(false);} }} />
provider-app/src/screens/radiology/RadiologyDashboard.tsx:272:          <NBtn label={AR?' رفض الطلب':' Decline Order'} variant="danger" loading={loading} onPress={async () => { setLoading(true); try { await client.patch(`/radiology/bookings/${currentOrder.id}/state`, { state:'CANCELLED', note:'Rejected by center' }); show(AR?'تم الرفض':'Declined','info'); onBack(); } catch(e:any){show(e.message,'error');} finally{setLoading(false);} }} />
provider-app/src/screens/radiology/RadiologyDashboard.tsx:338:      await client.post(`/radiology/bookings/${order.id}/upload-report`, { pdf_url: 'https://storage.nabdah.com/reports/' + order.id + '.pdf', dicom_url: dicomUrl || null, findings });
provider-app/src/screens/radiology/RadiologyDashboard.tsx:347:    try { await client.post(`/radiology/bookings/${order.id}/submit-report-for-review`, {}); setReportStatus('under_review'); show(AR ? 'تم الإرسال للمراجعة' : 'Sent for review', 'success'); }
provider-app/src/screens/radiology/RadiologyDashboard.tsx:353:    try { await client.post(`/radiology/bookings/${order.id}/approve-report`, {}); setReportStatus('ready'); show(AR?'تم نشر التقرير للمريض':'Report published','success'); onBack(); }
provider-app/src/screens/radiology/RadiologyDashboard.tsx:425:  useEffect(() => { client.get('/provider/capabilities/radiology').then(r => setServices(r.data || [])).catch(() => {}).finally(() => setLoading(false)); }, []);
provider-app/src/screens/radiology/RadiologyDashboard.tsx:430:      await client.post('/radiology/catalog/delta-request', { name_ar: nameAr, name_en: nameEn, modality_category: modality, price: parseFloat(price), estimated_duration_minutes: parseInt(duration) || 30, insurance_availability: insAvail, portable_ultrasound: portableUS, requires_pregnancy_check: riskPregnancy, requires_metal_implant_check: riskMetal, requires_contrast_allergy_check: riskContrast, preparation_keys: prepItems });
provider-app/src/screens/radiology/RadiologyDashboard.tsx:502:    try { await client.post('/radiology/catalog/delta-request', { type: 'schedule_update', working_days: workingDays, morning_shift: { from: morningFrom, to: morningTo }, evening_shift: { from: eveningFrom, to: eveningTo }, emergency_available: emergencyAvailable }); show(AR ? 'تم حفظ الجدول وإرساله للمراجعة' : 'Schedule saved and sent for review', 'success'); }
provider-app/src/screens/nursing/NursingDashboard.tsx:84: client.get('/provider/jobs/queue?kind=nursing&status=incoming'),
provider-app/src/screens/nursing/NursingDashboard.tsx:85: client.get('/provider/jobs/queue?kind=nursing&status=active'),
provider-app/src/screens/nursing/NursingDashboard.tsx:86: client.get('/provider/jobs/queue?kind=nursing&status=completed')
provider-app/src/screens/nursing/NursingDashboard.tsx:143:               await client.post(`/nursing/visits/${incomingRequest.id}/respond`, { accept: true });
provider-app/src/screens/nursing/NursingDashboard.tsx:153:               await client.post(`/nursing/visits/${incomingRequest.id}/respond`, { accept: false });
provider-app/src/screens/nursing/NursingDashboard.tsx:230: await client.post('/home-care/provider/availability', { available: nextVal });
provider-app/src/screens/nursing/NursingDashboard.tsx:362:    client.get('/nursing/jobs/active').then(res => setJobs(res.data || []));
provider-app/src/screens/nursing/NursingDashboard.tsx:424: await client.post(`/home-care/bookings/${order.id}/respond`, { accept: true });
provider-app/src/screens/nursing/NursingDashboard.tsx:435: await client.post(`/home-care/bookings/${order.id}/respond`, { accept: false });
provider-app/src/screens/nursing/NursingDashboard.tsx:510: useEffect(() => { client.get('/provider/nursing/checklist').then(r => setItems(r.data || [])).catch(() => {}); }, []);
provider-app/src/screens/nursing/NursingDashboard.tsx:580: if (p) await client.post(`/home-care/bookings/${order.id}/gps`, p);
provider-app/src/screens/nursing/NursingDashboard.tsx:602: await client.post(`/home-care/bookings/${order.id}/gps`, p);
provider-app/src/screens/nursing/NursingDashboard.tsx:615: const res = await client.post(`/home-care/bookings/${order.id}/check-in`, p);
provider-app/src/screens/nursing/NursingDashboard.tsx:670: await client.post(`/home-care/bookings/${order.id}/visit-report`, { complete: true });
provider-app/src/screens/nursing/NursingDashboard.tsx:699: const res = await client.get(`/home-care/care-plans/${patientId}`);
provider-app/src/screens/nursing/NursingDashboard.tsx:710: await client.post(`/home-care/care-plans/${patientId}`, {
provider-app/src/screens/nursing/NursingDashboard.tsx:774: const res = await client.get(`/nursing/notes/${patientId}`);
provider-app/src/screens/nursing/NursingDashboard.tsx:808:     await client.post('/nursing/notes', { patient_id: patientId, booking_id: patient?.id, vitals, note });
provider-app/src/screens/nursing/NursingDashboard.tsx:870: await client.post(`/home-care/bookings/${order.id}/visit-report`, {
provider-app/src/screens/nursing/NursingDashboard.tsx:950: useEffect(() => { client.get('/provider/nursing/supplies').then(r => setSupplies(r.data || [])).catch(() => {}); }, []);
provider-app/src/screens/nursing/NursingDashboard.tsx:956: await client.post('/home-care/inventory/request', {
provider-app/src/screens/nursing/NursingDashboard.tsx:1031: client.get('/provider/wallet'),
provider-app/src/screens/nursing/NursingDashboard.tsx:1032: client.get('/provider/wallet/transactions'),
provider-app/src/screens/nursing/NursingDashboard.tsx:1047: await client.post('/provider/payouts/request', { amount });
provider-app/src/screens/nursing/NursingDashboard.tsx:1119:      await client.post('/provider/settings/delta', { newData });
provider-app/src/screens/nursing/NursingDashboard.tsx:1216:   await client.post('/provider/settings/delta', { newData: { services, includeKit, kitPrice } });
provider-app/src/screens/nursing/NursingDashboard.tsx:1308:   await client.post('/provider/settings/delta', { 
provider-app/src/screens/nursing/NursingDashboard.tsx:1402:   await client.post('/nursing/coverage/verify-gps', { radius });
provider-app/src/screens/nursing/NursingDashboard.tsx:1471:      await client.post('/provider/settings/delta', { newData: { radius } });
provider-app/src/screens/nursing/NursingDashboard.tsx:1514: const res = await client.get('/provider/profile');
provider-app/src/screens/nursing/NursingDashboard.tsx:1532: await client.patch('/provider/profile', {
provider-app/src/screens/nursing/NursingDashboard.tsx:1600:        const res = await client.post('/chats/threads/booking', { booking_kind: 'nursing', booking_id: order?.id || order?.raw?.id });
provider-app/src/screens/nursing/NursingDashboard.tsx:1613:        const res = await client.get(`/chats/threads/${threadId}/messages`);
provider-app/src/screens/nursing/NursingDashboard.tsx:1628:      await client.post(`/chats/threads/${threadId}/messages`, { body: txt, client_message_id: `n_${Date.now()}` });
provider-app/src/screens/nursing/NursingDashboard.tsx:1629:      const res = await client.get(`/chats/threads/${threadId}/messages`);
provider-app/src/screens/nursing/NursingDashboard.tsx:1677:      await client.post('/provider/schedule/settings', { shifts, maxVisits: parseInt(maxVisits), emergencyReady });
provider-app/src/screens/nursing/NursingFieldOps.tsx:67:      const res = await client.post(`/nursing/visits/${order.id}/${endpoint}`, payload);
provider-app/src/screens/facility/FacilityAnnouncementsScreen.tsx:21:      const res = await client.get('/facility/announcements');
provider-app/src/screens/facility/FacilityAnnouncementsScreen.tsx:32:      await client.post('/facility/announcements', { text: message.trim() });
provider-app/src/screens/facility/FacilityLeaveRequestsScreen.tsx:33:      const res = await client.get('/provider/leave-requests');
provider-app/src/screens/facility/FacilityLeaveRequestsScreen.tsx:44:      await client.post('/provider/leave-requests/action', { id, action });
provider-app/src/screens/facility/FacilityAuditLogScreen.tsx:16:    client.get('/provider/facility/audit-logs')
provider-app/src/screens/facility/FacilityResourcesScreen.tsx:33:      const res = await client.get('/facility/resources');
provider-app/src/screens/facility/FacilityResourcesScreen.tsx:47:      await client.post('/facility/resources', { name_ar: nameAr.trim(), name_en: nameEn.trim(), type: addType });
provider-app/src/screens/facility/FacilityResourcesScreen.tsx:60:      await client.put(`/facility/resources/${res.id}`, { status: next });
provider-app/src/screens/facility/FacilityUnifiedCalendarScreen.tsx:16:    client.get('/provider/facility/calendar')
provider-app/src/screens/facility/FacilityPatientTrackerScreen.tsx:16:    client.get('/provider/facility/patients/active')
provider-app/src/screens/facility/FacilityInvitationScreen.tsx:53:      await client.post('/hospital/invitations', {
provider-app/src/screens/facility/DischargeSummaryScreen.tsx:25:    client.get('/facility/beds/admissions')
provider-app/src/screens/facility/DischargeSummaryScreen.tsx:45:      await client.put(`/facility/beds/discharge/${selected.id}`, {
provider-app/src/screens/facility/FacilityProfileConfigScreen.tsx:26:        const res = await client.get('/provider/profile');
provider-app/src/screens/facility/FacilityProfileConfigScreen.tsx:43:      await client.patch('/provider/profile', {
provider-app/src/screens/facility/FacilityInternalChatScreen.tsx:22:    client.get('/chat/threads')
provider-app/src/screens/facility/FacilityInternalChatScreen.tsx:37:      client.get(`/chat/threads/${activeChat}/messages`)
provider-app/src/screens/facility/FacilityInternalChatScreen.tsx:55:      await client.post(`/chat/threads/${activeChat}/messages`, { body: inputText, type: 'text' });
provider-app/src/screens/facility/FacilityDashboard.tsx:77:    client.get('/facility/inbox').then(res => setOrders(res.data || []));
provider-app/src/screens/facility/FacilityDashboard.tsx:140:        client.get('/facility/beds/wards'),
provider-app/src/screens/facility/FacilityDashboard.tsx:141:        client.get('/facility/surgeries/schedule')
provider-app/src/screens/facility/FacilityDashboard.tsx:160:    client.get('/hospital/branches').then(r => {
provider-app/src/screens/facility/FacilityDashboard.tsx:263:   client.get('/provider/jobs/queue?status=active&kind=appointment&today=true').then(r => setTodayApts(r.data || [])).catch(() => {});
provider-app/src/screens/facility/FacilityDashboard.tsx:264:   client.get('/hospital/staff').then(r => setSubaccounts(r.data || [])).catch(() => {});
provider-app/src/screens/facility/FacilityDashboard.tsx:265:   client.get('/provider/stats/today').then(r => setTodayStats(r.data || null)).catch(() => {});
provider-app/src/screens/facility/FacilityDashboard.tsx:272: client.get('/provider/jobs/queue?status=active&kind=appointment&today=true'),
provider-app/src/screens/facility/FacilityDashboard.tsx:273: client.get('/hospital/staff'),
provider-app/src/screens/facility/FacilityDashboard.tsx:274: client.get('/provider/stats/today'),
provider-app/src/screens/facility/FacilityDashboard.tsx:555: const res = await client.get('/hospital/staff');
provider-app/src/screens/facility/FacilityDashboard.tsx:579:     await client.delete(`/hospital/staff/${showDelete}`);
provider-app/src/screens/facility/FacilityDashboard.tsx:759: const response = await client.post('/hospital/staff', {
provider-app/src/screens/facility/FacilityDashboard.tsx:939:   client.get('/hospital/staff')
provider-app/src/screens/facility/FacilityDashboard.tsx:1017: useEffect(() => { client.get('/provider/facility/shifts').then(r => setShifts(r.data || [])).catch(() => {}); }, []);
provider-app/src/screens/facility/FacilityDashboard.tsx:1062:     await client.post(`/facility/shifts/${needingSub.id}/substitute`, {});
provider-app/src/screens/facility/FacilityDashboard.tsx:1133: const res = await client.get(`/facility/beds/wards/${ward.id}/beds`);
provider-app/src/screens/facility/FacilityDashboard.tsx:1147: const res = await client.post('/facility/beds/admission', {
provider-app/src/screens/facility/FacilityDashboard.tsx:1175: await client.put(`/facility/beds/discharge/${admissionId}`);
provider-app/src/screens/facility/FacilityDashboard.tsx:1192: await client.post('/facility/beds/wards', {
provider-app/src/screens/facility/FacilityDashboard.tsx:1341: useEffect(() => { client.get('/provider/jobs/queue?status=active&kind=appointment&today=true').then(r => setTodayApts(r.data || [])).catch(() => {}); }, []);
provider-app/src/screens/facility/FacilityDashboard.tsx:1440: await client.patch(`/care/appointments/${encodeURIComponent(apptId)}/check-in`);
provider-app/src/screens/facility/FacilityDashboard.tsx:1472:   client.get('/provider/facility/patients/active')
provider-app/src/screens/facility/FacilityDashboard.tsx:1593:   client.get('/insurance/requests/provider/queue')
provider-app/src/screens/facility/FacilityDashboard.tsx:1691:   client.get('/provider/ops/wallet/ledger')
provider-app/src/screens/facility/FacilityDashboard.tsx:1842:   client.get('/facility/shifts/attendance')
provider-app/src/screens/facility/FacilityDashboard.tsx:1955: await client.post('/facility/surgeries/book', {
provider-app/src/screens/facility/FacilityDashboard.tsx:2072:   client.get('/hospital/staff')
provider-app/src/screens/facility/FacilityDashboard.tsx:2170:   await client.post('/provider/settings/delta', { 
provider-app/src/screens/facility/FacilityDashboard.tsx:2187:      await client.post('/provider/settings/delta', { newData });
provider-app/src/screens/facility/FacilityDashboard.tsx:2335: const resBookings = await client.get('/home-care/bookings/nursing/all');
provider-app/src/screens/facility/FacilityDashboard.tsx:2338: const resNurses = await client.get('/home-care/providers?availability=now');
provider-app/src/screens/facility/FacilityDashboard.tsx:2355: await client.post(`/home-care/bookings/${selectedBooking.id}/assign`, {
provider-app/src/screens/facility/FacilityDashboard.tsx:2450:      await client.post(`/provider/jobs/${kind}/${order.id}/${action}`);
