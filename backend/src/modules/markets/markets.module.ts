import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Market, MarketConfigRow, MarketConfigRowSchema, MarketSchema, Operator, OperatorSchema } from './markets.schema';
import { MarketsService } from './markets.service';

@Module({
  imports: [MongooseModule.forFeature([
    { name: Market.name, schema: MarketSchema },
    { name: Operator.name, schema: OperatorSchema },
    { name: MarketConfigRow.name, schema: MarketConfigRowSchema },
  ])],
  providers: [MarketsService],
  exports: [MarketsService],
})
export class MarketsModule {}
