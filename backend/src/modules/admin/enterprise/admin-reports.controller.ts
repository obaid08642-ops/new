import { Controller, Get, Query, Res, UseGuards, BadRequestException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Response } from 'express';
import { JwtAuthGuard, Roles } from '../../../common/auth.guard';
import { UserRole } from '../../../common/enums';
import { IsDateString, IsIn, IsOptional } from 'class-validator';

export class ReportsQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsIn(['day', 'service', 'status', 'gateway', 'city', 'type'])
  group_by?: string;

  @IsOptional()
  @IsIn(['csv', 'xlsx'])
  format?: string;
}

const DAY = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };

/**
 * P6.x-1: operational reports over live aggregates (no constants).
 * Revenue from `transactions` (paid, net of refunds); orders from `orders`;
 * bookings as a union across the five booking collections; providers/patients
 * from profile/user creation. Every endpoint also serves ?format=csv and ?format=xlsx.
 */
@Controller('admin/reports')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminReportsController {
  constructor(@InjectConnection() private conn: Connection) {}

  private window(q: ReportsQueryDto): any {
    const match: any = {};
    const from = q.from ? new Date(q.from) : null;
    const to = q.to ? new Date(q.to) : null;
    if ((from && isNaN(+from)) || (to && isNaN(+to))) throw new BadRequestException('bad_date_range');
    if (from && to && +to - +from > 366 * 86400000) throw new BadRequestException('range_too_wide');
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = from;
      if (to) match.createdAt.$lte = to;
    }
    return match;
  }

  private groupKey(groupBy: string | undefined, fallback: any = DAY): any {
    switch (groupBy) {
      case 'service': return '$booking_kind';
      case 'status': return '$status';
      case 'gateway': return '$gateway';
      case 'city': return { $ifNull: ['$city', 'unknown'] };
      case 'type': return { $ifNull: ['$type', 'unknown'] };
      default: return fallback;
    }
  }

  private csv(res: Response, name: string, rows: any[]) {
    const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r || {}))));
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const body = [cols.join(',')].concat(rows.map((r) => cols.map((c) => esc((r as any)[c])).join(','))).join('\n');
    res.setHeader('content-type', 'text/csv; charset=utf-8');
    res.setHeader('content-disposition', `attachment; filename="${name}.csv"`);
    res.send('\uFEFF' + body);
  }

  private maybeCsv(res: Response | undefined, name: string, rows: any[], format?: string) {
    if (format === 'csv' && res) {
      this.csv(res, name, rows);
      return true;
    }
    return false;
  }

  /** R6-7: same rows as CSV, as a real .xlsx workbook (exceljs is a backend dep). */
  private async xlsx(res: Response, name: string, rows: any[]) {
    const ExcelJS = require('exceljs');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('report');
    const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r || {}))));
    ws.columns = cols.map((c) => ({ header: c, key: c, width: Math.max(12, Math.min(40, c.length + 2)) }));
    for (const r of rows) {
      const row: any = {};
      for (const c of cols) {
        const v = (r as any)?.[c];
        row[c] = v instanceof Date ? v : (v ?? '');
      }
      ws.addRow(row);
    }
    ws.getRow(1).font = { bold: true };
    const buf: Buffer = await wb.xlsx.writeBuffer();
    res.setHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('content-disposition', `attachment; filename="${name}.xlsx"`);
    res.send(Buffer.from(buf));
  }

  private async maybeXlsx(res: Response | undefined, name: string, rows: any[], format?: string) {
    if (format === 'xlsx' && res) {
      await this.xlsx(res, name, rows);
      return true;
    }
    return false;
  }

  @Get('revenue')
  async revenue(@Query() q: ReportsQueryDto, @Query('format') format?: string, @Res({ passthrough: true }) res?: Response) {
    const rows: any[] = await this.conn.collection('transactions').aggregate([
      { $match: { status: 'paid', ...this.window(q) } },
      { $group: { _id: this.groupKey(q.group_by), gross: { $sum: '$amount' }, refunded: { $sum: { $ifNull: ['$refunded_amount', 0] } }, count: { $sum: 1 } } },
      { $project: { bucket: '$_id', gross: 1, refunded: 1, net: { $subtract: ['$gross', '$refunded'] }, count: 1, _id: 0 } },
      { $sort: { bucket: 1 } },
    ]).toArray();
    if (this.maybeCsv(res, 'revenue', rows, format) || await this.maybeXlsx(res, 'revenue', rows, format)) return;
    return { group_by: q.group_by || 'day', rows };
  }

  @Get('orders')
  async orders(@Query() q: ReportsQueryDto, @Query('format') format?: string, @Res({ passthrough: true }) res?: Response) {
    // Pharmacy orders live in pharmacy_orders; `orders` only holds legacy rows. Sum both per bucket.
    const merged = new Map<string, { bucket: any; count: number; total: number }>();
    for (const col of ['pharmacy_orders', 'orders']) {
      const part: any[] = await this.conn.collection(col).aggregate([
        { $match: { is_deleted: { $ne: true }, ...this.window(q) } },
        // pharmacy_orders keep the amount in totals.total (total_price stays 0 there).
        { $group: { _id: this.groupKey(q.group_by), count: { $sum: 1 },
          total: { $sum: { $ifNull: ['$totals.total', { $ifNull: ['$total_price', { $ifNull: ['$total', 0] }] }] } } } },
      ]).toArray();
      for (const r of part) {
        const key = JSON.stringify(r._id ?? null);
        const acc = merged.get(key) || { bucket: r._id ?? null, count: 0, total: 0 };
        acc.count += r.count; acc.total += r.total;
        merged.set(key, acc);
      }
    }
    const rows = [...merged.values()].sort((a, b) => String(a.bucket).localeCompare(String(b.bucket)));
    if (this.maybeCsv(res, 'orders', rows, format) || await this.maybeXlsx(res, 'orders', rows, format)) return;
    return { group_by: q.group_by || 'day', rows };
  }

  @Get('bookings')
  async bookings(@Query() q: ReportsQueryDto, @Query('format') format?: string, @Res({ passthrough: true }) res?: Response) {
    const kinds = [
      { kind: 'consultation', col: 'appointments', state: '$status' },
      { kind: 'consultation_doctor', col: 'doctor_appointments', state: '$state' },
      { kind: 'lab', col: 'labbookings', state: '$state' },
      { kind: 'radiology', col: 'radiologybookings', state: '$state' },
      { kind: 'nursing', col: 'homecarebookings', state: '$state' },
    ];
    const win = this.window(q);
    const out: any[] = [];
    for (const k of kinds) {
      const groupBy = q.group_by === 'status' ? k.state : q.group_by === 'service' ? { $literal: k.kind } : DAY;
      const rows: any[] = await this.conn.collection(k.col).aggregate([
        { $match: win },
        { $group: { _id: groupBy, count: { $sum: 1 } } },
        { $project: { bucket: '$_id', count: 1, _id: 0 } },
        { $sort: { bucket: 1 } },
      ]).toArray().catch(() => []);
      for (const r of rows) out.push({ kind: k.kind, ...r });
    }
    if (this.maybeCsv(res, 'bookings', out, format) || await this.maybeXlsx(res, 'bookings', out, format)) return;
    return { group_by: q.group_by || 'day', rows: out };
  }

  @Get('providers')
  async providers(@Query() q: ReportsQueryDto, @Query('format') format?: string, @Res({ passthrough: true }) res?: Response) {
    const rows: any[] = await this.conn.collection('provider_profiles').aggregate([
      { $match: this.window(q) },
      { $group: { _id: this.groupKey(q.group_by, { $ifNull: ['$provider_type', { $ifNull: ['$type', 'unknown'] }] }), count: { $sum: 1 } } },
      { $project: { bucket: '$_id', count: 1, _id: 0 } },
      { $sort: { bucket: 1 } },
    ]).toArray();
    if (this.maybeCsv(res, 'providers', rows, format) || await this.maybeXlsx(res, 'providers', rows, format)) return;
    return { group_by: q.group_by || 'type', rows };
  }

  @Get('patients')
  async patients(@Query() q: ReportsQueryDto, @Query('format') format?: string, @Res({ passthrough: true }) res?: Response) {
    const rows: any[] = await this.conn.collection('users').aggregate([
      { $match: { role: 'patient', ...this.window(q) } },
      { $group: { _id: DAY, count: { $sum: 1 } } },
      { $project: { bucket: '$_id', count: 1, _id: 0 } },
      { $sort: { bucket: 1 } },
    ]).toArray();
    if (this.maybeCsv(res, 'patients', rows, format) || await this.maybeXlsx(res, 'patients', rows, format)) return;
    return { group_by: 'day', rows };
  }

  /** Finance — commissions and VAT from provider_earning ledger rows (A1: the wallet store is dead). */
  @Get('finance')
  async finance(@Query() q: ReportsQueryDto, @Query('format') format?: string, @Res({ passthrough: true }) res?: Response) {
    const rows: any[] = await this.conn.collection('platformledgerentries').aggregate([
      { $match: { type: 'provider_earning', ...this.window(q) } },
      { $group: { _id: DAY, gross: { $sum: { $ifNull: ['$gross', '$amount'] } },
        commission: { $sum: { $ifNull: ['$commission', 0] } }, vat: { $sum: { $ifNull: ['$vat', 0] } }, count: { $sum: 1 } } },
      { $project: { bucket: '$_id', gross: 1, commission: 1, vat: 1, count: 1, _id: 0 } },
      { $sort: { bucket: 1 } },
    ]).toArray().catch(() => []);
    if (this.maybeCsv(res, 'finance', rows, format) || await this.maybeXlsx(res, 'finance', rows, format)) return;
    return { group_by: 'day', rows };
  }

  /** P6.x-10: insurance — decisions by state + copay collected. */
  @Get('insurance')
  async insurance(@Query() q: ReportsQueryDto, @Query('format') format?: string, @Res({ passthrough: true }) res?: Response) {
    const rows: any[] = await this.conn.collection('insuranceservicerequests').aggregate([
      { $match: this.window(q) },
      { $group: { _id: this.groupKey(q.group_by, '$state'), count: { $sum: 1 }, copay: { $sum: { $ifNull: ['$copay_amount', 0] } } } },
      { $project: { bucket: '$_id', count: 1, copay: 1, _id: 0 } },
      { $sort: { bucket: 1 } },
    ]).toArray().catch(() => []);
    if (this.maybeCsv(res, 'insurance', rows, format) || await this.maybeXlsx(res, 'insurance', rows, format)) return;
    return { group_by: q.group_by || 'state', rows };
  }

  /** P6.x-10: labs turnaround — avg hours from creation to report upload, by day. */
  @Get('labs-turnaround')
  async labsTurnaround(@Query() q: ReportsQueryDto, @Query('format') format?: string, @Res({ passthrough: true }) res?: Response) {
    const rows: any[] = await this.conn.collection('labbookings').aggregate([
      // Lab bookings carry `state` (RESULT_UPLOADED → REPORTED); turnaround ends at the first result
      // entry in state_history (updatedAt moves on later edits).
      { $match: { state: { $in: ['RESULT_UPLOADED', 'REPORTED'] }, ...this.window(q) } },
      { $addFields: { _done: { $first: { $filter: { input: { $ifNull: ['$state_history', []] }, as: 'h', cond: { $in: ['$$h.to', ['RESULT_UPLOADED', 'REPORTED']] } } } } } },
      { $addFields: { _doneAt: { $ifNull: [{ $toDate: '$_done.at' }, '$updatedAt'] } } },
      { $group: { _id: DAY, count: { $sum: 1 }, avg_hours: { $avg: { $divide: [{ $subtract: ['$_doneAt', '$createdAt'] }, 3600000] } } } },
      { $project: { bucket: '$_id', count: 1, avg_hours: { $round: ['$avg_hours', 1] }, _id: 0 } },
      { $sort: { bucket: 1 } },
    ]).toArray().catch(() => []);
    if (this.maybeCsv(res, 'labs-turnaround', rows, format) || await this.maybeXlsx(res, 'labs-turnaround', rows, format)) return;
    return { group_by: 'day', rows };
  }

  /** B1: payments — every transaction by gateway and status (server-side window). */
  @Get('payments')
  async payments(@Query() q: ReportsQueryDto, @Query('format') format?: string, @Res({ passthrough: true }) res?: Response) {
    const rows: any[] = await this.conn.collection('transactions').aggregate([
      { $match: this.window(q) },
      { $group: { _id: { day: DAY, gateway: { $ifNull: ['$gateway', 'unknown'] }, status: { $ifNull: ['$status', 'unknown'] } },
        total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $project: { bucket: '$_id.day', gateway: '$_id.gateway', status: '$_id.status', total: 1, count: 1, _id: 0 } },
      { $sort: { bucket: 1, gateway: 1, status: 1 } },
    ]).toArray().catch(() => []);
    if (this.maybeCsv(res, 'payments', rows, format) || await this.maybeXlsx(res, 'payments', rows, format)) return;
    return { group_by: 'day', rows };
  }

  /** B1: refunds — ledger refund rows by method (A2: the only refund store). */
  @Get('refunds')
  async refunds(@Query() q: ReportsQueryDto, @Query('format') format?: string, @Res({ passthrough: true }) res?: Response) {
    const rows: any[] = await this.conn.collection('platformledgerentries').aggregate([
      { $match: { type: 'refund', ...this.window(q) } },
      { $group: { _id: { day: DAY, method: { $ifNull: ['$meta.method', 'unknown'] } },
        total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $project: { bucket: '$_id.day', method: '$_id.method', total: 1, count: 1, _id: 0 } },
      { $sort: { bucket: 1, method: 1 } },
    ]).toArray().catch(() => []);
    if (this.maybeCsv(res, 'refunds', rows, format) || await this.maybeXlsx(res, 'refunds', rows, format)) return;
    return { group_by: 'day', rows };
  }

  /** B1: payouts — withdrawals by state plus cleared payout ledger totals. */
  @Get('payouts')
  async payouts(@Query() q: ReportsQueryDto, @Query('format') format?: string, @Res({ passthrough: true }) res?: Response) {
    const [withdrawals, cleared]: any[] = await Promise.all([
      this.conn.collection('providerwithdrawals').aggregate([
        { $match: this.window(q) },
        { $group: { _id: { day: DAY, state: { $ifNull: ['$state', 'unknown'] } },
          total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $project: { bucket: '$_id.day', state: '$_id.state', total: 1, count: 1, _id: 0 } },
        { $sort: { bucket: 1, state: 1 } },
      ]).toArray().catch(() => []),
      this.conn.collection('platformledgerentries').aggregate([
        { $match: { type: 'payout', state: 'cleared', ...this.window(q) } },
        { $group: { _id: DAY, total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $project: { bucket: '$_id', total: 1, count: 1, _id: 0 } },
      ]).toArray().catch(() => []),
    ]);
    const rows = [...withdrawals.map((w: any) => ({ ...w, source: 'withdrawals' })),
      ...cleared.map((c: any) => ({ ...c, state: 'cleared', source: 'ledger' }))];
    if (this.maybeCsv(res, 'payouts', rows, format) || await this.maybeXlsx(res, 'payouts', rows, format)) return;
    return { group_by: 'day', rows };
  }

  /** B1: loyalty — earned vs redeemed points, discount SAR value, top earners. */
  @Get('loyalty')
  async loyalty(@Query() q: ReportsQueryDto, @Query('format') format?: string, @Res({ passthrough: true }) res?: Response) {
    const [flow, top]: any[] = await Promise.all([
      this.conn.collection('loyalty_transactions').aggregate([
        { $match: this.window(q) },
        { $group: { _id: { day: DAY, kind: { $ifNull: ['$kind', { $cond: [{ $gte: ['$points_delta', 0] }, 'earn', 'redeem'] }] } },
          points: { $sum: '$points_delta' }, discount_sar: { $sum: { $ifNull: ['$discount_sar', 0] } }, count: { $sum: 1 } } },
        { $project: { bucket: '$_id.day', kind: '$_id.kind', points: 1, discount_sar: 1, count: 1, _id: 0 } },
        { $sort: { bucket: 1, kind: 1 } },
      ]).toArray().catch(() => []),
      this.conn.collection('loyalty_transactions').aggregate([
        { $match: { points_delta: { $gt: 0 }, ...this.window(q) } },
        { $group: { _id: '$user_id', earned: { $sum: '$points_delta' } } },
        { $sort: { earned: -1 } },
        { $limit: 50 },
        { $project: { user_id: '$_id', earned: 1, _id: 0 } },
      ]).toArray().catch(() => []),
    ]);
    const rows = [...flow, ...top.map((t: any) => ({ bucket: 'top-earners', ...t }))];
    if (this.maybeCsv(res, 'loyalty', rows, format) || await this.maybeXlsx(res, 'loyalty', rows, format)) return;
    return { group_by: 'day', rows, top_earners: top };
  }

  /** B1: disputes — tickets by category and status. */
  @Get('disputes')
  async disputes(@Query() q: ReportsQueryDto, @Query('format') format?: string, @Res({ passthrough: true }) res?: Response) {
    const rows: any[] = await this.conn.collection('supportrequests').aggregate([
      { $match: this.window(q) },
      { $group: { _id: { day: DAY, category: { $ifNull: ['$category', 'unknown'] }, status: { $ifNull: ['$status', 'unknown'] } },
        count: { $sum: 1 } } },
      { $project: { bucket: '$_id.day', category: '$_id.category', status: '$_id.status', count: 1, _id: 0 } },
      { $sort: { bucket: 1, category: 1, status: 1 } },
    ]).toArray().catch(() => []);
    if (this.maybeCsv(res, 'disputes', rows, format) || await this.maybeXlsx(res, 'disputes', rows, format)) return;
    return { group_by: 'day', rows };
  }

  /** B1: admin actions — the audit log by action. */
  @Get('audit')
  async audit(@Query() q: ReportsQueryDto, @Query('format') format?: string, @Res({ passthrough: true }) res?: Response) {
    const rows: any[] = await this.conn.collection('admin_actions_log').aggregate([
      { $match: this.window(q) },
      { $group: { _id: { day: DAY, action: { $ifNull: ['$action', 'unknown'] } }, count: { $sum: 1 } } },
      { $project: { bucket: '$_id.day', action: '$_id.action', count: 1, _id: 0 } },
      { $sort: { bucket: 1, action: 1 } },
    ]).toArray().catch(() => []);
    if (this.maybeCsv(res, 'audit', rows, format) || await this.maybeXlsx(res, 'audit', rows, format)) return;
    return { group_by: 'day', rows };
  }

  /** B1 fix: finance reads the ledger (RefundExecutor), not the dead wallet store. */
  @Get('ledger')
  async ledger(@Query() q: ReportsQueryDto, @Query('format') format?: string, @Res({ passthrough: true }) res?: Response) {
    const rows: any[] = await this.conn.collection('platformledgerentries').aggregate([
      { $match: this.window(q) },
      { $group: { _id: { day: DAY, type: '$type' }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $project: { bucket: '$_id.day', type: '$_id.type', total: 1, count: 1, _id: 0 } },
      { $sort: { bucket: 1, type: 1 } },
    ]).toArray().catch(() => []);
    if (this.maybeCsv(res, 'ledger', rows, format) || await this.maybeXlsx(res, 'ledger', rows, format)) return;
    return { group_by: 'day', rows };
  }
}
