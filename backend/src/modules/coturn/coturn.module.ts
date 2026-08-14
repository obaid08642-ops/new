import { Module } from '@nestjs/common';
import { CoturnService } from './coturn.service';
import { CoturnController } from './coturn.controller';

@Module({
  controllers: [CoturnController],
  providers: [CoturnService],
  exports: [CoturnService],
})
export class CoturnModule {}
