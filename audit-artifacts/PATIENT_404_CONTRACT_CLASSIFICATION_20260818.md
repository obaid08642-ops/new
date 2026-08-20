# Patient 404 contract classification
## profile
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.controller.ts:11:  @Get('me/profile')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/users/users.controller.ts:16:  @Patch('me/profile')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/medical-profile/medical-profile.controller.ts:9:@Controller('medical-profile')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/recruitment/recruitment.module.ts:226:  @Get('candidate/profile')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/recruitment/recruitment.module.ts:231:  @Post('candidate/profile')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/providers/providers.controller.ts:45:  @Get('me/profile')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/maternity/maternity.controller.ts:12:  @Get('profile')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/maternity/maternity.controller.ts:24:  @Post('profile')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/nutrition/nutrition.controller.ts:17:  @Get('profile')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/nutrition/nutrition.controller.ts:25:  @Post('profile')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.controllers.ts:58:  @Get('profile') get(@CurrentUser() u: any) { return this.svc.getProfile(u); }
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.controllers.ts:59:  @Patch('profile') update(@CurrentUser() u: any, @Body() body: any) { return this.svc.updateProfile(u, body); }
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.controllers.ts:60:  @Post('profile/phones') addPhone(@CurrentUser() u: any, @Body() body: any) { return this.svc.addPhone(u, body); }
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.controllers.ts:61:  @Delete('profile/phones/:phone_id') removePhone(@CurrentUser() u: any, @Param('phone_id') pid: string) { return this.svc.removePhone(u, pid); }
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.controllers.ts:72:  @Post('profile/image/upload')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.controllers.ts:83:  @Get('profile/image/status')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider-onboarding/provider-onboarding.module.ts:438:  @UseGuards(JwtAuthGuard) @Get('my-profile')
## family
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/notifications/notifications.service.ts:673:      action: { route: '/family/hub' },
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/notifications/notifications.service.ts:685:      action: { route: '/family/permission-request' },
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/notifications/notifications.service.ts:697:      action: { route: '/family/hub' },
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/notifications/notifications.service.ts:708:      action: { route: '/family/hub' },
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.service.ts:146:   * GET /family/member-records/:userId — granular, permission-filtered record
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:9:@Controller('family')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:15:  /** POST /api/v1/family/create — Create a new family group */
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:22:  /** GET /api/v1/family/my-group — Get current user's family group */
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:28:  /** POST /api/v1/family/invite — Generate an invite code (owner only) */
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:34:  /** POST /api/v1/family/join — Join a group via invite code */
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:40:  /** POST /api/v1/family/leave — Leave your group (non-owner members) */
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:46:  /** PATCH /api/v1/family/member/:userId/relation — Set relation label (owner only) */
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:52:  /** PATCH /api/v1/family/member/:userId/permissions — Replace permission set (owner only; grant + revoke) */
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:58:  /** GET /api/v1/family/member-records/:userId — Granular records bundle (per-permission sections) */
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:64:  /** DELETE /api/v1/family/remove-member/:userId — Remove a member (owner only) */
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:70:  /** GET /api/v1/family/members — List all group members */
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:76:  /** GET /api/v1/family/member-health/:userId — View member's health (permission-gated) */
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:82:  /** GET /api/v1/family/emergency-contacts — Get family emergency contacts */
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:90:  /** POST /api/v1/family/calendar/event — Add a shared calendar event */
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:96:  /** GET /api/v1/family/calendar — Get shared calendar events */
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:102:  /** DELETE /api/v1/family/calendar/event/:eventId — Delete a calendar event */
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:110:  /** POST /api/v1/family/permissions/request — Request expanded permissions */
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:123:  /** GET /api/v1/family/permissions/pending — List pending permission requests (owner) */
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.controller.ts:129:  /** PUT /api/v1/family/permissions/respond/:requestId — Respond to permission request */
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/compat/compat.module.ts:41:@Controller('family/chat')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/compat/admin-spa.module.ts:287:@Controller('family-cards')
## appointments
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/export/export.controller.ts:25:  @Get('appointments')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/admin-authority/admin-authority.module.ts:256:  @Post('appointments/:id/force-cancel') fca(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.forceCancelAppt(u, id, b.reason || ''); }
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/admin-authority/admin-authority.module.ts:257:  @Post('appointments/:id/force-confirm') fcoappt(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.forceConfirmAppt(u, id, b.reason || ''); }
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/admin-authority/admin-authority.module.ts:258:  @Post('appointments/:id/force-reschedule') fra(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.forceRescheduleAppt(u, id, b.new_time, b.reason || ''); }
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/doctors/doctors.module.ts:256:  @Post('appointments') book(@Body() body: any, @CurrentUser() user: any) { return this.svc.book(user, body); }
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/doctors/doctors.module.ts:257:  @Get('appointments/mine') mine(@CurrentUser() user: any) { return this.svc.myAppointments(user); }
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/doctors/doctors.module.ts:258:  @Get('appointments/inbox') inbox(@Query('status') s: string | undefined, @CurrentUser() user: any) { return this.svc.doctorInbox(user, s); }
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/doctors/doctors.module.ts:259:  @Get('appointments/:id') ap(@Param('id') id: string, @CurrentUser() user: any) { return this.svc.appointmentDetail(user, id); }
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/doctors/doctors.module.ts:260:  @Patch('appointments/:id/state') tr(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) { return this.svc.transition(user, id, body.state); }
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/doctors/doctors.module.ts:262:  @Get('appointments/:id/messages') msgs(@Param('id') id: string, @CurrentUser() user: any) { return this.svc.listMessages(user, id); }
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/doctors/doctors.module.ts:263:  @Post('appointments/:id/messages') postMsg(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) { return this.svc.postMessage(user, id, body.text); }
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/doctors/doctors.module.ts:264:  @Post('appointments/:id/note') note(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) { return this.svc.upsertNote(user, id, body); }
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/family/family.service.ts:137:    // (vitals/meds/reports/appointments/emergency) plus legacy view_health.
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/care/appointments.controller.ts:8:@Controller('care/appointments')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:45:  @Get('appointments')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:53:  @Put('appointments/:id/status')
## hospitals
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/seed/seed.service.ts:67:  /** Seed facilities (hospitals/clinics) with stable IDs by slug. */
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/services/provider-profile.service.ts:46:      if (p && p.provider_type !== ProviderType.HOSPITAL && p.provider_type !== ProviderType.CLINIC) throw new BadRequestException('enabled_modules only allowed for hospitals/clinics');
## services
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/analytics/analytics.module.ts:141:  @Get('top-services')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:33:  @Get('services') servicesList(@Query() q: any) {
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:39:  @Get('services/:id') async serviceOne(@Param('id') id: string) {
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:9:  @Public() @Get('services')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/labs/labs.controller.ts:35:  @Public() @Get('services/:id')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/legacy/legacy.module.ts:58:        writers: ['pharmacy/services/pharmacy-order.service.ts', 'pharmacy/services/pharmacy-allocation.service.ts'],
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/legacy/legacy.module.ts:63:        readers: ['pharmacy/services/pharmacy-allocation.service.ts'],
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/legacy/legacy.module.ts:64:        writers: ['pharmacy/services/pharmacy-allocation.service.ts'],
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/legacy/legacy.module.ts:69:        readers: ['pharmacy/services/pharmacy-broadcast.service.ts'],
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/legacy/legacy.module.ts:70:        writers: ['pharmacy/services/pharmacy-broadcast.service.ts'],
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/legacy/legacy.module.ts:75:        readers: ['provider/services/*'],
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/legacy/legacy.module.ts:76:        writers: ['provider/services/*'],
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/compat/compat.module.ts:731:  @Get('lab-services')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/compat/compat.module.ts:740:  @Get('radiology-services')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/compat/admin-spa.module.ts:431:@Controller('services')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/compat/admin-spa.module.ts:991:@Controller('nursing-services')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.module.ts:18:import { ProviderAuthService } from './services/provider-auth.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.module.ts:19:import { ProviderProfileService } from './services/provider-profile.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.module.ts:20:import { ProviderOperatorsService } from './services/provider-operators.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.module.ts:21:import { ProviderAdminService } from './services/provider-admin.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.module.ts:22:import { ProviderOtpService } from './services/provider-otp.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.module.ts:23:import { ProviderMailerService } from './services/provider-mailer.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.module.ts:24:import { ProviderRequestEngineService } from './services/provider-request-engine.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.module.ts:25:import { ProviderNotificationsService } from './services/provider-notifications.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.module.ts:26:import { ProviderScheduleService } from './services/provider-schedule.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.module.ts:27:import { ProviderDashboardService } from './services/provider-dashboard.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.module.ts:28:import { ProviderSeedService } from './services/provider-seed.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.module.ts:29:import { ServiceCapabilityService } from './services/service-capability.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.module.ts:30:import { GeoEngineService } from './services/geo-engine.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.module.ts:31:import { SchedulingEngineService } from './services/scheduling-engine.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.module.ts:32:import { ProviderScoringService } from './services/provider-scoring.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.module.ts:33:import { ProviderMatchingService } from './services/provider-matching.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.module.ts:34:import { AssignmentStrategyService } from './services/assignment-strategy.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.module.ts:35:import { ProviderImageProcessorService } from './services/provider-image-processor.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.module.ts:53:import { DoctorSessionTypeRepository } from "./services/repositories/doctorsessiontype.repository";
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.module.ts:54:import { HomeCareServiceCatalogItemRepository } from "./services/repositories/homecareservicecatalogitem.repository";
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.module.ts:55:import { ImageProcessingJobRepository } from "./services/repositories/imageprocessingjob.repository";
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.module.ts:56:import { LabTestCatalogItemRepository } from "./services/repositories/labtestcatalogitem.repository";
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.module.ts:57:import { PharmacyInventoryItemRepository } from "./services/repositories/pharmacyinventoryitem.repository";
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.module.ts:58:import { ProfileImageAuditLogRepository } from "./services/repositories/profileimageauditlog.repository";
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.module.ts:59:import { ProfileImageMetadataRepository } from "./services/repositories/profileimagemetadata.repository";
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.module.ts:60:import { ProviderAccountRepository } from "./services/repositories/provideraccount.repository";
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.module.ts:61:import { ProviderAccountProfileRepository } from "./services/repositories/provideraccountprofile.repository";
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.module.ts:62:import { ProviderAssignmentAttemptRepository } from "./services/repositories/providerassignmentattempt.repository";
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.module.ts:63:import { ProviderAuditLogRepository } from "./services/repositories/providerauditlog.repository";
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.module.ts:64:import { ProviderAvailabilityRepository } from "./services/repositories/provideravailability.repository";
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.module.ts:65:import { ProviderBankAccountRepository } from "./services/repositories/providerbankaccount.repository";
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.module.ts:66:import { ProviderDeliveryZoneRepository } from "./services/repositories/providerdeliveryzone.repository";
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.module.ts:67:import { ProviderDocumentRepository } from "./services/repositories/providerdocument.repository";
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.module.ts:68:import { ProviderNotificationRepository } from "./services/repositories/providernotification.repository";
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.module.ts:69:import { ProviderOperatorRepository } from "./services/repositories/provideroperator.repository";
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.module.ts:70:import { ProviderOtpCodeRepository } from "./services/repositories/providerotpcode.repository";
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.module.ts:71:import { ProviderRequestRepository } from "./services/repositories/providerrequest.repository";
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.module.ts:72:import { ProviderScheduleSlotRepository } from "./services/repositories/providerscheduleslot.repository";
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.module.ts:73:import { ProviderScoreSnapshotRepository } from "./services/repositories/providerscoresnapshot.repository";
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.module.ts:74:import { RadiologyServiceCatalogItemRepository } from "./services/repositories/radiologyservicecatalogitem.repository";
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.module.ts:75:import { ProviderSessionRepository } from "./services/repositories/providersession.repository";
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.controllers.ts:3:import { ProviderAuthService } from './services/provider-auth.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.controllers.ts:4:import { ProviderProfileService } from './services/provider-profile.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.controllers.ts:5:import { ProviderOperatorsService } from './services/provider-operators.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.controllers.ts:6:import { ProviderAdminService } from './services/provider-admin.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.controllers.ts:7:import { ProviderRequestEngineService } from './services/provider-request-engine.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.controllers.ts:8:import { ProviderNotificationsService } from './services/provider-notifications.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.controllers.ts:9:import { ProviderScheduleService } from './services/provider-schedule.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.controllers.ts:10:import { ProviderDashboardService } from './services/provider-dashboard.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.controllers.ts:11:import { ProviderSeedService } from './services/provider-seed.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.controllers.ts:12:import { ServiceCapabilityService } from './services/service-capability.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.controllers.ts:13:import { SchedulingEngineService } from './services/scheduling-engine.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.controllers.ts:14:import { ProviderScoringService } from './services/provider-scoring.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.controllers.ts:15:import { ProviderMatchingService } from './services/provider-matching.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.controllers.ts:16:import { AssignmentStrategyService } from './services/assignment-strategy.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/provider/provider.controllers.ts:17:import { ProviderImageProcessorService } from './services/provider-image-processor.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/radiology/radiology.controller.ts:9:  @Public() @Get('services')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/radiology/radiology.controller.ts:34:  @Public() @Get('services/:id')
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/hospital/controllers/hospital.controller.ts:2:import { HospitalService } from '../services/hospital.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/hospital/hospital.module.ts:9:import { HospitalService } from './services/hospital.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/patient-pharmacy.controller.ts:3:import { PharmacyShortageService } from './services/pharmacy-shortage.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/services/pharmacy-broadcast.service.ts:18:import { GeoEngineService } from '../../provider/services/geo-engine.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/services/smart-split.service.ts:13:import { GeoEngineService } from '../../provider/services/geo-engine.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/tests/pharmacy-broadcast.service.spec.ts:3:import { PharmacyBroadcastService } from '../services/pharmacy-broadcast.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/tests/pharmacy-broadcast.service.spec.ts:8:import { GeoEngineService } from '../../provider/services/geo-engine.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/tests/pharmacy-broadcast.service.spec.ts:9:import { SmartSplitService } from '../services/smart-split.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/tests/pharmacy-broadcast.service.spec.ts:10:import { PharmacyNotificationService } from '../services/pharmacy-notification.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/tests/pharmacy-broadcast.service.spec.ts:12:import { PharmacyShortageService } from '../services/pharmacy-shortage.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/tests/pharmacy-broadcast.service.spec.ts:13:import { PharmacyChatService } from '../services/pharmacy-chat.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/tests/procurement.service.spec.ts:4:import { ProcurementService } from '../services/procurement.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/controllers/admin-procurement.controller.ts:15:import { ProcurementService } from '../services/procurement.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/controllers/procurement.controller.ts:5:import { ProcurementService } from '../services/procurement.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/pharmacy.module.ts:18:import { ProcurementService } from './services/procurement.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/pharmacy.module.ts:21:import { PharmacyOrderService } from './services/pharmacy-order.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/pharmacy.module.ts:22:import { PharmacyAllocationService } from './services/pharmacy-allocation.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/pharmacy.module.ts:23:import { SmartSplitService } from './services/smart-split.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/pharmacy.module.ts:24:import { PharmacyInventoryExtService } from './services/pharmacy-inventory-ext.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/pharmacy.module.ts:25:import { PharmacySeedService } from './services/pharmacy-seed.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/pharmacy.module.ts:26:import { PharmacyNotificationService } from './services/pharmacy-notification.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/pharmacy.module.ts:27:import { PharmacyBroadcastService } from './services/pharmacy-broadcast.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/pharmacy.module.ts:28:import { PharmacyChatService } from './services/pharmacy-chat.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/pharmacy.module.ts:29:import { PharmacyShortageService } from './services/pharmacy-shortage.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/pharmacy.module.ts:37:import { PharmacyOrdersProviderService } from './services/pharmacy-orders-provider.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/pharmacy.module.ts:39:import { GeoEngineService } from '../provider/services/geo-engine.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/pharmacy.module.ts:42:import { DrugRejectionLogRepository } from "./services/repositories/drugrejectionlog.repository";
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/pharmacy.module.ts:43:import { DrugShortageFlagRepository } from "./services/repositories/drugshortageflag.repository";
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/pharmacy.module.ts:44:import { MedicineRepository } from "./services/repositories/medicine.repository";
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/pharmacy.module.ts:45:import { PharmacyAllocationRepository } from "./services/repositories/pharmacyallocation.repository";
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/pharmacy.module.ts:46:import { PharmacyBroadcastRepository } from "./services/repositories/pharmacybroadcast.repository";
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/pharmacy.module.ts:47:import { PharmacyChatMessageRepository } from "./services/repositories/pharmacychatmessage.repository";
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/pharmacy.module.ts:48:import { PharmacyChatThreadRepository } from "./services/repositories/pharmacychatthread.repository";
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/pharmacy.module.ts:49:import { PharmacyInventoryItemRepository } from "./services/repositories/pharmacyinventoryitem.repository";
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/pharmacy.module.ts:50:import { PharmacyLowStockAlertRepository } from "./services/repositories/pharmacylowstockalert.repository";
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/pharmacy.module.ts:51:import { PharmacyOrderRepository } from "./services/repositories/pharmacyorder.repository";
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/pharmacy.module.ts:52:import { ProcurementRequestRepository } from "./services/repositories/procurementrequest.repository";
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/pharmacy.module.ts:53:import { ProviderAccountRepository } from "./services/repositories/provideraccount.repository";
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/pharmacy.module.ts:54:import { ProviderAccountProfileRepository } from "./services/repositories/provideraccountprofile.repository";
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/pharmacy.module.ts:55:import { ProviderAvailabilityRepository } from "./services/repositories/provideravailability.repository";
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/pharmacy.module.ts:56:import { ProviderScoreSnapshotRepository } from "./services/repositories/providerscoresnapshot.repository";
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/pharmacy.module.ts:57:import { QuotationRepository } from "./services/repositories/quotation.repository";
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/pharmacy.module.ts:58:import { SystemConfigRepository } from "./services/repositories/systemconfig.repository";
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:4:import { PharmacyOrderService } from './services/pharmacy-order.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:5:import { PharmacyAllocationService } from './services/pharmacy-allocation.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:6:import { PharmacyInventoryExtService } from './services/pharmacy-inventory-ext.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:7:import { PharmacySeedService } from './services/pharmacy-seed.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:8:import { SmartSplitService } from './services/smart-split.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:9:import { PharmacyBroadcastService } from './services/pharmacy-broadcast.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:10:import { PharmacyChatService } from './services/pharmacy-chat.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:11:import { PharmacyShortageService } from './services/pharmacy-shortage.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/pharmacy/pharmacy.controllers.ts:12:import { PharmacyOrdersProviderService } from './services/pharmacy-orders-provider.service';
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/custom-services/custom-services.controller.ts:8:@Controller('custom-services')
## Previous live observations
{
  "scope": "patient.sandbox@nabd.plus via origin direct; read-only only",
  "login": {"status": "success", "token_received": true},
  "reads": [
    {"path":"/profile","status":404,"classification":"UNRECONCILED_ROUTE"},
    {"path":"/notifications","status":200,"classification":"PASS_READ"},
    {"path":"/family","status":404,"classification":"UNRECONCILED_ROUTE_OR_EMPTY_CONTRACT"},
    {"path":"/wallet/balance","status":200,"classification":"PASS_READ"},
    {"path":"/wallet/transactions","status":200,"classification":"PASS_READ"},
    {"path":"/orders/mine","status":200,"classification":"PASS_READ"},
    {"path":"/appointments/mine","status":404,"classification":"UNRECONCILED_ROUTE"},
    {"path":"/services","status":403,"classification":"CONTRACT_OR_ROLE_MISMATCH"},
    {"path":"/doctors","status":200,"classification":"PASS_READ"},
    {"path":"/hospitals","status":404,"classification":"UNRECONCILED_ROUTE"},
    {"path":"/labs/packages","status":200,"classification":"PASS_READ"},
    {"path":"/radiology/services","status":200,"classification":"PASS_READ"},
    {"path":"/pharmacy/products","status":200,"classification":"PASS_READ"},
    {"path":"/home-care/services","status":200,"classification":"PASS_READ"},
    {"path":"/insurance/companies","status":200,"classification":"PASS_READ"},
    {"path":"/articles","status":200,"classification":"PASS_READ"}
  ],
  "note": "404s may be stale route guesses rather than source defects; next step is exact consumer-to-controller reconciliation before any mutation."
}
