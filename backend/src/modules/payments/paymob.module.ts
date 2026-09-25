// src/modules/payments/paymob.module.ts
import { Module } from '@nestjs/common';
import { PaymobService } from './paymob.service';

@Module({
  controllers: [],
  providers: [PaymobService],
  exports: [PaymobService],
})
export class PaymobModule {}
