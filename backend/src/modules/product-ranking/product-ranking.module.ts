import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ProductRankingMetrics,
  ProductRankingMetricsSchema,
} from '../../schemas/product-ranking-metrics.schema';
import { ProductRankingService } from './product-ranking.service';
import { ProductRankingEventService } from './product-ranking-event.service';
import { ProductRankingController } from './product-ranking.controller';
import { ManualBoost, ManualBoostSchema } from './manual-boost.schema';
import { ManualBoostsService } from './manual-boosts.service';
import { ManualBoostsController } from './manual-boosts.controller';
import { RankingAdminController, RankingScoreJob } from './ranking-admin.controller';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProductRankingMetrics.name, schema: ProductRankingMetricsSchema },
      { name: ManualBoost.name, schema: ManualBoostSchema },
    ]),
  ],
  controllers: [ProductRankingController, ManualBoostsController, RankingAdminController],
  providers: [ProductRankingService, ProductRankingEventService, ManualBoostsService, RankingScoreJob],
  exports: [ProductRankingService, ProductRankingEventService, ManualBoostsService],
})
export class ProductRankingModule {}
