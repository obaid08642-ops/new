import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { JwtAuthGuard, Roles, CurrentUser } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';

/**
 * C6.4: AI referral tracking.
 *
 * Tracks referrals from AI assistants (chat.openai.com, perplexity.ai, gemini,
 * copilot, claude.ai) in analytics and an admin report.
 */

const AI_REFERRERS = [
  'chat.openai.com',
  'perplexity.ai',
  'gemini.google.com',
  'copilot.microsoft.com',
  'claude.ai',
];

@Controller('admin/ai-referrals')
@UseGuards(JwtAuthGuard)
/** F1/R25: real DTO for the AI-referral beacon body. */
export class AiReferralDto {
  @IsOptional() @IsString() @MaxLength(512) referrer?: string;
  @IsOptional() @IsString() @MaxLength(512) path?: string;
  @IsOptional() @IsString() @MaxLength(512) user_agent?: string;
}

export class AiReferralController {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  private get referrals() {
    return this.conn.collection('ai_referrals');
  }

  @Post()
  async record(@Body() body: AiReferralDto) {
    const referrer = String(body?.referrer || '');
    const isAi = AI_REFERRERS.some((r) => referrer.toLowerCase().includes(r));
    if (!isAi) return { ok: false, reason: 'not_ai_referrer' };
    await this.referrals.insertOne({
      referrer,
      path: body.path || '/',
      user_agent: body.user_agent || null,
      created_at: new Date(),
    });
    return { ok: true };
  }

  @Get()
  @Roles(UserRole.ADMIN)
  async stats() {
    const stats = await this.referrals.aggregate([
      { $group: { _id: '$referrer', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]).toArray();
    return { stats };
  }
}
