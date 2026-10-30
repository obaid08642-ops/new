import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, CurrentUser } from '../../common/auth.guard';
import { cloudflareTurn } from './cloudflare-turn.service';
import { CoturnService } from './coturn.service';

@Controller('calls/ice')
@UseGuards(JwtAuthGuard)
export class CoturnController {
  constructor(private readonly svc: CoturnService) {}

  @Get('config')
  async getIceConfig(@CurrentUser() u: any) {
    const own = this.svc.isConfigured() ? this.svc.getIceServers(u.id) : { iceServers: [], realm: '' };
    return { ...own, iceServers: [...(await cloudflareTurn.iceServers(u.id)), ...own.iceServers] };
  }

  @Get('credentials')
  getCredentials(@CurrentUser() u: any) {
    return this.svc.generateCredentials(u.id);
  }
}
