import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { JwtAuthGuard, Public, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { AiReferralService } from './ai-referral.service';

/**
 * C6.4: AI referral tracking.
 *
 * Recording is a public, throttled beacon (AI referrals are anonymous web
 * visitors); the report is admin-only.
 */

/** F1/R25: real DTO for the AI-referral beacon body. */
export class AiReferralDto {
  @IsOptional() @IsString() @MaxLength(512) referrer?: string;
  @IsOptional() @IsString() @MaxLength(512) path?: string;
  @IsOptional() @IsString() @MaxLength(128) utm_source?: string;
  @IsOptional() @IsString() @MaxLength(512) user_agent?: string;
}

/** ccde4f0: POST /analytics/ai-referral — called by the patient website proxy. */
@Controller('analytics/ai-referral')
export class AiReferralBeaconController {
  constructor(private readonly referrals: AiReferralService) {}

  @Public()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Post()
  record(@Body() body: AiReferralDto) {
    return this.referrals.record(body);
  }
}

@Controller('admin/ai-referrals')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AiReferralController {
  constructor(private readonly referrals: AiReferralService) {}

  @Get()
  async stats() {
    return { stats: await this.referrals.stats() };
  }
}
