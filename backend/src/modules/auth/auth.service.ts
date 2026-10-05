import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException, ConflictException, Inject, Optional } from '@nestjs/common';
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
import { PasskeyService } from './passkey.service';
import { TurnstileService } from './turnstile.service';
import { SmsFraudProtectionService } from './sms-fraud-protection.service';
import { EmailOtpService } from './email-otp.service';
import { GuestService } from './guest.service';
import { PermissionMatrixService } from './permission-matrix.service';
import { AccountLinkingService, LinkedAccount } from './account-linking.service';
import { SessionService, DeviceInfo } from './session.service';
import { GuestLifecycleService } from './guest-lifecycle.service';
import { CheckoutContactService, CheckoutAddress } from './checkout-contact.service';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
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
    private readonly featureFlags: FeatureFlagsService,
    private readonly sms?: SmsService,
    private readonly media?: MediaService,
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
  // SMS is now a per-country feature flag (off by default)
  // Rate limits apply to email codes too
  // ============================================================
  async sendOtp(identifier: string, purpose: string = 'signup', ip?: string): Promise<void> {
    const isEmail = identifier.includes('@');
    
    if (isEmail) {
      // Email OTP is the default channel - use EmailOtpService with provider failover
      const result = await this.emailOtp.sendOtp(identifier, purpose as 'signup' | 'signin' | 'reset', ip);
      if (result.success) return;
      
      // Email failed - check if SMS fallback is enabled via feature flag for user's country
      const user = await this.conn.collection('users').findOne({ email: identifier });
      const smsEnabled = await this.isSmsEnabledForUser(user);
      
      if (smsEnabled && user?.phone && this.sms) {
        await this.sms.sendOtp(user.phone, this.generateOtp());
        return;
      }
      throw new BadRequestException('otp_delivery_failed');
    }
    
    // Phone identifier - check if SMS is enabled for this country
    const smsEnabled = await this.isSmsEnabledForPhone(identifier);
    if (smsEnabled && this.sms) {
      await this.sms.sendOtp(identifier, this.generateOtp());
    } else {
      throw new BadRequestException(smsEnabled ? 'no_sms_channel' : 'sms_not_enabled_for_country');
    }
  }

  private async isSmsEnabledForUser(user: any): Promise<boolean> {
    if (!user?.phone) return false;
    return this.isSmsEnabledForPhone(user.phone);
  }

  private async isSmsEnabledForPhone(phone: string): Promise<boolean> {
    // Extract country code from phone number
    const countryCode = this.extractCountryCode(phone);
    // Check feature flag: sms_enabled_<COUNTRY_CODE> (e.g., sms_enabled_SA)
    const flagKey = `sms_enabled_${countryCode}`;
    return this.featureFlags.isEnabled(flagKey);
  }

  private extractCountryCode(phone: string): string {
    const normalized = phone.replace(/\D/g, '');
    if (normalized.startsWith('966')) return 'SA';
    if (normalized.startsWith('971')) return 'AE';
    if (normalized.startsWith('20')) return 'EG';
    if (normalized.startsWith('965')) return 'KW';
    if (normalized.startsWith('973')) return 'BH';
    if (normalized.startsWith('974')) return 'QA';
    if (normalized.startsWith('968')) return 'OM';
    if (normalized.startsWith('962')) return 'JO';
    if (normalized.startsWith('961')) return 'LB';
    return 'XX';
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // ============================================================
  // 21.5: Checkout Contact Phone/Address
  // ============================================================
  /**
   * Store checkout contact (phone + address) for an order/booking
   * Phone: E.164 format, +966 default for Saudi Arabia, libphonenumber validation
   * Address: saved to patient profile addresses array
   * Returns contactId and addressId
   */
  async storeCheckoutContact(
    userId: string,
    phone: string,
    address: CheckoutAddress,
  ): Promise<{ contactId: string; phone: string; addressId?: string }> {
    return this.checkoutContact.validateAndStoreContact(userId, phone, address);
  }

  /**
   * Check COD eligibility based on phone verification status
   * - COD limited for new unverified customers
   * - Card payments not limited
   * - Provider must call before dispatch for unverified
   */
  async checkCodEligibility(userId: string): Promise<{ eligible: boolean; reason?: string }> {
    return this.checkoutContact.checkCodEligibility(userId);
  }

  /**
   * Get latest checkout contact for user
   */
  async getLatestCheckoutContact(userId: string) {
    return this.checkoutContact.getLatestContact(userId);
  }

  // ============================================================
  // 21.6: Account Linking
  // ============================================================
  /**
   * Initiate account linking with external provider (Google/Apple/Email)
   * Returns pending link that requires confirmation
   * Apple "hide my email" relay addresses supported for codes/receipts
   */
  async initiateAccountLink(
    userId: string,
    method: 'google' | 'apple' | 'email',
    providerEmail: string,
    providerId?: string,
    appleRelayEmail?: string,
  ): Promise<{ linkId: string; status: 'pending' }> {
    // Check for link opportunity
    const opportunity = await this.accountLinking.checkForLinkOpportunity(userId, providerEmail);
    if (!opportunity.canLink && opportunity.existingMethod) {
      throw new ConflictException('email_already_linked');
    }

    const result = await this.accountLinking.linkAccounts(
      userId,
      userId, // source and target are same for self-linking
      method,
      providerEmail,
      providerId,
      appleRelayEmail,
    );

    return { linkId: result.linkedAccountId, status: 'pending' };
  }

  /**
   * Confirm pending account link (after email verification)
   */
  async confirmAccountLink(linkId: string): Promise<void> {
    await this.accountLinking.confirmLink(linkId);
  }

  /**
   * Get all linked accounts for user
   */
  async getLinkedAccounts(userId: string): Promise<LinkedAccount[]> {
    return this.accountLinking.getLinkedAccounts(userId);
  }

  /**
   * Get pending links requiring confirmation
   */
  async getPendingLinks(userId: string): Promise<LinkedAccount[]> {
    return this.accountLinking.getPendingLinks(userId);
  }

  /**
   * Unlink an account
   */
  async unlinkAccount(linkId: string, userId: string): Promise<void> {
    await this.accountLinking.unlinkAccounts(linkId, userId);
  }

  /**
   * Get notification email for Apple relay addresses
   */
  async getAppleNotificationEmail(userId: string): Promise<string | null> {
    return this.accountLinking.getNotificationEmail(userId, 'apple');
  }

  private async verifyExternalToken(method: string, token: string): Promise<string> {
    switch (method) {
      case 'google':
        // Verify with Google OAuth
        return 'user@gmail.com'; // placeholder
      case 'apple':
        // Verify with Apple
        return 'user@icloud.com'; // placeholder
      case 'email':
        return token;
      default:
        throw new BadRequestException('unsupported_provider');
    }
  }

  // ============================================================
  // 21.7: Sessions
  // ============================================================
  /**
   * Create new session with rotating refresh token
   */
  async createSession(userId: string, deviceInfo: DeviceInfo): Promise<{ sessionId: string; refreshToken: string }> {
    return this.sessions.createSession(userId, deviceInfo);
  }

  /**
   * Rotate refresh token (validate old, issue new)
   */
  async rotateRefreshToken(sessionId: string, refreshToken: string): Promise<{ sessionId: string; refreshToken: string } | null> {
    return this.sessions.rotateRefreshToken(sessionId, refreshToken);
  }

  /**
   * List all signed-in devices for user
   */
  async getUserSessions(userId: string) {
    return this.sessions.getUserSessions(userId);
  }

  /**
   * Sign out specific device
   */
  async revokeSession(sessionId: string): Promise<void> {
    await this.sessions.revokeSession(sessionId);
  }

  /**
   * "Sign out other devices" - revoke all except current
   */
  async revokeOtherSessions(userId: string, keepSessionId: string): Promise<number> {
    return this.sessions.revokeOtherSessions(userId, keepSessionId);
  }

  /**
   * Sign out all devices
   */
  async revokeAllSessions(userId: string): Promise<number> {
    return this.sessions.revokeAllSessions(userId);
  }

  /**
   * Update session push token (for notifications)
   */
  async updateSessionPushToken(sessionId: string, pushToken: string): Promise<void> {
    await this.sessions.updatePushToken(sessionId, pushToken);
  }

  // ============================================================
  // 21.8: Guest Data Lifecycle
  // ============================================================
  async cleanupInactiveGuests(monthsInactive: number = 12): Promise<number> {
    return this.guestLifecycle.cleanupInactiveGuestsWithThreshold(monthsInactive);
  }

  // ... rest of existing auth.service.ts methods
}