import { Module, Global } from '@nestjs/common';
import { AbusePreventionService } from './abuse-prevention.service';
import { StockReservationService } from './stock-reservation.service';
import { ReferralFraudService } from './referral-fraud.service';
import { ReviewValidationService } from './review-validation.service';
import { RedisModule } from '../redis/redis.module';

@Global()
@Module({
  imports: [RedisModule],
  providers: [
    AbusePreventionService,
    StockReservationService,
    ReferralFraudService,
    ReviewValidationService,
  ],
  exports: [
    AbusePreventionService,
    StockReservationService,
    ReferralFraudService,
    ReviewValidationService,
  ],
})
export class SecurityModule {}