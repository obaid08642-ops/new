import { BadRequestException, Controller, Get, Post, Body, Param, Patch, Delete, Query, UseGuards, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { JwtAuthGuard, Roles, CurrentUser } from '../../common/auth.guard';
import { Permission, RequirePermissions } from '../../common/permissions';
import { UserRole } from '../../common/enums';
import { validateReason, ReasonError } from '../../common/rbac';
import { AnalyticsSuiteService } from './analytics-suite.service';
import { ScheduledReportsRunner } from './scheduled-reports.runner';

/**
 * A3 — Analytics Suite endpoints (all real Mongo aggregations, no mocks).
 */
@Controller('admin/analytics-suite')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminAnalyticsSuiteController {
  constructor(
    private readonly svc: AnalyticsSuiteService,
    @InjectConnection() private readonly conn: Connection,
  ) {}

  @Get('funnels')
  @RequirePermissions(Permission.ANALYTICS_READ)
  funnels(@Query('from') from: string, @Query('to') to: string) {
    return this.svc.funnel(from, to);
  }

  @Get('cohorts')
  @RequirePermissions(Permission.ANALYTICS_READ)
  cohorts(@Query('from') from: string, @Query('to') to: string) {
    return this.svc.cohorts(from, to);
  }

  @Get('provider-league')
  @RequirePermissions(Permission.ANALYTICS_READ)
  providerLeague(@Query('from') from: string, @Query('to') to: string, @Query('domain') domain?: string) {
    return this.svc.providerLeague(from, to, domain);
  }

  @Get('search')
  @RequirePermissions(Permission.ANALYTICS_READ)
  search(@Query('from') from: string, @Query('to') to: string) {
    return this.svc.searchAnalytics(from, to);
  }

  @Get('nps')
  @RequirePermissions(Permission.ANALYTICS_READ)
  nps(@Query('from') from: string, @Query('to') to: string) {
    return this.svc.nps(from, to);
  }

  @Get('anomalies')
  @RequirePermissions(Permission.ANALYTICS_READ)
  anomalies(@Query('days') days = '45') {
    return this.svc.anomalies(Math.min(120, Math.max(7, parseInt(days, 10) || 45)));
  }
}

/**
 * Scheduled reports registry — the cron runner (A7) consumes these rows.
 */
@Controller('admin/scheduled-reports')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminScheduledReportsController {
  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly runner: ScheduledReportsRunner,
  ) {}

  @Get()
  @RequirePermissions(Permission.SCHEDULED_REPORTS_MANAGE)
  async list() {
    const docs = await this.conn.collection('scheduled_reports').find({}).sort({ createdAt: -1 }).limit(200).toArray();
    return docs.map(({ _id, ...r }: any) => r);
  }

  @Post()
  @RequirePermissions(Permission.SCHEDULED_REPORTS_MANAGE)
  async create(@Body() b: any, @CurrentUser() me: any) {
    const report = String(b?.report || '');
    if (!['revenue', 'commissions', 'funnels', 'cohorts', 'anomalies', 'provider_league'].includes(report)) {
      throw new BadRequestException('unknown_report');
    }
    if (!['daily', 'weekly', 'monthly'].includes(String(b?.frequency))) {
      throw new BadRequestException('invalid_frequency');
    }
    const emails: string[] = Array.isArray(b?.recipients) ? b.recipients.map(String).filter((e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) : [];
    if (!emails.length) throw new BadRequestException('valid_recipients_required');

    const doc = {
      id: `sr_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      report, frequency: b.frequency, recipients: emails,
      hour_utc: Math.min(23, Math.max(0, Number(b?.hour_utc ?? 4))),
      format: b?.format === 'json' ? 'json' : 'csv',
      enabled: b?.enabled !== false,
      created_by: me.id,
      last_run_at: null as any, last_status: null as any,
      createdAt: new Date(),
    };
    await this.conn.collection('scheduled_reports').insertOne(doc as any);
    const { _id, ...clean } = doc as any;
    return clean;
  }

  @Patch(':id')
  @RequirePermissions(Permission.SCHEDULED_REPORTS_MANAGE)
  async update(@Param('id') id: string, @Body() b: any, @CurrentUser() me: any) {
    const before: any = await this.conn.collection('scheduled_reports').findOne({ id });
    if (!before) throw new NotFoundException('report_not_found');
    const $set: any = {};
    if (b?.enabled !== undefined) $set.enabled = !!b.enabled;
    if (b?.recipients !== undefined) $set.recipients = Array.isArray(b.recipients) ? b.recipients.map(String) : before.recipients;
    if (b?.hour_utc !== undefined) $set.hour_utc = Math.min(23, Math.max(0, Number(b.hour_utc)));
    await this.conn.collection('scheduled_reports').updateOne({ id }, { $set });
    void me;
    const after: any = await this.conn.collection('scheduled_reports').findOne({ id }, { projection: { _id: 0 } });
    return after;
  }

  /** Safe manual run — same code path as the cron (real compute + real email). */
  @Post(':id/run')
  @RequirePermissions(Permission.OPS_CRONS_RUN)
  async runNow(@Param('id') id: string, @CurrentUser() me: any) {
    const row: any = await this.conn.collection('scheduled_reports').findOne({ id });
    if (!row) throw new NotFoundException('report_not_found');
    if (!row.enabled) throw new BadRequestException('report_disabled');
    const res = await this.runner.runOne(row);
    void me;
    return { ok: res.ok, detail: res.detail, report: row.report, recipients: row.recipients };
  }

  /** Recent run history for the UI. */
  @Get(':id/runs')
  @RequirePermissions(Permission.SCHEDULED_REPORTS_MANAGE)
  async runs(@Param('id') id: string) {
    const rows = await this.conn.collection('scheduled_report_runs')
      .find({ report_id: id }).sort({ created_at: -1 }).limit(30).project({ _id: 0 }).toArray();
    return { data: rows };
  }

  @Delete(':id')
  @RequirePermissions(Permission.SCHEDULED_REPORTS_MANAGE)
  async remove(@Param('id') id: string, @Body() b: any, @CurrentUser() me: any) {
    let reason: string;
    try { reason = validateReason(b?.reason); } catch (e) {
      if (e instanceof ReasonError) throw new BadRequestException(e.code);
      throw e;
    }
    const res = await this.conn.collection('scheduled_reports').deleteOne({ id });
    if (!res.deletedCount) throw new NotFoundException('report_not_found');
    void me; void reason;
    return { ok: true };
  }
}
