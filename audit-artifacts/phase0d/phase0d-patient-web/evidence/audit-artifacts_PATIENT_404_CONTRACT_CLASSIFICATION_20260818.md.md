# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PATIENT_404_CONTRACT_CLASSIFICATION_20260818.md`
- **Member SHA-256:** `1574fe1e9863db9eaa912331235de29cbbea1242a2c3d13e9fb9039082fd3bc6`
- **Line count:** 218
- **Read range:** `1-218`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `17: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.controllers.ts:72:  @Post('profile/image/upload')`
- `21: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/notifications/notifications.service.ts:673:      action: { route: '/family/hub' },`
- `22: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/notifications/notifications.service.ts:685:      action: { route: '/family/permission-request' },`
- `23: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/notifications/notifications.service.ts:697:      action: { route: '/family/hub' },`
- `24: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/notifications/notifications.service.ts:708:      action: { route: '/family/hub' },`
- `49: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/admin-authority/admin-authority.module.ts:256:  @Post('appointments/:id/force-cancel') fca(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.forceCancel`
- `51: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/admin-authority/admin-authority.module.ts:258:  @Post('appointments/:id/force-reschedule') fra(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.forceRe`
- `52: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/doctors/doctors.module.ts:256:  @Post('appointments') book(@Body() body: any, @CurrentUser() user: any) { return this.svc.book(user, body); }`
- `198: "login": {"status": "success", "token_received": true},`
- `200: {"path":"/profile","status":404,"classification":"UNRECONCILED_ROUTE"},`
- `202: {"path":"/family","status":404,"classification":"UNRECONCILED_ROUTE_OR_EMPTY_CONTRACT"},`
- `206: {"path":"/appointments/mine","status":404,"classification":"UNRECONCILED_ROUTE"},`
### backend_consumers_or_contracts
- `21: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/notifications/notifications.service.ts:673:      action: { route: '/family/hub' },`
- `22: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/notifications/notifications.service.ts:685:      action: { route: '/family/permission-request' },`
- `23: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/notifications/notifications.service.ts:697:      action: { route: '/family/hub' },`
- `24: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/notifications/notifications.service.ts:708:      action: { route: '/family/hub' },`
- `27: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:15:  /** POST /api/v1/family/create — Create a new family group */`
- `28: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:22:  /** GET /api/v1/family/my-group — Get current user's family group */`
- `29: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:28:  /** POST /api/v1/family/invite — Generate an invite code (owner only) */`
- `30: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:34:  /** POST /api/v1/family/join — Join a group via invite code */`
- `31: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:40:  /** POST /api/v1/family/leave — Leave your group (non-owner members) */`
- `32: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:46:  /** PATCH /api/v1/family/member/:userId/relation — Set relation label (owner only) */`
- `33: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:52:  /** PATCH /api/v1/family/member/:userId/permissions — Replace permission set (owner only; grant + revoke) */`
- `34: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:58:  /** GET /api/v1/family/member-records/:userId — Granular records bundle (per-permission sections) */`
### auth_ownership
- `22: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/notifications/notifications.service.ts:685:      action: { route: '/family/permission-request' },`
- `25: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.service.ts:146:   * GET /family/member-records/:userId — granular, permission-filtered record`
- `29: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:28:  /** POST /api/v1/family/invite — Generate an invite code (owner only) */`
- `31: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:40:  /** POST /api/v1/family/leave — Leave your group (non-owner members) */`
- `32: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:46:  /** PATCH /api/v1/family/member/:userId/relation — Set relation label (owner only) */`
- `33: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:52:  /** PATCH /api/v1/family/member/:userId/permissions — Replace permission set (owner only; grant + revoke) */`
- `34: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:58:  /** GET /api/v1/family/member-records/:userId — Granular records bundle (per-permission sections) */`
- `35: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:64:  /** DELETE /api/v1/family/remove-member/:userId — Remove a member (owner only) */`
- `37: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:76:  /** GET /api/v1/family/member-health/:userId — View member's health (permission-gated) */`
- `42: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:110:  /** POST /api/v1/family/permissions/request — Request expanded permissions */`
- `43: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:123:  /** GET /api/v1/family/permissions/pending — List pending permission requests (owner) */`
- `44: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:129:  /** PUT /api/v1/family/permissions/respond/:requestId — Respond to permission request */`
### state_transitions
- `18: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.controllers.ts:83:  @Get('profile/image/status')`
- `43: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:123:  /** GET /api/v1/family/permissions/pending — List pending permission requests (owner) */`
- `49: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/admin-authority/admin-authority.module.ts:256:  @Post('appointments/:id/force-cancel') fca(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.forceCancel`
- `54: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/doctors/doctors.module.ts:258:  @Get('appointments/inbox') inbox(@Query('status') s: string | undefined, @CurrentUser() user: any) { return this.svc.doctorInbox(user, s); }`
- `56: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/doctors/doctors.module.ts:260:  @Patch('appointments/:id/state') tr(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) { return this.svc.transition(user, id, body.st`
- `63: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:53:  @Put('appointments/:id/status')`
- `198: "login": {"status": "success", "token_received": true},`
- `200: {"path":"/profile","status":404,"classification":"UNRECONCILED_ROUTE"},`
- `201: {"path":"/notifications","status":200,"classification":"PASS_READ"},`
- `202: {"path":"/family","status":404,"classification":"UNRECONCILED_ROUTE_OR_EMPTY_CONTRACT"},`
- `203: {"path":"/wallet/balance","status":200,"classification":"PASS_READ"},`
- `204: {"path":"/wallet/transactions","status":200,"classification":"PASS_READ"},`
### payment_insurance_relevance
- `46: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/compat/admin-spa.module.ts:287:@Controller('family-cards')`
- `203: {"path":"/wallet/balance","status":200,"classification":"PASS_READ"},`
- `204: {"path":"/wallet/transactions","status":200,"classification":"PASS_READ"},`
- `214: {"path":"/insurance/companies","status":200,"classification":"PASS_READ"},`
### error_empty_loading_retry_cancel
- `43: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:123:  /** GET /api/v1/family/permissions/pending — List pending permission requests (owner) */`
- `49: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/admin-authority/admin-authority.module.ts:256:  @Post('appointments/:id/force-cancel') fca(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.forceCancel`
- `202: {"path":"/family","status":404,"classification":"UNRECONCILED_ROUTE_OR_EMPTY_CONTRACT"},`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
