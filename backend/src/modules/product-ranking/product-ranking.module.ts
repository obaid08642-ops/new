import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ProductRankingMetrics,
  ProductRankingMetricsSchema,
} from '../../schemas/product-ranking-metrics.schema';
import { ProductRankingService } from './product-ranking.service';
import { ProductRankingEventService } from './product-ranking-event.service';
import { ProductRankingController } from './product-ranking.controller';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProductRankingMetrics.name, schema: ProductRankingMetricsSchema },
    ]),
  ],
  controllers: [ProductRankingController],
  providers: [ProductRankingService, ProductRankingEventService],
  exports: [ProductRankingService, ProductRankingEventService],
})
export class ProductRankingModule {}
