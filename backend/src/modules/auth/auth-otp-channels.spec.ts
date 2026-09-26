/** F34/F63: OTP channel selection + registration OTP gate (unit). */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RedisService } from '../redis/redis.service';
import { SmsService } from '../sms/sms.service';
import { MailService } from '../mail/mail.module';
import { PushService } from '../push/push.module';
import * as bcrypt from 'bcryptjs';

describe('AuthService OTP channels + register gate (F34/F63)', () => {
  let service: AuthService;
  let userModel: any;
  let redisService: any;
  let mail: any;
  let push: any;
  let sms: any;

  const user = (over: any = {}) => ({
    id: 'u1', phone: '+966500000001', email: undefined, active: true, role: 'patient', ...over,
  });

  beforeEach(async () => {
    userModel = { findOne: jest.fn(), create: jest.fn(async (d: any) => ({ id: 'u1', ...d })), findOneAndUpdate: jest.fn() };
    redisService = {
      setJson: jest.fn().mockResolvedValue(undefined),
      getJson: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(undefined),
      ttl: jest.fn().mockResolvedValue(60),
      checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 1 }),
    };
    mail = { sendOtp: jest.fn(async () => ({ ok: true, provider: 'resend', fallback_used: false })) };
    push = { sendToUser: jest.fn(async () => ({ sent: 0, failed: 0 })) };
    sms = { sendOtp: jest.fn(async () => true) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: 'UserRepository', useValue: userModel },
        { provide: 'PatientProfileRepository', useValue: { create: jest.fn() } },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('tok') } },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        { provide: RedisService, useValue: redisService },
        { provide: SmsService, useValue: sms },
        { provide: MailService, useValue: mail },
        { provide: PushService, useValue: push },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
  });

  it('phone identifier with working SMS → sms channel (Taqnyat path)', async () => {
    userModel.findOne.mockResolvedValue(user());
    const res: any = await service.sendOtp('+966500000001');
    expect(res.ok).toBe(true);
    expect(sms.sendOtp).toHaveBeenCalledWith('+966500000001', expect.any(String));
    expect(mail.sendOtp).not.toHaveBeenCalled();
  });

  it('phone identifier, SMS disabled, account email present → email fallback', async () => {
    sms.sendOtp.mockResolvedValue(false);
    userModel.findOne.mockResolvedValue(user({ email: 'u@example.com' }));
    const res: any = await service.sendOtp('+966500000001');
    expect(res.ok).toBe(true);
    expect(mail.sendOtp).toHaveBeenCalledWith('u@example.com', expect.any(String));
  });

  it('phone-only user, SMS disabled, no email, push unsent → 503 otp_channel_unavailable', async () => {
    sms.sendOtp.mockResolvedValue(false);
    userModel.findOne.mockResolvedValue(user());
    await expect(service.sendOtp('+966500000001')).rejects.toMatchObject({ status: 503 });
  });

  it('email identifier → email only (never SMS)', async () => {
    userModel.findOne.mockResolvedValue(user({ email: 'u@example.com' }));
    const res: any = await service.sendOtp('u@example.com');
    expect(res.ok).toBe(true);
    expect(sms.sendOtp).not.toHaveBeenCalled();
    expect(mail.sendOtp).toHaveBeenCalledWith('u@example.com', expect.any(String));
  });

  it('register without OTP proof → 400 otp_required (no user created)', async () => {
    userModel.findOne.mockResolvedValue(null);
    await expect(service.register({ full_name: 'N', phone: '+966500000002', password: 'Secret123' } as any))
      .rejects.toMatchObject({ status: 400 });
    expect(userModel.create).not.toHaveBeenCalled();
  });

  it('register with a prior verified marker → creates account and consumes the marker', async () => {
    userModel.findOne.mockResolvedValue(null);
    redisService.getJson.mockResolvedValue({ at: Date.now() });
    const res: any = await service.register({ full_name: 'N', phone: '+966500000002', password: 'Secret123' } as any);
    expect(res.token).toBeDefined();
    expect(userModel.create).toHaveBeenCalled();
    expect(redisService.del).toHaveBeenCalled();
  });

  it('register with an inline OTP code verifies it first', async () => {
    const code = '123456';
    const code_hash = await bcrypt.hash(code, 4);
    userModel.findOne.mockResolvedValue(null);
    redisService.getJson.mockImplementation(async (k: string) =>
      k.startsWith('auth:otp:login-2fa:') ? { code_hash, user_id: 'pending', attempts: 0 } : null);
    const res: any = await service.register({ full_name: 'N', phone: '+966500000002', password: 'Secret123', otp: code } as any);
    expect(res.token).toBeDefined();
    expect(userModel.create).toHaveBeenCalled();
  });

  // Live finding: F63 made /auth/register require a verified OTP, but send-otp only
  // served existing accounts, so no new patient or provider could sign up in the app.
  it('register purpose + unknown email -> code is sent to that email', async () => {
    userModel.findOne.mockResolvedValue(null);
    const res: any = await service.sendOtp('new@example.com', 'register');
    expect(res).toMatchObject({ ok: true, channel: 'email' });
    expect(mail.sendOtp).toHaveBeenCalledWith('new@example.com', expect.any(String));
    expect(push.sendToUser).not.toHaveBeenCalled();
    expect(redisService.setJson).toHaveBeenCalledWith(expect.stringContaining('new@example.com'), expect.objectContaining({ user_id: null }), expect.any(Number));
  });

  it('register purpose + unknown phone -> code is sent by SMS to that phone', async () => {
    userModel.findOne.mockResolvedValue(null);
    await service.sendOtp('+966500000009', 'register');
    expect(sms.sendOtp).toHaveBeenCalledWith('+966500000009', expect.any(String));
  });

  it('unknown account without register purpose -> same answer as success, nothing stored or sent (no enumeration)', async () => {
    userModel.findOne.mockResolvedValue(null);
    const res: any = await service.sendOtp('ghost@example.com', 'reset');
    expect(res).toEqual({ ok: true, channel: 'email' });
    expect(mail.sendOtp).not.toHaveBeenCalled();
    expect(redisService.setJson).not.toHaveBeenCalled();
  });
});
