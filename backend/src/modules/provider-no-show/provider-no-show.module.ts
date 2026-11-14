import { Module } from '@nestjs/common';
import { FinanceEngineModule } from '../finance-engine/finance-engine.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminProviderNoShowController, ProviderNoShowController } from './provider-no-show.controller';
import { ProviderNoShowService } from './provider-no-show.service';

@Module({
  imports: [NotificationsModule, FinanceEngineModule],
  controllers: [ProviderNoShowController, AdminProviderNoShowController],
  providers: [ProviderNoShowService],
  exports: [ProviderNoShowService],
})
export class ProviderNoShowModule {}
