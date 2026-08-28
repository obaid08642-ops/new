import { Controller, ForbiddenException, Get, Req, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard } from './auth.guard';

/**
 * A deliberately read-only proof of the short-lived support identity context.
 * It is consumed only through the same-origin admin BFF, which keeps the
 * support credential HttpOnly. No general impersonation proxy is exposed.
 */
@Controller('support-session')
@UseGuards(JwtAuthGuard)
export class SupportSessionContextController {
  @Get('context')
  context(@CurrentUser() user: any, @Req() req: any) {
    if (user?.scope !== 'impersonation' || !req?.impersonator || !req?.impersonationSession) {
      throw new ForbiddenException('impersonation_session_required');
    }

    return {
      active: true,
      read_only: true,
      session_id: req.impersonationSession.id,
      expires_at: new Date(req.impersonationSession.expiresAt).toISOString(),
      target: { id: user.id || user.sub, role: user.role },
      impersonator: { id: req.impersonator.id, role: req.impersonator.role },
    };
  }
}
