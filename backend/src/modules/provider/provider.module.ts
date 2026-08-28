import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import {
  ProviderAccountSchema, ProviderProfileSchema, ProviderDocumentSchema,
  ProviderBankAccountSchema, ProviderOperatorSchema, ProviderOtpCodeSchema, ProviderAuditLogSchema,
  ProviderSessionSchema
} from './schemas';
import {
  ProviderRequestSchema, ProviderNotificationSchema, ProviderAvailabilitySchema,
} from './schemas/requests.schema';
import {
  PharmacyInventoryItemSchema, LabTestCatalogItemSchema, RadiologyServiceCatalogItemSchema,
  DoctorSessionTypeSchema, HomeCareServiceCatalogItemSchema, ProviderDeliveryZoneSchema,
  ProviderScheduleSlotSchema, ProviderAssignmentAttemptSchema, ProviderScoreSnapshotSchema,
} from './schemas/capabilities.schema';
import { StorageModule } from '../storage/storage.module';
import { ProviderAuthService } from './services/provider-auth.service';
import { ProviderProfileService } from './services/provider-profile.service';
import { ProviderOperatorsService } from './services/provider-operators.service';
import { ProviderAdminService } from './services/provider-admin.service';
import { ProviderOtpService } from './services/provider-otp.service';
import { ProviderMailerService } from './services/provider-mailer.service';
import { ProviderRequestEngineService } from './services/provider-request-engine.service';
import { ProviderNotificationsService } from './services/provider-notifications.service';
import { ProviderScheduleService } from './services/provider-schedule.service';
import { ProviderDashboardService } from './services/provider-dashboard.service';
import { ProviderSeedService } from './services/provider-seed.service';
import { ServiceCapabilityService } from './services/service-capability.service';
import { GeoEngineService } from './services/geo-engine.service';
import { SchedulingEngineService } from './services/scheduling-engine.service';
import { ProviderScoringService } from './services/provider-scoring.service';
import { ProviderMatchingService } from './services/provider-matching.service';
import { AssignmentStrategyService } from './services/assignment-strategy.service';
import { ProviderImageProcessorService } from './services/provider-image-processor.service';
import { ProfileImageMetadataSchema } from '../../schemas/profile-image-metadata.schema';
import { ImageProcessingJobSchema } from '../../schemas/image-processing-job.schema';
import { PromotionCampaignSchema } from '../../schemas/promotion-campaign.schema';
import { PatientCrmTagSchema } from '../../schemas/patient-crm-tag.schema';
import { OutboundReferralSchema } from '../../schemas/outbound-referral.schema';
import { ProfileImageAuditLogSchema } from '../../schemas/profile-image-audit-log.schema';
import { User, UserSchema } from '../../schemas/user.schema';
import { HomeCareBooking, HomeCareBookingSchema, NursingVisitReport, NursingVisitReportSchema } from '../../schemas/home-care.schema';
import { RadiologyBooking, RadiologyBookingSchema } from '../../schemas/radiology.schema';
import { LeaveRequestsController } from './leave-requests.controller';
import {
  ProviderAuthController, ProviderProfileController, ProviderOperatorsController, ProviderAdminController,
  ProviderRequestsController, ProviderNotificationsController, ProviderScheduleController, ProviderDashboardController,
  ProviderCapabilitiesController, ProviderZonesController, ProviderScheduleSlotsController, ProviderScoreController,
  AdminMatchingController, ProviderWalletController
} from './provider.controllers';
import { DoctorSessionTypeRepository } from "./services/repositories/doctorsessiontype.repository";
import { HomeCareServiceCatalogItemRepository } from "./services/repositories/homecareservicecatalogitem.repository";
import { ImageProcessingJobRepository } from "./services/repositories/imageprocessingjob.repository";
import { LabTestCatalogItemRepository } from "./services/repositories/labtestcatalogitem.repository";
import { PharmacyInventoryItemRepository } from "./services/repositories/pharmacyinventoryitem.repository";
import { ProfileImageAuditLogRepository } from "./services/repositories/profileimageauditlog.repository";
import { ProfileImageMetadataRepository } from "./services/repositories/profileimagemetadata.repository";
import { ProviderAccountRepository } from "./services/repositories/provideraccount.repository";
import { ProviderAccountProfileRepository } from "./services/repositories/provideraccountprofile.repository";
import { ProviderAssignmentAttemptRepository } from "./services/repositories/providerassignmentattempt.repository";
import { ProviderAuditLogRepository } from "./services/repositories/providerauditlog.repository";
import { ProviderAvailabilityRepository } from "./services/repositories/provideravailability.repository";
import { ProviderBankAccountRepository } from "./services/repositories/providerbankaccount.repository";
import { ProviderDeliveryZoneRepository } from "./services/repositories/providerdeliveryzone.repository";
import { ProviderDocumentRepository } from "./services/repositories/providerdocument.repository";
import { ProviderNotificationRepository } from "./services/repositories/providernotification.repository";
import { ProviderOperatorRepository } from "./services/repositories/provideroperator.repository";
import { ProviderOtpCodeRepository } from "./services/repositories/providerotpcode.repository";
import { ProviderRequestRepository } from "./services/repositories/providerrequest.repository";
import { ProviderScheduleSlotRepository } from "./services/repositories/providerscheduleslot.repository";
import { ProviderScoreSnapshotRepository } from "./services/repositories/providerscoresnapshot.repository";
import { RadiologyServiceCatalogItemRepository } from "./services/repositories/radiologyservicecatalogitem.repository";
import { ProviderSessionRepository } from "./services/repositories/providersession.repository";
import { LeaveRequestSchema } from '../../schemas/leave-request.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'ProviderAccount', schema: ProviderAccountSchema },
      { name: 'LeaveRequest', schema: LeaveRequestSchema },
      { name: 'ProviderSession', schema: ProviderSessionSchema },
      { name: 'ProfileImageMetadata', schema: ProfileImageMetadataSchema },
      { name: 'ImageProcessingJob', schema: ImageProcessingJobSchema },
      { name: 'PromotionCampaign', schema: PromotionCampaignSchema },
      { name: 'PatientCrmTag', schema: PatientCrmTagSchema },
      { name: 'OutboundReferral', schema: OutboundReferralSchema },
      { name: 'ProfileImageAuditLog', schema: ProfileImageAuditLogSchema },
      { name: User.name, schema: UserSchema },
      { name: HomeCareBooking.name, schema: HomeCareBookingSchema },
      { name: NursingVisitReport.name, schema: NursingVisitReportSchema },
      { name: RadiologyBooking.name, schema: RadiologyBookingSchema },
      { name: 'ProviderAccountProfile', schema: ProviderProfileSchema },
      { name: 'ProviderDocument', schema: ProviderDocumentSchema },
      { name: 'ProviderBankAccount', schema: ProviderBankAccountSchema },
      { name: 'ProviderOperator', schema: ProviderOperatorSchema },
      { name: 'ProviderOtpCode', schema: ProviderOtpCodeSchema },
      { name: 'ProviderAuditLog', schema: ProviderAuditLogSchema },
      { name: 'ProviderRequest', schema: ProviderRequestSchema },
      { name: 'ProviderNotification', schema: ProviderNotificationSchema },
      { name: 'ProviderAvailability', schema: ProviderAvailabilitySchema },
      // Phase 1C
      { name: 'PharmacyInventoryItem', schema: PharmacyInventoryItemSchema },
      { name: 'LabTestCatalogItem', schema: LabTestCatalogItemSchema },
      { name: 'RadiologyServiceCatalogItem', schema: RadiologyServiceCatalogItemSchema },
      { name: 'DoctorSessionType', schema: DoctorSessionTypeSchema },
      { name: 'HomeCareServiceCatalogItem', schema: HomeCareServiceCatalogItemSchema },
      { name: 'ProviderDeliveryZone', schema: ProviderDeliveryZoneSchema },
      { name: 'ProviderScheduleSlot', schema: ProviderScheduleSlotSchema },
      { name: 'ProviderAssignmentAttempt', schema: ProviderAssignmentAttemptSchema },
      { name: 'ProviderScoreSnapshot', schema: ProviderScoreSnapshotSchema },
    ]),
    JwtModule.registerAsync({ useFactory: () => {
      const secret = process.env.JWT_SECRET;
      if (!secret) throw new Error('FATAL: JWT_SECRET must be configured');
      if (process.env.NODE_ENV === 'production' && secret.length < 32) {
        throw new Error('FATAL: JWT_SECRET must be at least 32 characters in production');
      }
      return { secret, signOptions: { expiresIn: '14d' } };
    } }),
    StorageModule,
  ],
  controllers: [
    LeaveRequestsController,
    ProviderAuthController,
    ProviderProfileController,
    ProviderOperatorsController,
    ProviderAdminController,
    ProviderRequestsController,
    ProviderWalletController,
    ProviderNotificationsController,
    ProviderScheduleController,
    ProviderDashboardController,
    // Phase 1C
    ProviderCapabilitiesController,
    ProviderZonesController,
    ProviderScheduleSlotsController,
    ProviderScoreController,
    AdminMatchingController,
  ],
  providers: [
    ProviderImageProcessorService,
    ProviderAuthService,
    ProviderProfileService,
    ProviderOperatorsService,
    ProviderAdminService,
    ProviderOtpService,
    ProviderMailerService,
    ProviderRequestEngineService,
    ProviderNotificationsService,
    ProviderScheduleService,
    ProviderDashboardService,
    ProviderSeedService,
    // Phase 1C
    ServiceCapabilityService,
    GeoEngineService,
    SchedulingEngineService,
    ProviderScoringService,
    ProviderMatchingService,
    AssignmentStrategyService,
    { provide: "DoctorSessionTypeRepository", useClass: DoctorSessionTypeRepository },
    { provide: "HomeCareServiceCatalogItemRepository", useClass: HomeCareServiceCatalogItemRepository },
    { provide: "ImageProcessingJobRepository", useClass: ImageProcessingJobRepository },
    { provide: "LabTestCatalogItemRepository", useClass: LabTestCatalogItemRepository },
    { provide: "PharmacyInventoryItemRepository", useClass: PharmacyInventoryItemRepository },
    { provide: "ProfileImageAuditLogRepository", useClass: ProfileImageAuditLogRepository },
    { provide: "ProfileImageMetadataRepository", useClass: ProfileImageMetadataRepository },
    { provide: "ProviderAccountRepository", useClass: ProviderAccountRepository },
    { provide: "ProviderAccountProfileRepository", useClass: ProviderAccountProfileRepository },
    { provide: "ProviderAssignmentAttemptRepository", useClass: ProviderAssignmentAttemptRepository },
    { provide: "ProviderAuditLogRepository", useClass: ProviderAuditLogRepository },
    { provide: "ProviderAvailabilityRepository", useClass: ProviderAvailabilityRepository },
    { provide: "ProviderBankAccountRepository", useClass: ProviderBankAccountRepository },
    { provide: "ProviderDeliveryZoneRepository", useClass: ProviderDeliveryZoneRepository },
    { provide: "ProviderDocumentRepository", useClass: ProviderDocumentRepository },
    { provide: "ProviderNotificationRepository", useClass: ProviderNotificationRepository },
    { provide: "ProviderOperatorRepository", useClass: ProviderOperatorRepository },
    { provide: "ProviderOtpCodeRepository", useClass: ProviderOtpCodeRepository },
    { provide: "ProviderRequestRepository", useClass: ProviderRequestRepository },
    { provide: "ProviderScheduleSlotRepository", useClass: ProviderScheduleSlotRepository },
    { provide: "ProviderScoreSnapshotRepository", useClass: ProviderScoreSnapshotRepository },
    { provide: "RadiologyServiceCatalogItemRepository", useClass: RadiologyServiceCatalogItemRepository },
    { provide: "ProviderSessionRepository", useClass: ProviderSessionRepository }
  ],
  exports: [
    ProviderAuthService, ProviderOtpService, ProviderRequestEngineService, ProviderNotificationsService,
    ProviderMatchingService, AssignmentStrategyService, ServiceCapabilityService, ProviderScoringService,
  ],
})
export class ProviderModule {}
