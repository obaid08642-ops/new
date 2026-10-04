import { Module } from '@nestjs/common';
import { ReferralController } from './referral.controller';
import { ReferralService } from './referral.service';
import { ReferralFraudService } from '../security/referral-fraud.service';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [SecurityModule],
  controllers: [ReferralController],
  providers: [ReferralService, ReferralFraudService],
  exports: [ReferralService, ReferralFraudService],
})
export class ReferralModule {}
