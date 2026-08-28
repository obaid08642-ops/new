"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PharmacyModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const ai_module_1 = require("../ai/ai.module");
const pharmacy_schema_1 = require("./schemas/pharmacy.schema");
const system_config_schema_1 = require("../../schemas/system-config.schema");
const drug_rejection_log_schema_1 = require("../../schemas/drug-rejection-log.schema");
const medicine_schema_1 = require("../../schemas/medicine.schema");
const capabilities_schema_1 = require("../provider/schemas/capabilities.schema");
const schemas_1 = require("../provider/schemas");
const requests_schema_1 = require("../provider/schemas/requests.schema");
const procurement_request_schema_1 = require("./schemas/procurement-request.schema");
const quotation_schema_1 = require("./schemas/quotation.schema");
const procurement_service_1 = require("./services/procurement.service");
const procurement_controller_1 = require("./controllers/procurement.controller");
const admin_procurement_controller_1 = require("./controllers/admin-procurement.controller");
const pharmacy_order_service_1 = require("./services/pharmacy-order.service");
const pharmacy_allocation_service_1 = require("./services/pharmacy-allocation.service");
const smart_split_service_1 = require("./services/smart-split.service");
const pharmacy_inventory_ext_service_1 = require("./services/pharmacy-inventory-ext.service");
const pharmacy_seed_service_1 = require("./services/pharmacy-seed.service");
const pharmacy_notification_service_1 = require("./services/pharmacy-notification.service");
const pharmacy_broadcast_service_1 = require("./services/pharmacy-broadcast.service");
const pharmacy_chat_service_1 = require("./services/pharmacy-chat.service");
const pharmacy_shortage_service_1 = require("./services/pharmacy-shortage.service");
const pharmacy_controllers_1 = require("./pharmacy.controllers");
const pharmacy_orders_provider_service_1 = require("./services/pharmacy-orders-provider.service");
const pharmacy_offer_service_1 = require("./services/pharmacy-offer.service");
const pharmacy_insurance_decision_service_1 = require("./services/pharmacy-insurance-decision.service");
const pharmacy_expiry_command_service_1 = require("./services/pharmacy-expiry-command.service");
const pharmacy_payment_evidence_service_1 = require("./services/pharmacy-payment-evidence.service");
const notifications_module_1 = require("../notifications/notifications.module");
const geo_engine_service_1 = require("../provider/services/geo-engine.service");
const provider_module_1 = require("../provider/provider.module");
const workflow_engine_module_1 = require("../workflow-engine/workflow-engine.module");
const realtime_module_1 = require("../realtime/realtime.module");
const drugrejectionlog_repository_1 = require("./services/repositories/drugrejectionlog.repository");
const drugshortageflag_repository_1 = require("./services/repositories/drugshortageflag.repository");
const medicine_repository_1 = require("./services/repositories/medicine.repository");
const pharmacyallocation_repository_1 = require("./services/repositories/pharmacyallocation.repository");
const pharmacybroadcast_repository_1 = require("./services/repositories/pharmacybroadcast.repository");
const pharmacychatmessage_repository_1 = require("./services/repositories/pharmacychatmessage.repository");
const pharmacychatthread_repository_1 = require("./services/repositories/pharmacychatthread.repository");
const pharmacyinventoryitem_repository_1 = require("./services/repositories/pharmacyinventoryitem.repository");
const pharmacylowstockalert_repository_1 = require("./services/repositories/pharmacylowstockalert.repository");
const pharmacyorder_repository_1 = require("./services/repositories/pharmacyorder.repository");
const procurementrequest_repository_1 = require("./services/repositories/procurementrequest.repository");
const provideraccount_repository_1 = require("./services/repositories/provideraccount.repository");
const provideraccountprofile_repository_1 = require("./services/repositories/provideraccountprofile.repository");
const provideravailability_repository_1 = require("./services/repositories/provideravailability.repository");
const providerscoresnapshot_repository_1 = require("./services/repositories/providerscoresnapshot.repository");
const quotation_repository_1 = require("./services/repositories/quotation.repository");
const systemconfig_repository_1 = require("./services/repositories/systemconfig.repository");
let PharmacyModule = class PharmacyModule {
};
exports.PharmacyModule = PharmacyModule;
exports.PharmacyModule = PharmacyModule = __decorate([
    (0, common_1.Module)({
        imports: [
            notifications_module_1.NotificationsModule,
            provider_module_1.ProviderModule,
            workflow_engine_module_1.WorkflowEngineModule,
            realtime_module_1.RealtimeModule,
            ai_module_1.AiModule,
            mongoose_1.MongooseModule.forFeature([
                { name: 'PharmacyOrder', schema: pharmacy_schema_1.PharmacyOrderSchema },
                { name: 'PharmacyAllocation', schema: pharmacy_schema_1.PharmacyAllocationSchema },
                { name: 'PrescriptionIntake', schema: pharmacy_schema_1.PrescriptionIntakeSchema },
                { name: 'PharmacySubstituteMap', schema: pharmacy_schema_1.PharmacySubstituteMapSchema },
                { name: 'PharmacyLowStockAlert', schema: pharmacy_schema_1.PharmacyLowStockAlertSchema },
                { name: 'PharmacyBroadcast', schema: pharmacy_schema_1.PharmacyBroadcastSchema },
                { name: 'PharmacyOffer', schema: pharmacy_schema_1.PharmacyOfferSchema },
                { name: 'PharmacyChatThread', schema: pharmacy_schema_1.PharmacyChatThreadSchema },
                { name: 'PharmacyChatMessage', schema: pharmacy_schema_1.PharmacyChatMessageSchema },
                { name: 'DrugShortageFlag', schema: pharmacy_schema_1.DrugShortageFlagSchema },
                { name: system_config_schema_1.SystemConfig.name, schema: system_config_schema_1.SystemConfigSchema },
                { name: drug_rejection_log_schema_1.DrugRejectionLog.name, schema: drug_rejection_log_schema_1.DrugRejectionLogSchema },
                { name: medicine_schema_1.Medicine.name, schema: medicine_schema_1.MedicineSchema },
                { name: 'PharmacyInventoryItem', schema: capabilities_schema_1.PharmacyInventoryItemSchema },
                { name: 'ProviderScoreSnapshot', schema: capabilities_schema_1.ProviderScoreSnapshotSchema },
                { name: 'ProviderAccount', schema: schemas_1.ProviderAccountSchema },
                { name: 'ProviderAccountProfile', schema: schemas_1.ProviderProfileSchema },
                { name: 'ProviderAvailability', schema: requests_schema_1.ProviderAvailabilitySchema },
                { name: 'ProcurementRequest', schema: procurement_request_schema_1.ProcurementRequestSchema },
                { name: 'Quotation', schema: quotation_schema_1.QuotationSchema },
            ]),
        ],
        providers: [
            pharmacy_order_service_1.PharmacyOrderService,
            pharmacy_allocation_service_1.PharmacyAllocationService,
            smart_split_service_1.SmartSplitService,
            pharmacy_inventory_ext_service_1.PharmacyInventoryExtService,
            pharmacy_seed_service_1.PharmacySeedService,
            pharmacy_notification_service_1.PharmacyNotificationService,
            pharmacy_broadcast_service_1.PharmacyBroadcastService,
            pharmacy_chat_service_1.PharmacyChatService,
            pharmacy_shortage_service_1.PharmacyShortageService,
            pharmacy_orders_provider_service_1.PharmacyOrdersProviderService,
            pharmacy_offer_service_1.PharmacyOfferService,
            pharmacy_insurance_decision_service_1.PharmacyInsuranceDecisionService,
            pharmacy_expiry_command_service_1.PharmacyExpiryCommandService,
            pharmacy_payment_evidence_service_1.PharmacyPaymentEvidenceService,
            procurement_service_1.ProcurementService,
            geo_engine_service_1.GeoEngineService,
            { provide: "DrugRejectionLogRepository", useClass: drugrejectionlog_repository_1.DrugRejectionLogRepository },
            { provide: "DrugShortageFlagRepository", useClass: drugshortageflag_repository_1.DrugShortageFlagRepository },
            { provide: "MedicineRepository", useClass: medicine_repository_1.MedicineRepository },
            { provide: "PharmacyAllocationRepository", useClass: pharmacyallocation_repository_1.PharmacyAllocationRepository },
            { provide: "PharmacyBroadcastRepository", useClass: pharmacybroadcast_repository_1.PharmacyBroadcastRepository },
            { provide: "PharmacyChatMessageRepository", useClass: pharmacychatmessage_repository_1.PharmacyChatMessageRepository },
            { provide: "PharmacyChatThreadRepository", useClass: pharmacychatthread_repository_1.PharmacyChatThreadRepository },
            { provide: "PharmacyInventoryItemRepository", useClass: pharmacyinventoryitem_repository_1.PharmacyInventoryItemRepository },
            { provide: "PharmacyLowStockAlertRepository", useClass: pharmacylowstockalert_repository_1.PharmacyLowStockAlertRepository },
            { provide: "PharmacyOrderRepository", useClass: pharmacyorder_repository_1.PharmacyOrderRepository },
            { provide: "ProcurementRequestRepository", useClass: procurementrequest_repository_1.ProcurementRequestRepository },
            { provide: "ProviderAccountRepository", useClass: provideraccount_repository_1.ProviderAccountRepository },
            { provide: "ProviderAccountProfileRepository", useClass: provideraccountprofile_repository_1.ProviderAccountProfileRepository },
            { provide: "ProviderAvailabilityRepository", useClass: provideravailability_repository_1.ProviderAvailabilityRepository },
            { provide: "ProviderScoreSnapshotRepository", useClass: providerscoresnapshot_repository_1.ProviderScoreSnapshotRepository },
            { provide: "QuotationRepository", useClass: quotation_repository_1.QuotationRepository },
            { provide: "SystemConfigRepository", useClass: systemconfig_repository_1.SystemConfigRepository }
        ],
        controllers: [
            pharmacy_controllers_1.PatientPharmacyController,
            pharmacy_controllers_1.ProviderPharmacyController,
            pharmacy_controllers_1.ProviderInventoryExtController,
            pharmacy_controllers_1.AdminPharmacyController,
            pharmacy_controllers_1.ProviderBroadcastController, pharmacy_controllers_1.AdminBroadcastController, pharmacy_controllers_1.AdminPharmacyInsuranceController,
            pharmacy_controllers_1.PharmacyChatController, pharmacy_controllers_1.AdminPharmacyChatController,
            pharmacy_controllers_1.ProviderShortageController,
            pharmacy_controllers_1.AdminShortageController,
            pharmacy_controllers_1.PatientShortageController,
            procurement_controller_1.ProcurementController,
            admin_procurement_controller_1.AdminProcurementController,
        ],
        exports: [pharmacy_order_service_1.PharmacyOrderService, pharmacy_allocation_service_1.PharmacyAllocationService, pharmacy_orders_provider_service_1.PharmacyOrdersProviderService, pharmacy_payment_evidence_service_1.PharmacyPaymentEvidenceService],
    })
], PharmacyModule);
//# sourceMappingURL=pharmacy.module.js.map