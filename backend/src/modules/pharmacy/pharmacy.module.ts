import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiModule } from '../ai/ai.module';
import {
  PharmacyOrderSchema, PharmacyAllocationSchema, PrescriptionIntakeSchema,
  PharmacySubstituteMapSchema, PharmacyLowStockAlertSchema,
  PharmacyBroadcastSchema, PharmacyOfferSchema, PharmacyChatThreadSchema, PharmacyChatMessageSchema,
  PharmacyExpiryAuditSchema, PharmacyLifecycleOutboxSchema, PharmacyExpiryLeaseSchema,
  DrugShortageFlagSchema,
} from './schemas/pharmacy.schema';
import { SystemConfig, SystemConfigSchema } from '../../schemas/system-config.schema';
import { DrugRejectionLog, DrugRejectionLogSchema } from '../../schemas/drug-rejection-log.schema';
import { Medicine, MedicineSchema } from '../../schemas/medicine.schema';
import { PharmacyInventoryItemSchema, ProviderScoreSnapshotSchema } from '../provider/schemas/capabilities.schema';
import { ProviderAccountSchema, ProviderProfileSchema } from '../provider/schemas';
import { ProviderAvailabilitySchema } from '../provider/schemas/requests.schema';
import { ProcurementRequestSchema } from './schemas/procurement-request.schema';
import { QuotationSchema } from './schemas/quotation.schema';
import { ProcurementService } from './services/procurement.service';
import { ProcurementController } from './controllers/procurement.controller';
import { AdminProcurementController } from './controllers/admin-procurement.controller';
import { PharmacyOrderService } from './services/pharmacy-order.service';
import { PharmacyAllocationService } from './services/pharmacy-allocation.service';
import { SmartSplitService } from './services/smart-split.service';
import { PharmacyInventoryExtService } from './services/pharmacy-inventory-ext.service';
import { PharmacySeedService } from './services/pharmacy-seed.service';
import { PharmacyNotificationService } from './services/pharmacy-notification.service';
import { PharmacyBroadcastService } from './services/pharmacy-broadcast.service';
import { PharmacyChatService } from './services/pharmacy-chat.service';
import { PharmacyShortageService } from './services/pharmacy-shortage.service';
import {
  PatientPharmacyController, ProviderPharmacyController,
  ProviderInventoryExtController, AdminPharmacyController,
  ProviderBroadcastController, AdminBroadcastController,
  PharmacyChatController, AdminPharmacyChatController,
  ProviderShortageController, AdminShortageController, PatientShortageController,
} from './pharmacy.controllers';
import { PharmacyOrdersProviderService } from './services/pharmacy-orders-provider.service';
import { PharmacyOfferService } from './services/pharmacy-offer.service';
import { PharmacyExpiryService } from './services/pharmacy-expiry.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { GeoEngineService } from '../provider/services/geo-engine.service';
import { ProviderModule } from '../provider/provider.module';
import { WorkflowEngineModule } from '../workflow-engine/workflow-engine.module';
import { DrugRejectionLogRepository } from "./services/repositories/drugrejectionlog.repository";
import { DrugShortageFlagRepository } from "./services/repositories/drugshortageflag.repository";
import { MedicineRepository } from "./services/repositories/medicine.repository";
import { PharmacyAllocationRepository } from "./services/repositories/pharmacyallocation.repository";
import { PharmacyBroadcastRepository } from "./services/repositories/pharmacybroadcast.repository";
import { PharmacyChatMessageRepository } from "./services/repositories/pharmacychatmessage.repository";
import { PharmacyChatThreadRepository } from "./services/repositories/pharmacychatthread.repository";
import { PharmacyInventoryItemRepository } from "./services/repositories/pharmacyinventoryitem.repository";
import { PharmacyLowStockAlertRepository } from "./services/repositories/pharmacylowstockalert.repository";
import { PharmacyOrderRepository } from "./services/repositories/pharmacyorder.repository";
import { ProcurementRequestRepository } from "./services/repositories/procurementrequest.repository";
import { ProviderAccountRepository } from "./services/repositories/provideraccount.repository";
import { ProviderAccountProfileRepository } from "./services/repositories/provideraccountprofile.repository";
import { ProviderAvailabilityRepository } from "./services/repositories/provideravailability.repository";
import { ProviderScoreSnapshotRepository } from "./services/repositories/providerscoresnapshot.repository";
import { QuotationRepository } from "./services/repositories/quotation.repository";
import { SystemConfigRepository } from "./services/repositories/systemconfig.repository";
import { IdempotencyInterceptor } from '../../common/idempotency.interceptor';

@Module({
  imports: [
    NotificationsModule,
    ProviderModule,
    WorkflowEngineModule,
    AiModule,
    MongooseModule.forFeature([
      { name: 'PharmacyOrder', schema: PharmacyOrderSchema },
      { name: 'PharmacyAllocation', schema: PharmacyAllocationSchema },
      { name: 'PrescriptionIntake', schema: PrescriptionIntakeSchema },
      { name: 'PharmacySubstituteMap', schema: PharmacySubstituteMapSchema },
      { name: 'PharmacyLowStockAlert', schema: PharmacyLowStockAlertSchema },
      { name: 'PharmacyBroadcast', schema: PharmacyBroadcastSchema },
      { name: 'PharmacyOffer', schema: PharmacyOfferSchema },
      { name: 'PharmacyExpiryAudit', schema: PharmacyExpiryAuditSchema },
      { name: 'PharmacyLifecycleOutbox', schema: PharmacyLifecycleOutboxSchema },
      { name: 'PharmacyExpiryLease', schema: PharmacyExpiryLeaseSchema },
      { name: 'PharmacyChatThread', schema: PharmacyChatThreadSchema },
      { name: 'PharmacyChatMessage', schema: PharmacyChatMessageSchema },
      { name: 'DrugShortageFlag', schema: DrugShortageFlagSchema },
      { name: SystemConfig.name, schema: SystemConfigSchema },
      { name: DrugRejectionLog.name, schema: DrugRejectionLogSchema },
      { name: Medicine.name, schema: MedicineSchema },
      // Re-register existing models needed by smart-split + broadcast engines:
      { name: 'PharmacyInventoryItem', schema: PharmacyInventoryItemSchema },
      { name: 'ProviderScoreSnapshot', schema: ProviderScoreSnapshotSchema },
      { name: 'ProviderAccount', schema: ProviderAccountSchema },
      { name: 'ProviderAccountProfile', schema: ProviderProfileSchema },
      { name: 'ProviderAvailability', schema: ProviderAvailabilitySchema },
      { name: 'ProcurementRequest', schema: ProcurementRequestSchema },
      { name: 'Quotation', schema: QuotationSchema },
    ]),
  ],
  providers: [
    PharmacyOrderService,
    PharmacyAllocationService,
    SmartSplitService,
    PharmacyInventoryExtService,
    PharmacySeedService,
    PharmacyNotificationService,
    PharmacyBroadcastService,
    PharmacyChatService,
    PharmacyShortageService,
    PharmacyOrdersProviderService,
    PharmacyOfferService,
    PharmacyExpiryService,
    IdempotencyInterceptor,
    ProcurementService,
    GeoEngineService,
    { provide: "DrugRejectionLogRepository", useClass: DrugRejectionLogRepository },
    { provide: "DrugShortageFlagRepository", useClass: DrugShortageFlagRepository },
    { provide: "MedicineRepository", useClass: MedicineRepository },
    { provide: "PharmacyAllocationRepository", useClass: PharmacyAllocationRepository },
    { provide: "PharmacyBroadcastRepository", useClass: PharmacyBroadcastRepository },
    { provide: "PharmacyChatMessageRepository", useClass: PharmacyChatMessageRepository },
    { provide: "PharmacyChatThreadRepository", useClass: PharmacyChatThreadRepository },
    { provide: "PharmacyInventoryItemRepository", useClass: PharmacyInventoryItemRepository },
    { provide: "PharmacyLowStockAlertRepository", useClass: PharmacyLowStockAlertRepository },
    { provide: "PharmacyOrderRepository", useClass: PharmacyOrderRepository },
    { provide: "ProcurementRequestRepository", useClass: ProcurementRequestRepository },
    { provide: "ProviderAccountRepository", useClass: ProviderAccountRepository },
    { provide: "ProviderAccountProfileRepository", useClass: ProviderAccountProfileRepository },
    { provide: "ProviderAvailabilityRepository", useClass: ProviderAvailabilityRepository },
    { provide: "ProviderScoreSnapshotRepository", useClass: ProviderScoreSnapshotRepository },
    { provide: "QuotationRepository", useClass: QuotationRepository },
    { provide: "SystemConfigRepository", useClass: SystemConfigRepository }
  ],
  controllers: [
    PatientPharmacyController,
    ProviderPharmacyController,
    ProviderInventoryExtController,
    AdminPharmacyController,
    ProviderBroadcastController,
    AdminBroadcastController,
    PharmacyChatController,
    AdminPharmacyChatController,
    ProviderShortageController,
    AdminShortageController,
    PatientShortageController,
    ProcurementController,
    AdminProcurementController,
  ],
  exports: [PharmacyOrderService, PharmacyAllocationService, PharmacyOrdersProviderService],
})
export class PharmacyModule {}
