// src/modules/payments/paymob.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymobController } from './paymob.controller';
import { PaymobService } from './paymob.service';
import { PharmacyOrderSchema } from '../pharmacy/schemas/pharmacy.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'PharmacyOrder', schema: PharmacyOrderSchema }])],
  controllers: [PaymobController],
  providers: [PaymobService],
  exports: [PaymobService],
})
export class PaymobModule {}
