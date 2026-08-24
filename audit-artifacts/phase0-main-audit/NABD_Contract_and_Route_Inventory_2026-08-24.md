# NABD Contract and Route Inventory — main baseline checkpoint

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

This checkpoint preserves raw route/controller/gateway decorator evidence from the first-party Backend archive. Each raw line is intentionally retained. It is not a final inventory until every route is semantically linked to DTO/schema/service, actor/ownership, state transition, price/insurance/payment timing, storage/audit, consumers, and tests.

## Global contract context

| Evidence | Source | Consequence |
|---|---|---|
| `/api` prefix and URI versioning | `nabdah-backend/src/main.ts:97-101` | Include deployed prefix/version in canonical paths. |
| strict `ValidationPipe` | `nabdah-backend/src/main.ts:103-108` | DTO/whitelist behavior requires route-level trace. |
| global JWT/roles/throttle/audit/idempotency | `nabdah-backend/src/app.module.ts:257-264` | Global registration does not replace route-level evidence. |
| Bans/correlation middleware | `nabdah-backend/src/app.module.ts:266-269` | Abuse/trace behavior is cross-cutting. |
| Patient Web method gate | `nabd-patient-web/lib/api/patient-allowlist.ts:42-48` | Web mutation reachability is not established by Backend routes. |

## Raw Backend decorator evidence

```text
audit-work/source/nabdah-backend/src/health.controller.ts:7:@Controller()
audit-work/source/nabdah-backend/src/health.controller.ts:15:  @Get()
audit-work/source/nabdah-backend/src/health.controller.ts:26:  @Get('health/liveness')
audit-work/source/nabdah-backend/src/health.controller.ts:32:  @Get('health/readiness')
audit-work/source/nabdah-backend/src/modules/analytics/analytics.module.ts:120:@Controller('admin/analytics')
audit-work/source/nabdah-backend/src/modules/analytics/analytics.module.ts:126:  @Get('overview')
audit-work/source/nabdah-backend/src/modules/analytics/analytics.module.ts:129:  @Get('top-searched')
audit-work/source/nabdah-backend/src/modules/analytics/analytics.module.ts:132:  @Get('top-medicines')
audit-work/source/nabdah-backend/src/modules/analytics/analytics.module.ts:135:  @Get('top-doctors')
audit-work/source/nabdah-backend/src/modules/analytics/analytics.module.ts:138:  @Get('top-pharmacies')
audit-work/source/nabdah-backend/src/modules/analytics/analytics.module.ts:141:  @Get('top-services')
audit-work/source/nabdah-backend/src/modules/storage/storage.module.ts:346:@Controller('storage')
audit-work/source/nabdah-backend/src/modules/storage/storage.module.ts:349:  @Post('upload')
audit-work/source/nabdah-backend/src/modules/storage/storage.module.ts:360:  @Get(':id')
audit-work/source/nabdah-backend/src/modules/storage/storage.module.ts:370:  @Get(':id/signed-url')
audit-work/source/nabdah-backend/src/modules/storage/storage.module.ts:381:  @Post('upload-suggestion-image')
audit-work/source/nabdah-backend/src/modules/storage/storage.module.ts:398:  @Post('upload-cloudinary')
audit-work/source/nabdah-backend/src/modules/users/users.controller.ts:7:@Controller('users')
audit-work/source/nabdah-backend/src/modules/users/users.controller.ts:13:  @Get('me/display')
audit-work/source/nabdah-backend/src/modules/users/users.controller.ts:19:  @Patch('me')
audit-work/source/nabdah-backend/src/modules/users/users.controller.ts:24:  @Get('me/health-id')
audit-work/source/nabdah-backend/src/modules/users/users.controller.ts:29:  @Get('me/profile')
audit-work/source/nabdah-backend/src/modules/users/users.controller.ts:34:  @Patch('me/profile')
audit-work/source/nabdah-backend/src/modules/users/users.controller.ts:39:  @Get('me/wishlist')
audit-work/source/nabdah-backend/src/modules/users/users.controller.ts:44:  @Post('me/wishlist/:itemId')
audit-work/source/nabdah-backend/src/modules/users/users.controller.ts:50:  @Get('me/notification-settings')
audit-work/source/nabdah-backend/src/modules/users/users.controller.ts:55:  @Patch('me/notification-settings')
audit-work/source/nabdah-backend/src/modules/users/users.controller.ts:61:  @Get('me/storage')
audit-work/source/nabdah-backend/src/modules/users/users.controller.ts:66:  @Get('me/privacy-settings')
audit-work/source/nabdah-backend/src/modules/users/users.controller.ts:71:  @Patch('me/privacy-settings')
audit-work/source/nabdah-backend/src/modules/users/users.controller.ts:76:  @Get('me/security-settings')
audit-work/source/nabdah-backend/src/modules/users/users.controller.ts:81:  @Patch('me/security-settings')
audit-work/source/nabdah-backend/src/modules/users/users.controller.ts:86:  @Post('me/change-password')
audit-work/source/nabdah-backend/src/modules/users/users.controller.ts:91:  @Get('me/sessions')
audit-work/source/nabdah-backend/src/modules/users/users.controller.ts:95:  @Delete('me/sessions/:jti')
audit-work/source/nabdah-backend/src/modules/users/users.controller.ts:100:  @Get()
audit-work/source/nabdah-backend/src/modules/users/users.controller.ts:106:  @Post(':id/toggle')
audit-work/source/nabdah-backend/src/modules/users/users.controller.ts:112:  @Delete(':id')
audit-work/source/nabdah-backend/src/modules/users/user.insurance.controller.ts:14:@Controller('user')
audit-work/source/nabdah-backend/src/modules/users/user.insurance.controller.ts:21:  @Get('insurance')
audit-work/source/nabdah-backend/src/modules/users/users.addresses.controller.ts:6:@Controller('users/me/addresses')
audit-work/source/nabdah-backend/src/modules/users/users.addresses.controller.ts:11:  @Get()
audit-work/source/nabdah-backend/src/modules/users/users.addresses.controller.ts:17:  @Post()
audit-work/source/nabdah-backend/src/modules/users/users.addresses.controller.ts:34:  @Patch(':addressId')
audit-work/source/nabdah-backend/src/modules/users/users.addresses.controller.ts:52:  @Delete(':addressId')
audit-work/source/nabdah-backend/src/modules/users/users.insurance.controller.ts:35:@Controller('users/me/insurance')
audit-work/source/nabdah-backend/src/modules/users/users.insurance.controller.ts:40:  @Get()
audit-work/source/nabdah-backend/src/modules/users/users.insurance.controller.ts:56:  @Post()
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:176:@Controller('bookings')
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:179:  @Get('quote') quote(@Query() q: any) {
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:456:@Controller('insurance')
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:462:  @Get('companies') companies() { return this.svc.companiesList(); }
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:463:  @Post('save-policy') savePolicy(@CurrentUser() u: any, @Body() b: any) { return this.svc.savePolicy(u, b); }
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:464:  @Get('my-policy') myPolicy(@CurrentUser() u: any) { return this.svc.myPolicy(u); }
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:466:  @Get('coverage-check') async coverageCheck(@CurrentUser() u: any, @Query() q: any) {
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:478:  @Get('benefits-summary') async benefits(@CurrentUser() u: any) {
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:483:  @Post('requests') createRequest(@CurrentUser() u: any, @Body() b: any) { return this.svc.createRequest(u, b); }
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:484:  @Get('requests/my') myRequests(@CurrentUser() u: any) { return this.svc.myRequests(u); }
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:485:  @Get('requests/:id') one(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.getOne(id, u); }
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:486:  @Post('requests/:id/pay-copay') payCopay(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.payCopay(u, id, b); }
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:487:  @Post('requests/:id/cancel') cancel(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.cancel(u, id); }
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:488:  @Post('requests/:id/resubmit') resubmit(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.resubmit(u, id, b); }
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:489:  @Post('requests/:id/appeal') appeal(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.appeal(u, id, b); }
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:492:  @Get('requests/provider/queue') providerQueue(@CurrentUser() u: any, @Query('state') state?: string) { return this.svc.providerQueue(u, state); }
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:493:  @Post('requests/:id/decide') decide(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.decide(u, id, b); }
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:496:  @Post('payment-confirm') paymentConfirm(@CurrentUser() u: any, @Body() b: any) {
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:501:  @Get('claims/my') claimsMy(@CurrentUser() u: any) { return this.svc.myRequests(u); }
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:505:@Controller()
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:510:  @Post('patient/pay-copay') payCopay(@CurrentUser() u: any, @Body() b: any) {
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:514:  @Post('home-care/insurance/verify') verify(@CurrentUser() u: any) {
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:585:@Controller('refunds')
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:589:  @Post('request') request(@CurrentUser() u: any, @Body() b: any) { return this.svc.request(u, b); }
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:590:  @Get('my') my(@CurrentUser() u: any) { return this.svc.myRefunds(u); }
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:591:  @Get('policy-preview') preview(@Query('scheduled_at') s?: string) {
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:597:@Controller('admin/finance')
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:604:  @Get('ledger/summary') summary() { return this.finance.platformSummary(); }
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:605:  @Get('refunds/queue') refundsQueue() { return this.refunds.adminQueue(); }
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:606:  @Post('refunds/:id/decide') decideRefund(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) {
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:611:@Controller('admin/insurance')
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:615:  @Get('requests') all(@Query('state') state?: string) { return this.svc.adminAll(state); }
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:616:  @Get('stats') stats() { return this.svc.adminStats(); }
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:619:@Controller('finance')
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:624:  @Post('ledger/accrue') accrue(@Body() b: any) { return this.finance.accrue(b); }
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:625:  @Get('ledger/provider/summary') providerSummary(@CurrentUser() u: any) { return this.finance.providerSummary(u.id); }
audit-work/source/nabdah-backend/src/modules/support/support.controller.ts:8:@Controller('support')
audit-work/source/nabdah-backend/src/modules/support/support.controller.ts:11:  @Post('requests') create(@CurrentUser() u: any, @Body() b: any) { return this.svc.create(u, b); }
audit-work/source/nabdah-backend/src/modules/support/support.controller.ts:13:  @Post('tickets') createTicket(@CurrentUser() u: any, @Body() b: any) { return this.svc.create(u, b); }
audit-work/source/nabdah-backend/src/modules/support/support.controller.ts:14:  @Get('requests/mine') mine(@CurrentUser() u: any) { return this.svc.mine(u); }
audit-work/source/nabdah-backend/src/modules/support/support.controller.ts:15:  @Get('requests/:id') one(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.getOne(u, id); }
audit-work/source/nabdah-backend/src/modules/support/support.controller.ts:16:  @Post('requests/:id/reply') reply(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.reply(u, id, b.message); }
audit-work/source/nabdah-backend/src/modules/support/support.controller.ts:19:  @Get('admin/requests') @Roles(UserRole.ADMIN) adminList(@Query('status') status?: string) { return this.svc.adminList(status); }
audit-work/source/nabdah-backend/src/modules/support/support.controller.ts:20:  @Patch('admin/requests/:id') @Roles(UserRole.ADMIN) adminUpdate(@Param('id') id: string, @Body() b: any) { return this.svc.adminUpdateStatus(id, b.status, b.assigned_to); }
audit-work/source/nabdah-backend/src/modules/support/support.controller.ts:23:  @Get('tickets')
audit-work/source/nabdah-backend/src/modules/support/support.controller.ts:29:  @Get('faqs')
audit-work/source/nabdah-backend/src/modules/support/support.controller.ts:34:  @Post('feedback')
audit-work/source/nabdah-backend/src/modules/support/support.controller.ts:39:  @Get('settings') get(@CurrentUser() u: any) { return this.svc.getSettings(u); }
audit-work/source/nabdah-backend/src/modules/support/support.controller.ts:40:  @Patch('settings') update(@CurrentUser() u: any, @Body() b: any) { return this.svc.updateSettings(u, b); }
audit-work/source/nabdah-backend/src/modules/webhooks/webhooks.controller.ts:9:@Controller('webhooks')
audit-work/source/nabdah-backend/src/modules/webhooks/webhooks.controller.ts:14:  @Post('moyasar')
audit-work/source/nabdah-backend/src/modules/webhooks/webhooks.controller.ts:24:  @Post('paytabs')
audit-work/source/nabdah-backend/src/modules/webhooks/webhooks.controller.ts:34:  @Post('sms')
audit-work/source/nabdah-backend/src/modules/webhooks/webhooks.controller.ts:42:  @Post('livekit')
audit-work/source/nabdah-backend/src/modules/community/community.controller.ts:10:@Controller('community')
audit-work/source/nabdah-backend/src/modules/community/community.controller.ts:16:  @Get('posts')
audit-work/source/nabdah-backend/src/modules/community/community.controller.ts:26:  @Post('posts')
audit-work/source/nabdah-backend/src/modules/community/community.controller.ts:31:  @Get('posts/:id')
audit-work/source/nabdah-backend/src/modules/community/community.controller.ts:36:  @Post('posts/:id/comment')
audit-work/source/nabdah-backend/src/modules/community/community.controller.ts:41:  @Put('posts/:id/vote')
audit-work/source/nabdah-backend/src/modules/community/community.controller.ts:46:  @Delete('posts/:id')
audit-work/source/nabdah-backend/src/modules/community/community.controller.ts:53:  @Get('admin/pending')
audit-work/source/nabdah-backend/src/modules/community/community.controller.ts:58:  @Put('admin/:id/moderate')
audit-work/source/nabdah-backend/src/modules/community/community.controller.ts:65:  @Get('live-sessions')
audit-work/source/nabdah-backend/src/modules/community/community.controller.ts:70:  @Post('live-sessions')
audit-work/source/nabdah-backend/src/modules/community/community.controller.ts:75:  @Put('live-sessions/:id/join')
audit-work/source/nabdah-backend/src/modules/community/community.controller.ts:80:  @Put('live-sessions/:id/status')
audit-work/source/nabdah-backend/src/modules/push/push.module.ts:692:@Controller('push')
audit-work/source/nabdah-backend/src/modules/push/push.module.ts:697:  @Post('register')
audit-work/source/nabdah-backend/src/modules/push/push.module.ts:700:  @Post('unregister')
audit-work/source/nabdah-backend/src/modules/push/push.module.ts:703:  @Get('devices')
audit-work/source/nabdah-backend/src/modules/push/push.module.ts:706:  @Post('test')
audit-work/source/nabdah-backend/src/modules/push/push.module.ts:710:  @Post('web/subscribe')
audit-work/source/nabdah-backend/src/modules/push/push.module.ts:722:  @Post('web/unsubscribe')
audit-work/source/nabdah-backend/src/modules/push/push.module.ts:729:  @Get('web/vapid-key')
audit-work/source/nabdah-backend/src/modules/push/push.module.ts:733:  @Post('events')
audit-work/source/nabdah-backend/src/modules/push/push.module.ts:736:  @Post('admin/campaign')
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:7:@Controller('pharmacy')
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:14:  @Get('prescriptions/:rxNumber') async byRxNumber(@CurrentUser() u: any, @Param('rxNumber') rx: string) {
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:26:  @Post('reports/eod') async eod(@CurrentUser() u: any) {
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:42:  @Get('orders/incoming') incoming(@CurrentUser() u: any) { return this.svc.incoming(u); }
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:43:  @Get('orders/preparing') preparing(@CurrentUser() u: any) { return this.svc.preparing(u); }
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:44:  @Get('orders/ready') ready(@CurrentUser() u: any) { return this.svc.ready(u); }
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:45:  @Get('orders/completed') completed(@CurrentUser() u: any) { return this.svc.completed(u); }
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:46:  @Get('orders/basket-review') basketReview(@CurrentUser() u: any) { return this.svc.basketReview(u); }
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:47:  @Get('orders/awaiting-approval') awaitingApproval(@CurrentUser() u: any) { return this.svc.awaitingApproval(u); }
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:48:  @Get('orders/refills') refills(@CurrentUser() u: any) { return this.svc.refillOrders(u); }
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:51:  @Post('orders/:id/accept') accept(@CurrentUser() u: any, @Param('id') id: string) { return this.ordersSvc.accept(id, u); }
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:52:  @Post('orders/:id/reject') reject(@CurrentUser() u: any, @Param('id') id: string, @Body() b: { reason?: string }) { return this.ordersSvc.reject(id, u, b?.reason || ''); }
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:53:  @Post('orders/:id/preparing') preparingAction(@CurrentUser() u: any, @Param('id') id: string) { return this.ordersSvc.markPreparing(id, u); }
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:54:  @Post('orders/:id/ready') readyAction(@CurrentUser() u: any, @Param('id') id: string) { return this.ordersSvc.markReady(id, u); }
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:55:  @Post('orders/:id/partial') partial(@CurrentUser() u: any, @Param('id') id: string, @Body() b: { unavailable_medicine_ids: string[] }) { return this.ordersSvc.markPartial(id, u, b.unavailable_medicine_ids || []); }
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:58:  @Get('inventory') inventory(@CurrentUser() u: any) { return this.svc.getInventory(u); }
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:59:  @Post('inventory/stock') stock(@CurrentUser() u: any, @Body() b: { medicine_id: string; stock_qty: number; is_available?: boolean }) { return this.svc.updateStock(u, b.medicine_id, b.stock_qty, b.is_available !== false); }
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:60:  @Post('inventory/add') addMed(@CurrentUser() u: any, @Body() b: any) { return this.svc.addMedicineToInventory(u, b); }
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:63:  @Get('orders/:id') orderDetail(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.orderDetail(u, id); }
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:64:  @Post('orders/:id/items/:idx/unavailable') itemUnavailable(@CurrentUser() u: any, @Param('id') id: string, @Param('idx') idx: string) { return this.svc.markItemUnavailable(u, id, parseInt(idx, 10)); }
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:65:  @Post('orders/:id/items/:idx/restore') itemRestore(@CurrentUser() u: any, @Param('id') id: string, @Param('idx') idx: string) { return this.svc.restoreItem(u, id, parseInt(idx, 10)); }
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:66:  @Post('orders/:id/items/:idx/qty') itemQty(@CurrentUser() u: any, @Param('id') id: string, @Param('idx') idx: string, @Body() b: { qty: number }) { return this.svc.updateItemQty(u, id, parseInt(idx, 10), b.qty); }
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:67:  @Post('orders/:id/items/:idx/substitute') itemSub(@CurrentUser() u: any, @Param('id') id: string, @Param('idx') idx: string, @Body() b: { name_ar: string; name_en?: string; medicine_id?: string; qty?: number; price?: number; note?: string }) { return this.svc.substituteItem(u, id, parseInt(idx, 10), b); }
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:70:  @Post('orders/:id/submit-basket') submitBasket(@CurrentUser() u: any, @Param('id') id: string, @Body() b: { note?: string }) { return this.svc.submitBasket(u, id, b?.note); }
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:73:  @Post('orders/:id/insurance') setInsurance(@CurrentUser() u: any, @Param('id') id: string, @Body() b: { status: 'approved' | 'rejected' | 'pending'; reason?: string }) {
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:83:@Controller('provider/pharmacy')
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:88:  @Post('orders/:id/accept') accept(@CurrentUser() u: any, @Param('id') id: string) { return this.ordersSvc.accept(id, u); }
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:89:  @Post('orders/:id/submit-basket') submitBasket(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.submitBasket(u, id, b?.note); }
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:90:  @Post('orders/:id/insurance') insurance(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) {
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:93:  @Post('orders/:id/dispatch') dispatch(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) {
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:21:@Controller('home-care')
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:33:  @Get('services') servicesList(@Query() q: any) {
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:39:  @Get('services/:id') async serviceOne(@Param('id') id: string) {
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:45:  @Get('providers') async providers(@Query() q: any) {
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:53:  @Get('providers/:id') async provider(@Param('id') id: string) {
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:74:  @Post('bookings') async createBooking(@CurrentUser() u: any, @Body() body: any) {
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:98:  @Get('bookings/my') myBookings(@CurrentUser() u: any, @Query() q: any) {
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:104:  @Get('bookings/nursing/all') nursingQueue(@CurrentUser() u: any, @Query() q: any) {
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:141:  @Post('bookings/:id/respond') respond(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:151:  @Post('bookings/:id/assign') async assign(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:158:  @Post('bookings/:id/check-in') checkIn(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:162:  @Post('bookings/:id/gps') async gps(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:170:  @Post('bookings/:id/visit-report') visitReport(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:183:  @Get('care-plans/:patientId') async listCarePlans(@CurrentUser() u: any, @Param('patientId') patientId: string) {
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:189:  @Post('care-plans/:patientId') async createCarePlan(@CurrentUser() u: any, @Param('patientId') patientId: string, @Body() body: any) {
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:209:  @Post('provider/availability') async setAvailability(@CurrentUser() u: any, @Body() body: any) {
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:215:  @Post('inventory/request') async inventoryRequest(@CurrentUser() u: any, @Body() body: any) {
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:265:@Controller('provider/nursing')
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:268:  @Get('checklist') checklist(@Query('category') category?: string) {
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:271:  @Get('supplies') supplies() { return { items: NURSING_SUPPLIES }; }
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:276:@Controller()
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:281:  @Get('chats/provider') providerThreads(@CurrentUser() u: any, @Query() q: any) {
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:285:  @Get('chat/channels') channels(@CurrentUser() u: any, @Query() q: any) {
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:289:  @Get('chats/:id/messages') getMessages(@CurrentUser() u: any, @Param('id') id: string, @Query() q: any) {
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:293:  @Post('chats/:id/messages') postMessage(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:298:  @Post('chat/messages/:threadId') postLegacy(@CurrentUser() u: any, @Param('threadId') threadId: string, @Body() body: any) {
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:303:  @Post('provider/chat/send') providerSend(@CurrentUser() u: any, @Body() body: any) {
audit-work/source/nabdah-backend/src/modules/admin-web-core/controllers/admin-config.controller.ts:4:@Controller('admin/config')
audit-work/source/nabdah-backend/src/modules/admin-web-core/controllers/admin-config.controller.ts:8:  @Get('sla')
audit-work/source/nabdah-backend/src/modules/admin-web-core/controllers/admin-config.controller.ts:19:  @Put('sla')
audit-work/source/nabdah-backend/src/modules/admin-web-core/controllers/system-health.controller.ts:3:@Controller('system-health')
audit-work/source/nabdah-backend/src/modules/admin-web-core/controllers/system-health.controller.ts:6:  @Get('liveness')
audit-work/source/nabdah-backend/src/modules/admin-web-core/controllers/system-health.controller.ts:19:  @Get('readiness')
audit-work/source/nabdah-backend/src/modules/admin-web-core/controllers/admin-governance.controller.ts:11:@Controller('admin/governance')
audit-work/source/nabdah-backend/src/modules/admin-web-core/controllers/admin-governance.controller.ts:25:  @Put('trigger-emergency-maintenance')
audit-work/source/nabdah-backend/src/modules/admin-web-core/controllers/admin-governance.controller.ts:33:  @Get('fraud-alerts')
audit-work/source/nabdah-backend/src/modules/admin-web-core/controllers/admin-governance.controller.ts:40:  @Get('audit-logs')
audit-work/source/nabdah-backend/src/modules/admin-web-core/controllers/admin-extended-operations.controller.ts:6:@Controller('admin/extended-operations')
audit-work/source/nabdah-backend/src/modules/admin-web-core/controllers/admin-extended-operations.controller.ts:12:  @Get('procurement/pending')
audit-work/source/nabdah-backend/src/modules/admin-web-core/controllers/admin-extended-operations.controller.ts:22:  @Patch('issue-quote/:procurementId')
audit-work/source/nabdah-backend/src/modules/admin-web-core/controllers/provider-moderation.controller.ts:8:@Controller('providers')
audit-work/source/nabdah-backend/src/modules/admin-web-core/controllers/provider-moderation.controller.ts:45:  @Post('provider-deltas')
audit-work/source/nabdah-backend/src/modules/admin-web-core/controllers/provider-moderation.controller.ts:51:  @Post('provider-deltas/:id/approve')
audit-work/source/nabdah-backend/src/modules/admin-web-core/controllers/provider-moderation.controller.ts:82:  @Post('provider-deltas/:id/reject')
audit-work/source/nabdah-backend/src/modules/admin-web-core/controllers/analytics.controller.ts:13:@Controller('nabd-extensions/admin/analytics')
audit-work/source/nabdah-backend/src/modules/admin-web-core/controllers/analytics.controller.ts:36:  @Get('heatmaps')
audit-work/source/nabdah-backend/src/modules/admin-web-core/controllers/finance.controller.ts:21:@Controller('admin/finance')
audit-work/source/nabdah-backend/src/modules/admin-web-core/controllers/finance.controller.ts:32:  @Get('commissions')
audit-work/source/nabdah-backend/src/modules/admin-web-core/controllers/finance.controller.ts:38:  @Get('withdrawals/pending')
audit-work/source/nabdah-backend/src/modules/admin-web-core/controllers/finance.controller.ts:71:  @Post('withdrawals/:id/execute')
audit-work/source/nabdah-backend/src/modules/admin-web-core/controllers/finance.controller.ts:131:  @Post('withdrawals/:id/reject')
audit-work/source/nabdah-backend/src/modules/bans/bans.controller.ts:14:@Controller('bans')
audit-work/source/nabdah-backend/src/modules/bans/bans.controller.ts:20:  @Post()
audit-work/source/nabdah-backend/src/modules/bans/bans.controller.ts:25:  @Delete(':value')
audit-work/source/nabdah-backend/src/modules/bans/bans.controller.ts:30:  @Get()
audit-work/source/nabdah-backend/src/modules/media/media.controller.ts:10:@Controller('media')
audit-work/source/nabdah-backend/src/modules/media/media.controller.ts:19:  @Post('upload')
audit-work/source/nabdah-backend/src/modules/media/media.controller.ts:53:  @Post('presigned')
audit-work/source/nabdah-backend/src/modules/media/media.controller.ts:73:  @Get(':id/url')
audit-work/source/nabdah-backend/src/modules/media/media.controller.ts:163:  @Delete('*key')
audit-work/source/nabdah-backend/src/modules/cart/cart.module.ts:206:@Controller('cart')
audit-work/source/nabdah-backend/src/modules/cart/cart.module.ts:213:  @Get('') get(@CurrentUser() u: any) { return this.svc.get(u); }
audit-work/source/nabdah-backend/src/modules/cart/cart.module.ts:214:  @Post('items') @RequireIdempotency()
audit-work/source/nabdah-backend/src/modules/cart/cart.module.ts:216:  @Patch('items/:lineId') @RequireIdempotency()
audit-work/source/nabdah-backend/src/modules/cart/cart.module.ts:218:  @Delete('items/:lineId') @RequireIdempotency()
audit-work/source/nabdah-backend/src/modules/cart/cart.module.ts:220:  @Post('lines') add(@Body() b: any, @CurrentUser() u: any) { return this.svc.addLine(u, b); }
audit-work/source/nabdah-backend/src/modules/cart/cart.module.ts:221:  @Patch('lines/:lineId') upd(@Param('lineId') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.updateLine(u, id, b); }
audit-work/source/nabdah-backend/src/modules/cart/cart.module.ts:222:  @Delete('lines/:lineId') rm(@Param('lineId') id: string, @CurrentUser() u: any) { return this.svc.removeLine(u, id); }
audit-work/source/nabdah-backend/src/modules/cart/cart.module.ts:223:  @Post('clear') clr(@Body() b: any, @CurrentUser() u: any) { return this.svc.clear(u, b?.kind); }
audit-work/source/nabdah-backend/src/modules/cart/cart.module.ts:224:  @Post('checkout') @RequireIdempotency()
audit-work/source/nabdah-backend/src/modules/cart/cart.module.ts:226:  @Get('checkout') chk(@CurrentUser() u: any) { return this.svc.prepareCheckout(u); }
audit-work/source/nabdah-backend/src/modules/cart/cart.module.ts:227:  @Get('prescription')
audit-work/source/nabdah-backend/src/modules/consistency/consistency.module.ts:160:@Controller('consistency')
audit-work/source/nabdah-backend/src/modules/consistency/consistency.module.ts:165:  @Get('audit') audit() { return this.svc.audit(); }
audit-work/source/nabdah-backend/src/modules/consistency/consistency.module.ts:166:  @Post('reconcile') reconcile() { return this.svc.reconcile(); }
audit-work/source/nabdah-backend/src/modules/consistency/consistency.module.ts:167:  @Post('fix-orphans') fixOrphans(@Query('dry_run') dry?: string) { return this.svc.fixOrphans(dry !== 'false'); }
audit-work/source/nabdah-backend/src/modules/feature-flags/feature-flags.controller.ts:8:@Controller('feature-flags')
audit-work/source/nabdah-backend/src/modules/feature-flags/feature-flags.controller.ts:14:  @Get()
audit-work/source/nabdah-backend/src/modules/feature-flags/feature-flags.controller.ts:20:@Controller('admin/feature-flags')
audit-work/source/nabdah-backend/src/modules/feature-flags/feature-flags.controller.ts:25:  @Get()
audit-work/source/nabdah-backend/src/modules/feature-flags/feature-flags.controller.ts:31:  @Post(':key')
audit-work/source/nabdah-backend/src/modules/facility-ops/facility-ops.module.ts:253:@Controller('facility/beds')
audit-work/source/nabdah-backend/src/modules/facility-ops/facility-ops.module.ts:258:  @Get('wards')
audit-work/source/nabdah-backend/src/modules/facility-ops/facility-ops.module.ts:263:  @Get('wards/:wardId/beds')
audit-work/source/nabdah-backend/src/modules/facility-ops/facility-ops.module.ts:268:  @Post('wards')
audit-work/source/nabdah-backend/src/modules/facility-ops/facility-ops.module.ts:273:  @Post('admission')
audit-work/source/nabdah-backend/src/modules/facility-ops/facility-ops.module.ts:278:  @Get('admissions')
audit-work/source/nabdah-backend/src/modules/facility-ops/facility-ops.module.ts:283:  @Put('discharge/:admissionId')
audit-work/source/nabdah-backend/src/modules/facility-ops/facility-ops.module.ts:289:@Controller('facility/shifts')
audit-work/source/nabdah-backend/src/modules/facility-ops/facility-ops.module.ts:294:  @Get()
audit-work/source/nabdah-backend/src/modules/facility-ops/facility-ops.module.ts:299:  @Post()
audit-work/source/nabdah-backend/src/modules/facility-ops/facility-ops.module.ts:304:  @Post(':id/substitute')
audit-work/source/nabdah-backend/src/modules/facility-ops/facility-ops.module.ts:309:  @Post('attendance/check-in')
audit-work/source/nabdah-backend/src/modules/facility-ops/facility-ops.module.ts:314:  @Post('attendance/check-out/:attendanceId')
audit-work/source/nabdah-backend/src/modules/facility-ops/facility-ops.module.ts:319:  @Get('attendance')
audit-work/source/nabdah-backend/src/modules/facility-ops/facility-ops.module.ts:325:@Controller('facility/surgeries')
audit-work/source/nabdah-backend/src/modules/facility-ops/facility-ops.module.ts:330:  @Post('book')
audit-work/source/nabdah-backend/src/modules/facility-ops/facility-ops.module.ts:335:  @Get('schedule')
audit-work/source/nabdah-backend/src/modules/facility-ops/facility-ops.module.ts:345:@Controller('facility')
audit-work/source/nabdah-backend/src/modules/facility-ops/facility-ops.module.ts:352:  @Get('announcements')
audit-work/source/nabdah-backend/src/modules/facility-ops/facility-ops.module.ts:359:  @Post('announcements')
audit-work/source/nabdah-backend/src/modules/facility-ops/facility-ops.module.ts:376:  @Get('resources')
audit-work/source/nabdah-backend/src/modules/facility-ops/facility-ops.module.ts:383:  @Post('resources')
audit-work/source/nabdah-backend/src/modules/facility-ops/facility-ops.module.ts:405:  @Put('resources/:id')
audit-work/source/nabdah-backend/src/modules/admin-governance/admin-governance.module.ts:233:@Controller('admin/governance')
audit-work/source/nabdah-backend/src/modules/admin-governance/admin-governance.module.ts:238:  @Get('summary') summary() { return this.svc.globalSummary(); }
audit-work/source/nabdah-backend/src/modules/admin-governance/admin-governance.module.ts:239:  @Get('providers-performance') perf(@Query() q: any) { return this.svc.providersPerformance({ type: q.type, limit: q.limit ? Number(q.limit) : undefined }); }
audit-work/source/nabdah-backend/src/modules/admin-governance/admin-governance.module.ts:240:  @Get('patient/:id') patient(@Param('id') id: string) { return this.svc.patientProfile(id); }
audit-work/source/nabdah-backend/src/modules/admin-governance/admin-governance.module.ts:241:  @Get('trace/:entity_type/:entity_id') trace(@Param('entity_type') et: string, @Param('entity_id') ei: string) { return this.svc.entityTrace(et, ei); }
audit-work/source/nabdah-backend/src/modules/admin-governance/admin-governance.module.ts:244:@Controller('kill-switches')
audit-work/source/nabdah-backend/src/modules/admin-governance/admin-governance.module.ts:261:  @Get()
audit-work/source/nabdah-backend/src/modules/admin-governance/admin-governance.module.ts:270:  @Post(':key')
audit-work/source/nabdah-backend/src/modules/admin-governance/admin-governance.module.ts:288:@Controller('commissions')
audit-work/source/nabdah-backend/src/modules/admin-governance/admin-governance.module.ts:301:  @Get()
audit-work/source/nabdah-backend/src/modules/admin-governance/admin-governance.module.ts:338:  @Put(':id')
audit-work/source/nabdah-backend/src/modules/admin-governance/system-config.controller.ts:15:@Controller('admin/governance/system-config')
audit-work/source/nabdah-backend/src/modules/admin-governance/system-config.controller.ts:19:  @Get()
audit-work/source/nabdah-backend/src/modules/admin-governance/system-config.controller.ts:31:  @Put()
audit-work/source/nabdah-backend/src/modules/admin-governance/b2b.controller.ts:8:@Controller('b2b')
audit-work/source/nabdah-backend/src/modules/admin-governance/b2b.controller.ts:15:  @Get('requests')
audit-work/source/nabdah-backend/src/modules/admin-governance/b2b.controller.ts:24:  @Post('requests/:id/approve')
audit-work/source/nabdah-backend/src/modules/admin-governance/b2b.controller.ts:34:  @Post('requests/:id/reject')
audit-work/source/nabdah-backend/src/modules/slot-locks/slot-locks.module.ts:57:@Controller('slot-locks')
audit-work/source/nabdah-backend/src/modules/slot-locks/slot-locks.module.ts:61:  @Post('reserve') reserve(@CurrentUser() u: any, @Body() b: any) { return this.svc.reserve(u, b); }
audit-work/source/nabdah-backend/src/modules/slot-locks/slot-locks.module.ts:62:  @Post(':id/confirm') confirm(@CurrentUser() u: any, @Param('id') id: string, @Body() b: { booking_id: string }) { return this.svc.confirm(u, id, b.booking_id); }
audit-work/source/nabdah-backend/src/modules/slot-locks/slot-locks.module.ts:63:  @Post(':id/release') release(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.release(u, id); }
audit-work/source/nabdah-backend/src/modules/slot-locks/slot-locks.module.ts:64:  @Get('mine') mine(@CurrentUser() u: any) { return this.svc.mine(u); }
audit-work/source/nabdah-backend/src/modules/loyalty/loyalty.controller.ts:9:@Controller('loyalty')
audit-work/source/nabdah-backend/src/modules/loyalty/loyalty.controller.ts:13:  @Get('config')
audit-work/source/nabdah-backend/src/modules/loyalty/loyalty.controller.ts:22:  @Get('account')
audit-work/source/nabdah-backend/src/modules/loyalty/loyalty.controller.ts:28:  @Get('transactions')
audit-work/source/nabdah-backend/src/modules/loyalty/loyalty.controller.ts:34:  @Get('leaderboard')
audit-work/source/nabdah-backend/src/modules/loyalty/loyalty.controller.ts:40:  @Get('challenges')
audit-work/source/nabdah-backend/src/modules/loyalty/loyalty.controller.ts:46:  @Post('challenges/:id/join')
audit-work/source/nabdah-backend/src/modules/loyalty/loyalty.controller.ts:52:  @Get('rewards')
audit-work/source/nabdah-backend/src/modules/loyalty/loyalty.controller.ts:58:  @Post('rewards/:id/claim')
audit-work/source/nabdah-backend/src/modules/loyalty/loyalty.controller.ts:64:  @Get('rewards/claimed')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:6:@Controller('medicines')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:12:  @Get()
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:45:  @Get('autocomplete')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:51:  @Post('lookup-barcode')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:57:  @Get('by-barcode/:code')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:63:  @Get('categories')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:69:  @Get('filters')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:75:  @Post('compare')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:85:  @Get('hot')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:92:  @Get('search/did-you-mean')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:99:  @Get('search/trending')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:105:  @Get('search/recent')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:111:  @Post('admin/hot/regenerate')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:118:  @Post(':id/report-shortage')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:124:  @Get('admin/shortage-reports')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:131:  @Post('admin/shortage-reports/:reportId/approve')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:138:  @Post('admin/shortage-reports/:reportId/reject')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:145:  @Post('admin/catalog/:id/clear-shortage-badge')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:152:  @Post('admin/catalog/:id/availability')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:161:  @Post(':id/suggest-image')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:167:  @Get('admin/image-suggestions')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:174:  @Post('admin/image-suggestions/:suggestionId/approve')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:181:  @Post('admin/image-suggestions/:suggestionId/reject')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:189:  @Post(':id/suggest-change')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:196:  @Post('suggest-new-item')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:202:  @Get('admin/change-requests')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:209:  @Post('admin/change-requests/:requestId/approve')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:216:  @Post('admin/change-requests/:requestId/reject')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:223:  @Patch('admin/catalog/:id')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:230:  @Get('admin/catalog')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:247:  @Post('admin/catalog')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:254:  @Post('admin/catalog/:id/delete')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:261:  @Get('admin/reports')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:268:  @Get('me/recently-viewed')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:274:  @Get(':id')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:280:  @Get(':id/details')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:289:  @Get(':id/alternatives')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:294:  @Post('manual-entry')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:299:  @Get('admin/pending-review')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:305:  @Post('admin/catalog')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:311:  @Delete('admin/catalog/:id')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:317:  @Post(':id/approve')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:323:  @Post(':id/reject')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:329:  @Patch(':id')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:336:  @Post('admin/import-json')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:342:  @Post('admin/import-csv')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:352:@Controller('public/catalog')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:357:  @Get(':locale/:category.json')
audit-work/source/nabdah-backend/src/modules/seo/seo.controller.ts:13:@Controller('seo')
audit-work/source/nabdah-backend/src/modules/seo/seo.controller.ts:19:  @Get('resolve/:type/:slug')
audit-work/source/nabdah-backend/src/modules/seo/seo.controller.ts:28:  @Get('meta/:type/:slug')
audit-work/source/nabdah-backend/src/modules/seo/seo.controller.ts:35:  @Get('build/:type/:id')
audit-work/source/nabdah-backend/src/modules/seo/seo.controller.ts:45:  @Get('sitemap.xml')
audit-work/source/nabdah-backend/src/modules/seo/seo.controller.ts:58:  @Get('llms.txt')
audit-work/source/nabdah-backend/src/modules/seo/seo.controller.ts:70:  @Get('robots.txt')
audit-work/source/nabdah-backend/src/modules/timeline/timeline.controller.ts:8:@Controller('timeline')
audit-work/source/nabdah-backend/src/modules/timeline/timeline.controller.ts:17:  @Get()
audit-work/source/nabdah-backend/src/modules/timeline/timeline.controller.ts:35:  @Get('summary')
audit-work/source/nabdah-backend/src/modules/service-catalog/service-catalog.module.ts:185:@Controller('service-catalog')
audit-work/source/nabdah-backend/src/modules/service-catalog/service-catalog.module.ts:190:  @Get('mine/:type') mine(@Param('type') t: 'lab' | 'radiology', @CurrentUser() u: any) { return this.svc.myCatalog(u, t); }
audit-work/source/nabdah-backend/src/modules/service-catalog/service-catalog.module.ts:191:  @Post('mine/:type') create(@Param('type') t: 'lab' | 'radiology', @Body() b: any, @CurrentUser() u: any) { return this.svc.createService(u, t, b); }
audit-work/source/nabdah-backend/src/modules/service-catalog/service-catalog.module.ts:192:  @Patch('mine/:type/:id') update(@Param('type') t: 'lab' | 'radiology', @Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.updateService(u, t, id, b); }
audit-work/source/nabdah-backend/src/modules/service-catalog/service-catalog.module.ts:193:  @Post('mine/:type/:id/toggle') toggle(@Param('type') t: 'lab' | 'radiology', @Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.toggleService(u, t, id, !!b.active); }
audit-work/source/nabdah-backend/src/modules/service-catalog/service-catalog.module.ts:194:  @Delete('mine/:type/:id') del(@Param('type') t: 'lab' | 'radiology', @Param('id') id: string, @CurrentUser() u: any) { return this.svc.deleteService(u, t, id); }
audit-work/source/nabdah-backend/src/modules/service-catalog/service-catalog.module.ts:196:  @Get('schedule/:entity') sched(@Param('entity') e: string, @CurrentUser() u: any) { return this.svc.getSchedule(u, e); }
audit-work/source/nabdah-backend/src/modules/service-catalog/service-catalog.module.ts:197:  @Patch('schedule/:entity') setSched(@Param('entity') e: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.upsertSchedule(u, e, b); }
audit-work/source/nabdah-backend/src/modules/service-catalog/service-catalog.module.ts:200:  @Get('admin/:type') @Roles(UserRole.ADMIN) adminAll(@Param('type') t: 'lab' | 'radiology', @Query() q: any) { return this.svc.adminListAll(t, q); }
audit-work/source/nabdah-backend/src/modules/service-catalog/service-catalog.module.ts:201:  @Post('admin/:type/:id/approve') @Roles(UserRole.ADMIN) approve(@Param('type') t: 'lab' | 'radiology', @Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.adminApproveService(t, id, b.approve !== false, u); }
audit-work/source/nabdah-backend/src/modules/ai/ai.controller.ts:9:@Controller('ai')
audit-work/source/nabdah-backend/src/modules/ai/ai.controller.ts:14:  @Get('config')
audit-work/source/nabdah-backend/src/modules/ai/ai.controller.ts:20:  @Post('config')
audit-work/source/nabdah-backend/src/modules/ai/ai.controller.ts:27:  @Get('admin/gateway')
audit-work/source/nabdah-backend/src/modules/ai/ai.controller.ts:34:  @Post('admin/gateway/provider/:key')
audit-work/source/nabdah-backend/src/modules/ai/ai.controller.ts:41:  @Post('admin/gateway/mode')
audit-work/source/nabdah-backend/src/modules/ai/ai.controller.ts:48:  @Get('admin/usage')
audit-work/source/nabdah-backend/src/modules/ai/ai.controller.ts:55:  @Post('triage')
audit-work/source/nabdah-backend/src/modules/ai/ai.controller.ts:60:  @Get('triage/history')
audit-work/source/nabdah-backend/src/modules/ai/ai.controller.ts:65:  @Post('voice-to-order')
audit-work/source/nabdah-backend/src/modules/ai/ai.controller.ts:84:  @Post('prescription-ocr')
audit-work/source/nabdah-backend/src/modules/ai/ai.controller.ts:90:  @Post('parse-excel')
audit-work/source/nabdah-backend/src/modules/ai/ai.controller.ts:106:  @Post('copilot/suggest')
audit-work/source/nabdah-backend/src/modules/ai/ai.controller.ts:113:  @Post('ocr-translate')
audit-work/source/nabdah-backend/src/modules/ai/ai.controller.ts:119:  @Post('skin-analysis')
audit-work/source/nabdah-backend/src/modules/ai/ai.controller.ts:124:  @Post('medicine-image-search')
audit-work/source/nabdah-backend/src/modules/ai/ai.controller.ts:129:  @Post('barcode-lookup')
audit-work/source/nabdah-backend/src/modules/ai/ai.controller.ts:134:  @Post('analyze-meal')
audit-work/source/nabdah-backend/src/modules/ai/ai.controller.ts:143:  @Post('analyze-report')
audit-work/source/nabdah-backend/src/modules/ai/ai.controller.ts:149:  @Post('generate-exercise-plan')
audit-work/source/nabdah-backend/src/modules/ai/ai.controller.ts:154:  @Post('generate-diet-plan')
audit-work/source/nabdah-backend/src/modules/patient-ux/patient-ux.module.ts:144:@Controller('patient-ux')
audit-work/source/nabdah-backend/src/modules/patient-ux/patient-ux.module.ts:148:  @Post('review') rate(@CurrentUser() u: any, @Body() b: any) { return this.svc.rate(u, b); }
audit-work/source/nabdah-backend/src/modules/patient-ux/patient-ux.module.ts:149:  @Post('refund') refund(@CurrentUser() u: any, @Body() b: any) { return this.svc.requestRefund(u, b); }
audit-work/source/nabdah-backend/src/modules/patient-ux/patient-ux.module.ts:150:  @Get('refund/mine') refunds(@CurrentUser() u: any) { return this.svc.myRefunds(u); }
audit-work/source/nabdah-backend/src/modules/patient-ux/patient-ux.module.ts:151:  @Post('rebook') rebook(@CurrentUser() u: any, @Body() b: any) { return this.svc.rebook(u, b); }
audit-work/source/nabdah-backend/src/modules/patient-ux/patient-ux.module.ts:155:@Controller('admin/refunds')
audit-work/source/nabdah-backend/src/modules/patient-ux/patient-ux.module.ts:160:  @Get() list() { return this.svc.adminListRefunds(); }
audit-work/source/nabdah-backend/src/modules/patient-ux/patient-ux.module.ts:161:  @Get('pending') pending() { return this.svc.adminListRefunds('requested'); }
audit-work/source/nabdah-backend/src/modules/patient-ux/patient-ux.module.ts:162:  @Post(':id/decide') decide(@CurrentUser() u: any, @Param('id') id: string, @Body() body: { decision: 'approved' | 'rejected'; note?: string; amount?: number }) {
audit-work/source/nabdah-backend/src/modules/patient-ux/patient-ux.module.ts:271:@Controller('admin/override')
audit-work/source/nabdah-backend/src/modules/patient-ux/patient-ux.module.ts:277:  @Post('cancel') cancel(@CurrentUser() u: any, @Body() body: { kind: string; id: string; reason: string }) {
audit-work/source/nabdah-backend/src/modules/patient-ux/patient-ux.module.ts:282:  @Post('transition') transition(@CurrentUser() u: any, @Body() body: { kind: string; id: string; state: string; reason: string }) {
audit-work/source/nabdah-backend/src/modules/patient-ux/patient-ux.module.ts:287:  @Post('payment') markPayment(@CurrentUser() u: any, @Body() body: { kind: string; id: string; payment_status: 'paid' | 'refunded' | 'failed'; amount?: number; reason: string }) {
audit-work/source/nabdah-backend/src/modules/home/home.controller.ts:5:@Controller('home')
audit-work/source/nabdah-backend/src/modules/home/home.controller.ts:10:  @Get('offers')
audit-work/source/nabdah-backend/src/modules/home/home.controller.ts:15:  @Get('upcoming-appointment')
audit-work/source/nabdah-backend/src/modules/home/home.controller.ts:20:  @Get('search')
audit-work/source/nabdah-backend/src/modules/notifications/notifications.controller.ts:7:@Controller('notifications')
audit-work/source/nabdah-backend/src/modules/notifications/notifications.controller.ts:12:  @Get()
audit-work/source/nabdah-backend/src/modules/notifications/notifications.controller.ts:22:  @Post('register-token')
audit-work/source/nabdah-backend/src/modules/notifications/notifications.controller.ts:36:  @Post(':id/read')
audit-work/source/nabdah-backend/src/modules/notifications/notifications.controller.ts:41:  @Post('read-all')
audit-work/source/nabdah-backend/src/modules/notifications/notifications.controller.ts:46:  @Post('admin/send')
audit-work/source/nabdah-backend/src/modules/notifications/notifications.controller.ts:53:  @Post('admin/schedule')
audit-work/source/nabdah-backend/src/modules/notifications/notifications.controller.ts:61:  @Get('admin/delivery-stats')
audit-work/source/nabdah-backend/src/modules/referral/referral.controller.ts:11:@Controller('referrals')
audit-work/source/nabdah-backend/src/modules/referral/referral.controller.ts:16:  @Get('my')
audit-work/source/nabdah-backend/src/modules/referral/referral.controller.ts:22:  @Post('apply')
audit-work/source/nabdah-backend/src/modules/auth/auth.controller.ts:81:@Controller('auth')
audit-work/source/nabdah-backend/src/modules/auth/auth.controller.ts:89:  @Post('otp/request')
audit-work/source/nabdah-backend/src/modules/auth/auth.controller.ts:97:  @Post('otp/verify')
audit-work/source/nabdah-backend/src/modules/auth/auth.controller.ts:104:  @Post('session/exchange')
audit-work/source/nabdah-backend/src/modules/auth/auth.controller.ts:114:  @Post('password/forgot')
audit-work/source/nabdah-backend/src/modules/auth/auth.controller.ts:120:  @Post('password/reset')
audit-work/source/nabdah-backend/src/modules/auth/auth.controller.ts:127:  @Post('register')
audit-work/source/nabdah-backend/src/modules/auth/auth.controller.ts:145:  @Post('login')
audit-work/source/nabdah-backend/src/modules/auth/auth.controller.ts:171:  @Post('guest')
audit-work/source/nabdah-backend/src/modules/auth/auth.controller.ts:176:  @Post('convert-guest')
audit-work/source/nabdah-backend/src/modules/auth/auth.controller.ts:183:  @Post('login/verify-2fa')
audit-work/source/nabdah-backend/src/modules/auth/auth.controller.ts:205:  @Get('me')
audit-work/source/nabdah-backend/src/modules/auth/auth.controller.ts:213:  @Get('trusted-devices')
audit-work/source/nabdah-backend/src/modules/auth/auth.controller.ts:219:  @Delete('trusted-devices/:deviceId')
audit-work/source/nabdah-backend/src/modules/auth/auth.controller.ts:225:  @Post('heartbeat')
audit-work/source/nabdah-backend/src/modules/auth/auth.controller.ts:236:  @Get('sessions/online')
audit-work/source/nabdah-backend/src/modules/auth/auth.controller.ts:243:  @Post('refresh')
audit-work/source/nabdah-backend/src/modules/auth/auth.controller.ts:249:  @Post('logout-all')
audit-work/source/nabdah-backend/src/modules/auth/auth.controller.ts:255:  @Post('consent')
audit-work/source/nabdah-backend/src/modules/auth/auth.controller.ts:265:  @Post('logout')
audit-work/source/nabdah-backend/src/modules/auth/auth.controller.ts:278:  @Post('send-otp')
audit-work/source/nabdah-backend/src/modules/auth/auth.controller.ts:286:  @Post('verify-otp')
audit-work/source/nabdah-backend/src/modules/auth/auth.controller.ts:294:  @Post('reset-password')
audit-work/source/nabdah-backend/src/modules/auth/auth.controller.ts:303:  @Post('social-login')
audit-work/source/nabdah-backend/src/modules/auth/passkey.controller.ts:14:@Controller('auth/passkey')
audit-work/source/nabdah-backend/src/modules/auth/passkey.controller.ts:19:  @Post('enroll/options')
audit-work/source/nabdah-backend/src/modules/auth/passkey.controller.ts:24:  @Post('enroll/verify')
audit-work/source/nabdah-backend/src/modules/auth/passkey.controller.ts:30:  @Get('devices')
audit-work/source/nabdah-backend/src/modules/auth/passkey.controller.ts:36:  @Delete('devices/:credentialId')
audit-work/source/nabdah-backend/src/modules/auth/passkey.controller.ts:44:  @Post('login/verify')
audit-work/source/nabdah-backend/src/modules/api-security/api-security.module.ts:191:@Controller('admin/security')
audit-work/source/nabdah-backend/src/modules/api-security/api-security.module.ts:197:  @Get('events')
audit-work/source/nabdah-backend/src/modules/api-security/api-security.module.ts:209:  @Post('blacklist/clear')
audit-work/source/nabdah-backend/src/modules/moyasar/moyasar.module.ts:374:@Controller('moyasar')
audit-work/source/nabdah-backend/src/modules/moyasar/moyasar.module.ts:379:  @Post('payments')
audit-work/source/nabdah-backend/src/modules/moyasar/moyasar.module.ts:404:  @Get('payments/booking/:bookingId')
audit-work/source/nabdah-backend/src/modules/moyasar/moyasar.module.ts:415:  @Get('payments/me')
audit-work/source/nabdah-backend/src/modules/moyasar/moyasar.module.ts:422:  @Get('payments/sync/:moyasarId')
audit-work/source/nabdah-backend/src/modules/moyasar/moyasar.module.ts:433:  @Post('payments/:moyasarId/refund')
audit-work/source/nabdah-backend/src/modules/moyasar/moyasar.module.ts:445:  @Post('webhook')
audit-work/source/nabdah-backend/src/modules/moyasar/moyasar.module.ts:457:  @Get('callback')
audit-work/source/nabdah-backend/src/modules/i18n/i18n.controller.ts:8:@Controller('i18n')
audit-work/source/nabdah-backend/src/modules/i18n/i18n.controller.ts:13:  @Get()
audit-work/source/nabdah-backend/src/modules/i18n/i18n.controller.ts:19:  @Get('all')
audit-work/source/nabdah-backend/src/modules/export/export.controller.ts:7:@Controller('export')
audit-work/source/nabdah-backend/src/modules/export/export.controller.ts:19:  @Get('patients')
audit-work/source/nabdah-backend/src/modules/export/export.controller.ts:25:  @Get('appointments')
audit-work/source/nabdah-backend/src/modules/export/export.controller.ts:31:  @Get('orders')
audit-work/source/nabdah-backend/src/modules/export/export.controller.ts:37:  @Get('transactions')
audit-work/source/nabdah-backend/src/modules/export/export.controller.ts:43:  @Get('audit-logs')
audit-work/source/nabdah-backend/src/modules/realtime/realtime.sse.ts:11:@Controller('realtime')
audit-work/source/nabdah-backend/src/modules/medical-profile/medical-profile.controller.ts:9:@Controller('medical-profile')
audit-work/source/nabdah-backend/src/modules/medical-profile/medical-profile.controller.ts:13:  @Get() get(@CurrentUser() u: any) { return this.svc.getOrCreate(u); }
audit-work/source/nabdah-backend/src/modules/medical-profile/medical-profile.controller.ts:14:  @Get('passport-token')
audit-work/source/nabdah-backend/src/modules/medical-profile/medical-profile.controller.ts:20:  @Patch() update(@CurrentUser() u: any, @Body() b: any) { return this.svc.update(u, b); }
audit-work/source/nabdah-backend/src/modules/medical-profile/medical-profile.controller.ts:22:  @Post('chronic-diseases') addCd(@CurrentUser() u: any, @Body() b: any) { return this.svc.addItem(u, 'chronic_diseases', b); }
audit-work/source/nabdah-backend/src/modules/medical-profile/medical-profile.controller.ts:23:  @Delete('chronic-diseases/:id') delCd(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.removeItem(u, 'chronic_diseases', id); }
audit-work/source/nabdah-backend/src/modules/medical-profile/medical-profile.controller.ts:25:  @Post('allergies') addAl(@CurrentUser() u: any, @Body() b: any) { return this.svc.addItem(u, 'allergies', b); }
audit-work/source/nabdah-backend/src/modules/medical-profile/medical-profile.controller.ts:26:  @Delete('allergies/:id') delAl(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.removeItem(u, 'allergies', id); }
audit-work/source/nabdah-backend/src/modules/medical-profile/medical-profile.controller.ts:28:  @Post('surgeries') addS(@CurrentUser() u: any, @Body() b: any) { return this.svc.addItem(u, 'surgeries', b); }
audit-work/source/nabdah-backend/src/modules/medical-profile/medical-profile.controller.ts:29:  @Delete('surgeries/:id') delS(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.removeItem(u, 'surgeries', id); }
audit-work/source/nabdah-backend/src/modules/medical-profile/medical-profile.controller.ts:31:  @Post('long-term-medications') addLm(@CurrentUser() u: any, @Body() b: any) { return this.svc.addItem(u, 'long_term_medications', b); }
audit-work/source/nabdah-backend/src/modules/medical-profile/medical-profile.controller.ts:32:  @Delete('long-term-medications/:id') delLm(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.removeItem(u, 'long_term_medications', id); }
audit-work/source/nabdah-backend/src/modules/medical-profile/medical-profile.controller.ts:35:  @Get('provider/:patientId') byPatient(@CurrentUser() u: any, @Param('patientId') pid: string) { return this.svc.getForPatient(u, pid); }
audit-work/source/nabdah-backend/src/modules/tour/tour.controller.ts:6:@Controller('tour')
audit-work/source/nabdah-backend/src/modules/tour/tour.controller.ts:10:  @Get('status')
audit-work/source/nabdah-backend/src/modules/tour/tour.controller.ts:15:  @Post('complete')
audit-work/source/nabdah-backend/src/modules/recruitment/recruitment.module.ts:220:@Controller('recruitment')
audit-work/source/nabdah-backend/src/modules/recruitment/recruitment.module.ts:226:  @Get('candidate/profile')
audit-work/source/nabdah-backend/src/modules/recruitment/recruitment.module.ts:231:  @Post('candidate/profile')
audit-work/source/nabdah-backend/src/modules/recruitment/recruitment.module.ts:236:  @Get('applications/my')
audit-work/source/nabdah-backend/src/modules/recruitment/recruitment.module.ts:242:  @Post('jobs')
audit-work/source/nabdah-backend/src/modules/recruitment/recruitment.module.ts:251:  @Put('jobs/:id')
audit-work/source/nabdah-backend/src/modules/recruitment/recruitment.module.ts:259:  @Get('jobs')
audit-work/source/nabdah-backend/src/modules/recruitment/recruitment.module.ts:265:  @Get('jobs/:id')
audit-work/source/nabdah-backend/src/modules/recruitment/recruitment.module.ts:270:  @Post('jobs/:id/apply')
audit-work/source/nabdah-backend/src/modules/recruitment/recruitment.module.ts:275:  @Get('jobs/:id/applications')
audit-work/source/nabdah-backend/src/modules/recruitment/recruitment.module.ts:280:  @Patch('applications/:id/status')
audit-work/source/nabdah-backend/src/modules/finance-engine/finance-engine.module.ts:859:@Controller('finance-engine')
audit-work/source/nabdah-backend/src/modules/finance-engine/finance-engine.module.ts:869:  @Post('coupons/validate')
audit-work/source/nabdah-backend/src/modules/finance-engine/finance-engine.module.ts:881:  @Post('loyalty/redeem-quote')
audit-work/source/nabdah-backend/src/modules/finance-engine/finance-engine.module.ts:889:  @Get('provider/balance')
audit-work/source/nabdah-backend/src/modules/finance-engine/finance-engine.module.ts:896:@Controller('admin/finance-engine')
audit-work/source/nabdah-backend/src/modules/finance-engine/finance-engine.module.ts:911:  @Get('reports/summary')
audit-work/source/nabdah-backend/src/modules/finance-engine/finance-engine.module.ts:918:  @Post('commission-rules')
audit-work/source/nabdah-backend/src/modules/finance-engine/finance-engine.module.ts:923:  @Get('commission-rules/history')
audit-work/source/nabdah-backend/src/modules/finance-engine/finance-engine.module.ts:928:  @Post('commission-rules/resolve')
audit-work/source/nabdah-backend/src/modules/finance-engine/finance-engine.module.ts:936:  @Get('approvals')
audit-work/source/nabdah-backend/src/modules/finance-engine/finance-engine.module.ts:941:  @Post('approvals/request')
audit-work/source/nabdah-backend/src/modules/finance-engine/finance-engine.module.ts:946:  @Post('approvals/:id/decide')
audit-work/source/nabdah-backend/src/modules/finance-engine/finance-engine.module.ts:974:  @Post('refunds/:id/execute')
audit-work/source/nabdah-backend/src/modules/finance-engine/finance-engine.module.ts:1004:  @Get('fraud/duplicate-payments/:bookingId')
audit-work/source/nabdah-backend/src/modules/finance-engine/finance-engine.module.ts:1010:  @Get('provider-balance/:providerId')
audit-work/source/nabdah-backend/src/modules/operations-safety/operations-safety.module.ts:137:@Controller('ops')
audit-work/source/nabdah-backend/src/modules/operations-safety/operations-safety.module.ts:142:  @Get('sla') sla() { return this.svc.slaReport(); }
audit-work/source/nabdah-backend/src/modules/operations-safety/operations-safety.module.ts:143:  @Post('escalate') escalate(@Body() b: any) { return this.svc.escalate(b); }
audit-work/source/nabdah-backend/src/modules/operations-safety/operations-safety.module.ts:144:  @Post('penalty/assess') assess(@Body() b: any) { return this.svc.assessPenalty(b); }
audit-work/source/nabdah-backend/src/modules/operations-safety/operations-safety.module.ts:145:  @Post('fallback') fallback(@Body() b: any) { return this.svc.fallback(b); }
audit-work/source/nabdah-backend/src/modules/operations-safety/operations-safety.module.ts:146:  @Get('penalties') penalties(@Query() q: any) { return this.svc.listPenalties(q); }
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:10:@Controller('health')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:14:  @Get('vitals')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:18:  @Get('vitals-log')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:23:  @Get('vitals/chart')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:26:  @Get('vitals/recent')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:29:  @Get('vitals/latest')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:32:  @Get('vitals/summary')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:35:  @Get('score')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:38:  @Post('vitals')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:44:  @Patch('vitals/:id')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:47:  @Delete('vitals/:id')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:51:  @Post('wearables/link')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:54:  @Delete('wearables/:deviceId')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:57:  @Get('reminders')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:60:  @Post('reminders')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:63:  @Post('reminders/:id/log')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:67:  @Post('reminders/:id/refill')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:69:  @Post('reminders/:id/refill/snooze')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:71:  @Post('reminders/:id/refill/cancel')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:74:  @Patch('reminders/:id')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:79:  @Delete('reminders/:id')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:83:  @Post('medications/:id/refill')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:86:  @Get('sleep')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:90:  @Post('sleep')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:96:  @Get('reports')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:101:  @Get('medications/reminders')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:106:  @Get('prescriptions')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:111:  @Get('emergency-contacts')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:116:  @Post('emergency-contacts')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:121:  @Delete('emergency-contacts/:id')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:126:  @Get('chronic-diseases')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:131:  @Get('chronic-meds')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:136:  @Get('trends')
audit-work/source/nabdah-backend/src/modules/health/health-dashboard.controller.ts:12:@Controller('admin/health-dashboard')
audit-work/source/nabdah-backend/src/modules/health/health-dashboard.controller.ts:31:  @Get()
audit-work/source/nabdah-backend/src/modules/mental-health/mental-health.controller.ts:8:@Controller('mental-health')
audit-work/source/nabdah-backend/src/modules/mental-health/mental-health.controller.ts:21:  @Post('mood')
audit-work/source/nabdah-backend/src/modules/mental-health/mental-health.controller.ts:28:  @Get('mood')
audit-work/source/nabdah-backend/src/modules/mental-health/mental-health.controller.ts:34:  @Get('mood/stats')
audit-work/source/nabdah-backend/src/modules/mental-health/mental-health.controller.ts:40:  @Post('meditation')
audit-work/source/nabdah-backend/src/modules/mental-health/mental-health.controller.ts:46:  @Get('meditation')
audit-work/source/nabdah-backend/src/modules/mental-health/mental-health.controller.ts:52:  @Get('meditation/stats')
audit-work/source/nabdah-backend/src/modules/mental-health/mental-health.controller.ts:58:  @Post('breathing')
audit-work/source/nabdah-backend/src/modules/mental-health/mental-health.controller.ts:64:  @Get('breathing')
audit-work/source/nabdah-backend/src/modules/mental-health/mental-health.controller.ts:72:  @Get('crisis-contacts')
audit-work/source/nabdah-backend/src/modules/mental-health/mental-health.controller.ts:78:  @Post('crisis-contacts')
audit-work/source/nabdah-backend/src/modules/mental-health/mental-health.controller.ts:84:  @Delete('crisis-contacts/:id')
audit-work/source/nabdah-backend/src/modules/mental-health/mental-health.controller.ts:90:  @Get('dashboard')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:5:@Controller('labs')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:9:  @Public() @Get('services')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:29:  @Public() @Get('packages')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:32:  @Public() @Get('categories')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:35:  @Public() @Get('services/:id')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:38:  @Post('bookings')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:41:  @Get('bookings/mine')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:44:  @Get('bookings/:id')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:47:  @Post('bookings/:id/cancel')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:50:  @Patch('bookings/:id/state')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:55:  @Post('bookings/:id/documents')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:60:  @Patch('bookings/:id/insurance')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:65:  @Patch('bookings/:id/items/:serviceId/opt-in-cash')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:70:  @Get('provider/inbox')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:75:  @Post('bookings/:id/assign-technician')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:80:  @Post('bookings/:id/upload-report')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:86:  @Patch('bookings/:id/reschedule')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:91:  @Post('bookings/:id/gps')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:96:  @Get('bookings/:id/tracking')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:101:  @Post('bookings/:id/emergency')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:106:  @Post('bookings/:id/reassign')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:111:  @Get('admin/all')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:124:  @Post('samples/register')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:130:  @Patch('samples/:id/stage')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:136:  @Get('samples')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:143:  @Post('admin/catalog')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:149:  @Put('admin/catalog/:id')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:155:  @Delete('admin/catalog/:id')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:162:  @Patch('admin/bookings/:id/force-state')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:168:  @Public() @Get('packages/:id')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:173:  @Public() @Get('compatible-providers')
audit-work/source/nabdah-backend/src/modules/labs/lab-results.controller.ts:8:@Controller('lab-results')
audit-work/source/nabdah-backend/src/modules/labs/lab-results.controller.ts:11:  @Post() create(@CurrentUser() u: any, @Body() b: any) { return this.svc.create(u, b); }
audit-work/source/nabdah-backend/src/modules/labs/lab-results.controller.ts:12:  @Get('mine') mine(@CurrentUser() u: any) { return this.svc.mineFor(u); }
audit-work/source/nabdah-backend/src/modules/labs/lab-results.controller.ts:13:  @Get('by-booking/:bid') byBkg(@CurrentUser() u: any, @Param('bid') bid: string) { return this.svc.byBooking(u, bid); }
audit-work/source/nabdah-backend/src/modules/labs/lab-results.controller.ts:14:  @Get(':id') one(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.one(u, id); }
audit-work/source/nabdah-backend/src/modules/labs/controllers/labs-engine.controller.ts:7:@Controller('labs/bookings')
audit-work/source/nabdah-backend/src/modules/labs/controllers/labs-engine.controller.ts:14:  @Get('queue')
audit-work/source/nabdah-backend/src/modules/labs/controllers/labs-engine.controller.ts:23:  @Post(':id/respond')
audit-work/source/nabdah-backend/src/modules/labs/controllers/labs-engine.controller.ts:42:  @Post('collect-sample/:id')
audit-work/source/nabdah-backend/src/modules/labs/controllers/labs-engine.controller.ts:70:  @Post('finalize-test/:id')
audit-work/source/nabdah-backend/src/modules/labs/controllers/labs-engine.controller.ts:100:  @Get('catalog')
audit-work/source/nabdah-backend/src/modules/labs/controllers/labs-engine.controller.ts:106:  @Post('catalog')
audit-work/source/nabdah-backend/src/modules/labs/controllers/labs-engine.controller.ts:121:  @Get('wallet')
audit-work/source/nabdah-backend/src/modules/prescriptions/prescriptions.controller.ts:6:@Controller('prescriptions')
audit-work/source/nabdah-backend/src/modules/prescriptions/prescriptions.controller.ts:11:  @Post('create')
audit-work/source/nabdah-backend/src/modules/prescriptions/prescriptions.controller.ts:17:  @Post('upload')
audit-work/source/nabdah-backend/src/modules/prescriptions/prescriptions.controller.ts:22:  @Post('manual-entry')
audit-work/source/nabdah-backend/src/modules/prescriptions/prescriptions.controller.ts:28:  @Post(':id/send')
audit-work/source/nabdah-backend/src/modules/prescriptions/prescriptions.controller.ts:34:  @Post(':id/transition')
audit-work/source/nabdah-backend/src/modules/prescriptions/prescriptions.controller.ts:39:  @Post(':id/substitute')
audit-work/source/nabdah-backend/src/modules/prescriptions/prescriptions.controller.ts:45:  @Get('manual-review/queue')
audit-work/source/nabdah-backend/src/modules/prescriptions/prescriptions.controller.ts:49:  @Get('active')
audit-work/source/nabdah-backend/src/modules/prescriptions/prescriptions.controller.ts:52:  @Get('mine')
audit-work/source/nabdah-backend/src/modules/prescriptions/prescriptions.controller.ts:57:  @Get('doctor/mine')
audit-work/source/nabdah-backend/src/modules/prescriptions/prescriptions.controller.ts:63:  @Get('pharmacy/queue')
audit-work/source/nabdah-backend/src/modules/prescriptions/prescriptions.controller.ts:69:  @Get(':id')
audit-work/source/nabdah-backend/src/modules/billing/billing.module.ts:209:@Controller('billing')
audit-work/source/nabdah-backend/src/modules/billing/billing.module.ts:215:  @Get('invoice/:kind/:bookingId')
audit-work/source/nabdah-backend/src/modules/billing/billing.module.ts:221:  @Get('invoice/:kind/:bookingId/pdf')
audit-work/source/nabdah-backend/src/modules/billing/billing.module.ts:230:  @Post('invoice/:kind/:bookingId/email')
audit-work/source/nabdah-backend/src/modules/billing/billing.module.ts:235:  @Get('my')
audit-work/source/nabdah-backend/src/modules/billing/billing.module.ts:241:  @Get('admin/list')
audit-work/source/nabdah-backend/src/modules/articles/articles.module.ts:96:@Controller('articles')
audit-work/source/nabdah-backend/src/modules/articles/articles.module.ts:100:  @Public() @Get() list(@Query() q: any) { return this.svc.list(q); }
audit-work/source/nabdah-backend/src/modules/articles/articles.module.ts:101:  @Public() @Get('categories') cats() { return this.svc.categories(); }
audit-work/source/nabdah-backend/src/modules/articles/articles.module.ts:102:  @Public() @Get(':slug') one(@Param('slug') slug: string) { return this.svc.bySlug(slug); }
audit-work/source/nabdah-backend/src/modules/articles/articles.module.ts:106:@Controller('admin/articles')
audit-work/source/nabdah-backend/src/modules/articles/articles.module.ts:112:  @Get() list() { return this.svc.adminList(); }
audit-work/source/nabdah-backend/src/modules/articles/articles.module.ts:113:  @Post() create(@Body() body: any) { return this.svc.create(body); }
audit-work/source/nabdah-backend/src/modules/articles/articles.module.ts:114:  @Patch(':id') update(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body); }
audit-work/source/nabdah-backend/src/modules/articles/articles.module.ts:115:  @Post(':id/publish') publish(@Param('id') id: string) { return this.svc.publish(id); }
audit-work/source/nabdah-backend/src/modules/articles/articles.module.ts:116:  @Post(':id/unpublish') unpublish(@Param('id') id: string) { return this.svc.unpublish(id); }
audit-work/source/nabdah-backend/src/modules/articles/articles.module.ts:117:  @Delete(':id') remove(@Param('id') id: string) { return this.svc.remove(id); }
audit-work/source/nabdah-backend/src/modules/articles/articles.module.ts:121:@Controller('articles')
audit-work/source/nabdah-backend/src/modules/articles/articles.module.ts:127:  @Post(':id/bookmark')
audit-work/source/nabdah-backend/src/modules/articles/articles.module.ts:139:  @Delete(':id/bookmark')
audit-work/source/nabdah-backend/src/modules/articles/articles.module.ts:149:@Controller('articles/bookmarks')
audit-work/source/nabdah-backend/src/modules/articles/articles.module.ts:157:  @Get('mine')
audit-work/source/nabdah-backend/src/modules/articles/articles.module.ts:167:  @Get(':slug/status')
audit-work/source/nabdah-backend/src/modules/articles/articles.module.ts:176:  @Post(':slug/toggle')
audit-work/source/nabdah-backend/src/modules/articles/seo.controller.ts:10:@Controller('seo')
audit-work/source/nabdah-backend/src/modules/articles/seo.controller.ts:15:  @Get('resolve/:type/:slug')
audit-work/source/nabdah-backend/src/modules/admin-authority/admin-authority.module.ts:251:@Controller('admin/authority')
audit-work/source/nabdah-backend/src/modules/admin-authority/admin-authority.module.ts:256:  @Post('appointments/:id/force-cancel') fca(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.forceCancelAppt(u, id, b.reason || ''); }
audit-work/source/nabdah-backend/src/modules/admin-authority/admin-authority.module.ts:257:  @Post('appointments/:id/force-confirm') fcoappt(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.forceConfirmAppt(u, id, b.reason || ''); }
audit-work/source/nabdah-backend/src/modules/admin-authority/admin-authority.module.ts:258:  @Post('appointments/:id/force-reschedule') fra(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.forceRescheduleAppt(u, id, b.new_time, b.reason || ''); }
audit-work/source/nabdah-backend/src/modules/admin-authority/admin-authority.module.ts:259:  @Post('orders/:id/force-cancel') fco(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.forceCancelOrder(u, id, b.reason || ''); }
audit-work/source/nabdah-backend/src/modules/admin-authority/admin-authority.module.ts:260:  @Post('orders/:id/force-complete') fkco(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.forceCompleteOrder(u, id, b.reason || ''); }
audit-work/source/nabdah-backend/src/modules/admin-authority/admin-authority.module.ts:261:  @Post('orders/:id/force-reassign') frr(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.forceReassignOrder(u, id, b.pharmacy_id, b.reason || ''); }
audit-work/source/nabdah-backend/src/modules/admin-authority/admin-authority.module.ts:263:  @Post('labs/:id/force-cancel') fcl(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.forceCancelLab(u, id, b.reason || ''); }
audit-work/source/nabdah-backend/src/modules/admin-authority/admin-authority.module.ts:264:  @Post('labs/:id/force-complete') fkcl(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.forceCompleteLab(u, id, b.reason || ''); }
audit-work/source/nabdah-backend/src/modules/admin-authority/admin-authority.module.ts:265:  @Post('labs/:id/override-insurance') oil(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.overrideLabInsurance(u, id, b.status, b.reason || ''); }
audit-work/source/nabdah-backend/src/modules/admin-authority/admin-authority.module.ts:267:  @Post('radiology/:id/force-cancel') fcr(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.forceCancelRad(u, id, b.reason || ''); }
audit-work/source/nabdah-backend/src/modules/admin-authority/admin-authority.module.ts:268:  @Post('radiology/:id/force-complete') fkcr(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.forceCompleteRad(u, id, b.reason || ''); }
audit-work/source/nabdah-backend/src/modules/admin-authority/admin-authority.module.ts:269:  @Post('radiology/:id/override-insurance') oir(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.overrideRadInsurance(u, id, b.status, b.reason || ''); }
audit-work/source/nabdah-backend/src/modules/admin-authority/admin-authority.module.ts:271:  @Post('providers/:id/suspend') susp(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.suspendProvider(u, id, b.reason || ''); }
audit-work/source/nabdah-backend/src/modules/admin-authority/admin-authority.module.ts:272:  @Post('providers/:id/unsuspend') unsp(@Param('id') id: string, @CurrentUser() u: any) { return this.svc.unsuspendProvider(u, id); }
audit-work/source/nabdah-backend/src/modules/admin-authority/admin-authority.module.ts:273:  @Post('users/:id/impersonate') impersonate(@Param('id') targetUserId: string, @CurrentUser() admin: any) { return this.svc.impersonateUser(admin, targetUserId); }
audit-work/source/nabdah-backend/src/modules/admin-authority/admin-authority.module.ts:275:  @Get('actions') log(@Query() q: any) { return this.svc.listActions({ action: q?.action, admin_id: q?.admin_id, target_type: q?.target_type, limit: q?.limit ? Number(q.limit) : undefined }); }
audit-work/source/nabdah-backend/src/modules/providers/providers.controller.ts:6:@Controller('providers')
audit-work/source/nabdah-backend/src/modules/providers/providers.controller.ts:13:  @Post('apply')
audit-work/source/nabdah-backend/src/modules/providers/providers.controller.ts:20:  @Get()
audit-work/source/nabdah-backend/src/modules/providers/providers.controller.ts:33:  @Get('map')
audit-work/source/nabdah-backend/src/modules/providers/providers.controller.ts:39:  @Get(':id')
audit-work/source/nabdah-backend/src/modules/providers/providers.controller.ts:45:  @Get('me/profile')
audit-work/source/nabdah-backend/src/modules/providers/providers.controller.ts:58:  @Post('admin/create')
audit-work/source/nabdah-backend/src/modules/providers/providers.controller.ts:64:  @Get('admin/all')
audit-work/source/nabdah-backend/src/modules/providers/providers.controller.ts:70:  @Get('admin/pending')
audit-work/source/nabdah-backend/src/modules/providers/providers.controller.ts:76:  @Post(':id/approve')
audit-work/source/nabdah-backend/src/modules/providers/providers.controller.ts:82:  @Post(':id/reject')
audit-work/source/nabdah-backend/src/modules/providers/providers.controller.ts:88:  @Post(':id/suspend')
audit-work/source/nabdah-backend/src/modules/providers/providers.controller.ts:95:  @Post('admin/seed-demo')
audit-work/source/nabdah-backend/src/modules/providers/controllers/hospital-enterprise.controller.ts:10:@Controller('providers/enterprise')
audit-work/source/nabdah-backend/src/modules/providers/controllers/hospital-enterprise.controller.ts:19:  @Post('provision-sub-provider')
audit-work/source/nabdah-backend/src/modules/providers/controllers/hospital-enterprise.controller.ts:49:  @Get('branch-staff/:hospitalId/:branchId')
audit-work/source/nabdah-backend/src/modules/providers/controllers/hospital-enterprise.controller.ts:70:  @Post('branch-financials/:hospitalId/:branchId')
audit-work/source/nabdah-backend/src/modules/payouts/provider-payouts.controller.ts:9:@Controller('provider/payouts')
audit-work/source/nabdah-backend/src/modules/payouts/provider-payouts.controller.ts:45:  @Post('request')
audit-work/source/nabdah-backend/src/modules/payouts/provider-payouts.controller.ts:111:  @Get('mine')
audit-work/source/nabdah-backend/src/modules/payouts/provider-payouts.controller.ts:116:  @Get('balance')
audit-work/source/nabdah-backend/src/modules/ratings/ratings.module.ts:85:@Controller('ratings')
audit-work/source/nabdah-backend/src/modules/ratings/ratings.module.ts:89:  @Post()
audit-work/source/nabdah-backend/src/modules/ratings/ratings.module.ts:96:  @Get('provider/:id')
audit-work/source/nabdah-backend/src/modules/ratings/ratings.module.ts:101:  @Get('mine/:entity_type/:entity_id')
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:523:@Controller('provider/ops')
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:529:  @Post('doctor/leave') addLeave(@CurrentUser() u: any, @Body() b: any) { return this.svc.addLeave(u.id, b); }
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:530:  @Get('doctor/leave') leaves(@CurrentUser() u: any): Promise<any[]> { return this.svc.myLeaves(u.id); }
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:531:  @Delete('doctor/leave/:id') cancelLeave(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.cancelLeave(u.id, id); }
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:534:  @Post('doctor/templates') saveTemplate(@CurrentUser() u: any, @Body() b: any) { return this.svc.saveTemplate(u.id, b); }
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:535:  @Get('doctor/templates') templates(@CurrentUser() u: any): Promise<any[]> { return this.svc.myTemplates(u.id); }
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:536:  @Delete('doctor/templates/:id') delTemplate(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.deleteTemplate(u.id, id); }
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:537:  @Post('doctor/diagnoses') saveDx(@CurrentUser() u: any, @Body() b: any) { return this.svc.saveDiagnosis(u.id, b); }
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:538:  @Get('doctor/diagnoses') diagnoses(@CurrentUser() u: any, @Query('search') s?: string): Promise<any[]> { return this.svc.myDiagnoses(u.id, s); }
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:539:  @Post('doctor/blacklist/:patientId') block(@CurrentUser() u: any, @Param('patientId') p: string, @Body() b: any) { return this.svc.blacklistPatient(u.id, p, b?.reason); }
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:540:  @Delete('doctor/blacklist/:patientId') unblock(@CurrentUser() u: any, @Param('patientId') p: string) { return this.svc.unblacklistPatient(u.id, p); }
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:541:  @Get('doctor/blacklist') blacklist(@CurrentUser() u: any): Promise<any[]> { return this.svc.myBlacklist(u.id); }
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:542:  @Get('doctor/patient-crm/:patientId') getCrm(@CurrentUser() u: any, @Param('patientId') p: string) { return this.svc.getPatientCrm(u.id, p); }
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:543:  @Put('doctor/patient-crm/:patientId') putCrm(@CurrentUser() u: any, @Param('patientId') p: string, @Body() b: any) { return this.svc.putPatientCrm(u.id, p, b || {}); }
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:546:  @Post('lab/bookings/:id/qc/:action') qc(@CurrentUser() u: any, @Param('id') id: string, @Param('action') action: string, @Body() b: any) { return this.svc.labQc(u, id, action, b); }
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:549:  @Post('nursing/bookings/:id/checklist/:phase') checklist(@CurrentUser() u: any, @Param('id') id: string, @Param('phase') phase: string, @Body() b: any) { return this.svc.nursingChecklist(u, id, phase as any, b?.items || {}); }
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:550:  @Post('nursing/bookings/:id/sign') sign(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.nursingSign(u, id, b?.signature, b?.signer_name); }
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:551:  @Post('nursing/bookings/:id/track') track(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.nursingTrack(u, id, b?.lat, b?.lng); }
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:552:  @Post('nursing/bookings/:id/escalate') escalate(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.nursingEscalate(u, id, b?.reason); }
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:555:  @Get('ambulance/:id/eta') eta(@Param('id') id: string, @Query('lat') lat: string, @Query('lng') lng: string) { return this.svc.ambulanceEta(id, parseFloat(lat), parseFloat(lng)); }
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:556:  @Post('ambulance/:id/handover') handover(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.ambulanceHandover(u, id, b); }
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:557:  @Post('ambulance/:id/complete') complete(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.ambulanceComplete(u, id, b); }
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:560:  @Get('invoice/:orderId/pdf') async invoice(@CurrentUser() u: any, @Param('orderId') id: string, @Res({ passthrough: true }) res: any) {
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:566:  @Get('wallet/ledger') wallet(@CurrentUser() u: any, @Query('limit') l?: string): Promise<any> { return this.svc.walletLedger(u.id, l ? parseInt(l) : 100); }
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:571:@Controller('provider')
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:577:  @Post('ops/availability/toggle-instant')
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:583:  @Get('wallet') async wallet(@CurrentUser() u: any) {
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:588:  @Get('wallet/transactions') async walletTx(@CurrentUser() u: any) {
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:600:  @Get('stats/today') async statsToday(@CurrentUser() u: any): Promise<any> {
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:605:  @Get('reviews') async myReviews(@CurrentUser() u: any): Promise<any[]> {
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:609:  @Post('reviews/:id/reply') replyReview(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) {
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:614:  @Get('working-hours') async getHours(@CurrentUser() u: any) {
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:617:  @Put('working-hours') async putHours(@CurrentUser() u: any, @Body() b: any) {
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:622:  @Get('schedule/settings') async getSched(@CurrentUser() u: any) {
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:625:  @Post('schedule/settings') async postSched(@CurrentUser() u: any, @Body() b: any) {
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:630:  @Post('consultation/end') endConsultation(@CurrentUser() u: any, @Body() b: any) {
audit-work/source/nabdah-backend/src/modules/config/config.controller.ts:8:@Controller('config')
audit-work/source/nabdah-backend/src/modules/config/config.controller.ts:13:  @Get()
audit-work/source/nabdah-backend/src/modules/event-reliability/event-reliability.module.ts:131:@Controller('events')
audit-work/source/nabdah-backend/src/modules/event-reliability/event-reliability.module.ts:136:  @Get('status') status() { return this.svc.status(); }
audit-work/source/nabdah-backend/src/modules/event-reliability/event-reliability.module.ts:137:  @Post('retry-failed') retry() { return this.svc.retryFailed(); }
audit-work/source/nabdah-backend/src/modules/event-reliability/event-reliability.module.ts:138:  @Post('replay/:eventId') replay(@Param('eventId') id: string) { return this.svc.replayOne(id); }
audit-work/source/nabdah-backend/src/modules/maternity/maternity.controller.ts:6:@Controller('maternity')
audit-work/source/nabdah-backend/src/modules/maternity/maternity.controller.ts:19:  @Get('profile')
audit-work/source/nabdah-backend/src/modules/maternity/maternity.controller.ts:24:  @Get('content')
audit-work/source/nabdah-backend/src/modules/maternity/maternity.controller.ts:30:  @Post('profile')
audit-work/source/nabdah-backend/src/modules/maternity/maternity.controller.ts:36:  @Post('kicks')
audit-work/source/nabdah-backend/src/modules/maternity/maternity.controller.ts:42:  @Post('contractions')
audit-work/source/nabdah-backend/src/modules/maternity/maternity.controller.ts:48:  @Put('checkups/:week/toggle')
audit-work/source/nabdah-backend/src/modules/maternity/maternity.controller.ts:54:  @Post('infant-growth')
audit-work/source/nabdah-backend/src/modules/provider-jobs/provider-jobs.module.ts:254:@Controller('provider/jobs')
audit-work/source/nabdah-backend/src/modules/provider-jobs/provider-jobs.module.ts:258:  @Get('queue') queue(@CurrentUser() u: any, @Query() q: any) { return this.svc.queue(u, (q.status as any) || 'incoming', q.kind); }
audit-work/source/nabdah-backend/src/modules/provider-jobs/provider-jobs.module.ts:259:  @Get('my-capabilities') async myCaps(@CurrentUser() u: any) {
audit-work/source/nabdah-backend/src/modules/provider-jobs/provider-jobs.module.ts:263:  @Post(':type/:id/accept') accept(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string, @Body() b: any) { return this.svc.accept(u, t, id, b?.reason); }
audit-work/source/nabdah-backend/src/modules/provider-jobs/provider-jobs.module.ts:264:  @Post(':type/:id/reject') reject(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string, @Body() b: any) { return this.svc.reject(u, t, id, b?.reason); }
audit-work/source/nabdah-backend/src/modules/provider-jobs/provider-jobs.module.ts:265:  @Post(':type/:id/start') start(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string, @Body() b: any) { return this.svc.start(u, t, id, b?.reason); }
audit-work/source/nabdah-backend/src/modules/provider-jobs/provider-jobs.module.ts:266:  @Post(':type/:id/complete') complete(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string, @Body() b: any) { return this.svc.complete(u, t, id, b?.reason); }
audit-work/source/nabdah-backend/src/modules/provider-jobs/provider-jobs.module.ts:267:  @Post(':type/:id/insurance') insurance(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string, @Body() b: any) { return this.svc.updateInsurance(u, t, id, b); }
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:8:@Controller('orders')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:14:  @Post('create')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:21:  @Get('mine')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:26:  @Post(':id/reorder')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:32:  @Post(':id/reorder-partial')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:38:  @Post(':id/cancel')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:45:  @Post(':id/approve-basket')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:49:  @Post(':id/reject-basket')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:55:  @Get('pharmacy/queue')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:61:  @Get(':id')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:66:  @Get(':id/report.pdf')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:74:  @Get(':id/tracking')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:79:  @Patch(':id/items/:itemId/opt-in-cash')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:86:  @Patch(':id/insurance-approval')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:92:  @Post(':id/accept')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:98:  @Post(':id/reject')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:104:  @Post(':id/preparing')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:110:  @Post(':id/ready')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:116:  @Post(':id/partial')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:123:  @Post(':id/assign-delivery')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:129:  @Post(':id/delivery/update')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:135:  @Post(':id/dispatch')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:141:  @Post(':id/delivered')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:148:  @Get()
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:154:  @Get('admin/escalated')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:160:  @Post(':id/admin/transition')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:166:  @Post('bids/place')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:172:  @Post('bids/:id/accept')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:177:  @Get('bids/request/:id')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:182:  @Get('bids/pharmacy/mine')
audit-work/source/nabdah-backend/src/modules/admin-notification-center/admin-notification-center.module.ts:369:@Controller('admin/notification-center')
audit-work/source/nabdah-backend/src/modules/admin-notification-center/admin-notification-center.module.ts:376:  @Get('segments')
audit-work/source/nabdah-backend/src/modules/admin-notification-center/admin-notification-center.module.ts:380:  @Get('stats/overview')
audit-work/source/nabdah-backend/src/modules/admin-notification-center/admin-notification-center.module.ts:384:  @Post('broadcasts')
audit-work/source/nabdah-backend/src/modules/admin-notification-center/admin-notification-center.module.ts:388:  @Post('campaigns')
audit-work/source/nabdah-backend/src/modules/admin-notification-center/admin-notification-center.module.ts:392:  @Get('campaigns')
audit-work/source/nabdah-backend/src/modules/admin-notification-center/admin-notification-center.module.ts:398:  @Get('campaigns/:id')
audit-work/source/nabdah-backend/src/modules/admin-notification-center/admin-notification-center.module.ts:402:  @Post('campaigns/:id/send')
audit-work/source/nabdah-backend/src/modules/admin-notification-center/admin-notification-center.module.ts:406:  @Delete('campaigns/:id')
audit-work/source/nabdah-backend/src/modules/admin-notification-center/admin-notification-center.module.ts:410:  @Post('retarget/run')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:7:@Controller()
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:16:  @Patch('notifications/:id/read')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:24:  @Get('wallet/balance')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:30:  @Post('wallet/credit')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:43:  @Post('wallet/debit')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:56:  @Post('referral/code')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:62:  @Post('referral/claim')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:69:  @Get('config/flags')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:74:  @Put('admin/config/flags')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:85:  @Get('patients/timeline')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:90:  @Get('patients/passport')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:95:  @Post('medical/programs/enroll')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:101:  @Get('medical/programs/active')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:106:  @Post('medical/programs/complete-session')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:116:  @Post('provider/match/pharmacy')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:121:  @Post('provider/match/nurse')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:126:  @Get('provider/rankings')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:132:  @Get('provider/fraud-alerts')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:142:  @Post('nursing/attendance/verify')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:147:  @Get('nursing/visit/checklist')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:152:  @Post('pharmacy/broadcast/respond')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:158:  @Get('pharmacy/inventory/expiry')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:163:  @Post('labs/samples/barcode-verify')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:169:  @Post('labs/results/verify')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:178:  @Get('admin/analytics/heatmaps')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:184:  @Post('admin/ads/bid')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:190:  @Post('corporate/enroll')
audit-work/source/nabdah-backend/src/modules/nutrition/nutrition.controller.ts:8:@Controller('nutrition')
audit-work/source/nabdah-backend/src/modules/nutrition/nutrition.controller.ts:22:  @Get('profile')
audit-work/source/nabdah-backend/src/modules/nutrition/nutrition.controller.ts:28:  @Post('profile')
audit-work/source/nabdah-backend/src/modules/nutrition/nutrition.controller.ts:35:  @Post('meals')
audit-work/source/nabdah-backend/src/modules/nutrition/nutrition.controller.ts:41:  @Get('meals')
audit-work/source/nabdah-backend/src/modules/nutrition/nutrition.controller.ts:48:  @Get('daily-summary')
audit-work/source/nabdah-backend/src/modules/nutrition/nutrition.controller.ts:55:  @Post('water')
audit-work/source/nabdah-backend/src/modules/nutrition/nutrition.controller.ts:61:  @Get('water')
audit-work/source/nabdah-backend/src/modules/nutrition/nutrition.controller.ts:68:  @Post('exercise')
audit-work/source/nabdah-backend/src/modules/nutrition/nutrition.controller.ts:74:  @Get('exercise')
audit-work/source/nabdah-backend/src/modules/nutrition/nutrition.controller.ts:81:  @Get('weekly-report')
audit-work/source/nabdah-backend/src/modules/livekit/livekit.controller.ts:7:@Controller('calls')
audit-work/source/nabdah-backend/src/modules/livekit/livekit.controller.ts:13:  @Get('provider/waiting-room')
audit-work/source/nabdah-backend/src/modules/livekit/livekit.controller.ts:18:  @Post('provider/ping-patient')
audit-work/source/nabdah-backend/src/modules/livekit/livekit.controller.ts:23:  @Post('provider/no-show')
audit-work/source/nabdah-backend/src/modules/livekit/livekit.controller.ts:31:  @Post('webhook')
audit-work/source/nabdah-backend/src/modules/livekit/livekit.controller.ts:37:  @Post('initiate')
audit-work/source/nabdah-backend/src/modules/livekit/livekit.controller.ts:46:  @Post(':sessionId/join')
audit-work/source/nabdah-backend/src/modules/livekit/livekit.controller.ts:51:  @Post(':sessionId/end')
audit-work/source/nabdah-backend/src/modules/livekit/livekit.controller.ts:56:  @Post(':sessionId/reject')
audit-work/source/nabdah-backend/src/modules/livekit/livekit.controller.ts:61:  @Post(':sessionId/metrics')
audit-work/source/nabdah-backend/src/modules/livekit/livekit.controller.ts:70:  @Get('history')
audit-work/source/nabdah-backend/src/modules/livekit/livekit.controller.ts:75:  @Get('sessions/:sessionId')
audit-work/source/nabdah-backend/src/modules/livekit/livekit.controller.ts:81:  @Get('admin/rooms')
audit-work/source/nabdah-backend/src/modules/livekit/livekit.controller.ts:87:  @Get('admin/analytics')
audit-work/source/nabdah-backend/src/modules/livekit/livekit.controller.ts:93:  @Get('admin/rooms/:roomName/participants')
audit-work/source/nabdah-backend/src/modules/livekit/livekit.controller.ts:99:  @Post('admin/rooms/:roomName/mute/:participantId')
audit-work/source/nabdah-backend/src/modules/livekit/livekit.controller.ts:109:  @Post('admin/rooms/:roomName/remove/:participantId')
audit-work/source/nabdah-backend/src/modules/doctors/doctors.module.ts:246:@Controller('doctors')
audit-work/source/nabdah-backend/src/modules/doctors/doctors.module.ts:251:  @Public() @Get('') list(@Query() q: any) { return this.svc.listDoctors(q); }
audit-work/source/nabdah-backend/src/modules/doctors/doctors.module.ts:252:  @Public() @Get('specialties') specs() { return this.svc.specialties(); }
audit-work/source/nabdah-backend/src/modules/doctors/doctors.module.ts:253:  @Public() @Get(':id') detail(@Param('id') id: string) { return this.svc.doctorDetail(id); }
audit-work/source/nabdah-backend/src/modules/doctors/doctors.module.ts:254:  @Public() @Get(':id/slots') slots(@Param('id') id: string, @Query('date') date: string) { return this.svc.availableSlots(id, date); }
audit-work/source/nabdah-backend/src/modules/doctors/doctors.module.ts:256:  @Post('appointments') book(@Body() body: any, @CurrentUser() user: any) { return this.svc.book(user, body); }
audit-work/source/nabdah-backend/src/modules/doctors/doctors.module.ts:257:  @Get('appointments/mine') mine(@CurrentUser() user: any) { return this.svc.myAppointments(user); }
audit-work/source/nabdah-backend/src/modules/doctors/doctors.module.ts:258:  @Get('appointments/inbox') inbox(@Query('status') s: string | undefined, @CurrentUser() user: any) { return this.svc.doctorInbox(user, s); }
audit-work/source/nabdah-backend/src/modules/doctors/doctors.module.ts:259:  @Get('appointments/:id') ap(@Param('id') id: string, @CurrentUser() user: any) { return this.svc.appointmentDetail(user, id); }
audit-work/source/nabdah-backend/src/modules/doctors/doctors.module.ts:260:  @Patch('appointments/:id/state') tr(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) { return this.svc.transition(user, id, body.state); }
audit-work/source/nabdah-backend/src/modules/doctors/doctors.module.ts:262:  @Get('appointments/:id/messages') msgs(@Param('id') id: string, @CurrentUser() user: any) { return this.svc.listMessages(user, id); }
audit-work/source/nabdah-backend/src/modules/doctors/doctors.module.ts:263:  @Post('appointments/:id/messages') postMsg(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) { return this.svc.postMessage(user, id, body.text); }
audit-work/source/nabdah-backend/src/modules/doctors/doctors.module.ts:264:  @Post('appointments/:id/note') note(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) { return this.svc.upsertNote(user, id, body); }
audit-work/source/nabdah-backend/src/modules/doctors/doctors.module.ts:266:  @Patch('availability') avail(@Body() body: any, @CurrentUser() user: any) { return this.svc.setAvailability(user, body); }
audit-work/source/nabdah-backend/src/modules/doctors/doctors.module.ts:269:@Controller('notifications')
audit-work/source/nabdah-backend/src/modules/doctors/doctors.module.ts:273:  @Get('') list(@CurrentUser() user: any) { return this.svc.listNotifications(user); }
audit-work/source/nabdah-backend/src/modules/doctors/doctors.module.ts:274:  @Get('unread-count') unread(@CurrentUser() user: any) { return this.svc.unreadCount(user); }
audit-work/source/nabdah-backend/src/modules/doctors/doctors.module.ts:275:  @Patch(':id/read') mr(@Param('id') id: string, @CurrentUser() user: any) { return this.svc.markRead(user, id); }
audit-work/source/nabdah-backend/src/modules/doctors/doctors.module.ts:276:  @Post('mark-all-read') mar(@CurrentUser() user: any) { return this.svc.markAllRead(user); }
audit-work/source/nabdah-backend/src/modules/admin/admin.controller.ts:19:@Controller('admin')
audit-work/source/nabdah-backend/src/modules/admin/admin.controller.ts:39:  @Get('referrals/report')
audit-work/source/nabdah-backend/src/modules/admin/admin.controller.ts:100:  @Get('loyalty/overview')
audit-work/source/nabdah-backend/src/modules/admin/admin.controller.ts:139:  @Get('users/:userId/overview')
audit-work/source/nabdah-backend/src/modules/admin/admin.controller.ts:242:  @Get('disputes')
audit-work/source/nabdah-backend/src/modules/admin/admin.controller.ts:251:  @Get('users')
audit-work/source/nabdah-backend/src/modules/admin/admin.controller.ts:309:  @Get('users/stats')
audit-work/source/nabdah-backend/src/modules/admin/admin.controller.ts:332:  @Get('sub-admins')
audit-work/source/nabdah-backend/src/modules/admin/admin.controller.ts:348:  @Post('sub-admins')
audit-work/source/nabdah-backend/src/modules/admin/admin.controller.ts:377:  @Patch('sub-admins/:userId')
audit-work/source/nabdah-backend/src/modules/admin/admin.controller.ts:398:  @Delete('sub-admins/:userId')
audit-work/source/nabdah-backend/src/modules/admin/admin.controller.ts:423:  @Post('providers/create')
audit-work/source/nabdah-backend/src/modules/admin/admin.controller.ts:458:  @Post('users/:userId/ban')
audit-work/source/nabdah-backend/src/modules/admin/admin.controller.ts:474:  @Post('users/:userId/unban')
audit-work/source/nabdah-backend/src/modules/admin/admin.controller.ts:490:  @Delete('users/:userId')
audit-work/source/nabdah-backend/src/modules/admin/admin.controller.ts:529:  @Post('approve/:userId')
audit-work/source/nabdah-backend/src/modules/admin/admin.controller.ts:543:  @Post('suspend/:userId')
audit-work/source/nabdah-backend/src/modules/admin/admin.controller.ts:557:  @Post('provider-deltas')
audit-work/source/nabdah-backend/src/modules/admin/admin.controller.ts:563:  @Post('provider-deltas/:deltaId/approve')
audit-work/source/nabdah-backend/src/modules/admin/admin.controller.ts:577:  @Post('provider-deltas/:deltaId/reject')
audit-work/source/nabdah-backend/src/modules/payments/paymob.controller.ts:9:@Controller('payments/paymob')
audit-work/source/nabdah-backend/src/modules/payments/paymob.controller.ts:14:  @Get('methods')
audit-work/source/nabdah-backend/src/modules/payments/paymob.controller.ts:19:  @Post('initiate')
audit-work/source/nabdah-backend/src/modules/payments/paymob.controller.ts:25:  @Post('verify')
audit-work/source/nabdah-backend/src/modules/payments/payments.module.ts:376:@Controller('payments')
audit-work/source/nabdah-backend/src/modules/payments/payments.module.ts:380:  @Post('intent/:type/:id')
audit-work/source/nabdah-backend/src/modules/payments/payments.module.ts:383:  @Post('verify/:txn') verify(@CurrentUser() u: any, @Param('txn') txn: string) { return this.svc.verifyPayment(u, txn); }
audit-work/source/nabdah-backend/src/modules/payments/payments.module.ts:384:  @Post('retry/:type/:id')
audit-work/source/nabdah-backend/src/modules/payments/payments.module.ts:387:  @Post('refund/:txn') refund(@CurrentUser() u: any, @Param('txn') txn: string, @Body() b: { amount?: number; reason?: string }) { return this.svc.refundPayment(u, txn, b.amount, b.reason); }
audit-work/source/nabdah-backend/src/modules/payments/payments.module.ts:388:  @Post('capture/:txn') capture(@CurrentUser() u: any, @Param('txn') txn: string) { return this.svc.capturePayment(u, txn); }
audit-work/source/nabdah-backend/src/modules/payments/payments.module.ts:389:  @Get('booking/:type/:id') list(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string) { return this.svc.listForBooking(u, t, id); }
audit-work/source/nabdah-backend/src/modules/payments/payments.module.ts:392:@Controller('payments/webhook')
audit-work/source/nabdah-backend/src/modules/payments/payments.module.ts:396:  @Post(':provider') @HttpCode(200) async webhook(
audit-work/source/nabdah-backend/src/modules/business-rules/business-rules.module.ts:167:@Controller('business-rules')
audit-work/source/nabdah-backend/src/modules/business-rules/business-rules.module.ts:172:  @Get('config/surge')
audit-work/source/nabdah-backend/src/modules/business-rules/business-rules.module.ts:175:  @Post('config/surge')
audit-work/source/nabdah-backend/src/modules/business-rules/business-rules.module.ts:178:  @Post('validate') validate(@Body() ctx: RuleContext) { return this.svc.validate(ctx); }
audit-work/source/nabdah-backend/src/modules/chat/chat.module.ts:19:@Controller(['chat', 'chats'])
audit-work/source/nabdah-backend/src/modules/chat/chat.module.ts:24:  @Get('threads/:threadId/permissions')
audit-work/source/nabdah-backend/src/modules/chat/chat.module.ts:137:  @Get('threads')
audit-work/source/nabdah-backend/src/modules/chat/chat.module.ts:142:  @Post('threads/direct')
audit-work/source/nabdah-backend/src/modules/chat/chat.module.ts:147:  @Post('threads/group')
audit-work/source/nabdah-backend/src/modules/chat/chat.module.ts:152:  @Post('threads/booking')
audit-work/source/nabdah-backend/src/modules/chat/chat.module.ts:157:  @Get('threads/:threadId')
audit-work/source/nabdah-backend/src/modules/chat/chat.module.ts:162:  @Get('threads/:threadId/messages')
audit-work/source/nabdah-backend/src/modules/chat/chat.module.ts:173:  @Post('threads/:threadId/messages')
audit-work/source/nabdah-backend/src/modules/chat/chat.module.ts:179:  @Post('threads/:threadId/read')
audit-work/source/nabdah-backend/src/modules/chat/chat.module.ts:184:  @Get('threads/:threadId/rt-token')
audit-work/source/nabdah-backend/src/modules/chat/chat.module.ts:189:  @Post('threads/:threadId/delivered')
audit-work/source/nabdah-backend/src/modules/chat/chat.module.ts:194:  @Patch('messages/:msgId')
audit-work/source/nabdah-backend/src/modules/chat/chat.module.ts:199:  @Delete('messages/:msgId')
audit-work/source/nabdah-backend/src/modules/chat/chat.module.ts:204:  @Post('messages/:msgId/reactions')
audit-work/source/nabdah-backend/src/modules/chat/chat.module.ts:209:  @Delete('messages/:msgId/reactions/:emoji')
audit-work/source/nabdah-backend/src/modules/chat/chat.module.ts:214:  @Post('messages/:msgId/pin')
audit-work/source/nabdah-backend/src/modules/chat/chat.module.ts:219:  @Post('threads/:threadId/participants')
audit-work/source/nabdah-backend/src/modules/chat/chat.module.ts:224:  @Delete('threads/:threadId/participants/:userId')
audit-work/source/nabdah-backend/src/modules/system-health/system-health.controller.ts:5:@Controller('system-health')
audit-work/source/nabdah-backend/src/modules/system-health/system-health.controller.ts:13:  @Get('liveness')
audit-work/source/nabdah-backend/src/modules/system-health/system-health.controller.ts:29:  @Get('readiness')
audit-work/source/nabdah-backend/src/modules/legal/legal-enterprise.controller.ts:10:@Controller()
audit-work/source/nabdah-backend/src/modules/legal/legal-enterprise.controller.ts:28:  @Get('legal/policy/:key/pdf')
audit-work/source/nabdah-backend/src/modules/legal/legal-enterprise.controller.ts:44:  @Get('legal/archive/:id/pdf')
audit-work/source/nabdah-backend/src/modules/legal/legal-enterprise.controller.ts:56:  @Get('legal/archive/:id/verify')
audit-work/source/nabdah-backend/src/modules/legal/legal-enterprise.controller.ts:60:  @Get('admin/finance/commission-history')
audit-work/source/nabdah-backend/src/modules/legal/legal-enterprise.controller.ts:68:  @Get('admin/audit-log')
audit-work/source/nabdah-backend/src/modules/legal/legal-enterprise.controller.ts:76:  @Get('provider/settlements')
audit-work/source/nabdah-backend/src/modules/legal/legal-enterprise.controller.ts:82:  @Get('provider/settlements/excel')
audit-work/source/nabdah-backend/src/modules/legal/legal-enterprise.controller.ts:91:  @Get('provider/settlements/pdf')
audit-work/source/nabdah-backend/src/modules/legal/legal-enterprise.controller.ts:101:  @Post('admin/providers/license-monitor/run')
audit-work/source/nabdah-backend/src/modules/legal/legal-enterprise.controller.ts:107:  @Get('provider/insurance-matrix')
audit-work/source/nabdah-backend/src/modules/legal/legal-enterprise.controller.ts:111:  @Put('provider/insurance-matrix')
audit-work/source/nabdah-backend/src/modules/legal/legal-enterprise.controller.ts:119:  @Get('provider/sla')
audit-work/source/nabdah-backend/src/modules/legal/legal-enterprise.controller.ts:126:  @Get('consents')
audit-work/source/nabdah-backend/src/modules/legal/legal-enterprise.controller.ts:130:  @Put('consents/:type')
audit-work/source/nabdah-backend/src/modules/legal/legal-enterprise.controller.ts:141:  @Get('admin/legal/policy/:key/diff')
audit-work/source/nabdah-backend/src/modules/legal/legal.module.ts:156:@Controller()
audit-work/source/nabdah-backend/src/modules/legal/legal.module.ts:161:  @Get('legal/policies')
audit-work/source/nabdah-backend/src/modules/legal/legal.module.ts:165:  @Get('legal/policy/:key')
audit-work/source/nabdah-backend/src/modules/legal/legal.module.ts:170:  @Get('legal/pending')
audit-work/source/nabdah-backend/src/modules/legal/legal.module.ts:174:  @Post('legal/accept/:key')
audit-work/source/nabdah-backend/src/modules/legal/legal.module.ts:180:  @Put('admin/legal/policy/:key')
audit-work/source/nabdah-backend/src/modules/legal/legal.module.ts:187:  @Get('admin/finance/commissions')
audit-work/source/nabdah-backend/src/modules/legal/legal.module.ts:192:  @Put('admin/finance/commissions')
audit-work/source/nabdah-backend/src/modules/legal/legal.module.ts:199:  @Get('finance/commission-for')
audit-work/source/nabdah-backend/src/modules/unified-bookings/unified-bookings.module.ts:399:@Controller('unified-bookings')
audit-work/source/nabdah-backend/src/modules/unified-bookings/unified-bookings.module.ts:404:  @Get('mine') mine(@CurrentUser() u: any, @Query() q: any) { return this.svc.myTimeline(u, { state: q.state, kind: q.kind }); }
audit-work/source/nabdah-backend/src/modules/unified-bookings/unified-bookings.module.ts:405:  @Post()
audit-work/source/nabdah-backend/src/modules/unified-bookings/unified-bookings.module.ts:408:  @Post(':id/cancel')
audit-work/source/nabdah-backend/src/modules/unified-bookings/unified-bookings.module.ts:411:  @Post(':id/reschedule')
audit-work/source/nabdah-backend/src/modules/unified-bookings/unified-bookings.module.ts:414:  @Get(':id/call-token')
audit-work/source/nabdah-backend/src/modules/unified-bookings/unified-bookings.module.ts:416:  @Get(':kind/:id') one(@CurrentUser() u: any, @Param('kind') k: string, @Param('id') id: string) { return this.svc.getOne(u, k, id); }
audit-work/source/nabdah-backend/src/modules/unified-bookings/unified-bookings.module.ts:417:  @Post(':kind/:id/cancel')
audit-work/source/nabdah-backend/src/modules/unified-bookings/unified-bookings.module.ts:420:  @Patch(':kind/:id/reschedule')
audit-work/source/nabdah-backend/src/modules/unified-bookings/unified-bookings.module.ts:423:  @Post('match') match(@CurrentUser() u: any, @Body() b: any) { return this.svc.smartMatch(u, b); }
audit-work/source/nabdah-backend/src/modules/unified-bookings/unified-bookings.module.ts:424:  @Post('nursing-broadcast')
audit-work/source/nabdah-backend/src/modules/unified-bookings/unified-bookings.module.ts:427:  @Post('checkout-cart')
audit-work/source/nabdah-backend/src/modules/booking-ops/booking-ops.module.ts:180:@Controller('booking/flow')
audit-work/source/nabdah-backend/src/modules/booking-ops/booking-ops.module.ts:184:  @Get('invoice/:type/:id') invoice(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string) { return this.svc.invoice(u, t, id); }
audit-work/source/nabdah-backend/src/modules/booking-ops/booking-ops.module.ts:185:  @Get('payment/:type/:id') payment(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string) { return this.svc.payment(u, t, id); }
audit-work/source/nabdah-backend/src/modules/booking-ops/booking-ops.module.ts:186:  @Post('payment/:type/:id/mark') mark(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string, @Body() b: any) { return this.svc.markPayment(u, t, id, b); }
audit-work/source/nabdah-backend/src/modules/booking-ops/booking-ops.module.ts:187:  @Post('attachments/:type/:id') addAtt(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string, @Body() b: any) { return this.svc.addAttachment(u, t, id, b); }
audit-work/source/nabdah-backend/src/modules/booking-ops/booking-ops.module.ts:188:  @Get('attachments/:type/:id') listAtt(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string) { return this.svc.listAttachments(u, t, id); }
audit-work/source/nabdah-backend/src/modules/legacy/legacy.module.ts:83:@Controller('legacy')
audit-work/source/nabdah-backend/src/modules/legacy/legacy.module.ts:88:  @Get('report') report() { return this.svc.report(); }
audit-work/source/nabdah-backend/src/modules/legacy/legacy.module.ts:89:  @Get('usage-map') usageMap() { return this.svc.usageMap(); }
audit-work/source/nabdah-backend/src/modules/ops/ops.controller.ts:15:@Controller('admin/ops')
audit-work/source/nabdah-backend/src/modules/ops/ops.controller.ts:39:  @Get('overview')
audit-work/source/nabdah-backend/src/modules/ops/ops.controller.ts:119:  @Get('requests')
audit-work/source/nabdah-backend/src/modules/ops/ops.controller.ts:162:  @Get('traffic')
audit-work/source/nabdah-backend/src/modules/family/family.controller.ts:8:@Controller('family')
audit-work/source/nabdah-backend/src/modules/family/family.controller.ts:21:  @Post('create')
audit-work/source/nabdah-backend/src/modules/family/family.controller.ts:26:  @Get('my-group')
audit-work/source/nabdah-backend/src/modules/family/family.controller.ts:32:  @Post('invite')
audit-work/source/nabdah-backend/src/modules/family/family.controller.ts:37:  @Post('join')
audit-work/source/nabdah-backend/src/modules/family/family.controller.ts:42:  @Post('leave')
audit-work/source/nabdah-backend/src/modules/family/family.controller.ts:47:  @Patch('member/:userId/relation')
audit-work/source/nabdah-backend/src/modules/family/family.controller.ts:52:  @Patch('members/:memberId/permissions')
audit-work/source/nabdah-backend/src/modules/family/family.controller.ts:57:  @Patch('member/:userId/permissions')
audit-work/source/nabdah-backend/src/modules/family/family.controller.ts:62:  @Get('member-records/:userId')
audit-work/source/nabdah-backend/src/modules/family/family.controller.ts:67:  @Delete('members/:memberId')
audit-work/source/nabdah-backend/src/modules/family/family.controller.ts:72:  @Delete('remove-member/:userId')
audit-work/source/nabdah-backend/src/modules/family/family.controller.ts:77:  @Get('my-group/members')
audit-work/source/nabdah-backend/src/modules/family/family.controller.ts:82:  @Get('members')
audit-work/source/nabdah-backend/src/modules/family/family.controller.ts:87:  @Get('member-health/:userId')
audit-work/source/nabdah-backend/src/modules/family/family.controller.ts:92:  @Get('emergency-contacts')
audit-work/source/nabdah-backend/src/modules/family/family.controller.ts:98:  @Post('calendar/event')
audit-work/source/nabdah-backend/src/modules/family/family.controller.ts:103:  @Get('calendar')
audit-work/source/nabdah-backend/src/modules/family/family.controller.ts:108:  @Delete('calendar/event/:eventId')
audit-work/source/nabdah-backend/src/modules/family/family.controller.ts:114:  @Post('permissions/request')
audit-work/source/nabdah-backend/src/modules/family/family.controller.ts:119:  @Get('permissions/pending')
audit-work/source/nabdah-backend/src/modules/family/family.controller.ts:124:  @Put('permissions/respond/:requestId')
audit-work/source/nabdah-backend/src/modules/home-care/home-care.controller.ts:12:@Controller('nursing')
audit-work/source/nabdah-backend/src/modules/home-care/home-care.controller.ts:54:  @Post('notes')
audit-work/source/nabdah-backend/src/modules/home-care/home-care.controller.ts:82:  @Get('notes/:patientId')
audit-work/source/nabdah-backend/src/modules/home-care/home-care.controller.ts:95:  @Public() @Get('catalog')
audit-work/source/nabdah-backend/src/modules/home-care/home-care.controller.ts:101:  @Post('admin/catalog')
audit-work/source/nabdah-backend/src/modules/home-care/home-care.controller.ts:106:  @Put('admin/catalog/:id')
audit-work/source/nabdah-backend/src/modules/home-care/home-care.controller.ts:111:  @Delete('admin/catalog/:id')
audit-work/source/nabdah-backend/src/modules/home-care/home-care.controller.ts:117:  @Get('visits')
audit-work/source/nabdah-backend/src/modules/home-care/home-care.controller.ts:124:  @Get('visits/:id')
audit-work/source/nabdah-backend/src/modules/home-care/home-care.controller.ts:133:  @Get('visits/:id/tracking')
audit-work/source/nabdah-backend/src/modules/home-care/home-care.controller.ts:175:  @Post('visits/:id/respond')
audit-work/source/nabdah-backend/src/modules/home-care/home-care.controller.ts:202:  @Post('visits/:id/transit')
audit-work/source/nabdah-backend/src/modules/home-care/home-care.controller.ts:220:  @Post('visits/:id/arrive')
audit-work/source/nabdah-backend/src/modules/home-care/home-care.controller.ts:255:  @Post('visits/:id/start-care')
audit-work/source/nabdah-backend/src/modules/home-care/home-care.controller.ts:271:  @Post('visits/:id/no-show')
audit-work/source/nabdah-backend/src/modules/home-care/home-care.controller.ts:291:  @Post('visits/:id/emergency-abort')
audit-work/source/nabdah-backend/src/modules/home-care/home-care.controller.ts:308:  @Post('visits/:id/complete')
audit-work/source/nabdah-backend/src/modules/home-care/home-care.controller.ts:336:  @Get('wallet')
audit-work/source/nabdah-backend/src/modules/home-care/home-care.controller.ts:395:@Controller('home-care')
audit-work/source/nabdah-backend/src/modules/home-care/home-care.controller.ts:399:  @Get('bookings/:bookingId')
audit-work/source/nabdah-backend/src/modules/home-care/controllers/home-care-tracking.controller.ts:20:@Controller('home-care/tracking')
audit-work/source/nabdah-backend/src/modules/home-care/controllers/home-care-tracking.controller.ts:52:  @Post('verify-attendance/:bookingId')
audit-work/source/nabdah-backend/src/modules/home-care/controllers/home-care-tracking.controller.ts:91:  @Post('submit-supplies-request')
audit-work/source/nabdah-backend/src/modules/drivers/drivers.controller.ts:6:@Controller('drivers')
audit-work/source/nabdah-backend/src/modules/drivers/drivers.controller.ts:11:  @Post('online')
audit-work/source/nabdah-backend/src/modules/drivers/drivers.controller.ts:17:  @Post('offline')
audit-work/source/nabdah-backend/src/modules/drivers/drivers.controller.ts:23:  @Get('shift')
audit-work/source/nabdah-backend/src/modules/drivers/drivers.controller.ts:29:  @Post('location')
audit-work/source/nabdah-backend/src/modules/drivers/drivers.controller.ts:35:  @Get(':driverId/location')
audit-work/source/nabdah-backend/src/modules/drivers/drivers.controller.ts:40:  @Get('orders/available')
audit-work/source/nabdah-backend/src/modules/drivers/drivers.controller.ts:46:  @Get('orders/active')
audit-work/source/nabdah-backend/src/modules/drivers/drivers.controller.ts:52:  @Get('orders/history')
audit-work/source/nabdah-backend/src/modules/drivers/drivers.controller.ts:58:  @Post('orders/:id/accept')
audit-work/source/nabdah-backend/src/modules/drivers/drivers.controller.ts:64:  @Post('orders/:id/pickup')
audit-work/source/nabdah-backend/src/modules/drivers/drivers.controller.ts:70:  @Post('orders/:id/deliver')
audit-work/source/nabdah-backend/src/modules/drivers/drivers.controller.ts:77:  @Get('admin/online')
audit-work/source/nabdah-backend/src/modules/drivers/drivers.controller.ts:84:  @Get('available')
audit-work/source/nabdah-backend/src/modules/coturn/coturn.controller.ts:5:@Controller('calls/ice')
audit-work/source/nabdah-backend/src/modules/coturn/coturn.controller.ts:10:  @Get('config')
audit-work/source/nabdah-backend/src/modules/coturn/coturn.controller.ts:15:  @Get('credentials')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:41:@Controller('family/chat')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:59:  @Get('messages')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:71:  @Post('messages')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:89:@Controller('health/medications')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:93:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:103:  @Post()
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:123:@Controller('wearables')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:127:  @Get('devices')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:133:  @Post('devices')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:147:  @Get('data')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:156:  @Post('data')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:175:@Controller('home-care/packages')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:179:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:209:@Controller('maternity/vaccines')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:213:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:226:  @Post()
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:248:@Controller('nutrition/foods')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:252:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:295:@Controller('offers')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:299:  @Get(':id')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:320:@Controller('promotions/offers')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:324:  @Get(':id/providers')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:342:@Controller('reports')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:346:  @Get('timeline')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:358:  @Get(':id')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:371:@Controller('support/chat')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:376:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:379:  @Post()
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:384:  @Get('messages')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:392:  @Post('messages')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:420:@Controller('audit')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:424:  @Post()
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:433:  @Post('batch')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:455:@Controller('ai')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:459:  @Post('drug-interactions')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:478:@Controller('consultations')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:490:  @Get(':id')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:508:  @Get(':id/messages')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:521:  @Post(':id/messages')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:541:@Controller('facility')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:545:  @Get('inbox')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:556:  @Post('inbox/:id/read')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:567:@Controller('nursing')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:571:  @Get('jobs/active')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:591:  @Post('notes')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:614:  @Post('jobs/:id/notes')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:633:  @Post('coverage/verify-gps')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:651:@Controller('pharmacy')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:655:  @Get('products')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:682:  @Post('shortages/report')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:717:@Controller('provider-deltas')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:721:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:735:@Controller('provider/capabilities')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:739:  @Get('lab-services')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:748:  @Get('radiology-services')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:759:@Controller('provider/facility')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:769:  @Get('audit-logs')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:781:  @Get('calendar')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:798:  @Get('patients/active')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:813:  @Get('subaccounts')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:826:  @Get('shifts')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:841:@Controller('provider/pharmacy/b2b')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:845:  @Post('voice-to-order')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:905:@Controller('mental-health')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:907:  @Get('assessment-questions')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:927:@Controller('drugs')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:961:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:984:  @Get('categories')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:995:  @Get(':id')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:1028:@Controller('provider/dashboard')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:1033:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:54:@Controller('dashboard')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:58:  @Get('kpis')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:78:  @Get('alerts')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:95:  @Get('live-feed')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:112:@Controller('broadcast')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:116:  @Get('live')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:124:  @Get('config')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:130:  @Put('config')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:140:  @Post(':id/expand')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:150:  @Post(':id/cancel')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:162:@Controller('emergency')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:166:  @Post(':id/dispatch')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:186:@Controller('contracts')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:190:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:197:@Controller('shifts')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:201:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:208:  @Post()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:222:@Controller('scorecard')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:226:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:246:@Controller('compliance')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:250:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:277:@Controller('transport')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:281:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:288:@Controller('family-cards')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:292:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:303:@Controller('blacklist')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:307:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:318:@Controller('fraud')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:322:  @Get('alerts')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:330:@Controller('admins')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:334:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:347:@Controller('waitlist')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:351:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:358:@Controller('referrals')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:362:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:372:@Controller('tasks')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:376:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:382:  @Post()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:407:@Controller('specialties')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:411:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:423:  @Post()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:432:@Controller('services')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:436:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:451:@Controller('complaints')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:455:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:462:@Controller('cms')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:466:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:473:@Controller('banners')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:477:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:483:  @Post()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:498:@Controller('orders')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:502:  @Post(':id/reassign')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:528:@Controller('financial')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:532:  @Get('summary')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:563:@Controller('commissions')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:567:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:573:  @Put(':id')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:585:@Controller('refunds')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:589:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:595:  @Post()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:607:@Controller('coupons')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:611:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:617:  @Post()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:640:  @Patch(':code')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:654:@Controller('loyalty')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:658:  @Put('config')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:668:  @Put('earn-rules/:id')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:678:  @Post('earn-rules/:id/toggle')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:686:  @Get('users/:id/balance')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:715:  @Post('manual-adjust')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:724:  @Post('redeem')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:735:@Controller('delivery')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:739:  @Get('rules')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:745:  @Post('rules')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:758:  @Put('rules/:id')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:768:  @Post('rules/:id/toggle')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:776:  @Delete('rules/:id')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:783:  @Put('base-fees')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:793:  @Post('toggle')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:805:@Controller('delivery')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:807:  @Get('check')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:828:@Controller('promotions')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:832:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:839:  @Get(':id')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:846:  @Post()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:862:  @Put(':id')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:872:  @Post(':id/toggle')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:881:  @Delete(':id')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:890:@Controller('promotions')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:892:  @Get('applicable')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:921:@Controller('notifications')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:925:  @Get('history')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:934:  @Post('send')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:955:  @Get('auto-rules')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:961:  @Post('auto-rules')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:973:  @Put('auto-rules/:id')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:983:  @Delete('auto-rules/:id')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:992:@Controller('nursing-services')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:996:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1008:@Controller('insurance')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1042:  @Post('claims/:id/approve')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1047:  @Post('claims/:id/reject')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1054:@Controller('providers')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1058:  @Get(':id/sub-accounts')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1072:@Controller('medicines')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1076:  @Post(':id/shortage')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1096:@Controller('bulk-upload')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1100:  @Post()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1143:@Controller('home-care')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1146:  @Get('bookings/nursing/my')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1182:@Controller('system')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1199:  @Get('theme') theme() { return this.getConfig('theme', DEFAULT_THEME); }
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1200:  @Put('theme') putTheme(@CurrentUser() u: any, @Body() b: any) { return this.putConfig('theme', b || {}, u); }
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1202:  @Get('permissions') permissions() { return this.getConfig('permissions', DEFAULT_PERMISSIONS); }
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1203:  @Put('permissions') putPermissions(@CurrentUser() u: any, @Body() b: any) { return this.putConfig('permissions', b || [], u); }
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1205:  @Get('workflows') workflows() { return this.getConfig('workflows', DEFAULT_WORKFLOWS); }
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1206:  @Put('workflows') putWorkflows(@CurrentUser() u: any, @Body() b: any) { return this.putConfig('workflows', b || [], u); }
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1208:  @Get('ai-config') aiConfig() { return this.getConfig('ai-config', DEFAULT_AI_CONFIG); }
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1209:  @Put('ai-config') putAiConfig(@CurrentUser() u: any, @Body() b: any) { return this.putConfig('ai-config', b || {}, u); }
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1211:  @Get('alert-rules') alertRules() { return this.getConfig('alert-rules', []); }
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1212:  @Put('alert-rules') putAlertRules(@CurrentUser() u: any, @Body() b: any) { return this.putConfig('alert-rules', b || [], u); }
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1216:@Controller('analytics')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1220:  @Get('overview')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1248:  @Get('heatmap')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1264:  @Post('custom-report')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1302:@Controller('admin/nursing')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1306:  @Get('requests')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1311:  @Post('requests/:id/assign')
audit-work/source/nabdah-backend/src/modules/device-trust/device-trust.module.ts:127:@Controller('device-trust')
audit-work/source/nabdah-backend/src/modules/device-trust/device-trust.module.ts:131:  @Post('challenge')
audit-work/source/nabdah-backend/src/modules/device-trust/device-trust.module.ts:138:  @Post('challenge-guest')
audit-work/source/nabdah-backend/src/modules/device-trust/device-trust.module.ts:143:  @Post('verify')
audit-work/source/nabdah-backend/src/modules/device-trust/device-trust.module.ts:149:  @Get('status')
audit-work/source/nabdah-backend/src/modules/security/security.module.ts:134:@Controller('security/audit')
audit-work/source/nabdah-backend/src/modules/security/security.module.ts:139:  @Get('admin')
audit-work/source/nabdah-backend/src/modules/security/security.module.ts:152:  @Get('my-activity')
audit-work/source/nabdah-backend/src/modules/security/security.module.ts:161:  @Get('recent')
audit-work/source/nabdah-backend/src/modules/security/security.module.ts:165:  @Get('critical')
audit-work/source/nabdah-backend/src/modules/provider/leave-requests.controller.ts:7:@Controller('provider/leave-requests')
audit-work/source/nabdah-backend/src/modules/provider/leave-requests.controller.ts:14:  @Get()
audit-work/source/nabdah-backend/src/modules/provider/leave-requests.controller.ts:23:  @Post()
audit-work/source/nabdah-backend/src/modules/provider/leave-requests.controller.ts:48:  @Post('action')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:24:@Controller('provider/auth')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:27:  @Public() @Post('register')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:29:  @Public() @Post('login')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:31:  @Public() @Post('refresh')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:33:  @Post('logout')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:35:  @Public() @Post('send-otp')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:40:  @Public() @Post('verify-email')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:42:  @Public() @Post('forgot-password')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:44:  @Public() @Post('verify-reset-code')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:46:  @Public() @Post('reset-password')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:48:  @Get('me')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:52:@Controller('provider')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:58:  @Get('profile') get(@CurrentUser() u: any) { return this.svc.getProfile(u); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:59:  @Patch('profile') update(@CurrentUser() u: any, @Body() body: any) { return this.svc.updateProfile(u, body); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:60:  @Post('profile/phones') addPhone(@CurrentUser() u: any, @Body() body: any) { return this.svc.addPhone(u, body); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:61:  @Delete('profile/phones/:phone_id') removePhone(@CurrentUser() u: any, @Param('phone_id') pid: string) { return this.svc.removePhone(u, pid); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:63:  @Post('kyc/documents') uploadDoc(@CurrentUser() u: any, @Body() body: any) { return this.svc.uploadDocument(u, body); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:64:  @Get('kyc/documents') listDocs(@CurrentUser() u: any) { return this.svc.listDocuments(u); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:66:  @Get('directory') directory() { return this.svc.directory(); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:68:  @Post('bank-account') upsertBank(@CurrentUser() u: any, @Body() body: any) { return this.svc.upsertBank(u, body); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:69:  @Get('bank-account') getBank(@CurrentUser() u: any) { return this.svc.getBank(u); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:70:  @Public() @Get('banks') banks() { return this.svc.banks_list(); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:72:  @Post('profile/image/upload')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:83:  @Get('profile/image/status')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:88:  @Post('onboarding/submit') submit(@CurrentUser() u: any) { return this.svc.submitForApproval(u); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:90:  @Post('settings/delta')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:96:@Controller('provider/operators')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:99:  @Get() list(@CurrentUser() u: any) { return this.svc.list(u); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:100:  @Post('invite') invite(@CurrentUser() u: any, @Body() body: any) { return this.svc.invite(u, body); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:101:  @Public() @Post('accept-invite') accept(@Body() body: any) { return this.svc.acceptInvite(body); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:102:  @Patch(':id') update(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.update(u, id, body); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:103:  @Post(':id/disable') disable(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.disable(u, id, body?.reason); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:104:  @Post(':id/enable') enable(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.enable(u, id); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:105:  @Delete(':id') revoke(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.revoke(u, id); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:108:@Controller('admin/providers')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:114:  @Get() list(@CurrentUser() u: any, @Query() q: any): Promise<any> { return this.svc.list(u, q); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:117:  @Get('by-user/:userId') byUser(@CurrentUser() u: any, @Param('userId') userId: string) { return this.svc.detailByUser(u, userId); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:118:  @Get(':id') detail(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.detail(u, id); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:119:  @Post(':id/approve') approve(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.approve(u, id, body); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:120:  @Post(':id/reject') reject(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.reject(u, id, body); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:122:  @Post(':id/reprocess-image')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:127:  @Post(':id/replace-image')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:132:  @Post(':id/retry-image-jobs')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:137:  @Get(':id/image-logs')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:141:  @Post(':id/request-changes') needsChanges(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.requestChanges(u, id, body); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:142:  @Post(':id/suspend') suspend(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.suspend(u, id, body); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:156:@Controller('provider/requests')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:164:  @Get() list(@CurrentUser() u: any, @Query() q: any) { return this.svc.list(u, q); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:165:  @Get(':id') detail(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.detail(u, id); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:166:  @Post(':id/accept') accept(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.accept(u, id, body || {}); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:167:  @Post(':id/reject') reject(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.reject(u, id, body || {}); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:168:  @Post(':id/start') start(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.start(u, id, body || {}); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:169:  @Post(':id/complete') complete(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.complete(u, id, body || {}); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:170:  @Post(':id/cancel') cancel(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.cancel(u, id, body || {}); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:171:  @Post(':id/assign-staff') assignStaff(@CurrentUser() u: any, @Param('id') id: string, @Body() body: { staff_id: string; notes?: string }) { return this.svc.assignStaff(u, id, body); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:173:  @Get(':id/orders')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:183:  @Post(':id/end')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:228:  @Post(':id/insurance-copay')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:292:  @Post(':id/sick-leave')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:342:  @Post(':id/medical-report')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:381:@Controller('provider/wallet')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:395:  @Post('withdraw')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:401:@Controller('provider/notifications')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:404:  @Get() list(@CurrentUser() u: any, @Query() q: any) { return this.svc.list(u, q); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:405:  @Post(':id/read') markRead(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.markRead(u, id); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:406:  @Post('read-all') markAllRead(@CurrentUser() u: any) { return this.svc.markAllRead(u); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:409:@Controller('provider/schedule')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:412:  @Get() view(@CurrentUser() u: any, @Query() q: any) { return this.svc.view(u, q); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:415:@Controller('provider')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:421:  @Get('me') me(@CurrentUser() u: any) { return this.dash.me(u); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:422:  @Get('dashboard/stats') stats(@CurrentUser() u: any) { return this.dash.stats(u); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:423:  @Get('dashboard/recent') recent(@CurrentUser() u: any, @Query('limit') limit?: string) {
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:426:  @Get('availability') getAvail(@CurrentUser() u: any) { return this.dash.getAvailability(u); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:427:  @Post('availability') setAvail(@CurrentUser() u: any, @Body() body: any) { return this.dash.setAvailability(u, body); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:428:  @Post('seed') seed(@CurrentUser() u: any) { return this.seedSvc.seed(u); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:429:  @Post('seed/reset') seedReset(@CurrentUser() u: any) { return this.seedSvc.resetSeed(u); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:437:@Controller('provider/capabilities')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:441:  @Get('pharmacy') listPharma(@CurrentUser() u: any) { return this.svc.listPharmacy(u); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:442:  @Post('pharmacy') upsertPharma(@CurrentUser() u: any, @Body() body: any) { return this.svc.upsertPharmacy(u, body); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:443:  @Delete('pharmacy/:id') delPharma(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.deletePharmacy(u, id); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:445:  @Get('lab') listLab(@CurrentUser() u: any) { return this.svc.listLab(u); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:446:  @Post('lab') upsertLab(@CurrentUser() u: any, @Body() body: any) { return this.svc.upsertLab(u, body); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:447:  @Delete('lab/:id') delLab(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.deleteLab(u, id); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:449:  @Get('radiology') listRad(@CurrentUser() u: any) { return this.svc.listRadiology(u); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:450:  @Post('radiology') upsertRad(@CurrentUser() u: any, @Body() body: any) { return this.svc.upsertRadiology(u, body); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:451:  @Delete('radiology/:id') delRad(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.deleteRadiology(u, id); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:453:  @Get('doctor-sessions') listDoc(@CurrentUser() u: any) { return this.svc.listDoctorSessions(u); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:454:  @Post('doctor-sessions') upsertDoc(@CurrentUser() u: any, @Body() body: any) { return this.svc.upsertDoctorSession(u, body); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:455:  @Delete('doctor-sessions/:id') delDoc(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.deleteDoctorSession(u, id); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:457:  @Get('home-care') listHc(@CurrentUser() u: any) { return this.svc.listHomeCare(u); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:458:  @Post('home-care') upsertHc(@CurrentUser() u: any, @Body() body: any) { return this.svc.upsertHomeCare(u, body); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:459:  @Delete('home-care/:id') delHc(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.deleteHomeCare(u, id); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:462:@Controller('provider/zones')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:465:  @Get() list(@CurrentUser() u: any) { return this.svc.listZones(u); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:466:  @Post() upsert(@CurrentUser() u: any, @Body() body: any) { return this.svc.upsertZone(u, body); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:467:  @Delete(':id') del(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.deleteZone(u, id); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:470:@Controller('provider/schedule-slots')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:473:  @Get() list(@CurrentUser() u: any) { return this.svc.listSlots(u); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:474:  @Post() upsert(@CurrentUser() u: any, @Body() body: any) { return this.svc.upsertSlot(u, body); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:475:  @Delete(':id') del(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.deleteSlot(u, id); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:478:@Controller('provider/score')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:481:  @Get() me(@CurrentUser() u: any) { return this.svc.getMy(u); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:482:  @Post('recompute') recompute(@CurrentUser() u: any) { return this.svc.recompute(u.id); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:485:@Controller('admin/matching')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:493:  @Get('preview/:requestId') preview(@CurrentUser() u: any, @Param('requestId') id: string, @Query('limit') limit?: string) {
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:497:  @Post('preview') previewAdHoc(@CurrentUser() u: any, @Body() body: any) {
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:501:  @Post('dispatch/:requestId') dispatch(@CurrentUser() u: any, @Param('requestId') id: string, @Body() body: any) {
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:505:  @Post('assign/:requestId/:providerId') assign(@CurrentUser() u: any, @Param('requestId') rid: string, @Param('providerId') pid: string) {
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:509:  @Get('attempts/:requestId') attempts(@CurrentUser() u: any, @Param('requestId') id: string) {
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:513:  @Post('expire-stale') expireStale(@CurrentUser() u: any) {
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:518:  @Post('seed-unassigned') seedUnassigned(@CurrentUser() u: any, @Body() body: any) {
audit-work/source/nabdah-backend/src/modules/provider/simulated-features.controller.ts:16:@Controller('provider/features')
audit-work/source/nabdah-backend/src/modules/provider/simulated-features.controller.ts:29:  @Post('promotions')
audit-work/source/nabdah-backend/src/modules/provider/simulated-features.controller.ts:45:  @Get('promotions')
audit-work/source/nabdah-backend/src/modules/provider/simulated-features.controller.ts:51:  @Post('referrals')
audit-work/source/nabdah-backend/src/modules/provider/simulated-features.controller.ts:65:  @Get('referrals')
audit-work/source/nabdah-backend/src/modules/provider/simulated-features.controller.ts:72:  @Get('crm/patients')
audit-work/source/nabdah-backend/src/modules/provider/simulated-features.controller.ts:89:  @Get('crm/patients/:id')
audit-work/source/nabdah-backend/src/modules/provider/simulated-features.controller.ts:107:  @Patch('crm/patients/:id')
audit-work/source/nabdah-backend/src/modules/provider/simulated-features.controller.ts:128:  @Post('home-care/bookings/:id/check-in')
audit-work/source/nabdah-backend/src/modules/provider/simulated-features.controller.ts:147:  @Post('home-care/reports/:id/submit')
audit-work/source/nabdah-backend/src/modules/provider/simulated-features.controller.ts:169:  @Post('radiology/bookings/:id/upload-report')
audit-work/source/nabdah-backend/src/modules/provider/simulated-features.controller.ts:187:  @Post('radiology/bookings/:id/publish-report')
audit-work/source/nabdah-backend/src/modules/care/doctor-integration.controller.ts:7:@Controller('provider/doctor-engine')
audit-work/source/nabdah-backend/src/modules/care/doctor-integration.controller.ts:14:  @Put('synchronize-settings')
audit-work/source/nabdah-backend/src/modules/care/doctor-integration.controller.ts:36:  @Post('finalize-encounter')
audit-work/source/nabdah-backend/src/modules/care/appointments.controller.ts:8:@Controller('care/appointments')
audit-work/source/nabdah-backend/src/modules/care/appointments.controller.ts:14:  @Post()
audit-work/source/nabdah-backend/src/modules/care/appointments.controller.ts:19:  @Get()
audit-work/source/nabdah-backend/src/modules/care/appointments.controller.ts:24:  @Get(':id')
audit-work/source/nabdah-backend/src/modules/care/appointments.controller.ts:29:  @Post('waitlist/join')
audit-work/source/nabdah-backend/src/modules/care/appointments.controller.ts:34:  @Patch(':id/cancel')
audit-work/source/nabdah-backend/src/modules/care/appointments.controller.ts:39:  @Patch(':id/reschedule')
audit-work/source/nabdah-backend/src/modules/care/appointments.controller.ts:45:  @Patch(':id/confirm')
audit-work/source/nabdah-backend/src/modules/care/appointments.controller.ts:51:  @Patch(':id/check-in')
audit-work/source/nabdah-backend/src/modules/care/appointments.controller.ts:57:  @Patch(':id/start')
audit-work/source/nabdah-backend/src/modules/care/appointments.controller.ts:63:  @Patch(':id/complete')
audit-work/source/nabdah-backend/src/modules/care/appointments.controller.ts:69:  @Post(':id/finish')
audit-work/source/nabdah-backend/src/modules/care/appointments.controller.ts:75:  @Get(':id/summary')
audit-work/source/nabdah-backend/src/modules/care/doctor-referrals.controller.ts:10:@Controller('provider/doctor-referrals')
audit-work/source/nabdah-backend/src/modules/care/doctor-referrals.controller.ts:29:  @Get('my-referrals/:doctorId')
audit-work/source/nabdah-backend/src/modules/care/doctor-referrals.controller.ts:66:  @Post('issue-referrals-and-prescription')
audit-work/source/nabdah-backend/src/modules/care/doctor-referrals.controller.ts:94:  @Patch('diagnostic-callback/:appointmentId')
audit-work/source/nabdah-backend/src/modules/care/care.controller.ts:5:@Controller('care')
audit-work/source/nabdah-backend/src/modules/care/care.controller.ts:11:  @Get('specialties')
audit-work/source/nabdah-backend/src/modules/care/care.controller.ts:17:  @Get('insurance')
audit-work/source/nabdah-backend/src/modules/care/care.controller.ts:23:  @Get('degrees')
audit-work/source/nabdah-backend/src/modules/care/care.controller.ts:29:  @Get('doctors')
audit-work/source/nabdah-backend/src/modules/care/care.controller.ts:60:  @Get('doctors/:id')
audit-work/source/nabdah-backend/src/modules/care/care.controller.ts:66:  @Get('doctors/:id/slots')
audit-work/source/nabdah-backend/src/modules/care/care.controller.ts:76:  @Get('search')
audit-work/source/nabdah-backend/src/modules/care/care.controller.ts:83:  @Get('facilities')
audit-work/source/nabdah-backend/src/modules/care/care.controller.ts:95:  @Get('facilities/:id')
audit-work/source/nabdah-backend/src/modules/care/care.controller.ts:102:@Controller('public')
audit-work/source/nabdah-backend/src/modules/care/care.controller.ts:107:  @Get('specialties')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:5:@Controller('radiology')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:9:  @Public() @Get('services')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:31:  @Public() @Get('modalities')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:34:  @Public() @Get('services/:id')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:37:  @Post('bookings')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:40:  @Get('bookings/mine')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:43:  @Get('bookings/:id')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:46:  @Post('bookings/:id/cancel')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:49:  @Patch('bookings/:id/state')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:54:  @Post('bookings/:id/publish-report')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:59:  @Get('reports/mine')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:62:  @Post('bookings/:id/documents')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:67:  @Patch('bookings/:id/insurance')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:72:  @Get('provider/inbox')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:77:  @Post('bookings/:id/assign-technician')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:82:  @Post('bookings/:id/upload-report')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:88:  @Post('bookings/:id/checkin')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:93:  @Post('bookings/:id/start-scan')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:99:  @Post('bookings/:id/abort')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:105:  @Post('bookings/:id/submit-report-for-review')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:110:  @Post('bookings/:id/approve-report')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:116:  @Post('bookings/:id/insurance-approval')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:122:  @Patch('bookings/:id/reschedule')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:128:  @Get('bookings/:id/tracking')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:134:  @Post('catalog/delta-request')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:140:  @Post('bookings/:id/confirm-preparation')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:145:  @Get('admin/all')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:159:  @Post('admin/catalog')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:165:  @Put('admin/catalog/:id')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:171:  @Delete('admin/catalog/:id')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:178:  @Patch('admin/bookings/:id/force-state')
audit-work/source/nabdah-backend/src/modules/radiology/controllers/radiology-provider.controller.ts:25:@Controller('radiology/provider')
audit-work/source/nabdah-backend/src/modules/radiology/controllers/radiology-provider.controller.ts:56:  @Get('queue')
audit-work/source/nabdah-backend/src/modules/radiology/controllers/radiology-provider.controller.ts:73:  @Post(':id/respond')
audit-work/source/nabdah-backend/src/modules/radiology/controllers/radiology-provider.controller.ts:98:  @Post('allocate-machine/:id')
audit-work/source/nabdah-backend/src/modules/radiology/controllers/radiology-provider.controller.ts:130:  @Post('finalize-scan/:id')
audit-work/source/nabdah-backend/src/modules/radiology/controllers/radiology-provider.controller.ts:162:  @Get('wallet')
audit-work/source/nabdah-backend/src/modules/radiology/controllers/radiology-provider.controller.ts:193:  @Get('catalog')
audit-work/source/nabdah-backend/src/modules/radiology/controllers/radiology-provider.controller.ts:198:  @Post('catalog/:id')
audit-work/source/nabdah-backend/src/modules/radiology/controllers/radiology-provider.controller.ts:207:  @Get('inventory')
audit-work/source/nabdah-backend/src/modules/radiology/controllers/radiology-provider.controller.ts:214:  @Post('inventory')
audit-work/source/nabdah-backend/src/modules/radiology/controllers/radiology.controller.ts:8:@Controller('radiology/bookings')
audit-work/source/nabdah-backend/src/modules/radiology/controllers/radiology.controller.ts:21:  @Post()
audit-work/source/nabdah-backend/src/modules/radiology/controllers/radiology.controller.ts:62:  @Get('mine')
audit-work/source/nabdah-backend/src/modules/radiology/controllers/radiology.controller.ts:70:  @Get(':id')
audit-work/source/nabdah-backend/src/modules/radiology/controllers/radiology.controller.ts:82:  @Post('allocate-machine/:id')
audit-work/source/nabdah-backend/src/modules/radiology/controllers/radiology.controller.ts:112:  @Post('finalize-scan/:id')
audit-work/source/nabdah-backend/src/modules/seo-search/seo-search.module.ts:244:@Controller()
audit-work/source/nabdah-backend/src/modules/seo-search/seo-search.module.ts:250:  @Get('sitemap.xml')
audit-work/source/nabdah-backend/src/modules/seo-search/seo-search.module.ts:258:  @Get('robots.txt')
audit-work/source/nabdah-backend/src/modules/seo-search/seo-search.module.ts:266:  @Get('seo/site/organization')
audit-work/source/nabdah-backend/src/modules/seo-search/seo-search.module.ts:277:  @Get('seo/site/local-business')
audit-work/source/nabdah-backend/src/modules/seo-search/seo-search.module.ts:291:  @Get('seo/site/faq')
audit-work/source/nabdah-backend/src/modules/seo-search/seo-search.module.ts:305:  @Get('seo/:type/:id')
audit-work/source/nabdah-backend/src/modules/seo-search/seo-search.module.ts:313:  @Get('seo/:type/:id/hreflang')
audit-work/source/nabdah-backend/src/modules/seo-search/seo-search.module.ts:328:  @Get('llms.txt')
audit-work/source/nabdah-backend/src/modules/seo-search/seo-search.module.ts:350:  @Get('image-sitemap.xml')
audit-work/source/nabdah-backend/src/modules/seo-search/seo-search.module.ts:366:  @Get('search/global')
audit-work/source/nabdah-backend/src/modules/seo-search/seo-search.module.ts:372:  @Get('medicines/:id/recommendations')
audit-work/source/nabdah-backend/src/modules/seo-search/seo-search.module.ts:378:  @Get('doctors/:id/recommendations')
audit-work/source/nabdah-backend/src/modules/medical-reports/medical-reports.controller.ts:10:@Controller('medical-reports')
audit-work/source/nabdah-backend/src/modules/medical-reports/medical-reports.controller.ts:16:  @Get('timeline')
audit-work/source/nabdah-backend/src/modules/medical-reports/medical-reports.controller.ts:36:  @Get('mine')
audit-work/source/nabdah-backend/src/modules/medical-reports/medical-reports.controller.ts:41:  @Get('track/:trackingId')
audit-work/source/nabdah-backend/src/modules/medical-reports/medical-reports.controller.ts:46:  @Get(':id')
audit-work/source/nabdah-backend/src/modules/medical-reports/medical-reports.controller.ts:49:  @Post()
audit-work/source/nabdah-backend/src/modules/booking-flow/booking-flow.module.ts:232:@Controller('booking/flow')
audit-work/source/nabdah-backend/src/modules/booking-flow/booking-flow.module.ts:236:  @Get('status/:type/:id') status(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string) { return this.svc.status(u, t, id); }
audit-work/source/nabdah-backend/src/modules/booking-flow/booking-flow.module.ts:237:  @Get('timeline/:type/:id') timeline(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string) { return this.svc.timeline(u, t, id); }
audit-work/source/nabdah-backend/src/modules/booking-flow/booking-flow.module.ts:238:  @Post('retry/:type/:id') retry(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string) { return this.svc.retry(u, t, id); }
audit-work/source/nabdah-backend/src/modules/booking-flow/booking-flow.module.ts:239:  @Post('resolve/:type/:id') resolve(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string, @Body() b: any) { return this.svc.resolve(u, t, id, b); }
audit-work/source/nabdah-backend/src/modules/wallet/wallet.controller.ts:5:@Controller('wallet')
audit-work/source/nabdah-backend/src/modules/wallet/wallet.controller.ts:10:  @Get('balance')
audit-work/source/nabdah-backend/src/modules/wallet/wallet.controller.ts:17:  @Get('transactions')
audit-work/source/nabdah-backend/src/modules/wallet/wallet.controller.ts:23:  @Get('spending-data')
audit-work/source/nabdah-backend/src/modules/wallet/wallet.controller.ts:34:  @Post('topup')
audit-work/source/nabdah-backend/src/modules/wallet/wallet.controller.ts:42:  @Post('topup/confirm')
audit-work/source/nabdah-backend/src/modules/wallet/wallet.controller.ts:48:  @Get('topup/:id')
audit-work/source/nabdah-backend/src/modules/wallet/wallet.controller.ts:53:  @Post('transfer')
audit-work/source/nabdah-backend/src/modules/wallet/wallet.controller.ts:61:  @Get('cards')
audit-work/source/nabdah-backend/src/modules/wallet/wallet.controller.ts:68:  @Post('cards')
audit-work/source/nabdah-backend/src/modules/wallet/wallet.controller.ts:75:  @Delete('cards/:id')
audit-work/source/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:5:@Controller('hospital')
audit-work/source/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:10:  @Post('branches')
audit-work/source/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:15:  @Get('branches')
audit-work/source/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:20:  @Post('departments')
audit-work/source/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:25:  @Get('departments')
audit-work/source/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:30:  @Post('staff')
audit-work/source/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:35:  @Get('staff')
audit-work/source/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:40:  @Post('doctors/onboard')
audit-work/source/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:45:  @Get('appointments')
audit-work/source/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:53:  @Put('appointments/:id/status')
audit-work/source/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:58:  @Get('wallet')
audit-work/source/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:66:  @Post('invitations')
audit-work/source/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:71:  @Get('invitations')
audit-work/source/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:76:  @Get('invitations/inbox')
audit-work/source/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:81:  @Post('invitations/:id/respond')
audit-work/source/nabdah-backend/src/modules/approval-workflow/approval-workflow.module.ts:169:@Controller('approval-workflow')
audit-work/source/nabdah-backend/src/modules/approval-workflow/approval-workflow.module.ts:174:  @Post('requests')
audit-work/source/nabdah-backend/src/modules/approval-workflow/approval-workflow.module.ts:179:  @Get('my-requests')
audit-work/source/nabdah-backend/src/modules/approval-workflow/approval-workflow.module.ts:184:  @Get('requests/pending')
audit-work/source/nabdah-backend/src/modules/approval-workflow/approval-workflow.module.ts:190:  @Get('requests/:id')
audit-work/source/nabdah-backend/src/modules/approval-workflow/approval-workflow.module.ts:195:  @Post('requests/:id/decide')
audit-work/source/nabdah-backend/src/modules/returns/returns.controller.ts:6:@Controller('pharmacy/returns')
audit-work/source/nabdah-backend/src/modules/returns/returns.controller.ts:11:  @Post()
audit-work/source/nabdah-backend/src/modules/returns/returns.controller.ts:16:  @Get()
audit-work/source/nabdah-backend/src/modules/returns/returns.controller.ts:21:  @Get('provider/list')
audit-work/source/nabdah-backend/src/modules/returns/returns.controller.ts:27:  @Get('eligibility/:orderId')
audit-work/source/nabdah-backend/src/modules/returns/returns.controller.ts:32:  @Get(':id')
audit-work/source/nabdah-backend/src/modules/returns/returns.controller.ts:37:  @Post(':id/decide')
audit-work/source/nabdah-backend/src/modules/pharmacy/patient-pharmacy.controller.ts:5:@Controller('patient/pharmacy')
audit-work/source/nabdah-backend/src/modules/pharmacy/patient-pharmacy.controller.ts:10:  @Get('shortage-flags/lookup')
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:18:@Controller('patient/pharmacy')
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:23:  @Post('orders') create(@CurrentUser() u: any, @Body() b: any) { return this.orders.create(u, b); }
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:24:  @Get('orders') list(@CurrentUser() u: any, @Query('status') status?: string) { return this.orders.list(u, status); }
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:25:  @Get('orders/:id') detail(@CurrentUser() u: any, @Param('id') id: string) { return this.orders.detail(u, id); }
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:26:  @Patch('orders/:id') update(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.orders.update(u, id, b); }
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:27:  @Post('orders/:id/submit') submit(@CurrentUser() u: any, @Param('id') id: string) { return this.orders.submit(u, id); }
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:28:  @Post('orders/:id/cancel') cancel(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.orders.cancel(u, id, b?.reason || ''); }
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:34:@Controller('provider/pharmacy')
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:43:  @Get('allocations') list(@CurrentUser() u: any, @Query('status') status?: string) {
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:47:  @Get('allocations/:id') detail(@CurrentUser() u: any, @Param('id') id: string) {
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:51:  @Post('allocations/:id/items/:itemId') itemAction(@CurrentUser() u: any, @Param('id') id: string, @Param('itemId') itemId: string, @Body() b: any) {
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:54:  @Post('allocations/:id/confirm') confirm(@CurrentUser() u: any, @Param('id') id: string) { return this.allocs.confirm(u, id); }
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:55:  @Post('allocations/:id/preparing') preparing(@CurrentUser() u: any, @Param('id') id: string) { return this.allocs.preparing(u, id); }
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:56:  @Post('allocations/:id/ready') ready(@CurrentUser() u: any, @Param('id') id: string) { return this.allocs.ready(u, id); }
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:57:  @Post('allocations/:id/out-for-delivery') out(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.allocs.outForDelivery(u, id, b); }
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:58:  @Post('allocations/:id/delivered') delivered(@CurrentUser() u: any, @Param('id') id: string) { return this.allocs.delivered(u, id); }
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:59:  @Post('allocations/:id/insurance') updateInsurance(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.allocs.updateInsurance(u, id, b); }
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:60:  @Post('allocations/:id/cancel') cancel(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.allocs.cancel(u, id, b?.reason || ''); }
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:65:  @Post('orders/:id/accept')
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:70:  @Post('orders/:id/submit-basket')
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:75:  @Post('orders/:id/insurance')
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:80:  @Post('orders/:id/preparing')
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:85:  @Post('orders/:id/ready')
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:90:  @Post('orders/:id/dispatch')
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:99:@Controller('provider/inventory')
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:103:  @Get('search') search(@CurrentUser() u: any, @Query('q') q?: string, @Query('barcode') bc?: string) { return this.svc.search(u, q, bc); }
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:104:  @Post(':id/restock') restock(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.restock(u, id, Number(b?.qty) || 0); }
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:105:  @Get('low-stock-alerts') alerts(@CurrentUser() u: any) { return this.svc.listLowStockAlerts(u); }
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:106:  @Post('low-stock-alerts/:id/ack') ack(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.acknowledgeAlert(u, id); }
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:112:@Controller('admin/pharmacy')
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:128:  @Post('seed') seed(@CurrentUser() u: any) { this.assertTestSeedAllowed(); return this.seedSvc.seed(u); }
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:129:  @Post('seed/sample-order') sampleOrder(@CurrentUser() u: any, @Body() b: any) { this.assertTestSeedAllowed(); return this.seedSvc.seedSampleOrder(b?.patient_account_id || u.id); }
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:130:  @Post('split/:orderId') async manualSplit(@Param('orderId') id: string) {
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:135:  @Post('expire-stale-allocations') expireStale() { return this.allocs.expireStale(); }
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:141:@Controller('provider/pharmacy/broadcasts')
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:145:  @Get() list(@CurrentUser() u: any) { return this.bc.listForPharmacy(u); }
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:146:  @Get(':id') detail(@CurrentUser() u: any, @Param('id') id: string) { return this.bc.detail(u, id); }
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:147:  @Post(':orderId/i-have-all') haveAll(@CurrentUser() u: any, @Param('orderId') oid: string, @Body() b: any) { return this.bc.claimHaveAll(u, oid, b); }
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:148:  @Post(':orderId/i-have-partial') havePartial(@CurrentUser() u: any, @Param('orderId') oid: string, @Body() b: any) { return this.bc.respondPartial(u, oid, b); }
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:149:  @Post(':orderId/reject') reject(@CurrentUser() u: any, @Param('orderId') oid: string, @Body() b: any) { return this.bc.respondReject(u, oid, b); }
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:152:@Controller('admin/pharmacy/broadcasts')
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:157:  @Post(':orderId/advance') advance(@Param('orderId') id: string) { return this.bc.advanceRound(id); }
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:158:  @Post(':orderId/fallback-split') fallback(@Param('orderId') id: string) { return this.bc.fallbackSplit(id); }
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:159:  @Post('expire-stale') expireStale() { return this.bc.expireStaleBroadcasts(); }
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:162:@Controller('pharmacy/chat')
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:166:  @Get('threads') list(@CurrentUser() u: any, @Query('order_id') oid?: string) { return this.chat.listThreads(u, oid); }
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:167:  @Get('threads/:id/messages') msgs(@CurrentUser() u: any, @Param('id') id: string) { return this.chat.listMessages(u, id); }
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:168:  @Post('threads/:id/messages') post(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.chat.postMessage(u, id, b); }
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:169:  @Post('threads/:id/accept-substitute/:msgId') accept(@CurrentUser() u: any, @Param('id') id: string, @Param('msgId') mid: string) { return this.chat.acceptSubstitute(u, id, mid); }
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:170:  @Post('threads/:id/reject') reject(@CurrentUser() u: any, @Param('id') id: string) { return this.chat.rejectOrRemove(u, id, 'rejected'); }
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:171:  @Post('threads/:id/remove-item') remove(@CurrentUser() u: any, @Param('id') id: string) { return this.chat.rejectOrRemove(u, id, 'removed'); }
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:174:@Controller('admin/pharmacy/chat')
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:179:  @Post('sweep-auto-close') sweep() { return this.chat.sweepAutoClose(); }
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:182:@Controller('provider/pharmacy/shortage-flags')
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:186:  @Post() report(@CurrentUser() u: any, @Body() b: any) { return this.svc.reportByPharmacy(u, b); }
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:187:  @Get() list(@CurrentUser() u: any, @Query('status') st?: string) { return this.svc.list(u, st); }
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:190:@Controller('admin/pharmacy/shortage-flags')
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:195:  @Post() create(@CurrentUser() u: any, @Body() b: any) { return this.svc.createByAdmin(u, b); }
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:196:  @Get() list(@CurrentUser() u: any, @Query('status') st?: string) { return this.svc.list(u, st); }
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:197:  @Get('dashboard') getDashboard(@CurrentUser() u: any) { return this.svc.getShortageDashboard(u); }
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:198:  @Post(':id/mark') markShortage(@CurrentUser() u: any, @Param('id') medicineId: string, @Body() b: any) { return this.svc.adminMarkShortage(u, medicineId, b); }
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:199:  @Post(':id/approve') approve(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.approve(u, id); }
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:200:  @Post(':id/reject') reject(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.reject(u, id, b?.reason); }
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:201:  @Post(':id/resolve') resolve(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.resolve(u, id); }
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:204:@Controller('patient/pharmacy/shortage-flags')
audit-work/source/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:209:  @Get('lookup') lookup(@Query('sku') sku?: string, @Query('generic_name') gn?: string) { return this.svc.lookupForPatient(sku, gn); }
audit-work/source/nabdah-backend/src/modules/pharmacy/controllers/admin-procurement.controller.ts:19:@Controller('admin/procurement')
audit-work/source/nabdah-backend/src/modules/pharmacy/controllers/admin-procurement.controller.ts:26:  @Get()
audit-work/source/nabdah-backend/src/modules/pharmacy/controllers/admin-procurement.controller.ts:32:  @Get('summary')
audit-work/source/nabdah-backend/src/modules/pharmacy/controllers/admin-procurement.controller.ts:38:  @Get(':id/export')
audit-work/source/nabdah-backend/src/modules/pharmacy/controllers/admin-procurement.controller.ts:47:  @Get(':id')
audit-work/source/nabdah-backend/src/modules/pharmacy/controllers/admin-procurement.controller.ts:53:  @Patch(':id/review')
audit-work/source/nabdah-backend/src/modules/pharmacy/controllers/admin-procurement.controller.ts:59:  @Post(':id/quotation')
audit-work/source/nabdah-backend/src/modules/pharmacy/controllers/admin-procurement.controller.ts:70:  @Get(':id/quotation')
audit-work/source/nabdah-backend/src/modules/pharmacy/controllers/admin-procurement.controller.ts:76:  @Patch(':id/cancel')
audit-work/source/nabdah-backend/src/modules/pharmacy/controllers/admin-procurement.controller.ts:82:  @Patch(':id/complete')
audit-work/source/nabdah-backend/src/modules/pharmacy/controllers/procurement.controller.ts:18:@Controller('pharmacy/procurement')
audit-work/source/nabdah-backend/src/modules/pharmacy/controllers/procurement.controller.ts:29:  @Post('submit-request')
audit-work/source/nabdah-backend/src/modules/pharmacy/controllers/procurement.controller.ts:53:  @Get('my-requests')
audit-work/source/nabdah-backend/src/modules/pharmacy/controllers/procurement.controller.ts:61:  @Post(':id/feedback')
audit-work/source/nabdah-backend/src/modules/pharmacy/controllers/procurement.controller.ts:75:  @Post('analyze-file')
audit-work/source/nabdah-backend/src/modules/workflow-engine/workflow-engine.module.ts:530:@Controller('workflow')
audit-work/source/nabdah-backend/src/modules/workflow-engine/workflow-engine.module.ts:535:  @Public() @Get('lifecycle')
audit-work/source/nabdah-backend/src/modules/workflow-engine/workflow-engine.module.ts:555:  @Public() @Get('universal')
audit-work/source/nabdah-backend/src/modules/workflow-engine/workflow-engine.module.ts:561:  @UseGuards(JwtAuthGuard) @Post('match')
audit-work/source/nabdah-backend/src/modules/workflow-engine/workflow-engine.module.ts:582:  @UseGuards(JwtAuthGuard) @Roles(UserRole.ADMIN) @Get('debug/state-map')
audit-work/source/nabdah-backend/src/modules/insurance/insurance.controller.ts:18:@Controller('insurance')
audit-work/source/nabdah-backend/src/modules/insurance/insurance.controller.ts:25:  @Get('active')
audit-work/source/nabdah-backend/src/modules/insurance/insurance.controller.ts:58:  @Get('companies')
audit-work/source/nabdah-backend/src/modules/insurance/insurance.module.ts:368:@Controller('insurance')
audit-work/source/nabdah-backend/src/modules/insurance/insurance.module.ts:374:  @Get('companies')
audit-work/source/nabdah-backend/src/modules/insurance/insurance.module.ts:383:  @Get('companies/all')
audit-work/source/nabdah-backend/src/modules/insurance/insurance.module.ts:389:  @Post('companies')
audit-work/source/nabdah-backend/src/modules/insurance/insurance.module.ts:396:  @Patch('companies/:id')
audit-work/source/nabdah-backend/src/modules/insurance/insurance.module.ts:421:  @Delete('companies/:companyId/networks/:networkId')
audit-work/source/nabdah-backend/src/modules/insurance/insurance.module.ts:428:  @Get('companies/:companyId/networks')
audit-work/source/nabdah-backend/src/modules/insurance/insurance.module.ts:433:  @Post('companies/:companyId/networks')
audit-work/source/nabdah-backend/src/modules/insurance/insurance.module.ts:440:  @Get('networks/:networkId/rules')
audit-work/source/nabdah-backend/src/modules/insurance/insurance.module.ts:445:  @Post('networks/:networkId/rules')
audit-work/source/nabdah-backend/src/modules/insurance/insurance.module.ts:451:  @Get('coverage-check')
audit-work/source/nabdah-backend/src/modules/insurance/insurance.module.ts:468:  @Post('ocr-extract')
audit-work/source/nabdah-backend/src/modules/insurance/insurance.module.ts:473:  @Post('upload-policy')
audit-work/source/nabdah-backend/src/modules/insurance/insurance.module.ts:478:  @Post('nphies/eligibility')
audit-work/source/nabdah-backend/src/modules/insurance/insurance.module.ts:483:  @Post('save-policy')
audit-work/source/nabdah-backend/src/modules/insurance/insurance.module.ts:488:  @Post('claims/submit')
audit-work/source/nabdah-backend/src/modules/insurance/insurance.module.ts:493:  @Get('claims')
audit-work/source/nabdah-backend/src/modules/hospital-staff/hospital-staff.module.ts:113:@Controller('hospital/staff')
audit-work/source/nabdah-backend/src/modules/hospital-staff/hospital-staff.module.ts:117:  @Get() list(@CurrentUser() u: any) { return this.svc.list(u); }
audit-work/source/nabdah-backend/src/modules/hospital-staff/hospital-staff.module.ts:118:  @Post() create(@CurrentUser() u: any, @Body() b: any) { return this.svc.create(u, b); }
audit-work/source/nabdah-backend/src/modules/hospital-staff/hospital-staff.module.ts:119:  @Patch(':id') update(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.update(u, id, b); }
audit-work/source/nabdah-backend/src/modules/hospital-staff/hospital-staff.module.ts:120:  @Post(':id/suspend') suspend(@CurrentUser() u: any, @Param('id') id: string, @Body() b: { suspended?: boolean }) { return this.svc.suspend(u, id, b?.suspended !== false); }
audit-work/source/nabdah-backend/src/modules/hospital-staff/hospital-staff.module.ts:121:  @Post(':id/reset-password') reset(@CurrentUser() u: any, @Param('id') id: string, @Body() b: { password: string }) { return this.svc.resetPassword(u, id, b?.password); }
audit-work/source/nabdah-backend/src/modules/hospital-staff/hospital-staff.module.ts:122:  @Delete(':id') remove(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.remove(u, id); }
audit-work/source/nabdah-backend/src/modules/emergency/ambulance-fleet.controller.ts:84:@Controller('provider/ambulance/fleet')
audit-work/source/nabdah-backend/src/modules/emergency/ambulance-fleet.controller.ts:95:  @Get()
audit-work/source/nabdah-backend/src/modules/emergency/ambulance-fleet.controller.ts:101:  @Post()
audit-work/source/nabdah-backend/src/modules/emergency/ambulance-fleet.controller.ts:107:  @Patch(':id')
audit-work/source/nabdah-backend/src/modules/emergency/ambulance-fleet.controller.ts:113:  @Delete(':id')
audit-work/source/nabdah-backend/src/modules/emergency/ambulance-fleet.controller.ts:120:@Controller('admin/ambulance/fleet')
audit-work/source/nabdah-backend/src/modules/emergency/ambulance-fleet.controller.ts:125:  @Get()
audit-work/source/nabdah-backend/src/modules/emergency/ambulance-fleet.controller.ts:131:  @Post(':id/approve')
audit-work/source/nabdah-backend/src/modules/emergency/ambulance-fleet.controller.ts:137:  @Post(':id/reject')
audit-work/source/nabdah-backend/src/modules/emergency/emergency.controller.ts:7:@Controller('emergency')
audit-work/source/nabdah-backend/src/modules/emergency/emergency.controller.ts:12:  @Post('trigger')
audit-work/source/nabdah-backend/src/modules/emergency/emergency.controller.ts:18:  @Get('my/active')
audit-work/source/nabdah-backend/src/modules/emergency/emergency.controller.ts:24:  @Post(':id/cancel')
audit-work/source/nabdah-backend/src/modules/emergency/emergency.controller.ts:30:  @Get('driver/missions')
audit-work/source/nabdah-backend/src/modules/emergency/emergency.controller.ts:36:  @Post(':id/claim')
audit-work/source/nabdah-backend/src/modules/emergency/emergency.controller.ts:42:  @Get('tracking')
audit-work/source/nabdah-backend/src/modules/emergency/emergency.controller.ts:48:  @Post(':id/track')
audit-work/source/nabdah-backend/src/modules/emergency/emergency.controller.ts:53:  @Get('active')
audit-work/source/nabdah-backend/src/modules/emergency/emergency.controller.ts:59:  @Get(':id')
audit-work/source/nabdah-backend/src/modules/emergency/emergency.controller.ts:65:  @Post(':id/assign')
audit-work/source/nabdah-backend/src/modules/emergency/emergency.controller.ts:72:  @Post(':id/auto-dispatch')
audit-work/source/nabdah-backend/src/modules/emergency/emergency.controller.ts:78:  @Post(':id/resolve')
audit-work/source/nabdah-backend/src/modules/admin-command-center/admin-command-center.module.ts:147:@Controller('admin/command-center')
audit-work/source/nabdah-backend/src/modules/admin-command-center/admin-command-center.module.ts:152:  @Get() snapshot() { return this.svc.snapshot(); }
audit-work/source/nabdah-backend/src/modules/admin-command-center/admin-command-center.module.ts:153:  @Get('order/:kind/:id') orderDetail(@Param('kind') kind: string, @Param('id') id: string) { return this.svc.orderDetail(kind, id); }
audit-work/source/nabdah-backend/src/modules/events/events.controllers.ts:6:@Controller('admin/events')
audit-work/source/nabdah-backend/src/modules/events/events.controllers.ts:12:  @Get()
audit-work/source/nabdah-backend/src/modules/events/events.controllers.ts:26:  @Get('trace')
audit-work/source/nabdah-backend/src/modules/provider-onboarding/provider-onboarding.module.ts:431:@Controller('provider-onboarding')
audit-work/source/nabdah-backend/src/modules/provider-onboarding/provider-onboarding.module.ts:435:  @Public() @Post('start')
audit-work/source/nabdah-backend/src/modules/provider-onboarding/provider-onboarding.module.ts:438:  @UseGuards(JwtAuthGuard) @Get('my-profile')
audit-work/source/nabdah-backend/src/modules/provider-onboarding/provider-onboarding.module.ts:441:  @UseGuards(JwtAuthGuard) @Post('step2')
audit-work/source/nabdah-backend/src/modules/provider-onboarding/provider-onboarding.module.ts:444:  @UseGuards(JwtAuthGuard) @Post('step3')
audit-work/source/nabdah-backend/src/modules/provider-onboarding/provider-onboarding.module.ts:447:  @UseGuards(JwtAuthGuard) @Post('submit')
audit-work/source/nabdah-backend/src/modules/provider-onboarding/provider-onboarding.module.ts:450:  @UseGuards(JwtAuthGuard) @Get('progress')
audit-work/source/nabdah-backend/src/modules/provider-onboarding/provider-onboarding.module.ts:454:  @UseGuards(JwtAuthGuard) @Get('contract')
audit-work/source/nabdah-backend/src/modules/provider-onboarding/provider-onboarding.module.ts:461:  @UseGuards(JwtAuthGuard) @Get('admin/contracts/:id')
audit-work/source/nabdah-backend/src/modules/provider-onboarding/provider-onboarding.module.ts:469:  @UseGuards(JwtAuthGuard) @Post('admin/contracts/:id/visibility')
audit-work/source/nabdah-backend/src/modules/provider-onboarding/provider-onboarding.module.ts:476:@Controller('search')
audit-work/source/nabdah-backend/src/modules/provider-onboarding/provider-onboarding.module.ts:480:  @Public() @Get('providers')
audit-work/source/nabdah-backend/src/modules/custom-services/custom-services.controller.ts:8:@Controller('custom-services')
audit-work/source/nabdah-backend/src/modules/custom-services/custom-services.controller.ts:12:  @Post() create(@CurrentUser() u: any, @Body() b: any) { return this.svc.create(u, b); }
audit-work/source/nabdah-backend/src/modules/custom-services/custom-services.controller.ts:13:  @Get('mine') mine(@CurrentUser() u: any, @Query('kind') k?: string) { return this.svc.mine(u, k); }
audit-work/source/nabdah-backend/src/modules/custom-services/custom-services.controller.ts:14:  @Get(':id') one(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.one(u, id); }
audit-work/source/nabdah-backend/src/modules/custom-services/custom-services.controller.ts:17:  @Get('admin/list') list(@Query('kind') k?: string, @Query('status') s?: string) { return this.svc.adminList(k, s); }
audit-work/source/nabdah-backend/src/modules/custom-services/custom-services.controller.ts:18:  @Patch('admin/:id/status') updateStatus(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.updateStatus(u, id, b.status, b.note); }
```

## Semantic review state

All raw entries remain `UNVERIFIED` at this checkpoint. No missing/inconsistent/partial conclusion is derived from a filename or decorator scan alone.
