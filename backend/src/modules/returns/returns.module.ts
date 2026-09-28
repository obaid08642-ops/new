import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminReturnsController, ReturnsController } from './returns.controller';
import { ReturnsService } from './returns.service';
import { ReturnRequest, ReturnRequestSchema } from '../../schemas/returns.schema';
import { FinanceEngineModule } from '../finance-engine/finance-engine.module';
import { ReturnRequestRepository } from "./repositories/returnrequest.repository";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ReturnRequest.name, schema: ReturnRequestSchema }]),
    FinanceEngineModule,
  ],
  controllers: [ReturnsController, AdminReturnsController],
  providers: [ReturnsService, { provide: 'ReturnRequestRepository', useClass: ReturnRequestRepository }],
  exports: [ReturnsService],
})
export class ReturnsModule {}
