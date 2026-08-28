import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, CurrentUser } from '../../common/auth.guard';
import { CoturnService } from './coturn.service';

@Controller('calls/ice')
@UseGuards(JwtAuthGuard)
export class CoturnController {
  constructor(private readonly svc: CoturnService) {}

  @Get('config')
  getIceConfig(@CurrentUser() u: any) {
    return this.svc.getIceServers(u.id);
  }

  @Get('credentials')
  getCredentials(@CurrentUser() u: any) {
    return this.svc.generateCredentials(u.id);
  }
}
