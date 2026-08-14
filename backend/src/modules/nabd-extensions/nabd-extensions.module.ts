// @ts-nocheck
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NabdExtensionsService } from './nabd-extensions.service';
import { NabdExtensionsController } from './nabd-extensions.controller';
import { NotificationsModule } from '../notifications/notifications.module';

// New schemas
import { UniversalActivity, UniversalActivitySchema } from '../../schemas/universal-activity.schema';
import { Wallet, WalletSchema, WalletTransaction, WalletTransactionSchema } from '../../schemas/wallet.schema';
import { ReferralCode, ReferralCodeSchema, ReferralReward, ReferralRewardSchema } from '../../schemas/referral.schema';
import { FeatureFlag, FeatureFlagSchema } from '../../schemas/feature-flag.schema';
import { TreatmentProgram, TreatmentProgramSchema } from '../../schemas/treatment-program.schema';
import { SlaLog, SlaLogSchema } from '../../schemas/sla-log.schema';
import { FraudAlert, FraudAlertSchema } from '../../schemas/fraud-alert.schema';
import { AdPlacement, AdPlacementSchema } from '../../schemas/ad-placement.schema';
import { CorporateAccount, CorporateAccountSchema } from '../../schemas/corporate-account.schema';

// Existing schemas
import { Appointment, AppointmentSchema } from '../../schemas/appointment.schema';
import { Prescription, PrescriptionSchema } from '../../schemas/prescription.schema';
import { LabResult, LabResultSchema } from '../../schemas/lab-result.schema';
import { VitalReading, VitalReadingSchema } from '../../schemas/health.schema';
import { Order, OrderSchema } from '../../schemas/order.schema';
import { ProviderProfile, ProviderProfileSchema } from '../../schemas/provider-profile.schema';
import { User, UserSchema } from '../../schemas/user.schema';
import { AdPlacementRepository } from "./repositories/adplacement.repository";
import { AppointmentRepository } from "./repositories/appointment.repository";
import { CorporateAccountRepository } from "./repositories/corporateaccount.repository";
import { FeatureFlagRepository } from "./repositories/featureflag.repository";
import { FraudAlertRepository } from "./repositories/fraudalert.repository";
import { LabResultRepository } from "./repositories/labresult.repository";
import { OrderRepository } from "./repositories/order.repository";
import { PrescriptionRepository } from "./repositories/prescription.repository";
import { ProviderProfileRepository } from "./repositories/providerprofile.repository";
import { ReferralCodeRepository } from "./repositories/referralcode.repository";
import { ReferralRewardRepository } from "./repositories/referralreward.repository";
import { SlaLogRepository } from "./repositories/slalog.repository";
import { TreatmentProgramRepository } from "./repositories/treatmentprogram.repository";
import { UniversalActivityRepository } from "./repositories/universalactivity.repository";
import { UserRepository } from "./repositories/user.repository";
import { VitalReadingRepository } from "./repositories/vitalreading.repository";
import { WalletRepository } from "./repositories/wallet.repository";
import { WalletTransactionRepository } from "./repositories/wallettransaction.repository";

@Module({
  imports: [
    NotificationsModule,
    MongooseModule.forFeature([
      { name: UniversalActivity.name, schema: UniversalActivitySchema },
      { name: Wallet.name, schema: WalletSchema },
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
      { name: ReferralCode.name, schema: ReferralCodeSchema },
      { name: ReferralReward.name, schema: ReferralRewardSchema },
      { name: FeatureFlag.name, schema: FeatureFlagSchema },
      { name: TreatmentProgram.name, schema: TreatmentProgramSchema },
      { name: SlaLog.name, schema: SlaLogSchema },
      { name: FraudAlert.name, schema: FraudAlertSchema },
      { name: AdPlacement.name, schema: AdPlacementSchema },
      { name: CorporateAccount.name, schema: CorporateAccountSchema },

      { name: Appointment.name, schema: AppointmentSchema },
      { name: Prescription.name, schema: PrescriptionSchema },
      { name: LabResult.name, schema: LabResultSchema },
      { name: VitalReading.name, schema: VitalReadingSchema },
      { name: Order.name, schema: OrderSchema },
      { name: ProviderProfile.name, schema: ProviderProfileSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [NabdExtensionsController],
  providers: [NabdExtensionsService, { provide: 'AdPlacementRepository', useClass: AdPlacementRepository }, { provide: 'AppointmentRepository', useClass: AppointmentRepository }, { provide: 'CorporateAccountRepository', useClass: CorporateAccountRepository }, { provide: 'FeatureFlagRepository', useClass: FeatureFlagRepository }, { provide: 'FraudAlertRepository', useClass: FraudAlertRepository }, { provide: 'LabResultRepository', useClass: LabResultRepository }, { provide: 'OrderRepository', useClass: OrderRepository }, { provide: 'PrescriptionRepository', useClass: PrescriptionRepository }, { provide: 'ProviderProfileRepository', useClass: ProviderProfileRepository }, { provide: 'ReferralCodeRepository', useClass: ReferralCodeRepository }, { provide: 'ReferralRewardRepository', useClass: ReferralRewardRepository }, { provide: 'SlaLogRepository', useClass: SlaLogRepository }, { provide: 'TreatmentProgramRepository', useClass: TreatmentProgramRepository }, { provide: 'UniversalActivityRepository', useClass: UniversalActivityRepository }, { provide: 'UserRepository', useClass: UserRepository }, { provide: 'VitalReadingRepository', useClass: VitalReadingRepository }, { provide: 'WalletRepository', useClass: WalletRepository }, { provide: 'WalletTransactionRepository', useClass: WalletTransactionRepository }],
  exports: [NabdExtensionsService],
})
export class NabdExtensionsModule {}
