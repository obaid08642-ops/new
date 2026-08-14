import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { DispatchService } from './dispatch.service';
import { Order, OrderSchema, PharmacyBid, PharmacyBidSchema } from '../../schemas/order.schema';
import { Medicine, MedicineSchema } from '../../schemas/medicine.schema';
import { Delivery, DeliverySchema } from '../../schemas/delivery.schema';
import { ProviderProfile, ProviderProfileSchema } from '../../schemas/provider-profile.schema';
import { PharmacyInventory, PharmacyInventorySchema } from '../../schemas/inventory.schema';
import { WorkflowEngineModule } from '../workflow-engine/workflow-engine.module';
import { DeliveryRepository } from "./repositories/delivery.repository";
import { MedicineRepository } from "./repositories/medicine.repository";
import { OrderRepository } from "./repositories/order.repository";
import { PharmacyBidRepository } from "./repositories/pharmacybid.repository";
import { PharmacyInventoryRepository } from "./repositories/pharmacyinventory.repository";
import { ProviderProfileRepository } from "./repositories/providerprofile.repository";

@Module({
  imports: [
    WorkflowEngineModule,
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Medicine.name, schema: MedicineSchema },
      { name: Delivery.name, schema: DeliverySchema },
      { name: ProviderProfile.name, schema: ProviderProfileSchema },
      { name: PharmacyInventory.name, schema: PharmacyInventorySchema },
      { name: PharmacyBid.name, schema: PharmacyBidSchema },
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, DispatchService, { provide: 'DeliveryRepository', useClass: DeliveryRepository }, { provide: 'MedicineRepository', useClass: MedicineRepository }, { provide: 'OrderRepository', useClass: OrderRepository }, { provide: 'PharmacyBidRepository', useClass: PharmacyBidRepository }, { provide: 'PharmacyInventoryRepository', useClass: PharmacyInventoryRepository }, { provide: 'ProviderProfileRepository', useClass: ProviderProfileRepository }],
  exports: [OrdersService, DispatchService],
})
export class OrdersModule {}
