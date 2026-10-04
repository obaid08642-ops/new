import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ProductRankingMetrics,
  ProductRankingMetricsSchema,
} from '../../schemas/product-ranking-metrics.schema';
import { ProductRankingService } from './product-ranking.service';
import { ProductRankingEventService } from './product-ranking-event.service';
import { ProductRankingController } from './product-ranking.controller';
import { ProductRankingR9Service } from './product-ranking-r9.service';
import { ProductRankingR9Controller } from './product-ranking-r9.controller';
import { ManualBoost, ManualBoostSchema } from './manual-boost.schema';
import { ManualBoostsService } from './manual-boosts.service';
import { ManualBoostsController } from './manual-boosts.controller';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProductRankingMetrics.name, schema: ProductRankingMetricsSchema },
      { name: ManualBoost.name, schema: ManualBoostSchema },
    ]),
  ],
  controllers: [ProductRankingController, ProductRankingR9Controller, ManualBoostsController],
  providers: [ProductRankingService, ProductRankingEventService, ProductRankingR9Service, ManualBoostsService],
  exports: [ProductRankingService, ProductRankingEventService, ProductRankingR9Service, ManualBoostsService],
})
export class ProductRankingModule {}
