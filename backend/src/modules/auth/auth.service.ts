import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException, Inject, Optional } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, ClientSession } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User, UserDocument } from '../../schemas/user.schema';
import { PatientProfile, PatientProfileDocument } from '../../schemas/patient-profile.schema';
import { ProviderProfile, ProviderProfileDocument } from '../../schemas/provider-profile.schema';
import { SmsService } from '../sms/sms.service';
import { MediaService } from '../media/media.service';
import { VerificationService } from '../verification/verification.service';
import { PasskeyService } from './passkey.service';
import { TurnstileService } from './turnstile.service';
import { SmsFraudProtectionService } from './sms-fraud-protection.service';
import { EmailOtpService } from './email-otp.service';
import { GuestService } from './guest.service';
import { PermissionMatrixService } from './permission-matrix.service';
import { AccountLinkingService } from './account-linking.service';
import { SessionService } from './session.service';
import { GuestLifecycleService } from './guest-lifecycle.service';
import { CheckoutContactService } from './checkout-contact.service';
import { Types } from 'mongoose';

const DEVICE_COOKIE = 'nabd_admin_device';
const PATIENT_ACCESS_COOKIE = 'nabd_patient_access';
const PATIENT_REFRESH_COOKIE = 'nabd_patient_refresh';
const PATIENT_ACCESS_COOKIE_MAX_AGE = 60 * 60 * 1000;
const PATIENT_REFRESH_COOKIE_MAX_AGE = 14 * 24 * 60 * 60 * 1000;

const PATIENT_SESSION_COOKIE_OPTS = (req: any, maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge,
});

const DEVICE_COOKIE_OPTS = (req: any) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 90 * 24 * 60 * 60 * 1000,
});

function clientIp(req: any): string | undefined {
  const xff = (req.headers['x-forwarded-for'] as string) || '';
  return (xff.split(',')[0] || req.ip || '').trim() || undefined;
}

@Injectable()
export class AuthService {
  private readonly log = new Logger(AuthService.name);

  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly events: EventEmitter2,
    private readonly sms?: SmsService,
    private readonly media?: MediaService,
    private readonly verification?: VerificationService,
    private readonly passkey: PasskeyService,
    private readonly turnstile: TurnstileService,
    private readonly smsFraud: SmsFraudProtectionService,
    private readonly emailOtp: EmailOtpService,
    private readonly guest: GuestService,
    private readonly permissions: PermissionMatrixService,
    private readonly accountLinking: AccountLinkingService,
    private readonly sessions: SessionService,
    private readonly guestLifecycle: GuestLifecycleService,
    private readonly checkoutContact: CheckoutContactService,
  ) {}

  // ============================================================
  // 21.2: Guest -> Account Merge (ATOMIC MongoDB Transaction)
  // ============================================================
  async migrateGuestData(fromUserId: string, toUserId: string): Promise<void> {
    const session = await this.conn.startSession();
    try {
      await session.withTransaction(async () => {
        await this.guest.mergeGuestToAccount(fromUserId, toUserId, session);
      });
    } finally {
      await session.endSession();
    }
  }

  // ============================================================
  // 21.4: Email OTP by Default (with provider failover)
  // ============================================================
  async sendOtp(identifier: string, purpose: string = 'signup'): Promise<void> {
    // Check if identifier is email
    const isEmail = identifier.includes('@');
    
    if (isEmail) {
      // Try email OTP first
      const result = await this.emailOtp.sendOtp(identifier, purpose as 'signup' | 'signin' | 'reset');
      if (result.success) return;
      
      // If email fails and phone available, try SMS
      const user = await this.conn.collection('users').findOne({ email: identifier });
      if (user?.phone && this.sms) {
        await this.sms.sendOtp(user.phone, this.generateOtp());
        return;
      }
      throw new BadRequestException('otp_delivery_failed');
    }
    
    // Phone identifier - use SMS
    if (this.sms) {
      await this.sms.sendOtp(identifier, this.generateOtp());
    } else {
      throw new BadRequestException('no_sms_channel');
    }
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // ============================================================
  // 21.6: Account Linking
  // ============================================================
  async linkAccounts(userId: string, method: 'google' | 'apple' | 'email', token: string): Promise<void> {
    // Verify the external token and get email
    const email = await this.verifyExternalToken(method, token);
    
    // Check if email already linked to another account
    const existing = await this.conn.collection('users').findOne({ email, id: { $ne: new Types.ObjectId(userId) } });
    if (existing) {
      throw new BadRequestException('email_already_linked');
    }
    
    // Link the account
    await this.accountLinking.linkAccounts(userId, method, token);
    
    // Update user's email if not set
    await this.conn.collection('users').updateOne(
      { id: userId },
      { $set: { email } },
    );
  }

  private async verifyExternalToken(method: string, token: string): Promise<string> {
    // Implementation depends on provider
    switch (method) {
      case 'google':
        // Verify with Google OAuth
        return 'user@gmail.com'; // placeholder
      case 'apple':
        // Verify with Apple
        return 'user@icloud.com'; // placeholder
      case 'email':
        return token; // token is the email
      default:
        throw new BadRequestException('unsupported_provider');
    }
  }

  // ============================================================
  // 21.5: Checkout Contact Phone/Address
  // ============================================================
  async storeCheckoutContact(
    userId: string,
    phone: string,
    address: any,
  ): Promise<{ contactId: string }> {
    // Validate phone format (E.164)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phone)) {
      throw new BadRequestException('invalid_phone_format');
    }

    return this.checkoutContact.validateAndStoreContact(userId, phone, address);
  }

  // ============================================================
  // 21.8: Guest Data Lifecycle
  // ============================================================
  async cleanupInactiveGuests(monthsInactive: number = 12): Promise<number> {
    return this.guestLifecycle.cleanupInactiveGuests(monthsInactive);
  }

  // ... rest of existing auth.service.ts methods
}
