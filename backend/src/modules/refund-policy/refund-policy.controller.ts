import { Body, Controller, Get, Put, UseGuards, BadRequestException } from '@nestjs/common';
import { recordAudit } from '../../common/audit-record';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { CurrentUser, JwtAuthGuard, Public, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { DEFAULT_REFUND_POLICY } from './refund-policy.defaults';


import { Permission, RequirePermissions } from '../../common/permissions';
@Controller('refund-policy')
export class PublicRefundPolicyController {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  @Public()
  @Get()
  async get(): Promise<any> {
    const doc: any = await this.conn.collection('system_configs').findOne({ key: 'refund_policy' }, { projection: { _id: 0, value: 1 } });
    return doc?.value || DEFAULT_REFUND_POLICY;
  }
}

@Controller('admin/refund-policy')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminRefundPolicyController {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  @Get()
  async get(): Promise<any> {
    const doc: any = await this.conn.collection('system_configs').findOne({ key: 'refund_policy' }, { projection: { _id: 0, value: 1 } });
    return doc?.value || DEFAULT_REFUND_POLICY;
  }

  @RequirePermissions(Permission.FINANCE_CONFIG_EDIT)
  @Put()
  async set(@CurrentUser() u: any, @Body() body: any): Promise<any> {
    const policy = body || {};
    const bad: string[] = [];
    const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
    const c = policy.consultation || {};
    if (!num(c.full_refund_min_hours) || c.full_refund_min_hours < 0) bad.push('consultation.full_refund_min_hours');
    if (!num(c.late_refund_percent) || c.late_refund_percent < 0 || c.late_refund_percent > 100) bad.push('consultation.late_refund_percent');
    if (!num(c.patient_no_show_percent) || c.patient_no_show_percent < 0 || c.patient_no_show_percent > 100) bad.push('consultation.patient_no_show_percent');
    if (!num(c.free_reschedules) || c.free_reschedules < 0) bad.push('consultation.free_reschedules');
    if (!num(c.free_reschedule_min_hours) || c.free_reschedule_min_hours < 0) bad.push('consultation.free_reschedule_min_hours');
    const h = policy.home_visit || {};
    if (!num(h.trip_fee_sar) || h.trip_fee_sar < 0) bad.push('home_visit.trip_fee_sar');
    if (!num(h.patient_absent_percent) || h.patient_absent_percent < 0 || h.patient_absent_percent > 100) bad.push('home_visit.patient_absent_percent');
    const p = policy.pharmacy || {};
    if (typeof p.refund_delivery_fee_before_dispatch !== 'boolean') bad.push('pharmacy.refund_delivery_fee_before_dispatch');
    if (bad.length) throw new BadRequestException(`invalid_refund_policy: ${bad.join(', ')}`);
    // Only the validated fields are stored; anything else in the body is dropped.
    const clean = {
      consultation: {
        full_refund_min_hours: c.full_refund_min_hours, late_refund_percent: c.late_refund_percent,
        patient_no_show_percent: c.patient_no_show_percent, free_reschedules: c.free_reschedules,
        free_reschedule_min_hours: c.free_reschedule_min_hours,
      },
      home_visit: { trip_fee_sar: h.trip_fee_sar, patient_absent_percent: h.patient_absent_percent },
      pharmacy: { refund_delivery_fee_before_dispatch: p.refund_delivery_fee_before_dispatch },
    };
    const now = new Date();
    await this.conn.collection('system_configs').updateOne(
      { key: 'refund_policy' },
      { $set: { value: clean, updated_by: u?.id, updatedAt: now }, $setOnInsert: { key: 'refund_policy', createdAt: now } },
      { upsert: true },
    );
    await recordAudit(this.conn, { action: 'refund_policy.set', user_id: u?.id, role: 'admin', resource_kind: 'system_config', resource_id: 'system_config:refund_policy', changes: { after: clean as Record<string, any> }, severity: 'warn' });
    return { ok: true, policy: clean };
  }
}
