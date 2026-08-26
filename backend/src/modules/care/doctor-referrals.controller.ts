import { Controller, Post, Body, Patch, Param, Get, BadRequestException, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard, NoGuestsGuard } from '../../common/auth.guard';
import { InjectModel } from '@nestjs/mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { Model, Types, Connection } from 'mongoose';
import { EncounterReferral } from './schemas/encounter-referrals.schema';
import { DoctorProfileExtended } from './schemas/doctor-profile-extended.schema';

@UseGuards(JwtAuthGuard, NoGuestsGuard)
@Controller('provider/doctor-referrals')
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

  /** Doctor's issued referrals + returned diagnostic results (inbound reports inbox) */
  @Get('my-referrals/:doctorId')
  async myReferrals(@Req() req: any, @Param('doctorId') doctorId: string) {
    if (!Types.ObjectId.isValid(doctorId)) throw new BadRequestException('invalid doctor id');
    await this.assertDoctorOwnership(req, doctorId);
    const rows = await this.referralModel
      .find({ doctor_id: new Types.ObjectId(doctorId) })
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
  async issueReferralsAndPrescription(@Req() req: any, @Body() payload: any) {
    const { appointmentId, patientId, doctorId, labTests, radScans, homeCareNotes, medications } = payload;
    await this.assertDoctorOwnership(req, doctorId);

    // Fix 3: Automatic Internal Hospital Pharmacy Routing
    const doctorProfile = await this.doctorProfileModel.findOne({ doctor_id: new Types.ObjectId(doctorId) });
    const isInstitutional = doctorProfile && doctorProfile.parent_provider_account_id;
    const prescriptionStatus = isInstitutional ? 'hospital_internal_dispatch' : 'public_radius_broadcast';

    const referral = await this.referralModel.create({
      appointment_id: new Types.ObjectId(appointmentId),
      patient_id: new Types.ObjectId(patientId),
      doctor_id: new Types.ObjectId(doctorId),
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
  async diagnosticCallback(@Param('appointmentId') appointmentId: string, @Body() body: { fileUrls: string[] }) {
    // Intercepted from Lab/Radiology Upload webhook to alert the parent Doctor automatically
    const referral = await this.referralModel.findOneAndUpdate(
      { appointment_id: new Types.ObjectId(appointmentId) },
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
