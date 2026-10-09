import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SearchIntent, SearchIntentSchema } from './schemas/search-intent.schema';
import { QueryAnalytics, QueryAnalyticsSchema } from './schemas/query-analytics.schema';
import { SearchIntentService } from './search-intent.service';
import { SearchIntentController } from './search-intent.controller';
import { LocationModule } from '../location/location.module';
import { SearchRateLimitGuard } from '../../common/guards/abuse-prevention.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SearchIntent.name, schema: SearchIntentSchema },
      { name: QueryAnalytics.name, schema: QueryAnalyticsSchema },
    ]),
    LocationModule,
  ],
  controllers: [SearchIntentController],
  providers: [SearchIntentService],
  exports: [SearchIntentService, SearchRateLimitGuard],
})
export class SearchIntentModule {}
