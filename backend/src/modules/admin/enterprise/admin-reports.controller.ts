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
}

const DAY = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };

/**
 * P6.x-1: operational reports over live aggregates (no constants).
 * Revenue from `transactions` (paid, net of refunds); orders from `orders`;
 * bookings as a union across the five booking collections; providers/patients
 * from profile/user creation. Every endpoint also serves ?format=csv.
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

  @Get('revenue')
  async revenue(@Query() q: ReportsQueryDto, @Query('format') format?: string, @Res({ passthrough: true }) res?: Response) {
    const rows: any[] = await this.conn.collection('transactions').aggregate([
      { $match: { status: 'paid', ...this.window(q) } },
      { $group: { _id: this.groupKey(q.group_by), gross: { $sum: '$amount' }, refunded: { $sum: { $ifNull: ['$refunded_amount', 0] } }, count: { $sum: 1 } } },
      { $project: { bucket: '$_id', gross: 1, refunded: 1, net: { $subtract: ['$gross', '$refunded'] }, count: 1, _id: 0 } },
      { $sort: { bucket: 1 } },
    ]).toArray();
    if (this.maybeCsv(res, 'revenue', rows, format)) return;
    return { group_by: q.group_by || 'day', rows };
  }

  @Get('orders')
  async orders(@Query() q: ReportsQueryDto, @Query('format') format?: string, @Res({ passthrough: true }) res?: Response) {
    const rows: any[] = await this.conn.collection('orders').aggregate([
      { $match: this.window(q) },
      { $group: { _id: this.groupKey(q.group_by), count: { $sum: 1 }, total: { $sum: { $ifNull: ['$total_price', { $ifNull: ['$total', 0] }] } } } },
      { $project: { bucket: '$_id', count: 1, total: 1, _id: 0 } },
      { $sort: { bucket: 1 } },
    ]).toArray();
    if (this.maybeCsv(res, 'orders', rows, format)) return;
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
    if (this.maybeCsv(res, 'bookings', out, format)) return;
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
    if (this.maybeCsv(res, 'providers', rows, format)) return;
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
    if (this.maybeCsv(res, 'patients', rows, format)) return;
    return { group_by: 'day', rows };
  }

  /** P6.x-10: finance — commissions (provider_earning debits), payouts, refunds. */
  @Get('finance')
  async finance(@Query() q: ReportsQueryDto, @Query('format') format?: string, @Res({ passthrough: true }) res?: Response) {
    const rows: any[] = await this.conn.collection('wallet_transactions').aggregate([
      { $match: this.window(q) },
      { $group: { _id: { day: DAY, type: '$type' }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $project: { bucket: '$_id.day', type: '$_id.type', total: 1, count: 1, _id: 0 } },
      { $sort: { bucket: 1, type: 1 } },
    ]).toArray().catch(() => []);
    if (this.maybeCsv(res, 'finance', rows, format)) return;
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
    if (this.maybeCsv(res, 'insurance', rows, format)) return;
    return { group_by: q.group_by || 'state', rows };
  }

  /** P6.x-10: labs turnaround — avg hours from creation to report upload, by day. */
  @Get('labs-turnaround')
  async labsTurnaround(@Query() q: ReportsQueryDto, @Query('format') format?: string, @Res({ passthrough: true }) res?: Response) {
    const rows: any[] = await this.conn.collection('labbookings').aggregate([
      { $match: { status: 'REPORT_UPLOADED', ...this.window(q) } },
      { $group: { _id: DAY, count: { $sum: 1 }, avg_hours: { $avg: { $divide: [{ $subtract: ['$updatedAt', '$createdAt'] }, 3600000] } } } },
      { $project: { bucket: '$_id', count: 1, avg_hours: { $round: ['$avg_hours', 1] }, _id: 0 } },
      { $sort: { bucket: 1 } },
    ]).toArray().catch(() => []);
    if (this.maybeCsv(res, 'labs-turnaround', rows, format)) return;
    return { group_by: 'day', rows };
  }
}
