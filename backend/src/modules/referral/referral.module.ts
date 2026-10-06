import { Module } from '@nestjs/common';
import { ReferralController } from './referral.controller';
import { ReferralService } from './referral.service';
import { AffiliateService } from './affiliate.service';

@Module({
  controllers: [ReferralController],
  providers: [ReferralService, AffiliateService],
  exports: [ReferralService, AffiliateService],
})
export class ReferralModule {}
