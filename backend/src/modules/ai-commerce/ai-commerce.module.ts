import { Module } from '@nestjs/common';
import { AiCommerceController } from './ai-commerce.controller';
import { AiCommerceService } from './ai-commerce.service';

@Module({
  controllers: [AiCommerceController],
  providers: [AiCommerceService],
  exports: [AiCommerceService],
})
export class AiCommerceModule {}
