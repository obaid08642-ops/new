import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, CurrentUser } from '../../common/auth.guard';
import { AuditTrailService } from './audit-trail.service';

/**
 * Phase 23.6 — user-facing history (frozen contract):
 * - GET /api/v1/patient/security/sessions  ("active sessions", 21.7: login + device history)
 * - GET /api/v1/patient/history/events     (status history of own orders/bookings + own events)
 *
 * Patients see only their own rows. No PII masking here: it is their own data.
 */
@Controller('patient')
@UseGuards(JwtAuthGuard)
export class PatientAuditController {
  constructor(private readonly audit: AuditTrailService) {}

  @Get('security/sessions')
  async sessions(@CurrentUser() user: any, @Query('limit') limit = '50') {
    const rows = await this.audit.search(
      { 'actor.id': String(user?.id), category: { $in: ['auth', 'security'] } },
      Math.min(Number(limit) || 50, 200),
    );
    return {
      items: rows.map((r: any) => ({
        action: r.action,
        at: r.at,
        ip: r.where?.ip,
        device_id: r.where?.device_id,
        platform: r.where?.platform,
        app_version: r.where?.app_version,
        user_agent: r.where?.user_agent,
      })),
      count: rows.length,
      note: 'Login and device history for this account (Phase 23.6).',
    };
  }

  @Get('history/events')
  async history(@CurrentUser() user: any, @Query('limit') limit = '100') {
    const uid = String(user?.id);
    const rows = await this.audit.search(
      {
        $or: [
          { 'actor.id': uid },
          { 'entity.type': 'order', 'diff.after.patient_id': uid },
          { 'entity.type': 'booking', 'diff.after.patient_id': uid },
        ],
      } as any,
      Math.min(Number(limit) || 100, 500),
    );
    return {
      items: rows.map((r: any) => ({
        action: r.action,
        entity: r.entity,
        at: r.at,
        diff: r.diff,
      })),
      count: rows.length,
    };
  }
}
