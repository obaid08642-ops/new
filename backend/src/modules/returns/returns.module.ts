import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReturnsController } from './returns.controller';
import { ReturnsService } from './returns.service';
import { ReturnRequest, ReturnRequestSchema } from '../../schemas/returns.schema';
import { Order, OrderSchema } from '../../schemas/order.schema';
import { WalletModule } from '../wallet/wallet.module';
import { ReturnRequestRepository } from "./repositories/returnrequest.repository";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ReturnRequest.name, schema: ReturnRequestSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
    WalletModule,
  ],
  controllers: [ReturnsController],
  providers: [ReturnsService, { provide: 'ReturnRequestRepository', useClass: ReturnRequestRepository }],
  exports: [ReturnsService],
})
export class ReturnsModule {}
