import { Controller, Post, Get, Patch, Delete, Body, Param, Query, Req, Inject } from '@nestjs/common';
import { LedgerService } from '../finance-engine/finance-engine.module';
import { ProviderAuthService } from './services/provider-auth.service';
import { ProviderProfileService } from './services/provider-profile.service';
import { ProviderOperatorsService } from './services/provider-operators.service';
import { ProviderAdminService } from './services/provider-admin.service';
import { ProviderRequestEngineService } from './services/provider-request-engine.service';
import { ProviderNotificationsService } from './services/provider-notifications.service';
import { ProviderScheduleService } from './services/provider-schedule.service';
import { ProviderDashboardService } from './services/provider-dashboard.service';
import { ProviderSeedService } from './services/provider-seed.service';
import { ServiceCapabilityService } from './services/service-capability.service';
import { SchedulingEngineService } from './services/scheduling-engine.service';
import { ProviderScoringService } from './services/provider-scoring.service';
import { ProviderMatchingService } from './services/provider-matching.service';
import { AssignmentStrategyService } from './services/assignment-strategy.service';
import { ProviderImageProcessorService } from './services/provider-image-processor.service';
import { Public, CurrentUser, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { OtpPurpose } from './schemas';

function meta(req: any) { return { ip: req?.ip || req?.headers?.['x-forwarded-for'], ua: req?.headers?.['user-agent'] }; }

@Controller('provider/auth')
export class ProviderAuthController {
  constructor(private readonly svc: ProviderAuthService) {}
  @Public() @Post('register')
  register(@Body() body: any, @Req() req: any) { return this.svc.register({ ...body, meta: meta(req) }); }
  @Public() @Post('login')
  login(@Body() body: any, @Req() req: any) { return this.svc.login({ ...body, meta: meta(req) }); }
  @Public() @Post('refresh')
  refresh(@Body() body: any, @Req() req: any) { return this.svc.refresh({ ...body, meta: meta(req) }); }
  @Post('logout')
  logout(@Body() body: any, @Req() req: any) { return this.svc.logout({ ...body, meta: meta(req) }); }
  @Public() @Post('send-otp')
  sendOtp(@Body() body: any, @Req() req: any) {
    const purpose: OtpPurpose = body.purpose || OtpPurpose.EMAIL_VERIFICATION;
    return this.svc.sendOtp({ email: body.email, purpose, meta: meta(req) });
  }
  @Public() @Post('verify-email')
  verifyEmail(@Body() body: any, @Req() req: any) { return this.svc.verifyEmail({ email: body.email, code: body.code, meta: meta(req) }); }
  @Public() @Post('forgot-password')
  forgot(@Body() body: any, @Req() req: any) { return this.svc.forgotPassword({ email: body.email, meta: meta(req) }); }
  @Public() @Post('verify-reset-code')
  verifyResetCode(@Body() body: any, @Req() req: any) { return this.svc.verifyResetCode({ email: body.email, code: body.code, meta: meta(req) }); }
  @Public() @Post('reset-password')
  reset(@Body() body: any, @Req() req: any) { return this.svc.resetPassword({ email: body.email, code: body.code, new_password: body.new_password, meta: meta(req) }); }
  @Get('me')
  me(@CurrentUser() user: any) { return this.svc.me(user); }
}

@Controller('provider')
export class ProviderProfileController {
  constructor(
    private readonly svc: ProviderProfileService,
    private readonly processor: ProviderImageProcessorService
  ) {}
  @Get('profile') get(@CurrentUser() u: any) { return this.svc.getProfile(u); }
  @Patch('profile') update(@CurrentUser() u: any, @Body() body: any) { return this.svc.updateProfile(u, body); }
  @Post('profile/phones') addPhone(@CurrentUser() u: any, @Body() body: any) { return this.svc.addPhone(u, body); }
  @Delete('profile/phones/:phone_id') removePhone(@CurrentUser() u: any, @Param('phone_id') pid: string) { return this.svc.removePhone(u, pid); }

  @Post('kyc/documents') uploadDoc(@CurrentUser() u: any, @Body() body: any) { return this.svc.uploadDocument(u, body); }
  @Get('kyc/documents') listDocs(@CurrentUser() u: any) { return this.svc.listDocuments(u); }

  @Get('directory') directory() { return this.svc.directory(); }

  @Post('bank-account') upsertBank(@CurrentUser() u: any, @Body() body: any) { return this.svc.upsertBank(u, body); }
  @Get('bank-account') getBank(@CurrentUser() u: any) { return this.svc.getBank(u); }
  @Public() @Get('banks') banks() { return this.svc.banks_list(); }

  @Post('profile/image/upload')
  async uploadProfileImage(@CurrentUser() user: any, @Body() body: { data_base64: string; mime: string; original_name: string }) {
    return this.processor.enqueueJob({
      owner_id: user.id,
      owner_type: user.role === 'nurse' ? 'nurse' : 'doctor',
      data_base64: body.data_base64,
      mime: body.mime,
      original_name: body.original_name,
    });
  }

  @Get('profile/image/status')
  async getProfileImageStatus(@CurrentUser() user: any) {
    return this.processor.getStatus(user.id);
  }

  @Post('onboarding/submit') submit(@CurrentUser() u: any) { return this.svc.submitForApproval(u); }

  @Post('settings/delta')
  async submitDelta(@CurrentUser() u: any, @Body() body: any) {
    return this.svc.submitDelta(u, body);
  }
}

@Controller('provider/operators')
export class ProviderOperatorsController {
  constructor(private readonly svc: ProviderOperatorsService) {}
  @Get() list(@CurrentUser() u: any) { return this.svc.list(u); }
  @Post('invite') invite(@CurrentUser() u: any, @Body() body: any) { return this.svc.invite(u, body); }
  @Public() @Post('accept-invite') accept(@Body() body: any) { return this.svc.acceptInvite(body); }
  @Patch(':id') update(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.update(u, id, body); }
  @Post(':id/disable') disable(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.disable(u, id, body?.reason); }
  @Post(':id/enable') enable(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.enable(u, id); }
  @Delete(':id') revoke(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.revoke(u, id); }
}

@Controller('admin/providers')
export class ProviderAdminController {
  constructor(
    private readonly svc: ProviderAdminService,
    private readonly processor: ProviderImageProcessorService
  ) {}
  @Get() list(@CurrentUser() u: any, @Query() q: any): Promise<any> { return this.svc.list(u, q); }
  // Full provider file by USER id (users-management "عرض الملف" — the admin clicks
  // any provider user and must see every registration detail, same as moderation).
  @Get('by-user/:userId') byUser(@CurrentUser() u: any, @Param('userId') userId: string) { return this.svc.detailByUser(u, userId); }
  @Get(':id') detail(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.detail(u, id); }
  @Post(':id/approve') approve(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.approve(u, id, body); }
  @Post(':id/reject') reject(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.reject(u, id, body); }

  @Post(':id/reprocess-image')
  async reprocessImage(@Param('id') id: string) {
    return this.processor.reprocessImage(id);
  }

  @Post(':id/replace-image')
  async replaceImage(@Param('id') id: string, @Body() body: { data_base64: string; mime: string }) {
    return this.processor.replaceImage(id, body.data_base64, body.mime);
  }

  @Post(':id/retry-image-jobs')
  async retryFailedJobs(@Param('id') id: string) {
    return this.processor.retryFailedJobs(id);
  }

  @Get(':id/image-logs')
  async getImageLogs(@Param('id') id: string) {
    return this.processor.getImageLogs(id);
  }
  @Post(':id/request-changes') needsChanges(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.requestChanges(u, id, body); }
  @Post(':id/suspend') suspend(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.suspend(u, id, body); }
}

// ============================================================================
//  PHASE 1B — OPERATIONAL LAYER (Requests / Notifications / Schedule / Dashboard)
// ============================================================================

import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { trackingId, TRACK_PREFIX } from '../../common/tracking';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

@Controller('provider/requests')
export class ProviderRequestsController {
  constructor(
    private readonly svc: ProviderRequestEngineService,
    @Inject('ProviderRequestRepository') private readonly reqRepo: any,
    private readonly events: EventEmitter2,
    @InjectConnection() private readonly conn: Connection
  ) {}
  @Get() list(@CurrentUser() u: any, @Query() q: any) { return this.svc.list(u, q); }
  @Get(':id') detail(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.detail(u, id); }
  @Post(':id/accept') accept(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.accept(u, id, body || {}); }
  @Post(':id/reject') reject(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.reject(u, id, body || {}); }
  @Post(':id/start') start(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.start(u, id, body || {}); }
  @Post(':id/complete') complete(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.complete(u, id, body || {}); }
  @Post(':id/cancel') cancel(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.cancel(u, id, body || {}); }
  @Post(':id/assign-staff') assignStaff(@CurrentUser() u: any, @Param('id') id: string, @Body() body: { staff_id: string; notes?: string }) { return this.svc.assignStaff(u, id, body); }

  @Get(':id/orders')
  async getOrders(@CurrentUser() u: any, @Param('id') id: string) {
    const request = await this.svc.detail(u, id);
    return {
      prescriptions: request?.payload?.prescriptions || [],
      labs: request?.payload?.labs || []
    };
  }

  // --- V3.0 DOCTOR PLATFORM ENDPOINTS ---
  @Post(':id/end')
  async endConsultation(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
    const request = await this.svc.detail(u, id);
    if (!['in_progress', 'IN_PROGRESS'].includes(String(request.status))) {
      throw new BadRequestException('consultation must be in progress before it can end');
    }

    // Persist clinical content only for the authenticated provider's in-progress request.
    const soapData = {
      subjective: body.soap_subjective,
      objective: body.soap_objective,
      assessment: body.soap_assessment,
      plan: body.soap_plan
    };
    const prescriptions = Array.isArray(body?.prescriptions) ? body.prescriptions : [];
    const labs = Array.isArray(body?.labs) ? body.labs : [];
    await this.reqRepo.updateOne(
      { id, provider_account_id: u.id },
      { $set: { payload: { ...(request.payload || {}), soap: soapData, prescriptions, labs } } },
    );
    const completed = await this.svc.complete(u, id, { note: 'clinical consultation ended' });

    // Emit event
    this.events.emit('medical_orders.emitted', {
      threadId: id,
      prescriptions,
      labs
    });
    
    return { 
      ok: true, 
      message: 'consultation_ended_atomically',
      prescriptions,
      labs,
      state: completed.status
    };
  }

  /**
   * Provider records the insurance company's response after the consultation
   * (approved in full / approved with patient copay / rejected) and the patient
   * is asked to pay ONLY their copay share. This writes a REAL
   * InsuranceServiceRequest so the patient flow (/insurance/requests/my →
   * /patient/pay-copay) works end-to-end — no console.log stubs.
   */
  @Post(':id/insurance-copay')
  async requestInsuranceCopay(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
    const { approvalStatus, patientCopay, approvalCode, reason } = body || {};
    // 1) Load the provider request and verify ownership
    const preq: any = await this.svc.detail(u, id);
    const patientId = preq.patient?.id || preq.patient_id || preq.patient_user_id || preq.user_id;
    if (!patientId) throw new BadRequestException('لا يمكن تحديد المريض لهذا الطلب');

    // 2) Compute the decision
    const price = Math.max(0, Number(preq.amount_total ?? preq.payload?.amount_total ?? 0));
    const patientShare = Math.min(price, Math.max(0, Number(patientCopay) || 0));
    const companyShare = Math.max(0, price - patientShare);
    const status = String(approvalStatus || '').toLowerCase();
    const rejected = ['rejected', 'denied', 'مرفوض'].includes(status);
    const state = rejected ? 'REJECTED' : patientShare > 0 ? 'COPAY_PENDING' : 'APPROVED_FULL';
    if (rejected && !String(reason || '').trim()) throw new BadRequestException('سبب الرفض مطلوب');
    if (!rejected && price <= 0) throw new BadRequestException('مبلغ الخدمة الموثق مطلوب');

    // 3) Patient's saved insurance policy (required by the insurance flow)
    const profile: any = await this.conn.collection('patientprofiles').findOne({ user_id: String(patientId) } as any);
    if (!profile?.insurance?.company_id || !profile?.insurance?.policy_number) {
      throw new BadRequestException('سياسة تأمين المريض الموثقة مطلوبة');
    }
    const policy = profile.insurance;

    // 4) Upsert the insurance request linked to this provider request
    const col = this.conn.collection('insuranceservicerequests');
    const existing: any = await col.findOne({ booking_id: id, booking_kind: 'provider_request' } as any);
    const patch: any = {
      patient_id: String(patientId), patient_name: preq.patient?.name || preq.patient_name || null,
      provider_id: String(u?.id), booking_id: id, booking_kind: 'provider_request',
      service_type: preq.type || 'consultation', price, policy,
      copay_amount: patientShare, copay_percent: price > 0 ? Math.round((patientShare / price) * 10000) / 100 : 0,
      approval_code: approvalCode || null, state,
      decided_by: String(u?.id), decided_at: new Date(),
      ...(rejected ? { rejection_reason: String(reason).trim() } : {}),
      updatedAt: new Date(),
    };
    let requestId: string;
    if (existing) {
      requestId = existing.id || String(existing._id);
      await col.updateOne({ _id: existing._id }, {
        $set: patch,
        $push: { history: { state, at: new Date(), by: String(u?.id), note: approvalCode || null } } as any,
      });
    } else {
      requestId = uuid();
      await col.insertOne({
        ...patch, id: requestId,
        history: [
          { state: 'PENDING_PROVIDER_REVIEW', at: preq.createdAt || new Date(), by: String(patientId) },
          { state, at: new Date(), by: String(u?.id), note: approvalCode || null },
        ],
        createdAt: new Date(),
      } as any);
    }

    // 5) Notify the patient through the standard insurance event pipeline
    this.events.emit('insurance.decided', {
      request_id: requestId, patient_id: String(patientId), state, copay_amount: patientShare,
    });
    return { ok: true, request_id: requestId, state, copay_amount: patientShare };
  }

  @Post(':id/sick-leave')
  async issueSickLeave(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
    if (!body?.patient_id) throw new BadRequestException('patient_id required');
    if (!body?.diagnosis?.trim()) throw new BadRequestException('diagnosis required');
    const days = Math.max(1, Math.min(30, parseInt(body?.duration_days) || 1));
    const start = body?.start_date ? new Date(body.start_date) : new Date();
    if (isNaN(start.getTime())) throw new BadRequestException('invalid start_date');
    const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);

    const provider: any = await this.conn.collection('provider_accounts').findOne({ $or: [{ user_id: String(u?.id) }, { _id: u?.id as any }] } as any);
    const doc = {
      id: uuid(),
      tracking_id: trackingId(TRACK_PREFIX.medical_report),
      patient_id: String(body.patient_id),
      patient_name: body.patient_name || null,
      report_type: 'medical_certificate',
      certificate_kind: 'sick_leave',
      title_ar: `إجازة مرضية لمدة ${days} ${days === 1 ? 'يوم' : 'أيام'}`,
      title_en: `${days}-day sick leave certificate`,
      summary: body.diagnosis.trim(),
      diagnosis: body.diagnosis.trim(),
      recommendations: body.recommendations || null,
      sick_leave: { start_date: start, end_date: end, duration_days: days },
      doctor_id: String(u?.id),
      doctor_name: u?.full_name || provider?.display_name || null,
      facility_id: provider?._id ? String(provider._id) : null,
      facility_name: provider?.display_name || null,
      appointment_id: id !== 'new' ? id : (body.appointment_id || null),
      attachments: [],
      issued_at: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await this.conn.collection('medicalreports').insertOne(doc as any);

    // Record on the appointment for the patient's timeline
    if (id && id !== 'new') {
      await this.conn.collection('appointments').updateOne(
        { $or: [{ id }, { _id: id as any }] } as any,
        { $push: { sickLeaves: { days, reason: doc.diagnosis, tracking_id: doc.tracking_id, at: new Date() } } } as any,
      );
    }

    // Notify the patient (push + in-app) through the standard pipeline
    this.events.emit('medical_report.created', { id: doc.id, patient_id: doc.patient_id, critical: false, tracking_id: doc.tracking_id });
    this.events.emit('sick_leave.issued', { patient_id: doc.patient_id, doctor_id: doc.doctor_id, tracking_id: doc.tracking_id, days });

    return { ok: true, message: 'sick_leave_issued', tracking_id: doc.tracking_id, verify_url: `/api/v1/medical-reports/track/${doc.tracking_id}`, days, start_date: start, end_date: end };
  }

  @Post(':id/medical-report')
  async issueMedicalReport(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
    if (!body?.findings?.trim() && !body?.summary?.trim()) throw new BadRequestException('findings required');
    const request: any = await this.svc.detail(u, id);
    const patientId = request.patient?.id || request.patient_id || request.patient_user_id || request.user_id;
    if (!patientId) throw new BadRequestException('linked patient required');
    if (body?.patient_id && String(body.patient_id) !== String(patientId)) {
      throw new ForbiddenException('patient does not match the owned request');
    }
    const provider: any = await this.conn.collection('provider_accounts').findOne({ $or: [{ user_id: String(u?.id) }, { _id: u?.id as any }] } as any);
    const doc = {
      id: uuid(),
      tracking_id: trackingId(TRACK_PREFIX.medical_report),
      patient_id: String(patientId),
      patient_name: request.patient?.name || request.patient_name || null,
      report_type: ['discharge_summary', 'surgery_report', 'consultation_note', 'second_opinion', 'clinic_note', 'other'].includes(body?.type) ? body.type : 'clinic_note',
      title_ar: body.title_ar || 'تقرير طبي',
      title_en: body.title_en || 'Medical Report',
      summary: body.findings?.trim() || body.summary?.trim(),
      body: body.conclusion || null,
      diagnosis: body.diagnosis || null,
      recommendations: body.recommendations || null,
      critical: !!body.critical,
      doctor_id: String(u?.id),
      doctor_name: u?.full_name || provider?.display_name || null,
      facility_id: provider?._id ? String(provider._id) : null,
      facility_name: provider?.display_name || null,
      appointment_id: id,
      attachments: Array.isArray(body.attachments) ? body.attachments : [],
      issued_at: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await this.conn.collection('medicalreports').insertOne(doc as any);
    this.events.emit('medical_report.created', { id: doc.id, patient_id: doc.patient_id, critical: doc.critical, tracking_id: doc.tracking_id });
    return { ok: true, message: 'medical_report_issued', tracking_id: doc.tracking_id, verify_url: `/api/v1/medical-reports/track/${doc.tracking_id}` };
  }
}

@Controller('provider/wallet')
export class ProviderWalletController {
  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly ledger: LedgerService,
  ) {}

  private get withdrawals() { return this.conn.collection('withdrawals'); }

  /**
   * Legacy alias of POST /provider/payouts/request — same real creation flow:
   * canonical ledger balance (never clamped), finance_config minimum,
   * negative-balance and pending-duplicate guards, Saudi IBAN validation.
   */
  @Post('withdraw')
  async requestWithdrawal(@CurrentUser() u: any, @Body() body: { amount?: number; iban?: string }) {
    throw new BadRequestException('withdrawal_alias_retired_use_provider_payouts_request');
  }
}

@Controller('provider/notifications')
export class ProviderNotificationsController {
  constructor(private readonly svc: ProviderNotificationsService) {}
  @Get() list(@CurrentUser() u: any, @Query() q: any) { return this.svc.list(u, q); }
  @Post(':id/read') markRead(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.markRead(u, id); }
  @Post('read-all') markAllRead(@CurrentUser() u: any) { return this.svc.markAllRead(u); }
}

@Controller('provider/schedule')
export class ProviderScheduleController {
  constructor(private readonly svc: ProviderScheduleService) {}
  @Get() view(@CurrentUser() u: any, @Query() q: any) { return this.svc.view(u, q); }
}

@Controller('provider')
export class ProviderDashboardController {
  constructor(
    private readonly dash: ProviderDashboardService,
    private readonly seedSvc: ProviderSeedService,
  ) {}
  @Get('me') me(@CurrentUser() u: any) { return this.dash.me(u); }
  @Get('dashboard/stats') stats(@CurrentUser() u: any) { return this.dash.stats(u); }
  @Get('dashboard/recent') recent(@CurrentUser() u: any, @Query('limit') limit?: string) {
    return this.dash.recentRequests(u, parseInt(limit || '3', 10) || 3);
  }
  @Get('availability') getAvail(@CurrentUser() u: any) { return this.dash.getAvailability(u); }
  @Post('availability') setAvail(@CurrentUser() u: any, @Body() body: any) { return this.dash.setAvailability(u, body); }
  @Post('seed') seed(@CurrentUser() u: any) { return this.seedSvc.seed(u); }
  @Post('seed/reset') seedReset(@CurrentUser() u: any) { return this.seedSvc.resetSeed(u); }
}


// ============================================================================
//  PHASE 1C — Matching / Capabilities / Geo / Scheduling / Assignment / Scoring
// ============================================================================

@Controller('provider/capabilities')
export class ProviderCapabilitiesController {
  constructor(private readonly svc: ServiceCapabilityService) {}
  // Pharmacy inventory
  @Get('pharmacy') listPharma(@CurrentUser() u: any) { return this.svc.listPharmacy(u); }
  @Post('pharmacy') upsertPharma(@CurrentUser() u: any, @Body() body: any) { return this.svc.upsertPharmacy(u, body); }
  @Delete('pharmacy/:id') delPharma(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.deletePharmacy(u, id); }
  // Lab tests
  @Get('lab') listLab(@CurrentUser() u: any) { return this.svc.listLab(u); }
  @Post('lab') upsertLab(@CurrentUser() u: any, @Body() body: any) { return this.svc.upsertLab(u, body); }
  @Delete('lab/:id') delLab(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.deleteLab(u, id); }
  // Radiology
  @Get('radiology') listRad(@CurrentUser() u: any) { return this.svc.listRadiology(u); }
  @Post('radiology') upsertRad(@CurrentUser() u: any, @Body() body: any) { return this.svc.upsertRadiology(u, body); }
  @Delete('radiology/:id') delRad(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.deleteRadiology(u, id); }
  // Doctor session types
  @Get('doctor-sessions') listDoc(@CurrentUser() u: any) { return this.svc.listDoctorSessions(u); }
  @Post('doctor-sessions') upsertDoc(@CurrentUser() u: any, @Body() body: any) { return this.svc.upsertDoctorSession(u, body); }
  @Delete('doctor-sessions/:id') delDoc(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.deleteDoctorSession(u, id); }
  // Home care
  @Get('home-care') listHc(@CurrentUser() u: any) { return this.svc.listHomeCare(u); }
  @Post('home-care') upsertHc(@CurrentUser() u: any, @Body() body: any) { return this.svc.upsertHomeCare(u, body); }
  @Delete('home-care/:id') delHc(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.deleteHomeCare(u, id); }
}

@Controller('provider/zones')
export class ProviderZonesController {
  constructor(private readonly svc: ServiceCapabilityService) {}
  @Get() list(@CurrentUser() u: any) { return this.svc.listZones(u); }
  @Post() upsert(@CurrentUser() u: any, @Body() body: any) { return this.svc.upsertZone(u, body); }
  @Delete(':id') del(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.deleteZone(u, id); }
}

@Controller('provider/schedule-slots')
export class ProviderScheduleSlotsController {
  constructor(private readonly svc: SchedulingEngineService) {}
  @Get() list(@CurrentUser() u: any) { return this.svc.listSlots(u); }
  @Post() upsert(@CurrentUser() u: any, @Body() body: any) { return this.svc.upsertSlot(u, body); }
  @Delete(':id') del(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.deleteSlot(u, id); }
}

@Controller('provider/score')
export class ProviderScoreController {
  constructor(private readonly svc: ProviderScoringService) {}
  @Get() me(@CurrentUser() u: any) { return this.svc.getMy(u); }
  @Post('recompute') recompute(@CurrentUser() u: any) { return this.svc.recompute(u.id); }
}

@Controller('admin/matching')
@Roles(UserRole.ADMIN)
export class AdminMatchingController {
  constructor(
    private readonly matching: ProviderMatchingService,
    private readonly assignment: AssignmentStrategyService,
  ) {}
  // Run matching for a request without modifying state
  @Get('preview/:requestId') preview(@CurrentUser() u: any, @Param('requestId') id: string, @Query('limit') limit?: string) {
    return this.matching.matchForRequest(id, parseInt(limit || '10', 10) || 10);
  }
  // Run matching ad-hoc with a custom payload (no DB record created)
  @Post('preview') previewAdHoc(@CurrentUser() u: any, @Body() body: any) {
    return this.matching.match(body || {});
  }
  // Dispatch (run strategy) for an existing unassigned request
  @Post('dispatch/:requestId') dispatch(@CurrentUser() u: any, @Param('requestId') id: string, @Body() body: any) {
    return this.assignment.dispatch(id, body?.timeout_seconds || 120);
  }
  // Manual assign
  @Post('assign/:requestId/:providerId') assign(@CurrentUser() u: any, @Param('requestId') rid: string, @Param('providerId') pid: string) {
    return this.assignment.manualAssign(u, rid, pid);
  }
  // List attempts for a request
  @Get('attempts/:requestId') attempts(@CurrentUser() u: any, @Param('requestId') id: string) {
    return this.assignment.listAttempts(u, id);
  }
  // Cron-style expiration sweep
  @Post('expire-stale') expireStale(@CurrentUser() u: any) {
    return this.assignment.expireStale();
  }
  // ADMIN seed: create a new UNASSIGNED request that triggers matching (real DB record).
  // Intended for testing flow end-to-end while patient-side ordering is not yet built.
  @Post('seed-unassigned') seedUnassigned(@CurrentUser() u: any, @Body() body: any) {
    const b = body || {};
    return this.assignment.createAndDispatch({
      type: b.type,
      patient: b.patient || { name: 'Test Patient' },
      payload: b.payload || {},
      summary_ar: b.summary_ar,
      summary_en: b.summary_en,
      amount_total: b.amount_total || 0,
      priority: b.priority,
      scheduled_at: b.scheduled_at ? new Date(b.scheduled_at) : undefined,
      patient_location: b.patient_location,
      strategy: b.strategy,
      timeout_seconds: b.timeout_seconds,
      seeded: true,
    });
  }
}
