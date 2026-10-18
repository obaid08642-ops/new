import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { PharmacyModule } from '../pharmacy/pharmacy.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [PharmacyModule, PaymentsModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
