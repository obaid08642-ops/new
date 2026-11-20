import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Market, MarketConfigRow, MarketConfigRowSchema, MarketSchema, Operator, OperatorSchema } from './markets.schema';
import { MarketsService } from './markets.service';
import { MarketContextMiddleware } from './market-context.middleware';

@Module({
  imports: [MongooseModule.forFeature([
    { name: Market.name, schema: MarketSchema },
    { name: Operator.name, schema: OperatorSchema },
    { name: MarketConfigRow.name, schema: MarketConfigRowSchema },
  ])],
  providers: [MarketsService, MarketContextMiddleware],
  exports: [MarketsService],
})
export class MarketsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MarketContextMiddleware).forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
