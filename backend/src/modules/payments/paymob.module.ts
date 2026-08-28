// src/modules/payments/paymob.module.ts
import { Module } from '@nestjs/common';
import { PaymobController } from './paymob.controller';
import { PaymobService } from './paymob.service';

@Module({
  controllers: [PaymobController],
  providers: [PaymobService],
  exports: [PaymobService],
})
export class PaymobModule {}
