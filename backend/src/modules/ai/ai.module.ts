import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AiGatewayService } from './ai-gateway.service';
import { AiInteractionsController } from './ai-compat.controller';
import { AiContentReviewController } from './ai-content-review.controller';
import { AiContentReviewService } from './ai-content-review.service';
import { AiContentReviewItem, AiContentReviewSchema } from '../../schemas/ai-content-review.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: AiContentReviewItem.name, schema: AiContentReviewSchema }]),
  ],
  controllers: [AiController, AiInteractionsController, AiContentReviewController],
  providers: [AiService, AiGatewayService, AiContentReviewService],
  exports: [AiService, AiGatewayService, AiContentReviewService],
})
export class AiModule {}
