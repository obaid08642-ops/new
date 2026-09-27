import { Controller, Get, Post, Body, Param, ForbiddenException, NotFoundException, BadRequestException, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { CurrentUser, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { AddNoteDto, VerifyGpsDto } from '../compat/compat.dto';

const byStringOrObjectId = (id: string) => {
  const or: any[] = [{ id }, { _id: id }];
  if (/^[0-9a-fA-F]{24}$/.test(String(id))) or.push({ _id: new (require('mongoose').Types.ObjectId)(id) });
  return { $or: or };
};

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const now = () => new Date();

const uid = (u: any) => u?.id || u?._id || u?.user_id;

const NURSING_ACTIVE_STATES = ['ASSIGNED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'assigned', 'accepted', 'en_route', 'arrived', 'in_progress'];

@Controller('nursing')
@Roles(UserRole.NURSE, UserRole.NURSING, UserRole.HOME_CARE, UserRole.ADMIN)
export class NursingCompatController {
  constructor(@InjectConnection() private conn: Connection) {}

  @Get('jobs/active')
  async activeJobs(@CurrentUser() user: any) {
    const u = uid(user);
    const rows = await this.conn.collection('homecarebookings')
      .find({
        $or: [{ provider_id: u }, { nurse_id: u }, { provider_account_id: u }],
        $and: [{ $or: [{ state: { $in: NURSING_ACTIVE_STATES } }, { status: { $in: NURSING_ACTIVE_STATES } }] }],
      } as any)
      .sort({ createdAt: -1 }).limit(100).toArray();
    return rows.map((b: any) => ({
      id: b.id || String(b._id), state: b.state || b.status,
      patient_id: b.patient_id, address: b.address, scheduled_at: b.scheduled_at,
      service: b.service_name || b.service_id, timers: b.timers || {},
    }));
  }

  // P5.3: removed — POST /nursing/notes is served by the canonical createNote
  // (home-care module), which targets the explicit booking clients send.
  // (Deletion marker kept so the route history stays greppable.)
  @Post('jobs/:id/notes')
  async addNote(@Param('id') id: string, @CurrentUser() user: any, @Body() body: AddNoteDto) {
    const u = uid(user);
    const text = String(body?.note || body?.body || '').trim();
    if (!text) throw new BadRequestException('نص الملاحظة مطلوب');
    const b: any = await this.conn.collection('homecarebookings').findOne(byStringOrObjectId(id) as any);
    if (!b) throw new NotFoundException('الطلب غير موجود');
    const assigned = [b.provider_id, b.nurse_id, b.provider_account_id].filter(Boolean).map(String);
    if (assigned.length && !assigned.includes(String(u))) throw new ForbiddenException('الطلب ليس مسنداً إليك');
    const ins = await this.conn.collection('nursingvisitreports').insertOne({
      booking_id: b.id || String(b._id), patient_id: b.patient_id, nurse_id: u,
      note: text, createdAt: now(),
    } as any);
    await this.conn.collection('homecarebookings').updateOne(
      byStringOrObjectId(id) as any, { $set: { updatedAt: now() } },
    );
    return { ok: true, id: String(ins.insertedId) };
  }

  @Post('coverage/verify-gps')
  async verifyGps(@CurrentUser() user: any, @Body() body: VerifyGpsDto) {
    const u = uid(user);
    const lat = Number(body?.lat), lng = Number(body?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new BadRequestException('إحداثيات غير صالحة');
    const nurse: any = await this.conn.collection('nurse_providers')
      .findOne({ $or: [{ nurse_id: u }, { provider_id: u }, { account_id: u }, { user_id: u }] } as any);
    const center = nurse?.base_location || nurse?.geo || null;
    const radius = Number(nurse?.coverage_radius_km || 0);
    if (!center || !radius || !Number.isFinite(Number(center.lat)) || !Number.isFinite(Number(center.lng))) {
      return { covered: true, reason: 'no_geofence' };
    }
    const dist = haversineKm(Number(center.lat), Number(center.lng), lat, lng);
    return { covered: dist <= radius, distance_km: Math.round(dist * 100) / 100, radius_km: radius };
  }
}
