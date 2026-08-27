import { JwtAuthGuard } from '../../common/auth.guard';
import { UseGuards } from '@nestjs/common';
import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { MedicalReportsService } from './medical-reports.service';
import { CurrentUser } from '../../common/auth.guard';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@UseGuards(JwtAuthGuard)
@Controller('medical-reports')
export class MedicalReportsController {
  constructor(private readonly svc: MedicalReportsService, @InjectConnection() private readonly conn: Connection) {}

  /** Unified health timeline — merged REAL events from appointments, lab/radiology
   *  bookings, prescriptions and vital readings. Empty array when the patient has none. */
  @Get('timeline')
  async timeline(@CurrentUser() user: any) {
    const pid = user.id;
    const [appts, labs, rads, rxs, vitals] = await Promise.all([
      this.conn.collection('appointments').find({ patient_id: pid }, { projection: { _id: 0, id: 1, doctor_name: 1, type: 1, scheduled_at: 1, state: 1, status: 1, createdAt: 1 } }).sort({ createdAt: -1 }).limit(50).toArray().catch(() => []),
      this.conn.collection('labbookings').find({ patient_id: pid }, { projection: { _id: 0, id: 1, status: 1, createdAt: 1, scheduled_at: 1 } }).sort({ createdAt: -1 }).limit(50).toArray().catch(() => []),
      this.conn.collection('radiologybookings').find({ patient_id: pid }, { projection: { _id: 0, id: 1, status: 1, createdAt: 1, scheduled_at: 1 } }).sort({ createdAt: -1 }).limit(50).toArray().catch(() => []),
      this.conn.collection('prescriptions').find({ patient_id: pid }, { projection: { _id: 0, id: 1, state: 1, status: 1, createdAt: 1, doctor_name: 1 } }).sort({ createdAt: -1 }).limit(50).toArray().catch(() => []),
      this.conn.collection('vitalreadings').find({ patient_id: pid }, { projection: { _id: 0, id: 1, type: 1, value: 1, unit: 1, measured_at: 1 } }).sort({ measured_at: -1 }).limit(50).toArray().catch(() => []),
    ]);
    const events: any[] = [];
    for (const a of appts as any[]) events.push({ id: a.id, type: 'appointment', title: a.doctor_name ? `موعد — ${a.doctor_name}` : 'موعد طبي', date: a.scheduled_at || a.createdAt, status: a.state || a.status });
    for (const l of labs as any[]) events.push({ id: l.id, type: 'lab', title: 'حجز تحاليل مخبرية', date: l.scheduled_at || l.createdAt, status: l.status });
    for (const r of rads as any[]) events.push({ id: r.id, type: 'lab', title: 'حجز أشعة', date: r.scheduled_at || r.createdAt, status: r.status, kind: 'radiology' });
    for (const x of rxs as any[]) events.push({ id: x.id, type: 'prescription', title: x.doctor_name ? `وصفة — ${x.doctor_name}` : 'وصفة طبية', date: x.createdAt, status: x.state || x.status });
    for (const v of vitals as any[]) events.push({ id: v.id, type: 'vitals', title: `قياس ${v.type}: ${v.value} ${v.unit || ''}`.trim(), date: v.measured_at, status: 'recorded' });
    events.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    return events;
  }

  @Get('mine')
  mine(@CurrentUser() user: any, @Query('type') type?: string, @Query('q') q?: string, @Query('limit') limit?: string) {
    return this.svc.list(user, { type, q, limit: limit ? parseInt(limit, 10) : undefined });
  }

  @Get('track/:trackingId')
  track(@CurrentUser() user: any, @Param('trackingId') tracking: string) {
    return this.svc.byTracking(tracking, user);
  }

  @Get(':id')
  one(@CurrentUser() user: any, @Param('id') id: string) { return this.svc.one(user, id); }

  @Post()
  create(@CurrentUser() user: any, @Body() body: any) { return this.svc.create(user, body); }
}
