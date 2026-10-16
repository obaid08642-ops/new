import { Module } from '@nestjs/common';
import { RumAdminController, RumController } from './rum.controller';
import { RumService } from './rum.service';

/** P14.23 real-user monitoring (web-vitals per page type). */
@Module({
  controllers: [RumController, RumAdminController],
  providers: [RumService],
})
export class RumModule {}
