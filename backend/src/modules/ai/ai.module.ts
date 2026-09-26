import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AiGatewayService } from './ai-gateway.service';
import { AiInteractionsController } from './ai-compat.controller';
@Module({
  controllers: [AiController, AiInteractionsController],
  providers: [AiService, AiGatewayService],
  exports: [AiService, AiGatewayService],
})
export class AiModule {}
