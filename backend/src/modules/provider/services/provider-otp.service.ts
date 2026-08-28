import { Injectable, BadRequestException, NotFoundException, Logger, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import { ProviderOtpCode, OtpPurpose, OtpStatus } from '../schemas';
import { ProviderMailerService } from './provider-mailer.service';
import { ProviderAuditLog } from '../schemas';
import { ProviderOtpCodeRepository } from "./repositories/providerotpcode.repository";
import { ProviderAuditLogRepository } from "./repositories/providerauditlog.repository";

const OTP_EXP_MIN = 10;
const OTP_RESEND_COOLDOWN_SEC = 60;
const OTP_MAX_ATTEMPTS = 5;

@Injectable()
export class ProviderOtpService {
  private logger = new Logger('ProviderOtp');
  constructor(
    @Inject('ProviderOtpCodeRepository') private readonly otpModel: ProviderOtpCodeRepository,
    @Inject('ProviderAuditLogRepository') private readonly audit: ProviderAuditLogRepository,
    private readonly mailer: ProviderMailerService,
  ) {}

  private hash(code: string) { return crypto.createHash('sha256').update(code).digest('hex'); }
  private generateCode() { return ('' + Math.floor(100000 + Math.random() * 900000)).slice(-6); }
  private bodyFor(purpose: OtpPurpose, code: string) {
    if (purpose === OtpPurpose.PASSWORD_RESET) {
      return { subject: 'إعادة تعيين كلمة المرور - نبض', text: `رمز إعادة التعيين: ${code}\nصالح لمدة ${OTP_EXP_MIN} دقائق.\nإذا لم تطلب هذا تجاهل الرسالة.` };
    }
    return { subject: 'رمز التحقق - نبض مقدمي الخدمة', text: `أهلاً بك في نبض.\nرمز التحقق الخاص بك: ${code}\nصالح لمدة ${OTP_EXP_MIN} دقائق.` };
  }

  /** Issue (or re-issue) an OTP. Honors 60s resend cooldown. */
  async issue(email: string, purpose: OtpPurpose, meta: { ip?: string; ua?: string; account_id?: string } = {}) {
    email = (email || '').toLowerCase().trim();
    if (!email || !email.includes('@')) throw new BadRequestException('invalid email');
    // Cooldown
    const recent = await this.otpModel.findOne({ email, purpose, status: OtpStatus.ACTIVE }).sort({ createdAt: -1 });
    if (recent?.last_sent_at) {
      const diff = (Date.now() - recent.last_sent_at.getTime()) / 1000;
      if (diff < OTP_RESEND_COOLDOWN_SEC) {
        const wait = Math.ceil(OTP_RESEND_COOLDOWN_SEC - diff);
        throw new BadRequestException(`Please wait ${wait}s before requesting a new code`);
      }
    }
    // Invalidate all previously-active codes for this (email, purpose)
    await this.otpModel.updateMany({ email, purpose, status: OtpStatus.ACTIVE }, { $set: { status: OtpStatus.INVALIDATED } });
    const code = this.generateCode();
    const doc = await this.otpModel.create({
      email, purpose, code_hash: this.hash(code),
      expires_at: new Date(Date.now() + OTP_EXP_MIN * 60 * 1000),
      last_sent_at: new Date(), ip: meta.ip, user_agent: meta.ua,
    });
    const body = this.bodyFor(purpose, code);
    const send = await this.mailer.send({ to: email, subject: body.subject, text: body.text, tag: purpose });
    await this.audit.create({ provider_account_id: meta.account_id, actor_id: meta.account_id || 'system', actor_role: 'system', action: 'otp.issued', target: { collection: 'provider_otp_codes', id: doc.id }, after: { purpose, send_status: send.status }, ip: meta.ip, user_agent: meta.ua });
    if (send.status === 'logged') this.logger.warn(`(LOG_ONLY) OTP for ${email} purpose=${purpose} → ${code}`);
    return { sent: send.status !== 'failed', cooldown_seconds: OTP_RESEND_COOLDOWN_SEC, expires_in_seconds: OTP_EXP_MIN * 60, log_only: send.status === 'logged' };
  }

  /** Verify the latest active OTP. */
  async verify(email: string, purpose: OtpPurpose, code: string, meta: { ip?: string; ua?: string; account_id?: string } = {}) {
    email = (email || '').toLowerCase().trim();
    if (!code || code.length !== 6) throw new BadRequestException('invalid code');
    const doc = await this.otpModel.findOne({ email, purpose, status: OtpStatus.ACTIVE }).sort({ createdAt: -1 });
    if (!doc) throw new BadRequestException('no active code — please request a new one');
    if (doc.expires_at.getTime() < Date.now()) { doc.status = OtpStatus.EXPIRED; await doc.save(); throw new BadRequestException('code expired'); }
    if (doc.attempts >= OTP_MAX_ATTEMPTS) { doc.status = OtpStatus.INVALIDATED; await doc.save(); throw new BadRequestException('too many attempts — please request a new code'); }
    const matches = doc.code_hash === this.hash(code);
    if (!matches) {
      doc.attempts += 1; await doc.save();
      await this.audit.create({ provider_account_id: meta.account_id, actor_id: meta.account_id || 'unknown', actor_role: 'provider', action: 'otp.verify_failed', target: { collection: 'provider_otp_codes', id: doc.id }, ip: meta.ip, user_agent: meta.ua });
      throw new BadRequestException(`incorrect code (${OTP_MAX_ATTEMPTS - doc.attempts} attempts left)`);
    }
    doc.status = OtpStatus.USED; doc.consumed_at = new Date(); await doc.save();
    await this.audit.create({ provider_account_id: meta.account_id, actor_id: meta.account_id || 'unknown', actor_role: 'provider', action: 'otp.verified', target: { collection: 'provider_otp_codes', id: doc.id }, ip: meta.ip, user_agent: meta.ua });
    return { ok: true };
  }

  /** Validate the latest active OTP WITHOUT consuming it — used by the
   *  password-reset UI to verify the code step before the actual reset call
   *  (which consumes the code). Wrong codes still burn attempts so this
   *  cannot be abused as a brute-force oracle. */
  async check(email: string, purpose: OtpPurpose, code: string, meta: { ip?: string; ua?: string; account_id?: string } = {}) {
    email = (email || '').toLowerCase().trim();
    if (!code || code.length !== 6) throw new BadRequestException('invalid code');
    const doc = await this.otpModel.findOne({ email, purpose, status: OtpStatus.ACTIVE }).sort({ createdAt: -1 });
    if (!doc) throw new BadRequestException('no active code — please request a new one');
    if (doc.expires_at.getTime() < Date.now()) { doc.status = OtpStatus.EXPIRED; await doc.save(); throw new BadRequestException('code expired'); }
    if (doc.attempts >= OTP_MAX_ATTEMPTS) { doc.status = OtpStatus.INVALIDATED; await doc.save(); throw new BadRequestException('too many attempts — please request a new code'); }
    const matches = doc.code_hash === this.hash(code);
    if (!matches) {
      doc.attempts += 1; await doc.save();
      await this.audit.create({ provider_account_id: meta.account_id, actor_id: meta.account_id || 'unknown', actor_role: 'provider', action: 'otp.verify_failed', target: { collection: 'provider_otp_codes', id: doc.id }, ip: meta.ip, user_agent: meta.ua });
      throw new BadRequestException(`incorrect code (${OTP_MAX_ATTEMPTS - doc.attempts} attempts left)`);
    }
    return { ok: true };
  }
}
