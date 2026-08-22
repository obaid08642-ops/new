import { JwtAuthGuard } from '../../common/auth.guard';
import { UseGuards } from '@nestjs/common';
import { Controller, Get } from '@nestjs/common';
import { ConfigService } from './config.service';
import { Public } from '../../common/auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('config')
@Public() // Accessible without authorization during startup
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  getConfig() {
    return this.configService.getClientConfig();
  }
}
