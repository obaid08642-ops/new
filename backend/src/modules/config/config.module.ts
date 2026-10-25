import { Module } from '@nestjs/common';
import { ConfigController } from './config.controller';
import { ConfigService } from './config.service';
import { ClamavService } from '../storage/clamav.service';

@Module({
  controllers: [ConfigController],
  providers: [ConfigService, ClamavService],
  exports: [ConfigService],
})
export class ClientConfigModule {}
