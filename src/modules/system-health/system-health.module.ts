import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { SystemHealthController } from './system-health.controller';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [TerminusModule, RedisModule],
  controllers: [SystemHealthController],
})
export class SystemHealthModule {}
