# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PATIENT_EXACT_READ_ROUTE_CONTRACTS_20260818.md`
- **Member SHA-256:** `8e7b79b4247b2825c5c4663db59651f4d9d587319b98e736167ad1059e7316a6`
- **Line count:** 85
- **Read range:** `1-85`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: # Exact Patient read route contracts`
- `50: ## Appointment/booking modules`
- `56: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/doctors/doctors.module.ts:256:  @Post('appointments') book(@Body() body: any, @CurrentUser() user: any) { return this.svc.book(user, body); }`
### backend_consumers_or_contracts
- `28: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.insurance.controller.ts:5:@Controller('users/me/insurance')`
### auth_ownership
- `16: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.controller.ts:72:  @Get('me/sessions')`
- `17: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.controller.ts:76:  @Delete('me/sessions/:jti')`
- `38: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:53:  @Patch('member/:userId/permissions')`
- `47: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:111:  @Post('permissions/request')`
- `48: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:124:  @Get('permissions/pending')`
- `49: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:130:  @Put('permissions/respond/:requestId')`
### state_transitions
- `48: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:124:  @Get('permissions/pending')`
- `58: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/doctors/doctors.module.ts:258:  @Get('appointments/inbox') inbox(@Query('status') s: string | undefined, @CurrentUser() user: any) { return this.svc.doctorInbox(user, s); }`
- `60: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/doctors/doctors.module.ts:260:  @Patch('appointments/:id/state') tr(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) { return this.svc.transition(user, id, body.st`
- `80: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:53:  @Put('appointments/:id/status')`
### payment_insurance_relevance
- `21: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/user.insurance.controller.ts:5:@Controller('user')`
- `22: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/user.insurance.controller.ts:12:  @Get('insurance')`
- `28: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.insurance.controller.ts:5:@Controller('users/me/insurance')`
- `29: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.insurance.controller.ts:10:  @Get()`
- `30: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.insurance.controller.ts:16:  @Post()`
- `81: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:58:  @Get('wallet')`
### error_empty_loading_retry_cancel
- `48: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:124:  @Get('permissions/pending')`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
