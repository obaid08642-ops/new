import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { OpsController } from './ops.controller';
import { MetricsInterceptor } from './metrics.interceptor';

@Module({
  controllers: [OpsController],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
  ],
})
export class OpsModule {}
