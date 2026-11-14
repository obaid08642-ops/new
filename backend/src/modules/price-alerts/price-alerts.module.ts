import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { PriceAlertsService } from './price-alerts.service';

/** 22.2: hourly price history and price-drop alerts for wishlist holders. */
@Module({
  imports: [NotificationsModule],
  providers: [PriceAlertsService],
  exports: [PriceAlertsService],
})
export class PriceAlertsModule {}
