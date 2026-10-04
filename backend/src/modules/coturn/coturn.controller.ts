import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, CurrentUser, NoGuestsGuard } from '../../common/auth.guard';
import { CoturnService } from './coturn.service';

// Q94 follow-up: TURN credentials only for a party of an active call session
// (?session_id=), about 10 minutes, never for guests.
@Controller('calls/ice')
@UseGuards(JwtAuthGuard, NoGuestsGuard)
export class CoturnController {
  constructor(private readonly svc: CoturnService) {}

  @Get('config')
  async getIceConfig(@CurrentUser() u: any, @Query('session_id') sessionId: string) {
    await this.svc.assertCallParty(u.id, sessionId);
    return this.svc.getIceServers(u.id);
  }

  @Get('credentials')
  async getCredentials(@CurrentUser() u: any, @Query('session_id') sessionId: string) {
    await this.svc.assertCallParty(u.id, sessionId);
    return this.svc.generateCredentials(u.id);
  }
}
