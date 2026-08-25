# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/FULL_E2E_BACKEND_ROUTE_CONTRACTS_20260817.md`
- **Member SHA-256:** `5427b2246fb0ad0a376840a6c4e51531c0829dcb2ca3cf7623ee8c6b31d035e3`
- **Line count:** 284
- **Read range:** `1-284`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `13: - 27:  @Post('orders/:id/submit') submit(@CurrentUser() u: any, @Param('id') id: string) { return this.orders.submit(u, id); }`
- `14: - 28:  @Post('orders/:id/cancel') cancel(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.orders.cancel(u, id, b?.reason || ''); }`
- `25: - 60:  @Post('allocations/:id/cancel') cancel(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.allocs.cancel(u, id, b?.reason || ''); }`
- `27: - 70:  @Post('orders/:id/submit-basket')`
- `81: - 35:  @Post(':id/cancel')`
- `125: - 38:  @Post('bookings')`
- `126: - 41:  @Get('bookings/mine')`
- `127: - 44:  @Get('bookings/:id')`
- `128: - 47:  @Post('bookings/:id/cancel')`
- `129: - 50:  @Patch('bookings/:id/state')`
- `130: - 55:  @Post('bookings/:id/documents')`
- `131: - 60:  @Patch('bookings/:id/insurance')`
### backend_consumers_or_contracts
- `8: - 18:@Controller('patient/pharmacy')`
- `15: - 34:@Controller('provider/pharmacy')`
- `24: - 59:  @Post('allocations/:id/insurance') updateInsurance(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.allocs.updateInsurance(u, id, b); }`
- `28: - 75:  @Post('orders/:id/insurance')`
- `37: - 112:@Controller('admin/pharmacy')`
- `42: - 141:@Controller('provider/pharmacy/broadcasts')`
- `48: - 152:@Controller('admin/pharmacy/broadcasts')`
- `59: - 174:@Controller('admin/pharmacy/chat')`
- `61: - 182:@Controller('provider/pharmacy/shortage-flags')`
- `64: - 190:@Controller('admin/pharmacy/shortage-flags')`
- `72: - 204:@Controller('patient/pharmacy/shortage-flags')`
- `89: - 81:  @Patch(':id/insurance-approval')`
### auth_ownership
- `37: - 112:@Controller('admin/pharmacy')`
- `48: - 152:@Controller('admin/pharmacy/broadcasts')`
- `59: - 174:@Controller('admin/pharmacy/chat')`
- `64: - 190:@Controller('admin/pharmacy/shortage-flags')`
- `65: - 195:  @Post() create(@CurrentUser() u: any, @Body() b: any) { return this.svc.createByAdmin(u, b); }`
- `68: - 198:  @Post(':id/mark') markShortage(@CurrentUser() u: any, @Param('id') medicineId: string, @Body() b: any) { return this.svc.adminMarkShortage(u, medicineId, b); }`
- `100: - 149:  @Get('admin/escalated')`
- `101: - 155:  @Post(':id/admin/transition')`
- `141: - 111:  @Get('admin/all')`
- `145: - 143:  @Post('admin/catalog')`
- `146: - 149:  @Put('admin/catalog/:id')`
- `147: - 155:  @Delete('admin/catalog/:id')`
### state_transitions
- `10: - 24:  @Get('orders') list(@CurrentUser() u: any, @Query('status') status?: string) { return this.orders.list(u, status); }`
- `14: - 28:  @Post('orders/:id/cancel') cancel(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.orders.cancel(u, id, b?.reason || ''); }`
- `16: - 43:  @Get('allocations') list(@CurrentUser() u: any, @Query('status') status?: string) {`
- `23: - 58:  @Post('allocations/:id/delivered') delivered(@CurrentUser() u: any, @Param('id') id: string) { return this.allocs.delivered(u, id); }`
- `25: - 60:  @Post('allocations/:id/cancel') cancel(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.allocs.cancel(u, id, b?.reason || ''); }`
- `57: - 170:  @Post('threads/:id/reject') reject(@CurrentUser() u: any, @Param('id') id: string) { return this.chat.rejectOrRemove(u, id, 'rejected'); }`
- `63: - 187:  @Get() list(@CurrentUser() u: any, @Query('status') st?: string) { return this.svc.list(u, st); }`
- `66: - 196:  @Get() list(@CurrentUser() u: any, @Query('status') st?: string) { return this.svc.list(u, st); }`
- `81: - 35:  @Post(':id/cancel')`
- `98: - 136:  @Post(':id/delivered')`
- `128: - 47:  @Post('bookings/:id/cancel')`
- `129: - 50:  @Patch('bookings/:id/state')`
### payment_insurance_relevance
- `24: - 59:  @Post('allocations/:id/insurance') updateInsurance(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.allocs.updateInsurance(u, id, b); }`
- `28: - 75:  @Post('orders/:id/insurance')`
- `87: - 68:  @Patch(':id/items/:itemId/opt-in-cash')`
- `89: - 81:  @Patch(':id/insurance-approval')`
- `110: - 17:  @Get('insurance')`
- `131: - 60:  @Patch('bookings/:id/insurance')`
- `132: - 65:  @Patch('bookings/:id/items/:serviceId/opt-in-cash')`
- `158: - 127:  @Get('wallet')`
- `230: - 240:  @Post(':id/insurance-copay')`
- `233: - 390:@Controller('provider/wallet')`
### error_empty_loading_retry_cancel
- `14: - 28:  @Post('orders/:id/cancel') cancel(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.orders.cancel(u, id, b?.reason || ''); }`
- `25: - 60:  @Post('allocations/:id/cancel') cancel(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.allocs.cancel(u, id, b?.reason || ''); }`
- `81: - 35:  @Post(':id/cancel')`
- `128: - 47:  @Post('bookings/:id/cancel')`
- `215: - 132:  @Post(':id/retry-image-jobs')`
- `226: - 170:  @Post(':id/cancel') cancel(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.cancel(u, id, body || {}); }`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
