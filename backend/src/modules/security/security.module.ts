import { Module, Injectable, Controller, Get, NestMiddleware, MiddlewareConsumer, UseGuards, Query } from '@nestjs/common';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OnEvent } from '@nestjs/event-emitter';
import { AuditLog, AuditLogSchema } from '../../schemas/audit-log.schema';
import { JwtAuthGuard, CurrentUser, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { Request, Response, NextFunction } from 'express';
import { randomUUID, createHash } from 'crypto';

@Injectable()
export class AuditService {
  constructor(@InjectModel('AuditLog') private logs: Model<any>) {}
  async write(entry: { action: string; user_id?: string; role?: string; ip?: string; user_agent?: string; resource_kind?: string; resource_id?: string; details?: any; severity?: 'info' | 'warn' | 'critical'; correlation_id?: string }) {
    try { await this.logs.create(entry); } catch {}
  }
  async query(filter: any = {}, limit = 100) { return this.logs.find(filter).sort({ createdAt: -1 }).limit(Math.min(limit, 500)).lean(); }

  async queryAdmin(options: { search?: string; role?: string; severity?: string; user_id?: string; page?: number; limit?: number }) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(options.limit || 50, 500));
    const filter: any = {};
    if (options.role) filter.role = options.role;
    if (options.severity) filter.severity = options.severity;
    if (options.user_id) filter.user_id = options.user_id;
    if (options.search) {
      filter.$or = [
        { action: { $regex: options.search, $options: 'i' } },
        { resource_kind: { $regex: options.search, $options: 'i' } },
        { resource_id: { $regex: options.search, $options: 'i' } },
      ];
    }
    const total = await this.logs.countDocuments(filter);
    const logs = await this.logs.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    return { logs, total, page, limit };
  }

  async queryPersonal(userId: string, options: { page?: number; limit?: number }) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(options.limit || 20, 100));
    const filter = { user_id: userId };
    const total = await this.logs.countDocuments(filter);
    const logs = await this.logs.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    return { logs, total, page, limit };
  }

  // ── Event-driven Audit Capture ──────────────────────────────

  // Patient Actions
  @OnEvent('auth.register') async onRegister(p: any) { await this.write({ action: 'patient_register', user_id: p.user_id, role: p.role || 'patient', ip: p.ip, user_agent: p.user_agent, details: p.details }); }
  @OnEvent('auth.login') async onLogin(p: any) { await this.write({ action: 'patient_login', user_id: p.user_id, role: p.role || 'patient', ip: p.ip, user_agent: p.user_agent, details: p.details }); }
  @OnEvent('auth.logout') async onLogout(p: any) { await this.write({ action: 'patient_logout', user_id: p.user_id, role: p.role || 'patient', ip: p.ip, user_agent: p.user_agent }); }
  @OnEvent('booking.created') async onBookingCreated(p: any) { await this.write({ action: 'consultation_booking', user_id: p.patient_id, role: 'patient', resource_kind: 'booking', resource_id: p.id, details: { booking_id: p.id } }); }
  @OnEvent('booking.cancelled') async onBookingCancelled(p: any) { await this.write({ action: 'consultation_cancellation', user_id: p.actor_id, role: p.role, resource_kind: 'booking', resource_id: p.id }); }
  @OnEvent('payment.completed') async onPaymentCompleted(p: any) { await this.write({ action: 'payment_completed', user_id: p.patient_id, role: 'patient', resource_kind: 'transaction', resource_id: p.transaction_id, details: { amount: p.amount } }); }
  @OnEvent('upload.completed') async onUploadCompleted(p: any) { await this.write({ action: 'file_upload', user_id: p.user_id, role: p.role, resource_kind: 'media', resource_id: p.id, details: { mime: p.mime, size: p.size } }); }
  @OnEvent('upload.rejected') async onUploadRejected(p: any) { await this.write({ action: 'upload_rejected', user_id: p.user_id, ip: p.ip, details: { reason: p.reason, mime: p.mime, size: p.size }, severity: 'warn' }); }

  // Provider Actions
  @OnEvent('provider.schedule_updated') async onScheduleUpdated(p: any) { await this.write({ action: 'schedule_change', user_id: p.provider_id, role: 'provider' }); }
  @OnEvent('call.accepted') async onCallAccepted(p: any) { await this.write({ action: 'consultation_accept', user_id: p.callee_id, role: 'doctor', resource_kind: 'call', resource_id: p.session_id }); }
  @OnEvent('call.rejected') async onCallRejected(p: any) { await this.write({ action: 'consultation_reject', user_id: p.callee_id, role: 'doctor', resource_kind: 'call', resource_id: p.session_id }); }
  @OnEvent('prescription.created') async onPrescriptionCreated(p: any) { await this.write({ action: 'prescription_create', user_id: p.doctor_id, role: 'doctor', resource_kind: 'prescription', resource_id: p.id }); }
  @OnEvent('prescription.updated') async onPrescriptionUpdated(p: any) { await this.write({ action: 'prescription_edit', user_id: p.doctor_id, role: 'doctor', resource_kind: 'prescription', resource_id: p.id }); }
  @OnEvent('provider.profile_updated') async onProviderProfileUpdated(p: any) { await this.write({ action: 'profile_edit', user_id: p.provider_id, role: 'provider' }); }

  // Admin Actions
  @OnEvent('admin.user_updated') async onAdminUserUpdated(p: any) { await this.write({ action: 'user_modify', user_id: p.admin_id, role: 'admin', resource_kind: 'user', resource_id: p.target_user_id, severity: 'warn' }); }
  @OnEvent('admin.provider_approved') async onAdminProviderApproved(p: any) { await this.write({ action: 'provider_approve', user_id: p.admin_id, role: 'admin', resource_kind: 'provider', resource_id: p.provider_id, severity: 'warn' }); }
  @OnEvent('admin.provider_rejected') async onAdminProviderRejected(p: any) { await this.write({ action: 'provider_reject', user_id: p.admin_id, role: 'admin', resource_kind: 'provider', resource_id: p.provider_id, severity: 'warn' }); }
  @OnEvent('admin.commission_updated') async onAdminCommissionUpdated(p: any) { await this.write({ action: 'commission_change', user_id: p.admin_id, role: 'admin', details: { rate: p.rate }, severity: 'warn' }); }
  @OnEvent('feature_flag.updated') async onFeatureFlagUpdated(p: any) { await this.write({ action: 'flag_change', user_id: p.admin_id, role: 'admin', details: { flag: p.flag, value: p.value } }); }
  @OnEvent('auth.login_failed') async onLoginFailed(p: any) { await this.write({ action: 'login_failed', ip: p.ip, user_agent: p.user_agent, details: { phone: hashTail(p.phone) }, severity: 'warn' }); }
  @OnEvent('payment.refund') async onRefund(p: any) { await this.write({ action: 'payment_refund', user_id: p.actor_id, resource_kind: 'transaction', resource_id: p.transaction_id, details: { amount: p.amount }, severity: 'warn' }); }
  @OnEvent('admin.force_cancel') async onForceCancel(p: any) { await this.write({ action: 'admin_force_cancel', user_id: p.actor_id, role: 'admin', resource_kind: p.kind, resource_id: p.id, severity: 'critical' }); }

  // ============ EPIC5/S5: financial + medical sensitive actions ============
  /** Manual finance approvals (payouts, refund executions) — maker-checker decisions */
  @OnEvent('finance.operation.executed') async onFinanceOpExecuted(p: any) { await this.write({ action: 'finance_operation_executed', user_id: p.by, role: 'admin', resource_kind: 'finance_operation', resource_id: p.id, details: { type: p.type, amount: p?.payload?.amount, provider_account_id: p?.payload?.provider_account_id }, severity: 'critical' }); }
  @OnEvent('finance.operation.rejected') async onFinanceOpRejected(p: any) { await this.write({ action: 'finance_operation_rejected', user_id: p.by, role: 'admin', resource_kind: 'finance_operation', resource_id: p.id, details: { type: p.type, note: p.note }, severity: 'warn' }); }
  /** Insurance decisions (approval / rejection / copay) */
  @OnEvent('insurance.decided') async onInsuranceDecided(p: any) { await this.write({ action: 'insurance_decision', resource_kind: 'insurance_request', resource_id: p.request_id, details: { state: p.state, copay_amount: p.copay_amount, patient_id: p.patient_id }, severity: 'warn' }); }
  /** Medical reports created (lab/radiology/doctor reports) */
  @OnEvent('medical_report.created') async onMedicalReportCreated(p: any) { await this.write({ action: 'medical_report_created', resource_kind: 'medical_report', resource_id: p.id, details: { patient_id: p.patient_id, critical: !!p.critical, tracking_id: p.tracking_id }, severity: p.critical ? 'critical' : 'info' }); }
  /** Lab / radiology report uploads */
  @OnEvent('lab.report_uploaded') async onLabReportUploaded(p: any) { await this.write({ action: 'lab_report_uploaded', resource_kind: 'lab_booking', resource_id: p.booking_id, details: { report_id: p.report_id, patient_id: p.patient_id }, severity: 'warn' }); }
  @OnEvent('radiology.report_published') async onRadiologyReportPublished(p: any) { await this.write({ action: 'radiology_report_published', resource_kind: 'radiology_booking', resource_id: p.bookingId || p.booking_id, details: { patient_id: p.patientId || p.patient_id }, severity: 'warn' }); }
  /** Irreversible user deletion by admin */
  @OnEvent('admin.user_deleted') async onUserDeleted(p: any) { await this.write({ action: 'user_deleted', user_id: p.admin_id, role: 'admin', resource_kind: 'user', resource_id: p.target_user_id, details: { target_role: p.role, phone_tail: p.phone_tail }, severity: 'critical' }); }
}
function hashTail(s?: string) { if (!s) return null; return createHash('sha256').update(s).digest('hex').slice(0, 12); }

/** Tracing + Correlation-ID + slow-request middleware. */
@Injectable()
export class TracingMiddleware implements NestMiddleware {
  use(req: Request & { correlation_id?: string }, res: Response, next: NextFunction) {
    const id = (req.headers['x-correlation-id'] as string) || randomUUID();
    req.correlation_id = id;
    res.setHeader('x-correlation-id', id);
    const start = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - start;
      if (ms > 1500 || res.statusCode >= 500) {
        // eslint-disable-next-line no-console
        console.warn(`[slow_or_err] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms cid=${id}`);
      }
    });
    next();
  }
}

/** Minimal helmet-style header hardening WITHOUT adding the helmet dependency. */
@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    next();
  }
}

@Controller('security/audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private svc: AuditService) {}

  @Get('admin')
  @Roles(UserRole.ADMIN)
  async admin(
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('severity') severity?: string,
    @Query('user_id') userId?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.svc.queryAdmin({ search, role, severity, user_id: userId, page: +page, limit: +limit });
  }

  @Get('my-activity')
  async myActivity(
    @CurrentUser() u: any,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.svc.queryPersonal(u.id, { page: +page, limit: +limit });
  }

  @Get('recent')
  @Roles(UserRole.ADMIN)
  recent() { return this.svc.query({}, 200); }

  @Get('critical')
  @Roles(UserRole.ADMIN)
  critical() { return this.svc.query({ severity: 'critical' }, 100); }
}

@Module({
  imports: [MongooseModule.forFeature([{ name: 'AuditLog', schema: AuditLogSchema }])],
  controllers: [AuditController],
  providers: [AuditService, TracingMiddleware, SecurityHeadersMiddleware],
  exports: [AuditService, TracingMiddleware, SecurityHeadersMiddleware],
})
export class SecurityModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TracingMiddleware, SecurityHeadersMiddleware).forRoutes('*');
  }
}
