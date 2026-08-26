import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PharmacyOpsController, ProviderPharmacyAliasController } from './pharmacy_ops.controller';
import { PharmacyOpsService } from './pharmacy_ops.service';
import { Order, OrderSchema } from '../../schemas/order.schema';
import { Medicine, MedicineSchema } from '../../schemas/medicine.schema';
import { PharmacyInventory, PharmacyInventorySchema } from '../../schemas/inventory.schema';
import { OrdersModule } from '../orders/orders.module';
import { PharmacyModule } from '../pharmacy/pharmacy.module';
import { MedicineRepository } from "./repositories/medicine.repository";
import { OrderRepository } from "./repositories/order.repository";
import { PharmacyInventoryRepository } from "./repositories/pharmacyinventory.repository";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Medicine.name, schema: MedicineSchema },
      { name: PharmacyInventory.name, schema: PharmacyInventorySchema },
    ]),
    OrdersModule,
    PharmacyModule,
    // (PharmacyOrdersProviderService arrives via PharmacyModule exports)
  ],
  controllers: [PharmacyOpsController, ProviderPharmacyAliasController],
  providers: [PharmacyOpsService, { provide: 'MedicineRepository', useClass: MedicineRepository }, { provide: 'OrderRepository', useClass: OrderRepository }, { provide: 'PharmacyInventoryRepository', useClass: PharmacyInventoryRepository }],
})
export class PharmacyOpsModule {}
