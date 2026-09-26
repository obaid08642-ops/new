import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { CurrentUser, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';

async function facilityIdOf(conn: Connection, u: string): Promise<string> {
  const account: any = await conn.collection('provider_accounts')
    .findOne({ $or: [{ id: u }, { user_id: u }, { _id: u }] } as any);
  return account?.facility_id || account?.id || u;
}

const now = () => new Date();

const uid = (u: any) => u?.id || u?._id || u?.user_id;

@Controller('provider/facility')
export class ProviderFacilityController {
  constructor(@InjectConnection() private conn: Connection) {}

  private async staffIds(fid: string): Promise<string[]> {
    const rows = await this.conn.collection('provider_accounts')
      .find({ facility_id: fid } as any).project({ id: 1, user_id: 1 }).toArray();
    return rows.flatMap((r: any) => [r.id, r.user_id].filter(Boolean).map(String));
  }

  @Get('audit-logs')
  async auditLogs(@CurrentUser() user: any, @Query('limit') limit = '100') {
    const fid = await facilityIdOf(this.conn, uid(user));
    const rows = await this.conn.collection('facility_audit_logs')
      .find({ facility_id: fid } as any).sort({ createdAt: -1 })
      .limit(Math.min(+limit || 100, 300)).toArray();
    return rows.map((r: any) => ({
      id: String(r._id), actor: r.actor_id, action: r.action, target: r.target,
      meta: r.meta || {}, created_at: r.createdAt,
    }));
  }

  @Get('calendar')
  async calendar(@CurrentUser() user: any, @Query('days') days = '30') {
    const fid = await facilityIdOf(this.conn, uid(user));
    const ids = await this.staffIds(fid);
    const horizon = new Date(Date.now() + Math.min(+days || 30, 90) * 86400000);
    const rows = await this.conn.collection('appointments')
      .find({
        $or: [{ facility_id: fid }, { provider_id: { $in: ids } }, { doctor_id: { $in: ids } }],
        scheduled_at: { $lte: horizon },
      } as any)
      .sort({ scheduled_at: 1 }).limit(300).toArray();
    return rows.map((a: any) => ({
      id: a.id || String(a._id), patient_id: a.patient_id, provider_id: a.provider_id || a.doctor_id,
      scheduled_at: a.scheduled_at, status: a.status, kind: a.kind || 'consultation',
    }));
  }

  @Get('patients/active')
  async activePatients(@CurrentUser() user: any) {
    const fid = await facilityIdOf(this.conn, uid(user));
    const ids = await this.staffIds(fid);
    const patientIds: string[] = await this.conn.collection('appointments').distinct('patient_id', {
      $or: [{ facility_id: fid }, { provider_id: { $in: ids } }, { doctor_id: { $in: ids } }],
      status: { $nin: ['CANCELLED', 'cancelled', 'COMPLETED', 'completed'] },
    } as any);
    if (!patientIds.length) return [];
    const users = await this.conn.collection('users')
      .find({ $or: [{ id: { $in: patientIds } }, { _id: { $in: patientIds } }] } as any)
      .project({ id: 1, full_name: 1, phone: 1, email: 1 }).limit(300).toArray();
    return users.map((x: any) => ({ id: x.id || String(x._id), name: x.full_name, phone: x.phone, email: x.email }));
  }

  @Get('subaccounts')
  async subaccounts(@CurrentUser() user: any) {
    const fid = await facilityIdOf(this.conn, uid(user));
    const rows = await this.conn.collection('provider_accounts')
      .find({ facility_id: fid } as any)
      .project({ id: 1, email: 1, role: 1, ptype: 1, status: 1, full_name: 1, createdAt: 1 })
      .limit(300).toArray();
    return rows.map((r: any) => ({
      id: r.id || String(r._id), email: r.email, name: r.full_name,
      role: r.role || r.ptype, status: r.status, created_at: r.createdAt,
    }));
  }

  @Get('shifts')
  async shifts(@CurrentUser() user: any, @Query('days') days = '14') {
    const fid = await facilityIdOf(this.conn, uid(user));
    const horizon = new Date(Date.now() + Math.min(+days || 14, 60) * 86400000);
    const rows = await this.conn.collection('shifts')
      .find({ facility_id: fid, date: { $lte: horizon } } as any)
      .sort({ date: 1 }).limit(300).toArray();
    return rows.map((s: any) => ({
      id: s.id || String(s._id), staff_id: s.staff_id, staff_name: s.staff_name,
      role: s.role, date: s.date, start: s.start, end: s.end, status: s.status || 'scheduled',
    }));
  }
}
