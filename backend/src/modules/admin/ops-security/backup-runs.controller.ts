import { Body, Controller, Post, Req, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { Public } from '../../../common/auth.guard';
import { OpsSecurityService } from './ops-security.service';
import { ReportBackupRunDto } from './ops-security.dto';

/**
 * D-34 — the server-side backup scripts report a run (D-33 calls this).
 * Auth: `Authorization: Bearer <BACKUP_REPORT_TOKEN>` (env, 32+ chars), else 401.
 * JWT-public (the scripts hold no user session); the report token is the credential.
 */
@Controller('ops')
export class BackupRunsController {
  constructor(private readonly ops: OpsSecurityService) {}

  @Public()
  @Post('backup-runs')
  async report(@Body() body: ReportBackupRunDto, @Req() req: any) {
    const expected = process.env.BACKUP_REPORT_TOKEN || '';
    const auth = String(req?.headers?.authorization || '');
    const sent = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const a = Buffer.from(sent);
    const b = Buffer.from(expected);
    if (expected.length < 32 || a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException('invalid_backup_token');
    }
    return this.ops.reportBackupRun(body);
  }
}
