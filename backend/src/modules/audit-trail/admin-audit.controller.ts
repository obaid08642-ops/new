import { BadRequestException, Controller, Get, Param, Query, Req, Res, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, CurrentUser, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { AuditTrailService } from './audit-trail.service';

/**
 * Phase 23.4 — admin views (frozen contract, admin/apps agents code against it):
 * - GET /api/v1/admin/audit/search
 * - GET /api/v1/admin/audit/timeline/:entityType/:entityId
 * - GET /api/v1/admin/audit/export?format=csv
 *
 * Reading audit data writes a read-audit (`audit.read`) event. PII
 * (phone/email/national ID) is masked for every role except the owner and
 * named roles (see pii-mask.ts).
 */
@Controller('admin/audit')
@UseGuards(JwtAuthGuard)
export class AdminAuditController {
  constructor(private readonly audit: AuditTrailService) {}

  private reqMeta(req: any) {
    return {
      ip: req?.ip || req?.socket?.remoteAddress,
      user_agent: req?.headers?.['user-agent'],
      request_id: (req as any)?.correlation_id || req?.headers?.['x-request-id'],
    };
  }

  private buildFilter(q: Record<string, any>): Record<string, any> {
    const filter: Record<string, any> = {};
    if (q.actor_id) filter['actor.id'] = String(q.actor_id);
    if (q.role) filter['actor.role'] = String(q.role);
    if (q.action) filter.action = String(q.action);
    if (q.entity_type) filter['entity.type'] = String(q.entity_type);
    if (q.entity_id) filter['entity.id'] = String(q.entity_id);
    if (q.request_id) filter.request_id = String(q.request_id);
    if (q.ip) filter['where.ip'] = String(q.ip);
    if (q.device_id) filter['where.device_id'] = String(q.device_id);
    if (q.phone) filter.$or = [...(filter.$or || []), { 'diff.after.phone': String(q.phone) }];
    if (q.email) filter.$or = [...(filter.$or || []), { 'diff.after.email': String(q.email) }];
    if (q.order_id) filter.$or = [...(filter.$or || []), { 'entity.id': String(q.order_id) }];
    const from = q.from ? new Date(String(q.from)) : null;
    const to = q.to ? new Date(String(q.to)) : null;
    if ((from && !isNaN(+from)) || (to && !isNaN(+to))) {
      filter.at = {};
      if (from && !isNaN(+from)) filter.at.$gte = from;
      if (to && !isNaN(+to)) filter.at.$lte = to;
    }
    return filter;
  }

  @Get('search')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async search(@Query() q: Record<string, any>, @CurrentUser() user: any, @Req() req: any) {
    const limit = Math.min(Number(q.limit) || 100, 1000);
    const rows = await this.audit.search(this.buildFilter(q), limit);
    this.audit.logRead(user, `search:${JSON.stringify(q).slice(0, 200)}`, this.reqMeta(req));
    return { items: this.audit.masked(rows, user?.role), count: rows.length };
  }

  @Get('timeline/:entityType/:entityId')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async timeline(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query('limit') limit: string,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const rows = await this.audit.timeline(entityType, entityId, limit ? Number(limit) : 200);
    this.audit.logRead(user, `timeline:${entityType}:${entityId}`, this.reqMeta(req));
    return { items: this.audit.masked(rows, user?.role), count: rows.length };
  }

  @Get('export')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async export(
    @Query() q: Record<string, any>,
    @CurrentUser() user: any,
    @Req() req: any,
    @Res() res: any,
  ) {
    const format = String(q.format || 'csv').toLowerCase();
    if (format !== 'csv') throw new BadRequestException(`unsupported export format: ${format} (supported: csv)`);
    const rows = await this.audit.search(this.buildFilter(q), 5000);
    this.audit.logRead(user, `export:csv:${rows.length}`, this.reqMeta(req));
    const csv = this.audit.toCsv(this.audit.masked(rows, user?.role));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="audit-export-${Date.now()}.csv"`);
    return res.send(csv);
  }
}
