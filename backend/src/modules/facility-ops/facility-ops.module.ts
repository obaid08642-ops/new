import { Module, Injectable, Controller, Get, Post, Put, Patch, Delete, Param, Body, UseGuards, BadRequestException, NotFoundException, ForbiddenException, Optional } from '@nestjs/common';
import { CreateShiftDto, CreateAnnouncementDto, CreateResourceDto, UpdateResourceDto, CreateWardDto, AdmitDto, CheckInDto, BookSurgeryDto, DischargeDto, UpdateShiftDto} from './facility-ops.dto';
import { InjectModel, InjectConnection, MongooseModule } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { JwtAuthGuard, CurrentUser, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { v4 as uuid } from 'uuid';
import {
  Ward, WardDocument, WardSchema,
  Bed, BedDocument, BedSchema,
  Admission, AdmissionDocument, AdmissionSchema,
  Shift, ShiftDocument, ShiftSchema,
  Attendance, AttendanceDocument, AttendanceSchema,
  SurgeryBooking, SurgeryBookingDocument, SurgeryBookingSchema
} from '../../schemas/hospital-operations.schema';
import { FacilityInboxController } from './facility-compat.controller';

// ══════════════════════════════════════════════════════════════════════════════
//  SERVICES
// ══════════════════════════════════════════════════════════════════════════════

@Injectable()
export class BedsService {
  constructor(
    @InjectModel(Ward.name) private wardModel: Model<WardDocument>,
    @InjectModel(Bed.name) private bedModel: Model<BedDocument>,
    @InjectModel(Admission.name) private admissionModel: Model<AdmissionDocument>,
    @InjectConnection() private readonly conn: Connection,
  ) {}

  async listAdmissions(facilityId: string, status?: string) {
    const filter: any = { facility_id: facilityId };
    if (status) filter.status = status;
    const rows = await this.admissionModel.find(filter).sort({ admitted_at: -1 }).limit(200).lean();
    const patientIds = [...new Set(rows.map((r: any) => r.patient_id).filter(Boolean))];
    const users = patientIds.length
      ? await this.conn.db.collection('users')
          .find({ id: { $in: patientIds } }, { projection: { _id: 0, id: 1, full_name: 1, name: 1, phone: 1 } } as any)
          .toArray()
      : [];
    const nameMap = new Map<string, string>(users.map((u: any) => [u.id, u.full_name || u.name || u.phone || '']));
    return rows.map((r: any) => ({
      id: r.id,
      patient_id: r.patient_id,
      patient_name: nameMap.get(r.patient_id) || '',
      bed_id: r.bed_id,
      admitted_at: r.admitted_at,
      discharged_at: r.discharged_at || null,
      status: r.status,
      discharge_summary: r.discharge_summary || null,
    }));
  }

  async listWards(facilityId: string) {
    return this.wardModel.find({ facility_id: facilityId }).lean();
  }

  async getWardBeds(facilityId: string, wardId: string) {
    const ward = await this.wardModel.findOne({ id: { $eq: wardId }, facility_id: { $eq: facilityId } }).lean();
    if (!ward) throw new NotFoundException('ward_not_found');
    return this.bedModel.find({ ward_id: { $eq: wardId } }).lean();
  }

  async createWard(facilityId: string, name: string, totalBeds: number) {
    const ward = await this.wardModel.create({
      id: uuid(),
      facility_id: facilityId,
      name,
      total_beds: totalBeds,
      available_beds: totalBeds,
    });

    for (let i = 1; i <= totalBeds; i++) {
      await this.bedModel.create({
        id: uuid(),
        ward_id: ward.id,
        bed_number: `${name}-${i}`,
        type: 'general',
        status: 'available',
      });
    }

    return ward;
  }

  async admitPatient(facilityId: string, patientId: string, bedId: string) {
    const bed = await this.bedModel.findOne({ id: { $eq: bedId } });
    if (!bed) throw new NotFoundException('bed_not_found');
    if (bed.status !== 'available') throw new BadRequestException('bed_not_available');

    // the bed must belong to this facility
    const ward = await this.wardModel.findOne({ id: { $eq: bed.ward_id }, facility_id: { $eq: facilityId } });
    if (!ward) throw new NotFoundException('ward_not_found');
    const patient = await this.conn.db.collection('users').findOne({ id: { $eq: String(patientId || '') } }, { projection: { _id: 1 } });
    if (!patient) throw new NotFoundException('patient_not_found');

    // atomic: two admissions racing for the same bed — only one wins
    const taken = await this.bedModel.updateOne(
      { id: { $eq: bedId }, status: 'available' },
      { $set: { status: 'occupied', occupied_by_patient_id: patientId } }
    );
    if (!taken.modifiedCount) throw new BadRequestException('bed_not_available');

    const admission = await this.admissionModel.create({
      id: uuid(),
      patient_id: patientId,
      facility_id: facilityId,
      bed_id: bedId,
      admitted_at: new Date(),
      status: 'active',
    });

    await this.wardModel.updateOne(
      { id: bed.ward_id },
      { $inc: { available_beds: -1 } }
    );

    return admission;
  }

  async dischargePatient(facilityId: string, admissionId: string, summary?: { diagnosis?: string; medications?: string; instructions?: string }) {
    const admission = await this.admissionModel.findOne({ id: { $eq: admissionId }, facility_id: { $eq: facilityId } });
    if (!admission) throw new NotFoundException('admission_not_found');
    if (admission.status === 'discharged') throw new BadRequestException('already_discharged');

    const bed = await this.bedModel.findOne({ id: { $eq: admission.bed_id } });
    if (!bed) throw new NotFoundException('bed_not_found');

    await this.admissionModel.updateOne(
      { id: { $eq: admissionId } },
      {
        $set: {
          status: 'discharged',
          discharged_at: new Date(),
          ...(summary && (summary.diagnosis || summary.medications || summary.instructions)
            ? {
                discharge_summary: {
                  diagnosis: (summary.diagnosis || '').slice(0, 4000),
                  medications: (summary.medications || '').slice(0, 4000),
                  instructions: (summary.instructions || '').slice(0, 4000),
                  created_at: new Date(),
                },
              }
            : {}),
        },
      }
    );

    await this.bedModel.updateOne(
      { id: admission.bed_id },
      { $set: { status: 'available', occupied_by_patient_id: null } }
    );

    await this.wardModel.updateOne(
      { id: bed.ward_id },
      { $inc: { available_beds: 1 } }
    );

    return { ok: true };
  }
}

@Injectable()
export class ShiftsService {
  constructor(
    @InjectModel(Shift.name) private shiftModel: Model<ShiftDocument>,
    @InjectModel(Attendance.name) private attendanceModel: Model<AttendanceDocument>,
    @Optional() @InjectConnection() private readonly conn?: Connection,
  ) {}

  /** Shifts in the shape ShiftManagementScreen reads: doctor (name), dept, from, to, day, status. */
  async listShifts(facilityId: string) {
    const rows: any[] = await this.shiftModel.find({ facility_id: facilityId, status: { $ne: 'cancelled' } }).lean();
    const db = this.shiftModel.db;
    const ids = [...new Set(rows.map((r) => String(r.user_id)))];
    const users: any[] = ids.length ? await db.collection('users').find({ id: { $in: ids } }, { projection: { id: 1, full_name: 1 } }).toArray() : [];
    const names = new Map(users.map((u) => [u.id, u.full_name]));
    return rows.map((r) => ({
      ...r, doctor: names.get(String(r.user_id)) || '—', dept: r.department_id || null, from: r.start_time, to: r.end_time, day: r.day_of_week,
    }));
  }

  /** The person must belong to this facility: a sub-account it created, or a provider linked to it by invitation. */
  private async isFacilityMember(facilityId: string, userId: string): Promise<boolean> {
    const db = this.shiftModel.db;
    const linked = await db.collection('provider_accounts').findOne({ $or: [{ id: userId }, { user_id: userId }], facility_id: facilityId }, { projection: { _id: 1 } });
    if (linked) return true;
    const [facilityUser, member]: any[] = await Promise.all([
      db.collection('users').findOne({ id: facilityId }, { projection: { _id: 1 } }),
      db.collection('users').findOne({ id: userId }, { projection: { _id: 1 } }),
    ]);
    if (!facilityUser || !member) return false;
    return !!(await db.collection('hospitalstaffs').findOne({ hospital_id: facilityUser._id, user_id: member._id, is_active: true }, { projection: { _id: 1 } }));
  }

  async createShift(facilityId: string, body: { user_id: string; department_id?: string; start_time: string; end_time: string; day_of_week: string }) {
    const hhmm = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!hhmm.test(String(body.start_time)) || !hhmm.test(String(body.end_time))) throw new BadRequestException('time_must_be_HH:MM');
    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    if (!DAYS.includes(String(body.day_of_week))) throw new BadRequestException('invalid_day_of_week');
    if (!(await this.isFacilityMember(facilityId, String(body.user_id)))) throw new BadRequestException('not_a_facility_member');
    return this.shiftModel.create({
      id: uuid(),
      facility_id: facilityId,
      user_id: String(body.user_id), department_id: body.department_id, start_time: body.start_time, end_time: body.end_time, day_of_week: body.day_of_week,
      status: 'scheduled',
    });
  }

    async requestSubstitute(facilityId: string, shiftId: string) {
    const shift = await this.shiftModel.findOne({ id: { $eq: shiftId }, facility_id: { $eq: facilityId } });
    if (!shift) throw new NotFoundException('shift_not_found');
    await this.shiftModel.updateOne({ id: { $eq: shiftId }, facility_id: { $eq: facilityId } }, { $set: { status: 'substitute' } });
    return { ok: true };
  }
  async updateShift(facilityId: string, shiftId: string, body: UpdateShiftDto) {
    const shift = await this.shiftModel.findOne({ id: { $eq: shiftId }, facility_id: { $eq: facilityId } });
    if (!shift) throw new NotFoundException('shift_not_found');
    const allowed = ['user_id', 'department_id', 'start_time', 'end_time', 'day_of_week', 'status'];
    const patch = Object.fromEntries(Object.entries(body || {}).filter(([key, value]) => allowed.includes(key) && value !== undefined));
    if (!Object.keys(patch).length) throw new BadRequestException('no_mutable_shift_fields');
    await this.shiftModel.updateOne({ id: { $eq: shiftId }, facility_id: { $eq: facilityId } }, { $set: patch });
    return this.shiftModel.findOne({ id: { $eq: shiftId }, facility_id: { $eq: facilityId } }).lean();
  }
  async deleteShift(facilityId: string, shiftId: string) {
    const deleted = await this.shiftModel.findOneAndDelete({ id: { $eq: shiftId }, facility_id: { $eq: facilityId } }).lean();
    if (!deleted) throw new NotFoundException('shift_not_found');
    return { ok: true, id: shiftId };
  }


  /** LJ-01: the facility a staff member belongs to is resolved on the server from
   * provider_accounts.facility_id — never from a client body. */
  async resolveFacilityId(user: any): Promise<string> {
    const db = this.shiftModel.db;
    const account: any = await db.collection('provider_accounts').findOne(
      { $or: [{ id: user?.id }, { user_id: user?.id }] },
      { projection: { _id: 0, id: 1, user_id: 1, facility_id: 1, parent_provider_account_id: 1 } },
    ).catch(() => null);
    const facilityId = account?.facility_id || user?.facility_id || account?.parent_provider_account_id || user?.parent_provider_account_id;
    if (facilityId) return String(facilityId);
    // A hospital/facility account checking in for itself.
    return String(user?.id);
  }

  /** Configurable check-in radius (metres). System config wins; 300m default. */
  private async attendanceRadiusM(): Promise<number> {
    try {
      const cfg: any = await this.conn?.collection('system_config').findOne({ key: 'system_config' } as any);
      const value = Number(cfg?.value?.attendance_radius_m);
      if (Number.isFinite(value) && value > 0) return value;
    } catch { /* default */ }
    return 300;
  }

  private async facilityGeo(facilityId: string): Promise<{ lat: number; lng: number } | null> {
    const db = this.shiftModel.db;
    const profile: any = await db.collection('provider_profiles').findOne(
      { $or: [{ id: facilityId }, { user_id: facilityId }], $and: [{ $or: [{ 'geo.lat': { $exists: true } }, { 'location.lat': { $exists: true } }, { 'base_location.lat': { $exists: true } }] }] },
      { projection: { _id: 0, geo: 1, location: 1, base_location: 1 } },
    ).catch(() => null);
    const point = profile?.geo?.lat != null ? profile.geo : profile?.location?.lat != null ? profile.location : profile?.base_location;
    return point && point.lat != null && point.lng != null ? { lat: Number(point.lat), lng: Number(point.lng) } : null;
  }

  private static distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  /** LJ-01: one open attendance per person; GPS checked against the facility. */
  async checkIn(user: any, lat?: number, lng?: number) {
    const facilityId = await this.resolveFacilityId(user);
    const userId = String(user.id);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new BadRequestException('location_required');
    const open: any = await this.attendanceModel.findOne({ facility_id: facilityId, user_id: userId, check_out_time: null }).lean();
    if (open) throw new BadRequestException('already_checked_in');
    const geo = await this.facilityGeo(facilityId);
    if (geo) {
      const distance = ShiftsService.distanceMeters(geo, { lat: Number(lat), lng: Number(lng) });
      const radius = await this.attendanceRadiusM();
      if (distance > radius) throw new ForbiddenException('outside_facility_radius');
    }
    return this.attendanceModel.create({
      id: uuid(), user_id: userId, facility_id: facilityId,
      check_in_time: new Date(), location_lat: Number(lat), location_lng: Number(lng), status: 'present',
    });
  }

  /** LJ-01: only the owner or the facility can close a record. */
  async checkOut(user: any, attendanceId: string) {
    const att: any = await this.attendanceModel.findOne({ id: { $eq: attendanceId } });
    if (!att) throw new NotFoundException('attendance_record_not_found');
    const isOwner = String(att.user_id) === String(user.id);
    const isFacility = String(att.facility_id) === (await this.resolveFacilityId(user)) || user.role === 'admin';
    if (!isOwner && !isFacility) throw new ForbiddenException('not_attendance_owner');
    if (att.check_out_time) throw new BadRequestException('already_checked_out');
    await this.attendanceModel.updateOne({ id: { $eq: attendanceId } }, { $set: { check_out_time: new Date() } });
    return { ok: true, id: attendanceId, check_out_time: new Date() };
  }

  /** Real rows for the facility attendance screen (staff names resolved). */
  async getAttendance(user: any) {
    const facilityId = await this.resolveFacilityId(user);
    const rows: any[] = await this.attendanceModel.find({ facility_id: facilityId }).sort({ check_in_time: -1 }).limit(200).lean();
    const ids = [...new Set(rows.map((r) => String(r.user_id)))];
    const db = this.shiftModel.db;
    const users: any[] = ids.length ? await db.collection('users').find({ id: { $in: ids } }, { projection: { _id: 0, id: 1, full_name: 1, name: 1 } }).toArray() : [];
    const names = new Map(users.map((u: any) => [String(u.id), u.full_name || u.name || '—']));
    return rows.map((r) => ({ ...r, staff_name: names.get(String(r.user_id)) || '—', open: !r.check_out_time }));
  }
}

@Injectable()
export class SurgeriesService {
  constructor(
    @InjectModel(SurgeryBooking.name) private surgeryModel: Model<SurgeryBookingDocument>,
  ) {}

  async bookSurgery(facilityId: string, body: { patient_id: string; primary_surgeon_id: string; assistants?: string[]; ot_room_number: string; scheduled_at: Date; duration_mins: number }) {
    const start = new Date(body.scheduled_at);
    const end = new Date(start.getTime() + body.duration_mins * 60 * 1000);

    const conflicting = await this.surgeryModel.findOne({
      facility_id: { $eq: facilityId },
      ot_room_number: { $eq: body.ot_room_number },
      status: { $ne: 'cancelled' },
      scheduled_at: { $lt: end },
    });

    if (conflicting) {
      const conflictEnd = new Date(conflicting.scheduled_at.getTime() + conflicting.duration_mins * 60 * 1000);
      if (conflictEnd > start) {
        throw new BadRequestException('ot_room_already_booked_at_this_time');
      }
    }

    return this.surgeryModel.create({
      id: uuid(),
      facility_id: facilityId,
      patient_id: body.patient_id,
      primary_surgeon_id: body.primary_surgeon_id,
      assistants: body.assistants || [],
      ot_room_number: body.ot_room_number,
      scheduled_at: body.scheduled_at,
      duration_mins: body.duration_mins,
      status: 'confirmed',
    });
  }

  async listSurgeries(facilityId: string) {
    return this.surgeryModel.find({ facility_id: facilityId }).sort({ scheduled_at: 1 }).lean();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  CONTROLLERS
// ══════════════════════════════════════════════════════════════════════════════

@Controller('facility/beds')
@Roles(UserRole.HOSPITAL, UserRole.HOSPITAL_ADMIN, UserRole.ADMIN)
@UseGuards(JwtAuthGuard)
export class FacilityBedsController {
  constructor(private svc: BedsService) {}

  @Get('wards')
  listWards(@CurrentUser() u: any) {
    return this.svc.listWards(u.parent_provider_account_id || u.id);
  }

  @Get('wards/:wardId/beds')
  getWardBeds(@CurrentUser() u: any, @Param('wardId') wardId: string) {
    return this.svc.getWardBeds(u.parent_provider_account_id || u.id, wardId);
  }

  @Post('wards')
  createWard(@CurrentUser() u: any, @Body() b: CreateWardDto) {
    return this.svc.createWard(u.parent_provider_account_id || u.id, b.name, b.total_beds);
  }

  @Post('admission')
  admit(@CurrentUser() u: any, @Body() b: AdmitDto) {
    return this.svc.admitPatient(u.parent_provider_account_id || u.id, b.patient_id, b.bed_id);
  }

  @Get('admissions')
  admissions(@CurrentUser() u: any) {
    return this.svc.listAdmissions(u.parent_provider_account_id || u.id);
  }

  @Put('discharge/:admissionId')
  discharge(@CurrentUser() u: any, @Param('admissionId') id: string, @Body() b?: DischargeDto) {
    return this.svc.dischargePatient(u.parent_provider_account_id || u.id, id, b);
  }
}

@Controller('facility/shifts')
@Roles(UserRole.HOSPITAL, UserRole.HOSPITAL_ADMIN, UserRole.ADMIN)
@UseGuards(JwtAuthGuard)
export class FacilityShiftsController {
  constructor(private svc: ShiftsService) {}

  @Get()
  listShifts(@CurrentUser() u: any) {
    return this.svc.listShifts(u.parent_provider_account_id || u.id);
  }

  @Post()
  createShift(@CurrentUser() u: any, @Body() b: CreateShiftDto) {
    return this.svc.createShift(u.parent_provider_account_id || u.id, b);
  }

    @Post(':id/substitute')
  substitute(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.requestSubstitute(u.parent_provider_account_id || u.id, id);
  }
  @Patch(':id')
  updateShift(@CurrentUser() u: any, @Param('id') id: string, @Body() b: UpdateShiftDto) {
    return this.svc.updateShift(u.parent_provider_account_id || u.id, id, b);
  }
  @Delete(':id')
  deleteShift(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.deleteShift(u.parent_provider_account_id || u.id, id);
  }
}

/** LJ-01: any linked provider (not only the hospital role) can clock in/out for
 * the facility it belongs to. Facility id and GPS come from the server side. */
@Controller('facility/shifts/attendance')
@Roles(UserRole.DOCTOR, UserRole.NURSE, UserRole.NURSING, UserRole.HOME_CARE, UserRole.LAB, UserRole.RADIOLOGY, UserRole.PHARMACY, UserRole.HOSPITAL, UserRole.HOSPITAL_ADMIN, UserRole.ADMIN)
@UseGuards(JwtAuthGuard)
export class FacilityAttendanceController {
  constructor(private svc: ShiftsService) {}

  @Post('check-in')
  checkIn(@CurrentUser() u: any, @Body() b: CheckInDto) {
    return this.svc.checkIn(u, b?.lat, b?.lng);
  }

  @Post('check-out/:attendanceId')
  checkOut(@CurrentUser() u: any, @Param('attendanceId') id: string) {
    return this.svc.checkOut(u, id);
  }

  @Get()
  getAttendance(@CurrentUser() u: any) {
    return this.svc.getAttendance(u);
  }
}

@Controller('facility/surgeries')
@Roles(UserRole.HOSPITAL, UserRole.HOSPITAL_ADMIN, UserRole.ADMIN)
@UseGuards(JwtAuthGuard)
export class FacilitySurgeriesController {
  constructor(private svc: SurgeriesService) {}

  @Post('book')
  book(@CurrentUser() u: any, @Body() b: BookSurgeryDto) {
    return this.svc.bookSurgery(u.parent_provider_account_id || u.id, { ...b, scheduled_at: new Date(b.scheduled_at) });
  }

  @Get('schedule')
  list(@CurrentUser() u: any) {
    return this.svc.listSurgeries(u.parent_provider_account_id || u.id);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  ANNOUNCEMENTS + RESOURCES (facility-scoped, raw collections)
// ══════════════════════════════════════════════════════════════════════════════

@Controller('facility')
@Roles(UserRole.HOSPITAL, UserRole.HOSPITAL_ADMIN, UserRole.ADMIN)
@UseGuards(JwtAuthGuard)
export class FacilityCommsController {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  private fid(u: any) { return u.parent_provider_account_id || u.id; }

  @Get('announcements')
  listAnnouncements(@CurrentUser() u: any): Promise<any[]> {
    return this.conn.db.collection('facility_announcements')
      .find({ facility_id: this.fid(u) }, { projection: { _id: 0 } } as any)
      .sort({ createdAt: -1 }).limit(100).toArray();
  }

  @Post('announcements')
  async createAnnouncement(@CurrentUser() u: any, @Body() b: CreateAnnouncementDto) {
    const text = String(b?.text || '').trim().slice(0, 2000);
    if (!text) throw new BadRequestException('text is required');
    const doc = {
      id: uuid(),
      facility_id: this.fid(u),
      text,
      sender: u.full_name || u.name || '',
      sender_id: u.id,
      createdAt: new Date(),
    };
    await this.conn.db.collection('facility_announcements').insertOne(doc as any);
    const { _id, ...rest } = doc as any;
    return rest;
  }

  @Get('resources')
  listResources(@CurrentUser() u: any): Promise<any[]> {
    return this.conn.db.collection('facility_resources')
      .find({ facility_id: this.fid(u) }, { projection: { _id: 0 } } as any)
      .sort({ createdAt: -1 }).limit(200).toArray();
  }

  @Post('resources')
  async createResource(@CurrentUser() u: any, @Body() b: CreateResourceDto) {
    const nameAr = String(b?.name_ar || '').trim().slice(0, 200);
    const nameEn = String(b?.name_en || '').trim().slice(0, 200);
    if (!nameAr && !nameEn) throw new BadRequestException('name is required');
    const type = String(b?.type || 'consultation').slice(0, 40);
    const doc = {
      id: uuid(),
      facility_id: this.fid(u),
      branch_id: b?.branch_id ? String(b.branch_id).slice(0, 80) : null,
      name_ar: nameAr || nameEn,
      name_en: nameEn || nameAr,
      type,
      status: 'active',
      capacity: Math.max(1, Number(b?.capacity) || 1),
      createdAt: new Date(),
    };
    await this.conn.db.collection('facility_resources').insertOne(doc as any);
    const { _id, ...rest } = doc as any;
    return rest;
  }

  @Put('resources/:id')
  async updateResource(@CurrentUser() u: any, @Param('id') id: string, @Body() b: UpdateResourceDto) {
    const set: any = {};
    if (b?.name_ar !== undefined) set.name_ar = String(b.name_ar).slice(0, 200);
    if (b?.name_en !== undefined) set.name_en = String(b.name_en).slice(0, 200);
    if (b?.status !== undefined && ['active', 'maintenance', 'inactive'].includes(b.status)) set.status = b.status;
    if (b?.capacity !== undefined) set.capacity = Math.max(1, Number(b.capacity) || 1);
    if (!Object.keys(set).length) throw new BadRequestException('nothing to update');
    const r = await this.conn.db.collection('facility_resources')
      .findOneAndUpdate({ id, facility_id: this.fid(u) }, { $set: set }, { returnDocument: 'after' } as any);
    if (!r) throw new NotFoundException('resource not found');
    const { _id, ...rest } = r as any;
    return rest;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  MODULE
// ══════════════════════════════════════════════════════════════════════════════

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Ward.name, schema: WardSchema },
      { name: Bed.name, schema: BedSchema },
      { name: Admission.name, schema: AdmissionSchema },
      { name: Shift.name, schema: ShiftSchema },
      { name: Attendance.name, schema: AttendanceSchema },
      { name: SurgeryBooking.name, schema: SurgeryBookingSchema },
    ]),
  ],
  controllers: [FacilityBedsController, FacilityShiftsController, FacilityAttendanceController, FacilitySurgeriesController, FacilityCommsController, FacilityInboxController],
  providers: [BedsService, ShiftsService, SurgeriesService],
  exports: [BedsService, ShiftsService, SurgeriesService],
})
export class FacilityOpsModule {}
