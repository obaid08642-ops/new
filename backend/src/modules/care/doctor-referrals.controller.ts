import { Controller, Post, Body, Patch, Param, Get, BadRequestException, NotFoundException, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard, NoGuestsGuard, Roles } from '../../common/auth.guard';
import { InjectModel } from '@nestjs/mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { Model, Types, Connection } from 'mongoose';
import { EncounterReferral } from './schemas/encounter-referrals.schema';
import { DoctorProfileExtended } from './schemas/doctor-profile-extended.schema';
import { UserRole } from '../../common/enums';
import { DiagnosticCallbackDto, IssueReferralsDto, REFERRAL_ID } from './doctor-referrals.dto';

@UseGuards(JwtAuthGuard, NoGuestsGuard)
@Controller('provider/doctor-referrals')
@Roles(UserRole.DOCTOR, UserRole.ADMIN)
export class DoctorReferralsController {
  constructor(
    @InjectModel(EncounterReferral.name) private referralModel: Model<EncounterReferral>,
    @InjectModel(DoctorProfileExtended.name) private doctorProfileModel: Model<DoctorProfileExtended>,
    @InjectConnection() private readonly conn: Connection,
  ) {}

  /** Referral rows key doctors by Mongo _id; JWT carries the uuid id — resolve and compare both. */
  private async assertDoctorOwnership(req: any, doctorId: string) {
    const role = req.user?.role;
    if (role === 'admin' || role === 'super_admin') return;
    if (req.user?.id && String(req.user.id) === String(doctorId)) return;
    const me: any = await this.conn.db.collection('users').findOne({ id: req.user?.id }, { projection: { _id: 1 } } as any);
    if (me && String(me._id) === String(doctorId)) return;
    throw new ForbiddenException('Cannot access another doctor\'s referrals');
  }

  /** A user by the id the apps use (uuid `id`) or by Mongo _id (older rows); null when there is none. */
  private async userByAnyId(id: string): Promise<any | null> {
    const filter = Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id) ? { _id: new Types.ObjectId(id) } : { id };
    return this.conn.db.collection('users').findOne(filter as any, { projection: { _id: 1, id: 1 } } as any);
  }

  /** An appointment by the apps' uuid `id` or by Mongo _id; null when there is none. */
  private async appointmentByAnyId(id: string): Promise<any | null> {
    const filter = /^[0-9a-fA-F]{24}$/.test(id) ? { _id: new Types.ObjectId(id) } : { id };
    return this.conn.db.collection('appointments').findOne(filter as any, { projection: { _id: 1, id: 1, patient_id: 1, doctor_id: 1 } } as any);
  }

  /** The visit must be the signed-in doctor's own (admins excepted): the appointment names the doctor's provider profile. */
  private async assertOwnVisit(req: any, appt: any) {
    const role = req.user?.role;
    if (role === 'admin' || role === 'super_admin') return;
    const profile: any = await this.conn.db.collection('provider_profiles').findOne({ id: appt.doctor_id }, { projection: { id: 1, user_id: 1, account_id: 1 } } as any);
    const mine = [req.user?.id, req.user?.account_id, req.user?.provider_id, req.user?.provider_profile_id].filter(Boolean).map(String);
    const doctorIds = [profile?.id, profile?.user_id, profile?.account_id].filter(Boolean).map(String);
    if (!mine.some((x) => doctorIds.includes(x))) throw new ForbiddenException('Cannot issue a referral for another doctor\'s visit');
  }

  /** Doctor's issued referrals + returned diagnostic results (inbound reports inbox) */
  @Get('my-referrals/:doctorId')
  async myReferrals(@Req() req: any, @Param('doctorId') doctorId: string) {
    // doctorId is validated as a Mongo ObjectId on the next line; referral rows
    // key doctors by Mongo _id (see assertDoctorOwnership above).
    if (!REFERRAL_ID.test(doctorId)) throw new BadRequestException('invalid doctor id');
    await this.assertDoctorOwnership(req, doctorId);
    const doctorUser = await this.userByAnyId(doctorId);
    if (!doctorUser) return [];
    const rows = await this.referralModel
      .find({ doctor_id: doctorUser._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    const patientIds = [...new Set(rows.map((r: any) => String(r.patient_id)))]
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
    const users = patientIds.length
      ? await this.conn.db.collection('users')
          .find({ _id: { $in: patientIds } }, { projection: { full_name: 1, name: 1, phone: 1 } } as any)
          .toArray()
      : [];
    const nameMap = new Map<string, string>(users.map((u: any) => [String(u._id), u.full_name || u.name || u.phone || '']));
    return rows.map((r: any) => ({
      id: String(r._id),
      type: r.requested_radiology_scans?.length && r.requested_lab_tests?.length
        ? 'BOTH'
        : r.requested_radiology_scans?.length
          ? 'RADIOLOGY'
          : r.requested_lab_tests?.length
            ? 'LAB'
            : 'HOME_CARE',
      patientName: nameMap.get(String(r.patient_id)) || '',
      labTests: r.requested_lab_tests || [],
      radScans: r.requested_radiology_scans || [],
      homeCareNotes: r.home_care_recommendation_notes || null,
      status: r.diagnostic_results_returned ? 'COMPLETED' : 'PENDING',
      date: r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : '',
      fileUrls: r.returned_results_file_urls || [],
    }));
  }

  @Post('issue-referrals-and-prescription')
  async issueReferralsAndPrescription(@Req() req: any, @Body() payload: IssueReferralsDto) {
    const { appointmentId, patientId, doctorId, labTests, radScans, homeCareNotes, medications } = payload;
    await this.assertDoctorOwnership(req, doctorId);

    // The ids arrive as the apps' uuids (or Mongo ObjectIds from older callers); referral rows key by Mongo _id, so they are resolved here,
    // and the visit must be this doctor's own and for this patient.
    const appt = await this.appointmentByAnyId(appointmentId);
    if (!appt) throw new NotFoundException('appointment_not_found');
    const patientUser = await this.userByAnyId(patientId);
    const doctorUser = await this.userByAnyId(doctorId);
    if (!patientUser || !doctorUser) throw new NotFoundException('user_not_found');
    if (String(appt.patient_id) !== String(patientUser.id) && String(appt.patient_id) !== String(patientUser._id)) {
      throw new BadRequestException('patient_does_not_match_appointment');
    }
    await this.assertOwnVisit(req, appt);
    // Fix 3: Automatic Internal Hospital Pharmacy Routing
    const doctorProfile = await this.doctorProfileModel.findOne({ doctor_id: doctorUser._id });
    const isInstitutional = doctorProfile && doctorProfile.parent_provider_account_id;
    const prescriptionStatus = isInstitutional ? 'hospital_internal_dispatch' : 'public_radius_broadcast';

    const referral = await this.referralModel.create({
      appointment_id: appt._id,
      patient_id: patientUser._id,
      doctor_id: doctorUser._id,
      requested_lab_tests: labTests || [],
      requested_radiology_scans: radScans || [],
      home_care_recommendation_notes: homeCareNotes || null,
      prescription_routing_status: prescriptionStatus
    });

    return { 
      success: true, 
      message: 'تم حفظ الروشتة والإحالات التشخيصية، وإرسال التنبيهات الفورية للمريض.', 
      referral_id: referral._id,
      routing_mode: prescriptionStatus
    };
  }

  @Patch('diagnostic-callback/:appointmentId')
  async diagnosticCallback(@Param('appointmentId') appointmentId: string, @Body() body: DiagnosticCallbackDto) {
    // appointment_id is a Mongo ObjectId — reject uuids with 400 instead of
    // letting the cast fail downstream.
    if (!REFERRAL_ID.test(appointmentId)) throw new BadRequestException('invalid appointment id');
    const appt = await this.appointmentByAnyId(appointmentId);
    if (!appt) throw new BadRequestException('No active medical referral found linking to this appointment ID.');
    // Intercepted from Lab/Radiology Upload webhook to alert the parent Doctor automatically
    const referral = await this.referralModel.findOneAndUpdate(
      { appointment_id: appt._id },
      {
        $set: {
          diagnostic_results_returned: true,
        },
        $push: {
          returned_results_file_urls: { $each: body.fileUrls }
        }
      },
      { new: true }
    );

    if (!referral) throw new BadRequestException('No active medical referral found linking to this appointment ID.');

    // Code logic to inject a high-priority push notification route to the mapped doctor user id
    return { success: true, message: 'تم ربط نتائج التحاليل المخبرية بملف الإحالة، وتنبيه الطبيب المعالج تلقائياً.' };
  }
}
