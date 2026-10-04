import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisManagerService } from '../../common/redis/redis-manager.service';

interface SmsRateLimitConfig {
  maxOtpsPerNumberPerHour: number;
  maxNumbersPerIpPerHour: number;
  allowedCountryCodes: string[];
  dailySmsBudget: number;
}

@Injectable()
export class SmsFraudProtectionService {
  private readonly config: SmsRateLimitConfig;
  private readonly redis: RedisManagerService;

  constructor(
    private readonly configService: ConfigService,
    redisManager: RedisManagerService,
  ) {
    this.redis = redisManager.getClient('queue');
    this.config = {
      maxOtpsPerNumberPerHour: parseInt(this.configService.get('SMS_MAX_OTPS_PER_NUMBER_PER_HOUR') || '5', 10),
      maxNumbersPerIpPerHour: parseInt(this.configService.get('SMS_MAX_NUMBERS_PER_IP_PER_HOUR') || '15', 10),
      allowedCountryCodes: (this.configService.get('SMS_ALLOWED_COUNTRY_CODES') || 'SA,AE,EG,KW,BH,QA,OM,JO,LB').split(','),
      dailySmsBudget: parseInt(this.configService.get('SMS_DAILY_BUDGET') || '10000', 10),
    };
  }

  async checkAndRecord(phoneNumber: string, ip: string): Promise<{ allowed: boolean; reason?: string }> {
    const normalized = this.normalizePhone(phoneNumber);
    const countryCode = this.extractCountryCode(normalized);

    // Check allowed country codes
    if (!this.config.allowedCountryCodes.includes(countryCode)) {
      return { allowed: false, reason: `Country code ${countryCode} not allowed` };
    }

    const now = Date.now();
    const hourKey = Math.floor(now / 3600000);
    const dayKey = Math.floor(now / 86400000);

    // Check OTPs per number per hour
    const numberKey = `sms:rate:number:${normalized}:${hourKey}`;
    const numberCount = await this.redis.incr(numberKey);
    if (numberCount === 1) await this.redis.expire(numberKey, 3600);
    if (numberCount > this.config.maxOtpsPerNumberPerHour) {
      return { allowed: false, reason: `Too many OTPs for this number (max ${this.config.maxOtpsPerNumberPerHour}/hour)` };
    }

    // Check numbers per IP per hour
    const ipKey = `sms:rate:ip:${ip}:${hourKey}`;
    const ipCount = await this.redis.incr(ipKey);
    if (ipCount === 1) await this.redis.expire(ipKey, 3600);
    if (ipCount > this.config.maxNumbersPerIpPerHour) {
      return { allowed: false, reason: `Too many numbers from this IP (max ${this.config.maxNumbersPerIpPerHour}/hour)` };
    }

    // Check daily budget
    const dayBudgetKey = `sms:budget:${dayKey}`;
    const dayCount = await this.redis.incr(dayBudgetKey);
    if (dayCount === 1) await this.redis.expire(dayBudgetKey, 86400);
    if (dayCount > this.config.dailySmsBudget) {
      // Alert would be sent here (e.g., to Sentry, Slack, etc.)
      console.warn(`SMS daily budget exceeded: ${dayCount}/${this.config.dailySmsBudget}`);
    }

    return { allowed: true };
  }

  private normalizePhone(phone: string): string {
    // Remove all non-digits, ensure starts with country code
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('00')) return digits.slice(2);
    if (digits.startsWith('0')) return '966' + digits.slice(1); // Default SA
    return digits;
  }

  private extractCountryCode(normalized: string): string {
    // SA=966, AE=971, EG=20, KW=965, BH=973, QA=974, OM=968, JO=962, LB=961
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
}
