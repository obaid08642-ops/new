import { JwtAuthGuard } from '../../common/auth.guard';
import { UseGuards } from '@nestjs/common';
import { Controller, Post, Get, Patch, Body, Param, Query, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CurrentUser } from '../../common/auth.guard';
import { PromotionCampaignDocument } from '../../schemas/promotion-campaign.schema';
import { PatientCrmTagDocument } from '../../schemas/patient-crm-tag.schema';
import { OutboundReferralDocument } from '../../schemas/outbound-referral.schema';
import { User, UserDocument } from '../../schemas/user.schema';
import { HomeCareBooking, HomeCareBookingState, NursingVisitReport } from '../../schemas/home-care.schema';
import { RadiologyBooking, RadiologyBookingState } from '../../schemas/radiology.schema';
import { CreateCampaignDto, CreateReferralDto, UpdateCrmTagDto, HomeCareCheckinDto, HomeCareSubmitReportDto, RadiologyUploadReportDto } from './simulated-features.dto';

@UseGuards(JwtAuthGuard)
@Controller('provider/features')
export class SimulatedFeaturesController {
  constructor(
    @InjectModel('PromotionCampaign') private readonly campaignModel: Model<PromotionCampaignDocument>,
    @InjectModel('PatientCrmTag') private readonly crmModel: Model<PatientCrmTagDocument>,
    @InjectModel('OutboundReferral') private readonly referralModel: Model<OutboundReferralDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(HomeCareBooking.name) private readonly homeCareBookingModel: Model<any>,
    @InjectModel(NursingVisitReport.name) private readonly nursingVisitReportModel: Model<any>,
    @InjectModel(RadiologyBooking.name) private readonly radiologyBookingModel: Model<any>,
  ) {}

  // ===================== PROMOTIONS & CAMPAIGNS =====================
  @Post('promotions')
  async createCampaign(@CurrentUser() user: any, @Body() body: CreateCampaignDto) {
    return this.campaignModel.create({
      provider_id: user.id,
      title_ar: body.title_ar,
      title_en: body.title_en,
      original_price: body.original_price,
      discounted_price: body.discounted_price,
      start_date: new Date(body.start_date || Date.now()),
      end_date: new Date(body.end_date || Date.now() + 30 * 24 * 60 * 60 * 1000),
      image_url: body.image_url,
      target_parameters: body.target_parameters || {},
      status: 'pending',
    });
  }

  @Get('promotions')
  async listCampaigns(@CurrentUser() user: any) {
    return this.campaignModel.find({ provider_id: user.id }).sort({ createdAt: -1 });
  }

  // ===================== OUTBOUND REFERRALS =====================
  @Post('referrals')
  async createReferral(@CurrentUser() user: any, @Body() body: CreateReferralDto) {
    const code = 'REF-' + Math.floor(100000 + Math.random() * 900000).toString();
    return this.referralModel.create({
      referrer_doctor_id: user.id,
      patient_id: body.patient_id,
      referral_code: code,
      target_type: body.target_type,
      notes: body.notes,
      requested_tests: body.requested_tests || [],
      status: 'pending',
    });
  }

  @Get('referrals')
  async listReferrals(@CurrentUser() user: any) {
    return this.referralModel.find({ referrer_doctor_id: user.id }).sort({ createdAt: -1 });
  }

  // ===================== PATIENT CRM TAGS =====================
  /** List this provider's CRM-tagged patients with real names — no demo roster. */
  @Get('crm/patients')
  async listCrmPatients(@CurrentUser() user: any) {
    const tags = await this.crmModel.find({ provider_id: user.id }).sort({ updatedAt: -1 }).limit(200).lean();
    const ids = tags.map((t: any) => t.patient_id).filter(Boolean);
    const users = ids.length
      ? await this.userModel.find({ id: { $in: ids } }, { projection: { _id: 0, id: 1, full_name: 1 } }).lean()
      : [];
    const nameById = new Map(users.map((u: any) => [u.id, u.full_name]));
    return tags.map((t: any) => ({
      patient_id: t.patient_id,
      name: nameById.get(t.patient_id) || t.patient_id,
      is_vip: !!t.is_vip,
      is_favorite: !!t.is_favorite,
      is_blocked: !!t.is_blocked,
    }));
  }

  @Get('crm/patients/:id')
  async getCrmTag(@CurrentUser() user: any, @Param('id') patientId: string) {
    let tag = await this.crmModel.findOne({ provider_id: user.id, patient_id: patientId });
    if (!tag) {
      // Return defaults if not configured
      return {
        provider_id: user.id,
        patient_id: patientId,
        is_vip: false,
        is_favorite: false,
        is_blocked: false,
        custom_tags: [],
        private_notes: [],
      };
    }
    return tag;
  }

  @Patch('crm/patients/:id')
  async updateCrmTag(@CurrentUser() user: any, @Param('id') patientId: string, @Body() body: UpdateCrmTagDto) {
    let tag = await this.crmModel.findOne({ provider_id: user.id, patient_id: patientId });
    if (!tag) {
      tag = new this.crmModel({
        provider_id: user.id,
        patient_id: patientId,
      });
    }

    if (body.is_vip !== undefined) tag.is_vip = body.is_vip;
    if (body.is_favorite !== undefined) tag.is_favorite = body.is_favorite;
    if (body.is_blocked !== undefined) tag.is_blocked = body.is_blocked;
    if (body.blocked_reason !== undefined) tag.blocked_reason = body.blocked_reason;
    if (body.custom_tags !== undefined) tag.custom_tags = body.custom_tags;
    if (body.private_notes !== undefined) tag.private_notes = body.private_notes;

    return tag.save();
  }

  // ===================== OTHER WORKFLOWS DB-BACKED ENDPOINTS =====================
  @Post('home-care/bookings/:id/check-in')
  async homeCareCheckin(@Param('id') bookingId: string, @Body() body: HomeCareCheckinDto, @CurrentUser() user: any) {
    const booking = await this.homeCareBookingModel.findById(bookingId);
    if (!booking) throw new NotFoundException('Booking not found');
    
    booking.state = HomeCareBookingState.IN_PROGRESS;
    await booking.save();

    const report = await this.nursingVisitReportModel.create({
      home_care_order_id: bookingId,
      nurse_id: user.id,
      check_in_time: new Date(),
      gps_lat: body.lat,
      gps_lng: body.lng,
    });
    
    return { ok: true, bookingId, checkedInAt: report.check_in_time, verifiedGps: !!(body.lat && body.lng) };
  }

  @Post('home-care/reports/:id/submit')
  async homeCareSubmitReport(@Param('id') bookingId: string, @Body() body: HomeCareSubmitReportDto, @CurrentUser() user: any) {
    const booking = await this.homeCareBookingModel.findById(bookingId);
    if (!booking) throw new NotFoundException('Booking not found');

    booking.state = HomeCareBookingState.COMPLETED;
    await booking.save();

    const report = await this.nursingVisitReportModel.findOneAndUpdate(
      { home_care_order_id: bookingId },
      { 
        check_out_time: new Date(),
        completed_tasks: body.completed_tasks || [],
        vitals_logged: body.vitals_logged || {},
        notes: body.notes 
      },
      { new: true, upsert: true }
    );

    return { ok: true, bookingId, reportId: report.id, status: 'submitted' };
  }

  @Post('radiology/bookings/:id/upload-report')
  async uploadRadiologyReport(@Param('id') bookingId: string, @Body() body: RadiologyUploadReportDto) {
    const booking = await this.radiologyBookingModel.findById(bookingId);
    if (!booking) throw new NotFoundException('Booking not found');

    const reportEntry = {
      result_id: body.file_id || 'FILE-' + Date.now().toString(),
      tracking_id: booking.tracking_id,
      at: new Date(),
      report_text: body.report_text
    };

    booking.reports.push(reportEntry);
    await booking.save();

    return { ok: true, bookingId, status: 'uploaded', report_text: body.report_text };
  }

  @Post('radiology/bookings/:id/publish-report')
  async publishRadiologyReport(@Param('id') bookingId: string) {
    const booking = await this.radiologyBookingModel.findById(bookingId);
    if (!booking) throw new NotFoundException('Booking not found');

    booking.state = RadiologyBookingState.REPORT_PUBLISHED;
    await booking.save();

    return { ok: true, bookingId, status: 'published' };
  }
}
