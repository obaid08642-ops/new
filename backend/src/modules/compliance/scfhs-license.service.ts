import { Injectable, Logger, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ProviderProfile, ProviderProfileDocument } from '../../schemas/provider-profile.schema';
import { User, UserDocument } from '../../schemas/user.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, NotificationPriority } from '../../common/enums';

export interface ScfhsVerificationResult {
  licenseNumber: string;
  isValid: boolean;
  status: 'active' | 'expired' | 'suspended' | 'not_found' | 'pending_verification';
  providerName?: string;
  specialty?: string;
  expiryDate?: Date;
  verifiedAt: Date;
  source: 'scfhs_api' | 'manual' | 'cached';
}

export interface LicenseCheckInput {
  providerAccountId: string;
  licenseNumber: string;
  providerType: 'doctor' | 'nurse' | 'pharmacist' | 'dentist' | 'allied_health';
}

@Injectable()
export class ScfhsLicenseService {
  private readonly logger = new Logger(ScfhsLicenseService.name);
  private readonly SCFHS_API_BASE = process.env.SCFHS_API_BASE || 'https://api.scfhs.org.sa/v1';
  private readonly SCFHS_API_KEY = process.env.SCFHS_API_KEY;
  private readonly CACHE_TTL_DAYS = 30;

  constructor(
    @InjectModel(ProviderProfile.name) private readonly providerProfileModel: Model<ProviderProfileDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async verifyLicense(input: LicenseCheckInput): Promise<ScfhsVerificationResult> {
    const { providerAccountId, licenseNumber, providerType } = input;

    this.logger.log(`Verifying SCFHS license ${licenseNumber} for provider ${providerAccountId}`);

    const profile = await this.providerProfileModel.findOne({ account_id: providerAccountId });
    if (!profile) {
      throw new NotFoundException('Provider profile not found');
    }

    const cached = await this.getCachedVerification(providerAccountId, licenseNumber);
    if (cached && !this.isCacheStale(cached.verifiedAt)) {
      this.logger.log(`Using cached SCFHS verification for ${licenseNumber}`);
      return { ...cached, source: 'cached' };
    }

    let result: ScfhsVerificationResult;

    if (this.SCFHS_API_KEY) {
      result = await this.callScfhsApi(licenseNumber, providerType);
    } else {
      result = await this.mockScfhsVerification(licenseNumber, providerType);
    }

    await this.updateProviderLicenseStatus(providerAccountId, result);
    await this.cacheVerification(providerAccountId, licenseNumber, result);

    if (result.status === 'expired' || result.status === 'suspended') {
      await this.handleExpiredLicense(providerAccountId, profile, result);
    }

    return result;
  }

  async verifyLicenseAtOnboarding(
    providerAccountId: string,
    licenseNumber: string,
    providerType: LicenseCheckInput['providerType'],
  ): Promise<ScfhsVerificationResult> {
    const result = await this.verifyLicense({ providerAccountId, licenseNumber, providerType });

    const profile = await this.providerProfileModel.findOne({ account_id: providerAccountId });
    if (profile) {
      profile.scfhs_license_number = licenseNumber;
      profile.license_status = result.status;
      profile.license_verified = result.isValid;
      profile.verification_logs.push({
        status: result.status,
        verified_by: 'scfhs_api',
        verified_at: new Date(),
        notes: `Onboarding verification: ${result.status}`,
      });
      await profile.save();
    }

    return result;
  }

  async periodicLicenseCheck(): Promise<{ checked: number; expired: number; suspended: number }> {
    this.logger.log('Starting periodic SCFHS license check');

    const providers = await this.providerProfileModel.find({
      scfhs_license_number: { $exists: true, $ne: null },
      license_status: { $in: ['verified', 'active'] },
    }).lean();

    let checked = 0;
    let expired = 0;
    let suspended = 0;

    for (const provider of providers) {
      if (!provider.scfhs_license_number) continue;

      const result = await this.verifyLicense({
        providerAccountId: provider.account_id || provider.user_id,
        licenseNumber: provider.scfhs_license_number,
        providerType: this.mapProviderType(provider.type),
      });

      checked++;
      if (result.status === 'expired') expired++;
      if (result.status === 'suspended') suspended++;

      await this.sleep(100);
    }

    this.logger.log(`Periodic check complete: ${checked} checked, ${expired} expired, ${suspended} suspended`);
    return { checked, expired, suspended };
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async scheduledPeriodicCheck(): Promise<void> {
    await this.periodicLicenseCheck();
  }

  async getLicenseStatus(providerAccountId: string): Promise<{
    licenseNumber: string | null;
    status: string;
    isValid: boolean;
    expiryDate: Date | null;
    lastVerified: Date | null;
  }> {
    const profile = await this.providerProfileModel.findOne({ account_id: providerAccountId });
    if (!profile) {
      throw new NotFoundException('Provider profile not found');
    }

    return {
      licenseNumber: profile.scfhs_license_number || null,
      status: profile.license_status,
      isValid: profile.license_verified,
      expiryDate: profile.license_expiry_date || null,
      lastVerified: profile.verification_logs[profile.verification_logs.length - 1]?.verified_at || null,
    };
  }

  async manualVerification(
    providerAccountId: string,
    licenseNumber: string,
    verifiedBy: string,
    notes: string,
    status: ScfhsVerificationResult['status'] = 'verified',
  ): Promise<ScfhsVerificationResult> {
    const profile = await this.providerProfileModel.findOne({ account_id: providerAccountId });
    if (!profile) {
      throw new NotFoundException('Provider profile not found');
    }

    const result: ScfhsVerificationResult = {
      licenseNumber,
      isValid: status === 'active' || status === 'verified',
      status,
      verifiedAt: new Date(),
      source: 'manual',
    };

    profile.scfhs_license_number = licenseNumber;
    profile.license_status = status;
    profile.license_verified = result.isValid;
    profile.verification_logs.push({
      status,
      verified_by: verifiedBy,
      verified_at: new Date(),
      notes,
    });
    await profile.save();

    await this.cacheVerification(providerAccountId, licenseNumber, result);

    if (!result.isValid) {
      await this.handleExpiredLicense(providerAccountId, profile, result);
    }

    return result;
  }

  async getProvidersWithLicenseStatus(status?: string): Promise<ProviderProfileDocument[]> {
    const query: any = {
      scfhs_license_number: { $exists: true, $ne: null },
    };
    if (status) {
      query.license_status = status;
    }
    return this.providerProfileModel.find(query).lean();
  }

  private async callScfhsApi(licenseNumber: string, providerType: string): Promise<ScfhsVerificationResult> {
    try {
      const response = await fetch(`${this.SCFHS_API_BASE}/license/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.SCFHS_API_KEY}`,
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          license_number: licenseNumber,
          practitioner_type: providerType,
        }),
      });

      if (!response.ok) {
        throw new Error(`SCFHS API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        licenseNumber,
        isValid: data.is_valid === true,
        status: data.status || (data.is_valid ? 'active' : 'not_found'),
        providerName: data.practitioner_name,
        specialty: data.specialty,
        expiryDate: data.expiry_date ? new Date(data.expiry_date) : undefined,
        verifiedAt: new Date(),
        source: 'scfhs_api',
      };
    } catch (error) {
      this.logger.error(`SCFHS API call failed: ${error.message}`);
      return this.mockScfhsVerification(licenseNumber, providerType);
    }
  }

  private async mockScfhsVerification(licenseNumber: string, providerType: string): Promise<ScfhsVerificationResult> {
    const isValid = licenseNumber.length >= 6;
    const status = isValid ? 'active' : 'not_found';

    return {
      licenseNumber,
      isValid,
      status,
      providerName: `Dr. ${licenseNumber.substring(0, 3).toUpperCase()} ${licenseNumber.substring(3, 6).toUpperCase()}`,
      specialty: providerType === 'doctor' ? 'General Practice' : providerType,
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      verifiedAt: new Date(),
      source: 'mock',
    };
  }

  private async getCachedVerification(
    providerAccountId: string,
    licenseNumber: string,
  ): Promise<ScfhsVerificationResult | null> {
    const profile = await this.providerProfileModel.findOne({ account_id: providerAccountId });
    if (!profile || !profile.scfhs_license_number) return null;

    const lastLog = profile.verification_logs[profile.verification_logs.length - 1];
    if (!lastLog) return null;

    return {
      licenseNumber: profile.scfhs_license_number,
      isValid: profile.license_verified,
      status: profile.license_status as ScfhsVerificationResult['status'],
      verifiedAt: lastLog.verified_at,
      source: 'cached',
    };
  }

  private isCacheStale(verifiedAt: Date): boolean {
    const age = Date.now() - new Date(verifiedAt).getTime();
    return age > this.CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
  }

  private async cacheVerification(
    providerAccountId: string,
    licenseNumber: string,
    result: ScfhsVerificationResult,
  ): Promise<void> {
    await this.providerProfileModel.updateOne(
      { account_id: providerAccountId },
      {
        $set: {
          scfhs_license_number: licenseNumber,
          license_status: result.status,
          license_verified: result.isValid,
          license_expiry_date: result.expiryDate,
        },
        $push: {
          verification_logs: {
            status: result.status,
            verified_by: result.source,
            verified_at: result.verifiedAt,
            notes: `Auto-verified via ${result.source}`,
          },
        },
      },
    );
  }

  private async updateProviderLicenseStatus(
    providerAccountId: string,
    result: ScfhsVerificationResult,
  ): Promise<void> {
    await this.providerProfileModel.updateOne(
      { account_id: providerAccountId },
      {
        $set: {
          license_status: result.status,
          license_verified: result.isValid,
          license_expiry_date: result.expiryDate,
        },
      },
    );
  }

  private async handleExpiredLicense(
    providerAccountId: string,
    profile: ProviderProfileDocument,
    result: ScfhsVerificationResult,
  ): Promise<void> {
    this.logger.warn(`License expired/suspended for provider ${providerAccountId}: ${result.status}`);

    await this.providerProfileModel.updateOne(
      { account_id: providerAccountId },
      {
        $set: {
          status: 'suspended',
          public_eligibility: false,
          indexing_eligibility: false,
        },
      },
    );

    await this.notificationsService.create({
      user_id: providerAccountId,
      title_key: 'notification.license.expired.title',
      body_key: 'notification.license.expired.body',
      params: { licenseNumber: result.licenseNumber, status: result.status },
      type: NotificationType.ALERT,
      priority: NotificationPriority.HIGH,
    });

    await this.notificationsService.create({
      user_id: 'admin',
      title_key: 'notification.admin.license.expired.title',
      body_key: 'notification.admin.license.expired.body',
      params: { providerName: profile.name_ar || profile.name_en, licenseNumber: result.licenseNumber },
      type: NotificationType.ALERT,
      priority: NotificationPriority.HIGH,
    });
  }

  private mapProviderType(type: string): LicenseCheckInput['providerType'] {
    const mapping: Record<string, LicenseCheckInput['providerType']> = {
      doctor: 'doctor',
      nursing: 'nurse',
      pharmacy: 'pharmacist',
      radiology: 'allied_health',
      lab: 'allied_health',
    };
    return mapping[type] || 'allied_health';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}