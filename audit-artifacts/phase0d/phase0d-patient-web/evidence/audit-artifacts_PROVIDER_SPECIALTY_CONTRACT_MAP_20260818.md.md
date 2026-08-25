# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PROVIDER_SPECIALTY_CONTRACT_MAP_20260818.md`
- **Member SHA-256:** `3a6d7b2a7d14899e859a088ca4a6fddcbbdecb76b9ae6eaf87e1365526aafec1`
- **Line count:** 317
- **Read range:** `1-317`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: 27:  @Post('orders/:id/submit') submit(@CurrentUser() u: any, @Param('id') id: string) { return this.orders.submit(u, id); }`
- `9: 28:  @Post('orders/:id/cancel') cancel(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.orders.cancel(u, id, b?.reason || ''); }`
- `20: 60:  @Post('allocations/:id/cancel') cancel(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.allocs.cancel(u, id, b?.reason || ''); }`
- `22: 70:  @Post('orders/:id/submit-basket')`
- `86: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:38:  @Post('bookings')`
- `87: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:41:  @Get('bookings/mine')`
- `88: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:44:  @Get('bookings/:id')`
- `89: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:47:  @Post('bookings/:id/cancel')`
- `90: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:50:  @Patch('bookings/:id/state')`
- `91: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:55:  @Post('bookings/:id/documents')`
- `92: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:60:  @Patch('bookings/:id/insurance')`
- `93: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:65:  @Patch('bookings/:id/items/:serviceId/opt-in-cash')`
### backend_consumers_or_contracts
- `2: ## /tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts`
- `3: 18:@Controller('patient/pharmacy')`
- `10: 34:@Controller('provider/pharmacy')`
- `19: 59:  @Post('allocations/:id/insurance') updateInsurance(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.allocs.updateInsurance(u, id, b); }`
- `23: 75:  @Post('orders/:id/insurance')`
- `32: 112:@Controller('admin/pharmacy')`
- `37: 141:@Controller('provider/pharmacy/broadcasts')`
- `43: 152:@Controller('admin/pharmacy/broadcasts')`
- `54: 174:@Controller('admin/pharmacy/chat')`
- `56: 182:@Controller('provider/pharmacy/shortage-flags')`
- `59: 190:@Controller('admin/pharmacy/shortage-flags')`
- `67: 204:@Controller('patient/pharmacy/shortage-flags')`
### auth_ownership
- `32: 112:@Controller('admin/pharmacy')`
- `43: 152:@Controller('admin/pharmacy/broadcasts')`
- `54: 174:@Controller('admin/pharmacy/chat')`
- `59: 190:@Controller('admin/pharmacy/shortage-flags')`
- `60: 195:  @Post() create(@CurrentUser() u: any, @Body() b: any) { return this.svc.createByAdmin(u, b); }`
- `63: 198:  @Post(':id/mark') markShortage(@CurrentUser() u: any, @Param('id') medicineId: string, @Body() b: any) { return this.svc.adminMarkShortage(u, medicineId, b); }`
- `102: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:111:  @Get('admin/all')`
- `106: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:143:  @Post('admin/catalog')`
- `107: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:149:  @Put('admin/catalog/:id')`
- `108: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:155:  @Delete('admin/catalog/:id')`
- `109: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:162:  @Patch('admin/bookings/:id/force-state')`
- `139: 183:  @Get('care-plans/:patientId') async listCarePlans(@CurrentUser() u: any, @Param('patientId') patientId: string) {`
### state_transitions
- `5: 24:  @Get('orders') list(@CurrentUser() u: any, @Query('status') status?: string) { return this.orders.list(u, status); }`
- `9: 28:  @Post('orders/:id/cancel') cancel(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.orders.cancel(u, id, b?.reason || ''); }`
- `11: 43:  @Get('allocations') list(@CurrentUser() u: any, @Query('status') status?: string) {`
- `18: 58:  @Post('allocations/:id/delivered') delivered(@CurrentUser() u: any, @Param('id') id: string) { return this.allocs.delivered(u, id); }`
- `20: 60:  @Post('allocations/:id/cancel') cancel(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.allocs.cancel(u, id, b?.reason || ''); }`
- `52: 170:  @Post('threads/:id/reject') reject(@CurrentUser() u: any, @Param('id') id: string) { return this.chat.rejectOrRemove(u, id, 'rejected'); }`
- `58: 187:  @Get() list(@CurrentUser() u: any, @Query('status') st?: string) { return this.svc.list(u, st); }`
- `61: 196:  @Get() list(@CurrentUser() u: any, @Query('status') st?: string) { return this.svc.list(u, st); }`
- `89: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:47:  @Post('bookings/:id/cancel')`
- `90: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:50:  @Patch('bookings/:id/state')`
- `109: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:162:  @Patch('admin/bookings/:id/force-state')`
- `168: provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:999:        client.get('/provider/pharmacy/allocations', { params: { status: 'ready_for_pickup' } }),`
### payment_insurance_relevance
- `19: 59:  @Post('allocations/:id/insurance') updateInsurance(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.allocs.updateInsurance(u, id, b); }`
- `23: 75:  @Post('orders/:id/insurance')`
- `75: 161:  @Get('wallet')`
- `92: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:60:  @Patch('bookings/:id/insurance')`
- `93: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:65:  @Patch('bookings/:id/items/:serviceId/opt-in-cash')`
- `119: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/controllers/labs-engine.controller.ts:121:  @Get('wallet')`
- `162: provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:536:      const res: any = await client.post('/pharmacy/procurement/analyze-file', payload);`
- `164: provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:770:        client.get('/provider/wallet'),`
- `165: provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:771:        client.get('/provider/wallet/transactions').catch(() => ({ data: [] })),`
- `174: provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:1215:      const res = await client.post(`/provider/pharmacy/orders/${orderId}/insurance`, { policyNo: nphiesData.policyNo, authCode: nphiesData.authCode, copay: Number(nphiesData.copa`
- `175: provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:1239:      await client.post(`/provider/pharmacy/orders/${orderId}/submit-basket`, { basket, insuranceStatus, copay });`
- `188: provider-app/src/screens/lab/LabDashboard.tsx:383:      await client.patch(`/labs/bookings/${order.id}/state`, { state: 'WAITING_COPAY', note: `nphies_code: ${nphiesCode}, copay: ${copay}` });`
### error_empty_loading_retry_cancel
- `9: 28:  @Post('orders/:id/cancel') cancel(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.orders.cancel(u, id, b?.reason || ''); }`
- `20: 60:  @Post('allocations/:id/cancel') cancel(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.allocs.cancel(u, id, b?.reason || ''); }`
- `89: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:47:  @Post('bookings/:id/cancel')`
- `165: provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:771:        client.get('/provider/wallet/transactions').catch(() => ({ data: [] })),`
- `200: provider-app/src/screens/lab/LabDashboard.tsx:943: useEffect(() => { client.get('/labs/packages').then(r => setBundlesList(r.data || [])).catch(() => {}); }, []);`
- `215: provider-app/src/screens/radiology/RadiologyDashboard.tsx:141:  const fetch = useCallback(async () => { try { setLoading(true); const res = await client.get('/radiology/provider/inbox'); setOrders(res.data || []); } catch {} finally { setLo`
- `216: provider-app/src/screens/radiology/RadiologyDashboard.tsx:194:  const refresh = async () => { try { const res = await client.get(`/radiology/bookings/${order.id}`); setCurrentOrder(res.data); } catch {} };`
- `219: provider-app/src/screens/radiology/RadiologyDashboard.tsx:212:    try { await client.post(`/radiology/bookings/${currentOrder.id}/abort`, { reason: abortReason }); show(AR ? 'تم إلغاء الفحص وإنشاء طلب استرداد' : 'Scan aborted. Refund ticket`
- `220: provider-app/src/screens/radiology/RadiologyDashboard.tsx:228:      await client.patch(`/radiology/bookings/${currentOrder.id}/reschedule`, { new_date: newDate, reason: 'reschedule_after_abort' });`
- `221: provider-app/src/screens/radiology/RadiologyDashboard.tsx:270:          <NBtn label={AR?' تأكيد الطلب (كاش)':' Confirm Order (Cash)'} loading={loading} onPress={async () => { setLoading(true); try { await client.patch(`/radiology/bookings/$`
- `222: provider-app/src/screens/radiology/RadiologyDashboard.tsx:272:          <NBtn label={AR?' رفض الطلب':' Decline Order'} variant="danger" loading={loading} onPress={async () => { setLoading(true); try { await client.patch(`/radiology/bookings`
- `226: provider-app/src/screens/radiology/RadiologyDashboard.tsx:425:  useEffect(() => { client.get('/provider/capabilities/radiology').then(r => setServices(r.data || [])).catch(() => {}).finally(() => setLoading(false)); }, []);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
