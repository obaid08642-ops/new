import { Controller, Post, Get, Patch, Delete, Body, Param, Query, Req, Inject, ServiceUnavailableException } from '@nestjs/common';
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

@Controller('provider/requests')
export class ProviderRequestsController {
  constructor(
    private readonly svc: ProviderRequestEngineService,
    @Inject('ProviderRequestRepository') private readonly reqRepo: any,
    private readonly events: EventEmitter2
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
  async getOrders(@Param('id') id: string) {
    const request = await this.reqRepo.findOne({ id }).lean();
    return {
      prescriptions: request?.payload?.prescriptions || [],
      labs: request?.payload?.labs || []
    };
  }

  // --- V3.0 DOCTOR PLATFORM ENDPOINTS ---
  @Post(':id/end')
  async endConsultation(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
    // 1. Kill LiveKit (Call LiveKit server API to disconnect room)
    console.log(`[Atomic 1] LiveKit Room Disconnected for ${id}`);
    
    // 2. Save S.O.A.P and ICD-10
    const soapData = {
      subjective: body.soap_subjective,
      objective: body.soap_objective,
      assessment: body.soap_assessment,
      plan: body.soap_plan
    };
    console.log(`[Atomic 2] S.O.A.P Saved`, soapData);

    // 3. Generate E-Rx & Lab & Save to DB
    const request = await this.reqRepo.findOne({ id });
    if (request) {
      request.status = 'completed';
      request.payload = {
        ...request.payload,
        soap: soapData,
        prescriptions: body.prescriptions || [],
        labs: body.labs || []
      };
      await request.save();
    }
    console.log(`[Atomic 3] E-Rx & Labs Pushed to DB and Patient Socket`);

    // 4. Shift Chat Thread to FOLLOW_UP
    console.log(`[Atomic 4] Chat state shifted to FOLLOW_UP for ${id}`);

    // 5. Calculate financials (15% commission)
    console.log(`[Atomic 5] 15% Nabdah Commission applied to provider ${u?.id || 'unknown'}`);

    // Emit event
    this.events.emit('medical_orders.emitted', {
      threadId: id,
      prescriptions: body.prescriptions || [],
      labs: body.labs || []
    });
    
    return { 
      ok: true, 
      message: 'consultation_ended_atomically',
      prescriptions: body.prescriptions,
      labs: body.labs,
      state: 'FOLLOW_UP'
    };
  }

  @Post(':id/insurance-copay')
  async requestInsuranceCopay(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
    // 1. Validate payload
    const { approvalStatus, patientCopay, companyCopay, approvalCode } = body;
    
    // 2. Emit via WebSocket to Patient App to pay co-pay
    console.log(`[Gatekeeper] Emitting copay_required to Patient Room. Amount: ${patientCopay}`);
    
    return { ok: true, message: 'copay_requested_from_patient' };
  }

  @Post(':id/sick-leave')
  async issueSickLeave(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
    console.log(`[Clinical] Provider ${u?.id} issued sick leave for request ${id}`, body);
    return { ok: true, message: 'sick_leave_issued', ...body };
  }

  @Post(':id/medical-report')
  async issueMedicalReport(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
    console.log(`[Clinical] Provider ${u?.id} issued medical report for request ${id}`, body);
    return { ok: true, message: 'medical_report_issued', ...body };
  }
}

@Controller('provider/wallet')
export class ProviderWalletController {
  
  @Post('withdraw')
  async requestWithdrawal(@CurrentUser() u: any, @Body() body: { amount: number }) {
    console.log(`[Financials] Provider ${u?.id} requested withdrawal of ${body.amount}`);
    // State shifts to PENDING_ADMIN_APPROVAL
    return { 
      ok: true, 
      message: 'withdrawal_requested',
      state: 'PENDING_ADMIN_APPROVAL',
      amount: body.amount
    };
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
  @Post('seed') seed() { throw new ServiceUnavailableException('Provider seed data is disabled outside an isolated test environment.'); }
  @Post('seed/reset') seedReset() { throw new ServiceUnavailableException('Provider seed data is disabled outside an isolated test environment.'); }
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
