/** Legal Enterprise Controller — endpoints for the enterprise legal features. */
import { Controller, Get, Post, Put, Body, Param, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { JwtAuthGuard, CurrentUser, Public, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { LegalEnterpriseService } from './legal-enterprise.service';

@Controller()
export class LegalEnterpriseController {
  constructor(
    private readonly svc: LegalEnterpriseService,
    @InjectConnection() private readonly conn: Connection,
  ) {}

  private meta(req: Request) {
    return {
      ip: (req as any).ip || null,
      device: (req.headers['x-device-id'] as string) || null,
      platform: (req.headers['x-app-platform'] as string) || 'web',
      user_agent: req.headers['user-agent'] || null,
    };
  }

  // ── PDF of any policy document ──────────────────────────────────────────
  @Public()
  @Get('legal/policy/:key/pdf')
  async policyPdf(@Param('key') key: string, @Res() res: Response) {
    const p: any = await this.conn.collection('legal_policies').findOne({ key });
    if (!p) return res.status(404).json({ error: 'not_found' });
    const pdf = this.svc.buildPdf(`${p.title_en} — v${p.version}`, [
      `${p.title_ar}`,
      `Version ${p.version} · Effective ${new Date(p.effective_date).toISOString().slice(0, 10)} · Updated ${new Date(p.last_updated).toISOString().slice(0, 10)}`,
      '',
      ...(p.content_en || p.content_ar || '').split('\n').slice(0, 48),
    ]);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${key}-v${p.version}.pdf"`);
    res.send(pdf);
  }

  // ── Acceptance archive: snapshot + verify ──────────────────────────────
  @Get('legal/archive/:id/pdf')
  @UseGuards(JwtAuthGuard)
  async archivePdf(@Param('id') id: string, @Res() res: Response) {
    const result = await this.svc.acceptancePdf(id);
    if (!result) return res.status(404).json({ error: 'archive_not_found' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="acceptance-${id.slice(0, 8)}.pdf"`);
    res.setHeader('X-SHA256', result.sha256);
    res.send(result.pdf);
  }

  @Public()
  @Get('legal/archive/:id/verify')
  verifyArchive(@Param('id') id: string) { return this.svc.verifyArchive(id); }

  // ── Commission history ────────────────────────────────────────────────
  @Get('admin/finance/commission-history')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  commissionHistory(@Query('limit') limit?: string): Promise<any[]> {
    return this.svc.getCommissionHistory(parseInt(limit || '100'));
  }

  // ── Full admin audit log ───────────────────────────────────────────────
  @Get('admin/audit-log')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  auditLog(@Query('action') action?: string, @Query('admin_id') adminId?: string, @Query('limit') limit?: string): Promise<any[]> {
    return this.svc.getAuditLog({ action, admin_id: adminId, limit: limit ? parseInt(limit) : 100 });
  }

  // ── Settlement reports (provider) ──────────────────────────────────────
  @Get('provider/settlements')
  @UseGuards(JwtAuthGuard)
  settlements(@CurrentUser() user: any, @Query('from') from?: string, @Query('to') to?: string): Promise<any> {
    return this.svc.settlementData(user.id, from, to);
  }

  @Get('provider/settlements/excel')
  @UseGuards(JwtAuthGuard)
  async settlementsExcel(@CurrentUser() user: any, @Res() res: Response, @Query('from') from?: string, @Query('to') to?: string) {
    const buf = await this.svc.settlementExcel(user.id, from, to);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="settlements-${user.id.slice(0, 8)}.xlsx"`);
    res.send(buf);
  }

  @Get('provider/settlements/pdf')
  @UseGuards(JwtAuthGuard)
  async settlementsPdf(@CurrentUser() user: any, @Res() res: Response, @Query('from') from?: string, @Query('to') to?: string) {
    const buf = await this.svc.settlementPdf(user.id, from, to);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="settlements-${user.id.slice(0, 8)}.pdf"`);
    res.send(buf);
  }

  // ── License monitoring (manual trigger for admin) ──────────────────────
  @Post('admin/providers/license-monitor/run')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  licenseRun() { return this.svc.licenseMonitorRun(); }

  // ── Provider insurance matrix ──────────────────────────────────────────
  @Get('provider/insurance-matrix')
  @UseGuards(JwtAuthGuard)
  getMatrix(@CurrentUser() user: any) { return this.svc.getProviderInsurance(user.id); }

  @Put('provider/insurance-matrix')
  @UseGuards(JwtAuthGuard)
  setMatrix(@CurrentUser() user: any, @Body() body: { companies: string[] }) {
    if (!Array.isArray(body?.companies)) return { ok: false, error: 'companies array required' };
    return this.svc.setProviderInsurance(user.id, body.companies);
  }

  // ── Provider SLA dashboard ─────────────────────────────────────────────
  @Get('provider/sla')
  @UseGuards(JwtAuthGuard)
  sla(@CurrentUser() user: any, @Query('days') days?: string) {
    return this.svc.providerSla(user.id, days ? parseInt(days) : 30, user.role);
  }

  // ── Consent management (9 types) ───────────────────────────────────────
  @Get('consents')
  @UseGuards(JwtAuthGuard)
  getConsents(@CurrentUser() user: any) { return this.svc.getConsents(user.id); }

  @Put('consents/:type')
  @UseGuards(JwtAuthGuard)
  setConsent(@CurrentUser() user: any, @Param('type') type: string, @Body() body: { value: boolean }, @Req() req: Request) {
    try {
      return this.svc.setConsent(user.id, type, !!body?.value, this.meta(req));
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  // ── Version comparison ─────────────────────────────────────────────────
  @Get('admin/legal/policy/:key/diff')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  async diff(@Param('key') key: string, @Query('from_content') from?: string) {
    const p: any = await this.conn.collection('legal_policies').findOne({ key });
    if (!p) return { error: 'not_found' };
    const changeLog = p.change_log || [];
    return {
      key,
      current_version: p.version,
      change_log: changeLog,
      diff_from_previous: changeLog.length >= 2
        ? await this.svc.diffVersions(key, changeLog[changeLog.length - 2]?.note || '', changeLog[changeLog.length - 1]?.note || '')
        : { note: 'single version — nothing to compare' },
    };
  }

  // ── Snapshot creation (called by accept flow in legal.module) ──────────
  async snapshot(user: any, policy: any, req: Request) {
    return this.svc.snapshotAcceptance(user, policy, this.meta(req));
  }
}
