import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { CatalogueInterestService } from './catalogue-interest.service';
import { AdminCatalogueInterestController, CatalogueInterestController } from './catalogue-interest.controller';

/** Notify-me interests on catalogue services nobody offers yet (owner, 2026-10-28). */
@Module({
  imports: [NotificationsModule],
  controllers: [CatalogueInterestController, AdminCatalogueInterestController],
  providers: [CatalogueInterestService],
  exports: [CatalogueInterestService],
})
export class CatalogueInterestModule {}
