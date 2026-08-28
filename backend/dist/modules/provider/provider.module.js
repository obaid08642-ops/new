"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const jwt_1 = require("@nestjs/jwt");
const schemas_1 = require("./schemas");
const requests_schema_1 = require("./schemas/requests.schema");
const capabilities_schema_1 = require("./schemas/capabilities.schema");
const storage_module_1 = require("../storage/storage.module");
const provider_auth_service_1 = require("./services/provider-auth.service");
const provider_profile_service_1 = require("./services/provider-profile.service");
const provider_operators_service_1 = require("./services/provider-operators.service");
const provider_admin_service_1 = require("./services/provider-admin.service");
const provider_otp_service_1 = require("./services/provider-otp.service");
const provider_mailer_service_1 = require("./services/provider-mailer.service");
const provider_request_engine_service_1 = require("./services/provider-request-engine.service");
const provider_notifications_service_1 = require("./services/provider-notifications.service");
const provider_schedule_service_1 = require("./services/provider-schedule.service");
const provider_dashboard_service_1 = require("./services/provider-dashboard.service");
const provider_seed_service_1 = require("./services/provider-seed.service");
const service_capability_service_1 = require("./services/service-capability.service");
const geo_engine_service_1 = require("./services/geo-engine.service");
const scheduling_engine_service_1 = require("./services/scheduling-engine.service");
const provider_scoring_service_1 = require("./services/provider-scoring.service");
const provider_matching_service_1 = require("./services/provider-matching.service");
const assignment_strategy_service_1 = require("./services/assignment-strategy.service");
const provider_image_processor_service_1 = require("./services/provider-image-processor.service");
const profile_image_metadata_schema_1 = require("../../schemas/profile-image-metadata.schema");
const image_processing_job_schema_1 = require("../../schemas/image-processing-job.schema");
const promotion_campaign_schema_1 = require("../../schemas/promotion-campaign.schema");
const patient_crm_tag_schema_1 = require("../../schemas/patient-crm-tag.schema");
const outbound_referral_schema_1 = require("../../schemas/outbound-referral.schema");
const profile_image_audit_log_schema_1 = require("../../schemas/profile-image-audit-log.schema");
const user_schema_1 = require("../../schemas/user.schema");
const home_care_schema_1 = require("../../schemas/home-care.schema");
const radiology_schema_1 = require("../../schemas/radiology.schema");
const leave_requests_controller_1 = require("./leave-requests.controller");
const provider_controllers_1 = require("./provider.controllers");
const doctorsessiontype_repository_1 = require("./services/repositories/doctorsessiontype.repository");
const homecareservicecatalogitem_repository_1 = require("./services/repositories/homecareservicecatalogitem.repository");
const imageprocessingjob_repository_1 = require("./services/repositories/imageprocessingjob.repository");
const labtestcatalogitem_repository_1 = require("./services/repositories/labtestcatalogitem.repository");
const pharmacyinventoryitem_repository_1 = require("./services/repositories/pharmacyinventoryitem.repository");
const profileimageauditlog_repository_1 = require("./services/repositories/profileimageauditlog.repository");
const profileimagemetadata_repository_1 = require("./services/repositories/profileimagemetadata.repository");
const provideraccount_repository_1 = require("./services/repositories/provideraccount.repository");
const provideraccountprofile_repository_1 = require("./services/repositories/provideraccountprofile.repository");
const providerassignmentattempt_repository_1 = require("./services/repositories/providerassignmentattempt.repository");
const providerauditlog_repository_1 = require("./services/repositories/providerauditlog.repository");
const provideravailability_repository_1 = require("./services/repositories/provideravailability.repository");
const providerbankaccount_repository_1 = require("./services/repositories/providerbankaccount.repository");
const providerdeliveryzone_repository_1 = require("./services/repositories/providerdeliveryzone.repository");
const providerdocument_repository_1 = require("./services/repositories/providerdocument.repository");
const providernotification_repository_1 = require("./services/repositories/providernotification.repository");
const provideroperator_repository_1 = require("./services/repositories/provideroperator.repository");
const providerotpcode_repository_1 = require("./services/repositories/providerotpcode.repository");
const providerrequest_repository_1 = require("./services/repositories/providerrequest.repository");
const providerscheduleslot_repository_1 = require("./services/repositories/providerscheduleslot.repository");
const providerscoresnapshot_repository_1 = require("./services/repositories/providerscoresnapshot.repository");
const radiologyservicecatalogitem_repository_1 = require("./services/repositories/radiologyservicecatalogitem.repository");
const providersession_repository_1 = require("./services/repositories/providersession.repository");
const leave_request_schema_1 = require("../../schemas/leave-request.schema");
let ProviderModule = class ProviderModule {
};
exports.ProviderModule = ProviderModule;
exports.ProviderModule = ProviderModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: 'ProviderAccount', schema: schemas_1.ProviderAccountSchema },
                { name: 'LeaveRequest', schema: leave_request_schema_1.LeaveRequestSchema },
                { name: 'ProviderSession', schema: schemas_1.ProviderSessionSchema },
                { name: 'ProfileImageMetadata', schema: profile_image_metadata_schema_1.ProfileImageMetadataSchema },
                { name: 'ImageProcessingJob', schema: image_processing_job_schema_1.ImageProcessingJobSchema },
                { name: 'PromotionCampaign', schema: promotion_campaign_schema_1.PromotionCampaignSchema },
                { name: 'PatientCrmTag', schema: patient_crm_tag_schema_1.PatientCrmTagSchema },
                { name: 'OutboundReferral', schema: outbound_referral_schema_1.OutboundReferralSchema },
                { name: 'ProfileImageAuditLog', schema: profile_image_audit_log_schema_1.ProfileImageAuditLogSchema },
                { name: user_schema_1.User.name, schema: user_schema_1.UserSchema },
                { name: home_care_schema_1.HomeCareBooking.name, schema: home_care_schema_1.HomeCareBookingSchema },
                { name: home_care_schema_1.NursingVisitReport.name, schema: home_care_schema_1.NursingVisitReportSchema },
                { name: radiology_schema_1.RadiologyBooking.name, schema: radiology_schema_1.RadiologyBookingSchema },
                { name: 'ProviderAccountProfile', schema: schemas_1.ProviderProfileSchema },
                { name: 'ProviderDocument', schema: schemas_1.ProviderDocumentSchema },
                { name: 'ProviderBankAccount', schema: schemas_1.ProviderBankAccountSchema },
                { name: 'ProviderOperator', schema: schemas_1.ProviderOperatorSchema },
                { name: 'ProviderOtpCode', schema: schemas_1.ProviderOtpCodeSchema },
                { name: 'ProviderAuditLog', schema: schemas_1.ProviderAuditLogSchema },
                { name: 'ProviderRequest', schema: requests_schema_1.ProviderRequestSchema },
                { name: 'ProviderNotification', schema: requests_schema_1.ProviderNotificationSchema },
                { name: 'ProviderAvailability', schema: requests_schema_1.ProviderAvailabilitySchema },
                { name: 'PharmacyInventoryItem', schema: capabilities_schema_1.PharmacyInventoryItemSchema },
                { name: 'LabTestCatalogItem', schema: capabilities_schema_1.LabTestCatalogItemSchema },
                { name: 'RadiologyServiceCatalogItem', schema: capabilities_schema_1.RadiologyServiceCatalogItemSchema },
                { name: 'DoctorSessionType', schema: capabilities_schema_1.DoctorSessionTypeSchema },
                { name: 'HomeCareServiceCatalogItem', schema: capabilities_schema_1.HomeCareServiceCatalogItemSchema },
                { name: 'ProviderDeliveryZone', schema: capabilities_schema_1.ProviderDeliveryZoneSchema },
                { name: 'ProviderScheduleSlot', schema: capabilities_schema_1.ProviderScheduleSlotSchema },
                { name: 'ProviderAssignmentAttempt', schema: capabilities_schema_1.ProviderAssignmentAttemptSchema },
                { name: 'ProviderScoreSnapshot', schema: capabilities_schema_1.ProviderScoreSnapshotSchema },
            ]),
            jwt_1.JwtModule.registerAsync({ useFactory: () => {
                    const secret = process.env.JWT_SECRET;
                    if (!secret)
                        throw new Error('FATAL: JWT_SECRET must be configured');
                    if (process.env.NODE_ENV === 'production' && secret.length < 32) {
                        throw new Error('FATAL: JWT_SECRET must be at least 32 characters in production');
                    }
                    return { secret, signOptions: { expiresIn: '14d' } };
                } }),
            storage_module_1.StorageModule,
        ],
        controllers: [
            leave_requests_controller_1.LeaveRequestsController,
            provider_controllers_1.ProviderAuthController,
            provider_controllers_1.ProviderProfileController,
            provider_controllers_1.ProviderOperatorsController,
            provider_controllers_1.ProviderAdminController,
            provider_controllers_1.ProviderRequestsController,
            provider_controllers_1.ProviderWalletController,
            provider_controllers_1.ProviderNotificationsController,
            provider_controllers_1.ProviderScheduleController,
            provider_controllers_1.ProviderDashboardController,
            provider_controllers_1.ProviderCapabilitiesController,
            provider_controllers_1.ProviderZonesController,
            provider_controllers_1.ProviderScheduleSlotsController,
            provider_controllers_1.ProviderScoreController,
            provider_controllers_1.AdminMatchingController,
        ],
        providers: [
            provider_image_processor_service_1.ProviderImageProcessorService,
            provider_auth_service_1.ProviderAuthService,
            provider_profile_service_1.ProviderProfileService,
            provider_operators_service_1.ProviderOperatorsService,
            provider_admin_service_1.ProviderAdminService,
            provider_otp_service_1.ProviderOtpService,
            provider_mailer_service_1.ProviderMailerService,
            provider_request_engine_service_1.ProviderRequestEngineService,
            provider_notifications_service_1.ProviderNotificationsService,
            provider_schedule_service_1.ProviderScheduleService,
            provider_dashboard_service_1.ProviderDashboardService,
            provider_seed_service_1.ProviderSeedService,
            service_capability_service_1.ServiceCapabilityService,
            geo_engine_service_1.GeoEngineService,
            scheduling_engine_service_1.SchedulingEngineService,
            provider_scoring_service_1.ProviderScoringService,
            provider_matching_service_1.ProviderMatchingService,
            assignment_strategy_service_1.AssignmentStrategyService,
            { provide: "DoctorSessionTypeRepository", useClass: doctorsessiontype_repository_1.DoctorSessionTypeRepository },
            { provide: "HomeCareServiceCatalogItemRepository", useClass: homecareservicecatalogitem_repository_1.HomeCareServiceCatalogItemRepository },
            { provide: "ImageProcessingJobRepository", useClass: imageprocessingjob_repository_1.ImageProcessingJobRepository },
            { provide: "LabTestCatalogItemRepository", useClass: labtestcatalogitem_repository_1.LabTestCatalogItemRepository },
            { provide: "PharmacyInventoryItemRepository", useClass: pharmacyinventoryitem_repository_1.PharmacyInventoryItemRepository },
            { provide: "ProfileImageAuditLogRepository", useClass: profileimageauditlog_repository_1.ProfileImageAuditLogRepository },
            { provide: "ProfileImageMetadataRepository", useClass: profileimagemetadata_repository_1.ProfileImageMetadataRepository },
            { provide: "ProviderAccountRepository", useClass: provideraccount_repository_1.ProviderAccountRepository },
            { provide: "ProviderAccountProfileRepository", useClass: provideraccountprofile_repository_1.ProviderAccountProfileRepository },
            { provide: "ProviderAssignmentAttemptRepository", useClass: providerassignmentattempt_repository_1.ProviderAssignmentAttemptRepository },
            { provide: "ProviderAuditLogRepository", useClass: providerauditlog_repository_1.ProviderAuditLogRepository },
            { provide: "ProviderAvailabilityRepository", useClass: provideravailability_repository_1.ProviderAvailabilityRepository },
            { provide: "ProviderBankAccountRepository", useClass: providerbankaccount_repository_1.ProviderBankAccountRepository },
            { provide: "ProviderDeliveryZoneRepository", useClass: providerdeliveryzone_repository_1.ProviderDeliveryZoneRepository },
            { provide: "ProviderDocumentRepository", useClass: providerdocument_repository_1.ProviderDocumentRepository },
            { provide: "ProviderNotificationRepository", useClass: providernotification_repository_1.ProviderNotificationRepository },
            { provide: "ProviderOperatorRepository", useClass: provideroperator_repository_1.ProviderOperatorRepository },
            { provide: "ProviderOtpCodeRepository", useClass: providerotpcode_repository_1.ProviderOtpCodeRepository },
            { provide: "ProviderRequestRepository", useClass: providerrequest_repository_1.ProviderRequestRepository },
            { provide: "ProviderScheduleSlotRepository", useClass: providerscheduleslot_repository_1.ProviderScheduleSlotRepository },
            { provide: "ProviderScoreSnapshotRepository", useClass: providerscoresnapshot_repository_1.ProviderScoreSnapshotRepository },
            { provide: "RadiologyServiceCatalogItemRepository", useClass: radiologyservicecatalogitem_repository_1.RadiologyServiceCatalogItemRepository },
            { provide: "ProviderSessionRepository", useClass: providersession_repository_1.ProviderSessionRepository }
        ],
        exports: [
            provider_auth_service_1.ProviderAuthService, provider_otp_service_1.ProviderOtpService, provider_request_engine_service_1.ProviderRequestEngineService, provider_notifications_service_1.ProviderNotificationsService,
            provider_matching_service_1.ProviderMatchingService, assignment_strategy_service_1.AssignmentStrategyService, service_capability_service_1.ServiceCapabilityService, provider_scoring_service_1.ProviderScoringService,
        ],
    })
], ProviderModule);
//# sourceMappingURL=provider.module.js.map