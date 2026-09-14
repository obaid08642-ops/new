import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NphiesService } from './nphies.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [NphiesService],
  exports: [NphiesService],
})
export class NphiesModule {}
