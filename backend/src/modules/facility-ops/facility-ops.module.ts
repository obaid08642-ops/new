import { Module, Injectable, Controller, Get, Post, Put, Param, Body, UseGuards, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtAuthGuard, CurrentUser } from '../../common/auth.guard';
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

// ══════════════════════════════════════════════════════════════════════════════
//  SERVICES
// ══════════════════════════════════════════════════════════════════════════════

@Injectable()
export class BedsService {
  constructor(
    @InjectModel(Ward.name) private wardModel: Model<WardDocument>,
    @InjectModel(Bed.name) private bedModel: Model<BedDocument>,
    @InjectModel(Admission.name) private admissionModel: Model<AdmissionDocument>,
  ) {}

  async listWards(facilityId: string) {
    return this.wardModel.find({ facility_id: facilityId }).lean();
  }

  async getWardBeds(wardId: string) {
    return this.bedModel.find({ ward_id: wardId }).lean();
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
    const bed = await this.bedModel.findOne({ id: bedId });
    if (!bed) throw new NotFoundException('bed_not_found');
    if (bed.status !== 'available') throw new BadRequestException('bed_not_available');

    const ward = await this.wardModel.findOne({ id: bed.ward_id });
    if (!ward) throw new NotFoundException('ward_not_found');

    await this.bedModel.updateOne(
      { id: bedId },
      { $set: { status: 'occupied', occupied_by_patient_id: patientId } }
    );

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

  async dischargePatient(facilityId: string, admissionId: string) {
    const admission = await this.admissionModel.findOne({ id: admissionId, facility_id: facilityId });
    if (!admission) throw new NotFoundException('admission_not_found');
    if (admission.status === 'discharged') throw new BadRequestException('already_discharged');

    const bed = await this.bedModel.findOne({ id: admission.bed_id });
    if (!bed) throw new NotFoundException('bed_not_found');

    await this.admissionModel.updateOne(
      { id: admissionId },
      { $set: { status: 'discharged', discharged_at: new Date() } }
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
  ) {}

  async listShifts(facilityId: string) {
    return this.shiftModel.find({ facility_id: facilityId }).lean();
  }

  async createShift(facilityId: string, body: { user_id: string; department_id?: string; start_time: string; end_time: string; day_of_week: string }) {
    return this.shiftModel.create({
      id: uuid(),
      facility_id: facilityId,
      ...body,
      status: 'scheduled',
    });
  }

  async requestSubstitute(facilityId: string, shiftId: string) {
    const shift = await this.shiftModel.findOne({ id: shiftId, facility_id: facilityId });
    if (!shift) throw new NotFoundException('shift_not_found');
    
    await this.shiftModel.updateOne({ id: shiftId }, { $set: { status: 'substitute' } });
    return { ok: true };
  }

  async checkIn(facilityId: string, userId: string, lat?: number, lng?: number) {
    return this.attendanceModel.create({
      id: uuid(),
      user_id: userId,
      facility_id: facilityId,
      check_in_time: new Date(),
      location_lat: lat,
      location_lng: lng,
      status: 'present',
    });
  }

  async checkOut(facilityId: string, attendanceId: string) {
    const att = await this.attendanceModel.findOne({ id: attendanceId, facility_id: facilityId });
    if (!att) throw new NotFoundException('attendance_record_not_found');

    await this.attendanceModel.updateOne({ id: attendanceId }, { $set: { check_out_time: new Date() } });
    return { ok: true };
  }

  async getAttendance(facilityId: string) {
    return this.attendanceModel.find({ facility_id: facilityId }).sort({ check_in_time: -1 }).lean();
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
      facility_id: facilityId,
      ot_room_number: body.ot_room_number,
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
@UseGuards(JwtAuthGuard)
export class FacilityBedsController {
  constructor(private svc: BedsService) {}

  @Get('wards')
  listWards(@CurrentUser() u: any) {
    return this.svc.listWards(u.parent_provider_account_id || u.id);
  }

  @Get('wards/:wardId/beds')
  getWardBeds(@Param('wardId') wardId: string) {
    return this.svc.getWardBeds(wardId);
  }

  @Post('wards')
  createWard(@CurrentUser() u: any, @Body() b: { name: string; total_beds: number }) {
    return this.svc.createWard(u.parent_provider_account_id || u.id, b.name, b.total_beds);
  }

  @Post('admission')
  admit(@CurrentUser() u: any, @Body() b: { patient_id: string; bed_id: string }) {
    return this.svc.admitPatient(u.parent_provider_account_id || u.id, b.patient_id, b.bed_id);
  }

  @Put('discharge/:admissionId')
  discharge(@CurrentUser() u: any, @Param('admissionId') id: string) {
    return this.svc.dischargePatient(u.parent_provider_account_id || u.id, id);
  }
}

@Controller('facility/shifts')
@UseGuards(JwtAuthGuard)
export class FacilityShiftsController {
  constructor(private svc: ShiftsService) {}

  @Get()
  listShifts(@CurrentUser() u: any) {
    return this.svc.listShifts(u.parent_provider_account_id || u.id);
  }

  @Post()
  createShift(@CurrentUser() u: any, @Body() b: any) {
    return this.svc.createShift(u.parent_provider_account_id || u.id, b);
  }

  @Post(':id/substitute')
  substitute(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.requestSubstitute(u.parent_provider_account_id || u.id, id);
  }

  @Post('attendance/check-in')
  checkIn(@CurrentUser() u: any, @Body() b: { lat?: number; lng?: number }) {
    return this.svc.checkIn(u.parent_provider_account_id || u.id, u.id, b?.lat, b?.lng);
  }

  @Post('attendance/check-out/:attendanceId')
  checkOut(@CurrentUser() u: any, @Param('attendanceId') id: string) {
    return this.svc.checkOut(u.parent_provider_account_id || u.id, id);
  }

  @Get('attendance')
  getAttendance(@CurrentUser() u: any) {
    return this.svc.getAttendance(u.parent_provider_account_id || u.id);
  }
}

@Controller('facility/surgeries')
@UseGuards(JwtAuthGuard)
export class FacilitySurgeriesController {
  constructor(private svc: SurgeriesService) {}

  @Post('book')
  book(@CurrentUser() u: any, @Body() b: any) {
    return this.svc. bookSurgery(u.parent_provider_account_id || u.id, b);
  }

  @Get('schedule')
  list(@CurrentUser() u: any) {
    return this.svc.listSurgeries(u.parent_provider_account_id || u.id);
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
  controllers: [FacilityBedsController, FacilityShiftsController, FacilitySurgeriesController],
  providers: [BedsService, ShiftsService, SurgeriesService],
  exports: [BedsService, ShiftsService, SurgeriesService],
})
export class FacilityOpsModule {}
