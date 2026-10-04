import { Module } from '@nestjs/common';
import { AiCommerceController } from './ai-commerce.controller';
import { AiCommerceService } from './ai-commerce.service';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [AiCommerceController],
  providers: [AiCommerceService],
  exports: [AiCommerceService],
})
export class AiCommerceModule {}
