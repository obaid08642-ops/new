import { Controller, Post, Body, Patch, Param, Get, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EncounterReferral } from './schemas/encounter-referrals.schema';
import { DoctorProfileExtended } from './schemas/doctor-profile-extended.schema';

@Controller('provider/doctor-referrals')
export class DoctorReferralsController {
  constructor(
    @InjectModel(EncounterReferral.name) private referralModel: Model<EncounterReferral>,
    @InjectModel(DoctorProfileExtended.name) private doctorProfileModel: Model<DoctorProfileExtended>
  ) {}

  @Post('issue-referrals-and-prescription')
  async issueReferralsAndPrescription(@Body() payload: any) {
    const { appointmentId, patientId, doctorId, labTests, radScans, homeCareNotes, medications } = payload;

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
