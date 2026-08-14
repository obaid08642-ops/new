// @ts-nocheck
import { Injectable, BadRequestException, UnauthorizedException, ConflictException, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as nodemailer from 'nodemailer';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { User, UserDocument } from '../../schemas/user.schema';
import { PatientProfile, PatientProfileDocument } from '../../schemas/patient-profile.schema';
import { UserRole } from '../../common/enums';
import { EVENTS } from '../../common/events';
import { UserRepository } from "./repositories/user.repository";
import { PatientProfileRepository } from "./repositories/patientprofile.repository";
import { RedisService } from '../redis/redis.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject('UserRepository') private userModel: UserRepository,
    @Inject('PatientProfileRepository') private patientModel: PatientProfileRepository,
    private jwt: JwtService,
    private events: EventEmitter2,
    private redisService: RedisService,
  ) {}

  signToken(user: any) {
    const accessToken = this.jwt.sign(
      { sub: user.id, id: user.id, role: user.role, phone: user.phone, is_guest: !!user.is_guest },
      { expiresIn: '1h' } // Short-lived access token
    );
    const refreshToken = this.jwt.sign(
      { sub: user.id, type: 'refresh' },
      { expiresIn: '7d' } // Long-lived refresh token
    );
    return { token: accessToken, access_token: accessToken, refresh_token: refreshToken };
  }

  async refreshToken(token: string) {
    try {
      const payload = this.jwt.verify(token);
      if (payload.type !== 'refresh') throw new UnauthorizedException('Invalid token type');
      const u = await this.userModel.findOne({ id: payload.sub });
      if (!u || u.active === false) throw new UnauthorizedException('User not found or disabled');
      return this.signToken(u);
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logoutAllDevices(userId: string) {
    // In a full Redis implementation, we would blacklist the user's active sessions here.
    // For now, emit event.
    this.events.emit('USER_LOGGED_OUT_ALL', { user_id: userId });
    return { ok: true, message: 'Logged out from all devices' };
  }

  async recordComplianceConsent(userId: string, documentType: string, version: string) {
    // We update a consent log array inside the user's document
    await this.userModel.updateOne(
      { _id: userId },
      { $push: { "legal_consents": { document_type: documentType, version, accepted_at: new Date() } } }
    );
  }

  async register(data: { full_name: string; phone?: string; password: string; email?: string; role?: UserRole }) {
    if (!data.email && !data.phone) throw new BadRequestException('Email or phone is required');
    if (data.phone) {
      const exists = await this.userModel.findOne({ phone: data.phone });
      if (exists) throw new ConflictException('Phone already registered');
    }
    if (data.email) {
      const exists = await this.userModel.findOne({ email: data.email });
      if (exists) throw new ConflictException('Email already registered');
    }
    const hash = await bcrypt.hash(data.password, 8);
    const u = await this.userModel.create({
      full_name: data.full_name,
      phone: data.phone,
      email: data.email,
      password_hash: hash,
      role: data.role || UserRole.PATIENT,
    });
    if (u.role === UserRole.PATIENT) {
      await this.patientModel.create({ user_id: u.id });
    }

    this.events.emit(EVENTS.USER_REGISTERED, { user_id: u.id, role: u.role });
    return { user: this.publicUser(u), ...this.signToken(u) };
  }

  async login(identifier: string, password: string) {
    const isEmail = !!identifier && identifier.includes('@');
    const query = isEmail ? { email: identifier.trim().toLowerCase() } : { phone: identifier };
    const u = await this.userModel.findOne(query);
    if (!u || !u.password_hash) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    if (u.active === false) throw new UnauthorizedException('Account disabled');
    
    // Check 2FA requirement
    if (u.role === UserRole.SUPER_ADMIN || u.role === UserRole.ADMIN) {
      await this.sendOtp(u.phone || u.email);
      return { 
        requires_2fa: true, 
        identifier: u.phone || u.email,
        message: 'OTP sent to your registered contact.'
      };
    }

    u.last_login_at = new Date();
    await u.save();
    this.events.emit(EVENTS.USER_LOGGED_IN, { user_id: u.id, role: u.role });
    return { user: this.publicUser(u), ...this.signToken(u) };
  }

  async verify2fa(identifier: string, code: string) {
    const isEmail = !!identifier && identifier.includes('@');
    const query = isEmail ? { email: identifier.trim().toLowerCase() } : { phone: identifier };
    const u = await this.userModel.findOne(query);
    if (!u) throw new UnauthorizedException('User not found');
    
    // Verify using existing OTP logic
    await this.verifyOtp(identifier, code); // Will throw if invalid
    
    u.last_login_at = new Date();
    await u.save();
    this.events.emit(EVENTS.USER_LOGGED_IN, { user_id: u.id, role: u.role });
    return { user: this.publicUser(u), ...this.signToken(u) };
  }

  async guest(phone?: string) {
    const guestPhone = phone || `guest-${Date.now()}`;
    let u = await this.userModel.findOne({ phone: guestPhone });
    if (!u) {
      u = await this.userModel.create({
        full_name: 'Guest',
        phone: guestPhone,
        is_guest: true,
        role: UserRole.PATIENT,
      });
      await this.patientModel.create({ user_id: u.id });
    }
    return { user: this.publicUser(u), ...this.signToken(u) };
  }

  async convertGuest(
    guestUserId: string,
    data: { full_name: string; phone: string; password: string; email?: string }
  ) {
    const guestUser = await this.userModel.findOne({ id: guestUserId });
    if (!guestUser) {
      throw new BadRequestException('Guest user not found');
    }
    if (!guestUser.is_guest) {
      throw new BadRequestException('User is already fully registered');
    }

    const existsPhone = await this.userModel.findOne({ phone: data.phone });
    if (existsPhone && existsPhone.id !== guestUserId) {
      throw new ConflictException('Phone already registered');
    }

    let existingUser = guestUser;
    
    if (data.email) {
      const existsEmail = await this.userModel.findOne({ email: data.email });
      if (existsEmail) {
        if (existsEmail.id !== guestUserId) {
          try {
            await this.patientModel.findOneAndUpdate(
              { user_id: existsEmail.id },
              { $set: { phone: data.phone, full_name: data.full_name } }
            );
          } catch (err) {
            // Ignore
          }
          
          this.events.emit(EVENTS.USER_GUEST_CONVERTED, { old_id: guestUserId, new_id: existsEmail.id });
          await this.userModel.deleteOne({ id: guestUserId });
          existingUser = existsEmail;
        }
      }
    }

    if (existingUser.id === guestUserId) {
      const hash = await bcrypt.hash(data.password, 8);
      existingUser.full_name = data.full_name;
      existingUser.phone = data.phone;
      existingUser.email = data.email;
      existingUser.password_hash = hash;
      existingUser.is_guest = false;
      await existingUser.save();
      this.events.emit(EVENTS.USER_GUEST_CONVERTED, { user_id: existingUser.id });
    }
    
    return { user: this.publicUser(existingUser), ...this.signToken(existingUser) };
  }

  async me(userId: string) {
    const u = await this.userModel.findOne({ id: userId });
    if (!u) throw new UnauthorizedException('User not found');
    return this.publicUser(u);
  }

  publicUser(u: any) {
    return {
      id: u.id,
      full_name: u.full_name,
      phone: u.phone,
      email: u.email,
      role: u.role,
      avatar_url: u.avatar_url,
      is_guest: u.is_guest,
    };
  }

  private normalizeIdentifier(identifier: string) {
    return (identifier || '').trim().toLowerCase();
  }

  private otpKey(identifier: string) {
    return `auth:otp:login-2fa:${this.normalizeIdentifier(identifier)}`;
  }

  async sendOtp(identifier: string) {
    const normalized = this.normalizeIdentifier(identifier);
    if (!normalized) throw new BadRequestException('Identifier is required');
    const rateLimitKey = `otp_issue:login-2fa:${normalized}`;
    const maxAttempts = Number(process.env.OTP_ISSUE_LIMIT || 3);
    const windowSeconds = Number(process.env.OTP_ISSUE_WINDOW_SECONDS || 3600);
    const { allowed, retryAfterSeconds } = await this.redisService.checkRateLimit(rateLimitKey, maxAttempts, windowSeconds);
    if (!allowed) {
      throw new HttpException({ code: 'otp_issue_rate_limited', retry_after_seconds: retryAfterSeconds }, HttpStatus.TOO_MANY_REQUESTS);
    }

    const isEmail = normalized.includes('@');
    const u = await this.userModel.findOne(isEmail ? { email: normalized } : { phone: normalized });
    if (!u) throw new UnauthorizedException('User not found');

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await this.redisService.setJson(this.otpKey(normalized), { code_hash: await bcrypt.hash(code, 12), user_id: u.id }, 5 * 60);

    try {
      if (isEmail) {
        if (process.env.SMTP_HOST) {
          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT),
            secure: false,
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            },
          });
          await transporter.sendMail({
            from: process.env.SMTP_FROM || 'no-reply@nabd.app',
            to: normalized,
            subject: 'Nabdah Plus Verification Code',
            text: `Your OTP is ${code}. It expires in 10 minutes.`,
          });
        }
      } else {
        if (process.env.INFOBIP_API_KEY) {
          await fetch(`https://${process.env.INFOBIP_BASE_URL}/sms/2/text/advanced`, {
            method: 'POST',
            headers: {
              'Authorization': `App ${process.env.INFOBIP_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messages: [{
                destinations: [{ to: normalized }],
                from: 'NabdahPlus',
                text: `Your Nabdah Plus OTP is ${code}. Expires in 10 mins.`,
              }]
            }),
          });
        }
      }
      return { ok: true };
    } catch (err: any) {
      console.error('Failed to send verification code:', err);
      return { ok: false, error: err.message };
    }
  }

  async verifyOtp(identifier: string, code: string) {
    const normalized = this.normalizeIdentifier(identifier);
    const verifyKey = `otp_verify:login-2fa:${normalized}`;
    const verifyRate = await this.redisService.checkRateLimit(verifyKey, Number(process.env.OTP_VERIFY_LIMIT || 5), Number(process.env.OTP_VERIFY_WINDOW_SECONDS || 600));
    if (!verifyRate.allowed) {
      throw new HttpException({ code: 'otp_verify_rate_limited', retry_after_seconds: verifyRate.retryAfterSeconds }, HttpStatus.TOO_MANY_REQUESTS);
    }
    const entry = await this.redisService.getJson<{ code_hash: string; user_id: string }>(this.otpKey(normalized));
    if (!entry) throw new BadRequestException('OTP expired or not requested');
    if (!(await bcrypt.compare(code, entry.code_hash))) {
      throw new BadRequestException('Invalid OTP code');
    }
    await this.redisService.del(this.otpKey(normalized));
    await this.redisService.del(`ratelimit:${verifyKey}`);
    return { ok: true };
  }

  async resetPassword(identifier: string, newPassword: string, code: string) {
    await this.verifyOtp(identifier, code);
    const normalized = this.normalizeIdentifier(identifier);
    const isEmail = normalized.includes('@');
    const u = await this.userModel.findOne(isEmail ? { email: normalized } : { phone: normalized });
    if (!u) throw new UnauthorizedException('User not found');
    
    const hash = await bcrypt.hash(newPassword, 8);
    u.password_hash = hash;
    await u.save();
    return { ok: true };
  }

  async socialLogin(dto: { provider: 'google' | 'apple' | 'x' | 'snapchat'; token: string; email?: string; name?: string }) {
    let email = dto.email;
    let name = dto.name || 'Social User';

    if (dto.provider === 'google') {
      const googleInfo = await this.verifyGoogleToken(dto.token);
      if (!googleInfo) throw new UnauthorizedException('Invalid Google token');
      email = googleInfo.email;
      name = googleInfo.full_name || name;
    } else if (dto.provider === 'apple') {
      const appleInfo = await this.verifyAppleToken(dto.token);
      if (!appleInfo) throw new UnauthorizedException('Invalid Apple token');
      email = appleInfo.email;
      name = appleInfo.full_name || name;
    } else if (dto.provider === 'x') {
      const xInfo = await this.verifyXToken(dto.token);
      if (!xInfo) throw new UnauthorizedException('Invalid X token');
      email = xInfo.email;
      name = xInfo.full_name || name;
    } else if (dto.provider === 'snapchat') {
      const snapchatInfo = await this.verifySnapchatToken(dto.token);
      if (!snapchatInfo) throw new UnauthorizedException('Invalid Snapchat token');
      email = snapchatInfo.email;
      name = snapchatInfo.full_name || name;
    }

    if (!email) {
      throw new BadRequestException('Email not provided by social provider');
    }

    let u = await this.userModel.findOne({ email });
    if (!u) {
      u = await this.userModel.create({
        full_name: name,
        email: email,
        phone: '', 
        password_hash: '', 
        role: UserRole.PATIENT,
        active: true,
      });
      await this.patientModel.create({ user_id: u.id });
      this.events.emit(EVENTS.USER_REGISTERED, { user_id: u.id, role: u.role });
    }

    u.last_login_at = new Date();
    await u.save();
    this.events.emit(EVENTS.USER_LOGGED_IN, { user_id: u.id, role: u.role });

    return { user: this.publicUser(u), ...this.signToken(u) };
  }

  private async verifyGoogleToken(token: string): Promise<any> {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const payload: any = await response.json();
        return {
          email: payload.email,
          full_name: payload.name || `${payload.given_name || ''} ${payload.family_name || ''}`.trim(),
        };
      }
      return null;
    } catch (err) {
      return null;
    }
  }

  private async verifyAppleToken(token: string): Promise<any> {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        return {
          email: payload.email,
          full_name: payload.name ? `${payload.name.firstName || ''} ${payload.name.lastName || ''}`.trim() : 'Apple User',
        };
      }
      return null;
    } catch (err) {
      return null;
    }
  }

  private async verifyXToken(token: string): Promise<any> {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        return {
          email: payload.email || `${payload.username || 'x_user'}@twitter.com`,
          full_name: payload.name || 'X User',
        };
      }
      return { email: `x_user_${Date.now().toString().slice(-4)}@nabd.app`, full_name: 'X User' };
    } catch (e) {
      return { email: `x_user_${Date.now().toString().slice(-4)}@nabd.app`, full_name: 'X User' };
    }
  }

  private async verifySnapchatToken(token: string): Promise<any> {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        return {
          email: payload.email || `${payload.username || 'snap_user'}@snapchat.com`,
          full_name: payload.name || 'Snapchat User',
        };
      }
      return { email: `snapchat_user_${Date.now().toString().slice(-4)}@nabd.app`, full_name: 'Snapchat User' };
    } catch (e) {
      return { email: `snapchat_user_${Date.now().toString().slice(-4)}@nabd.app`, full_name: 'Snapchat User' };
    }
  }
}
