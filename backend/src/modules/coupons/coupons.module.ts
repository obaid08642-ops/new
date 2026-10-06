import { Module } from '@nestjs/common';
import { FinanceEngineModule } from '../finance-engine/finance-engine.module';
import { CouponRulesService } from './coupon-rules.service';
import { CouponRulesController } from './coupon-rules.controller';

/**
 * P22.15 — coupon stacking rules engine.
 * NOTE (orchestrator): register CouponsModule in app.module.ts imports.
 */
@Module({
  imports: [FinanceEngineModule],
  controllers: [CouponRulesController],
  providers: [CouponRulesService],
  exports: [CouponRulesService],
})
export class CouponsModule {}
