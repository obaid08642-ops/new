import { Controller, Get } from '@nestjs/common';
import { ConfigService } from './config.service';
import { Public } from '../../common/auth.guard';

@Controller('config')
@Public() // Accessible without authorization during startup
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  getConfig() {
    return this.configService.getClientConfig();
  }
}
