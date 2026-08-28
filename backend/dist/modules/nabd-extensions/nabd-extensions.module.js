"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NabdExtensionsModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const nabd_extensions_service_1 = require("./nabd-extensions.service");
const nabd_extensions_controller_1 = require("./nabd-extensions.controller");
const notifications_module_1 = require("../notifications/notifications.module");
const universal_activity_schema_1 = require("../../schemas/universal-activity.schema");
const wallet_schema_1 = require("../../schemas/wallet.schema");
const referral_schema_1 = require("../../schemas/referral.schema");
const feature_flag_schema_1 = require("../../schemas/feature-flag.schema");
const treatment_program_schema_1 = require("../../schemas/treatment-program.schema");
const sla_log_schema_1 = require("../../schemas/sla-log.schema");
const fraud_alert_schema_1 = require("../../schemas/fraud-alert.schema");
const ad_placement_schema_1 = require("../../schemas/ad-placement.schema");
const corporate_account_schema_1 = require("../../schemas/corporate-account.schema");
const appointment_schema_1 = require("../../schemas/appointment.schema");
const prescription_schema_1 = require("../../schemas/prescription.schema");
const lab_result_schema_1 = require("../../schemas/lab-result.schema");
const health_schema_1 = require("../../schemas/health.schema");
const order_schema_1 = require("../../schemas/order.schema");
const provider_profile_schema_1 = require("../../schemas/provider-profile.schema");
const user_schema_1 = require("../../schemas/user.schema");
const adplacement_repository_1 = require("./repositories/adplacement.repository");
const appointment_repository_1 = require("./repositories/appointment.repository");
const corporateaccount_repository_1 = require("./repositories/corporateaccount.repository");
const featureflag_repository_1 = require("./repositories/featureflag.repository");
const fraudalert_repository_1 = require("./repositories/fraudalert.repository");
const labresult_repository_1 = require("./repositories/labresult.repository");
const order_repository_1 = require("./repositories/order.repository");
const prescription_repository_1 = require("./repositories/prescription.repository");
const providerprofile_repository_1 = require("./repositories/providerprofile.repository");
const referralcode_repository_1 = require("./repositories/referralcode.repository");
const referralreward_repository_1 = require("./repositories/referralreward.repository");
const slalog_repository_1 = require("./repositories/slalog.repository");
const treatmentprogram_repository_1 = require("./repositories/treatmentprogram.repository");
const universalactivity_repository_1 = require("./repositories/universalactivity.repository");
const user_repository_1 = require("./repositories/user.repository");
const vitalreading_repository_1 = require("./repositories/vitalreading.repository");
const wallet_repository_1 = require("./repositories/wallet.repository");
const wallettransaction_repository_1 = require("./repositories/wallettransaction.repository");
let NabdExtensionsModule = class NabdExtensionsModule {
};
exports.NabdExtensionsModule = NabdExtensionsModule;
exports.NabdExtensionsModule = NabdExtensionsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            notifications_module_1.NotificationsModule,
            mongoose_1.MongooseModule.forFeature([
                { name: universal_activity_schema_1.UniversalActivity.name, schema: universal_activity_schema_1.UniversalActivitySchema },
                { name: wallet_schema_1.Wallet.name, schema: wallet_schema_1.WalletSchema },
                { name: wallet_schema_1.WalletTransaction.name, schema: wallet_schema_1.WalletTransactionSchema },
                { name: referral_schema_1.ReferralCode.name, schema: referral_schema_1.ReferralCodeSchema },
                { name: referral_schema_1.ReferralReward.name, schema: referral_schema_1.ReferralRewardSchema },
                { name: feature_flag_schema_1.FeatureFlag.name, schema: feature_flag_schema_1.FeatureFlagSchema },
                { name: treatment_program_schema_1.TreatmentProgram.name, schema: treatment_program_schema_1.TreatmentProgramSchema },
                { name: sla_log_schema_1.SlaLog.name, schema: sla_log_schema_1.SlaLogSchema },
                { name: fraud_alert_schema_1.FraudAlert.name, schema: fraud_alert_schema_1.FraudAlertSchema },
                { name: ad_placement_schema_1.AdPlacement.name, schema: ad_placement_schema_1.AdPlacementSchema },
                { name: corporate_account_schema_1.CorporateAccount.name, schema: corporate_account_schema_1.CorporateAccountSchema },
                { name: appointment_schema_1.Appointment.name, schema: appointment_schema_1.AppointmentSchema },
                { name: prescription_schema_1.Prescription.name, schema: prescription_schema_1.PrescriptionSchema },
                { name: lab_result_schema_1.LabResult.name, schema: lab_result_schema_1.LabResultSchema },
                { name: health_schema_1.VitalReading.name, schema: health_schema_1.VitalReadingSchema },
                { name: order_schema_1.Order.name, schema: order_schema_1.OrderSchema },
                { name: provider_profile_schema_1.ProviderProfile.name, schema: provider_profile_schema_1.ProviderProfileSchema },
                { name: user_schema_1.User.name, schema: user_schema_1.UserSchema },
            ]),
        ],
        controllers: [nabd_extensions_controller_1.NabdExtensionsController],
        providers: [nabd_extensions_service_1.NabdExtensionsService, { provide: 'AdPlacementRepository', useClass: adplacement_repository_1.AdPlacementRepository }, { provide: 'AppointmentRepository', useClass: appointment_repository_1.AppointmentRepository }, { provide: 'CorporateAccountRepository', useClass: corporateaccount_repository_1.CorporateAccountRepository }, { provide: 'FeatureFlagRepository', useClass: featureflag_repository_1.FeatureFlagRepository }, { provide: 'FraudAlertRepository', useClass: fraudalert_repository_1.FraudAlertRepository }, { provide: 'LabResultRepository', useClass: labresult_repository_1.LabResultRepository }, { provide: 'OrderRepository', useClass: order_repository_1.OrderRepository }, { provide: 'PrescriptionRepository', useClass: prescription_repository_1.PrescriptionRepository }, { provide: 'ProviderProfileRepository', useClass: providerprofile_repository_1.ProviderProfileRepository }, { provide: 'ReferralCodeRepository', useClass: referralcode_repository_1.ReferralCodeRepository }, { provide: 'ReferralRewardRepository', useClass: referralreward_repository_1.ReferralRewardRepository }, { provide: 'SlaLogRepository', useClass: slalog_repository_1.SlaLogRepository }, { provide: 'TreatmentProgramRepository', useClass: treatmentprogram_repository_1.TreatmentProgramRepository }, { provide: 'UniversalActivityRepository', useClass: universalactivity_repository_1.UniversalActivityRepository }, { provide: 'UserRepository', useClass: user_repository_1.UserRepository }, { provide: 'VitalReadingRepository', useClass: vitalreading_repository_1.VitalReadingRepository }, { provide: 'WalletRepository', useClass: wallet_repository_1.WalletRepository }, { provide: 'WalletTransactionRepository', useClass: wallettransaction_repository_1.WalletTransactionRepository }],
        exports: [nabd_extensions_service_1.NabdExtensionsService],
    })
], NabdExtensionsModule);
//# sourceMappingURL=nabd-extensions.module.js.map