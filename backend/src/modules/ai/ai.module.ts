import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AiGatewayService } from './ai-gateway.service';
@Module({
  controllers: [AiController],
  providers: [AiService, AiGatewayService],
  exports: [AiService, AiGatewayService],
})
export class AiModule {}
