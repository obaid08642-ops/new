// @ts-nocheck
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DriversController } from './drivers.controller';
import { DriversService } from './drivers.service';
import { User, UserSchema } from '../../schemas/user.schema';
import { DriverShift, DriverShiftSchema } from '../../schemas/driver-shift.schema';
import { Order, OrderSchema } from '../../schemas/order.schema';
import { Delivery, DeliverySchema } from '../../schemas/delivery.schema';
import { RealtimeModule } from '../realtime/realtime.module';
import { DeliveryRepository } from "./repositories/delivery.repository";
import { DriverShiftRepository } from "./repositories/drivershift.repository";
import { OrderRepository } from "./repositories/order.repository";
import { UserRepository } from "./repositories/user.repository";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: DriverShift.name, schema: DriverShiftSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Delivery.name, schema: DeliverySchema },
    ]),
    RealtimeModule,
  ],
  controllers: [DriversController],
  providers: [DriversService, { provide: 'DeliveryRepository', useClass: DeliveryRepository }, { provide: 'DriverShiftRepository', useClass: DriverShiftRepository }, { provide: 'OrderRepository', useClass: OrderRepository }, { provide: 'UserRepository', useClass: UserRepository }],
  exports: [DriversService],
})
export class DriversModule {}
