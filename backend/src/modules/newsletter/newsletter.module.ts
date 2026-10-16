/**
 * P17-17.5: newsletter signup with consent and double opt-in.
 *
 * POST /newsletter/subscribe stores a PENDING subscription and emails a
 * confirm link; GET /newsletter/confirm?token= activates it. No address is
 * ever mailed without the confirmation click. Resends are capped per address
 * per day; tokens are stored hashed (sha256) with a 24h expiry and cleared
 * on use, so a link works exactly once.
 */
import { BadRequestException, Body, Controller, Get, Injectable, Module, Post, Query } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { createHash, randomBytes } from 'crypto';
import { IsDefined, IsEmail, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { Public } from '../../common/auth.guard';
import { MailService } from '../mail/mail.module';

const LOCALES = ['ar', 'en', 'ur', 'hi', 'bn', 'fil'] as const;
const TOKEN_TTL_MS = 24 * 3600000;
const RESEND_CAP_PER_DAY = 3;

export class SubscribeDto {
  @IsDefined()
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsOptional()
  @IsIn(['ar', 'en', 'ur', 'hi', 'bn', 'fil'])
  locale?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  source?: string;
}

export class UnsubscribeDto {
  @IsDefined()
  @IsEmail()
  @MaxLength(254)
  email!: string;
}

@Injectable()
export class NewsletterService {
  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly mailer: MailService,
  ) {}

  private subs() { return this.conn.collection('newsletter_subscriptions'); }

  private confirmUrl(token: string): string {
    const base = (process.env.API_PUBLIC_URL || 'https://api.nabd.plus').replace(/\/$/, '');
    return `${base}/api/v1/newsletter/confirm?token=${token}`;
  }

  async subscribe(body: SubscribeDto) {
    const email = String(body?.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException('invalid_email');
    const locale = (LOCALES as readonly string[]).includes(String(body?.locale)) ? String(body.locale) : 'ar';
    const existing: any = await this.subs().findOne({ email });
    if (existing?.status === 'active') return { status: 'active' as const, email };
    const today = new Date().toISOString().slice(0, 10);
    const resends = existing?.resend_date === today ? Number(existing?.resend_count || 0) : 0;
    if (resends >= RESEND_CAP_PER_DAY) throw new BadRequestException('too_many_requests');

    const token = randomBytes(32).toString('hex');
    const now = new Date();
    await this.subs().updateOne(
      { email },
      {
        $setOnInsert: { id: existing?.id, email, created_at: existing?.created_at || now },
        $set: {
          status: 'pending',
          locale,
          source: typeof body?.source === 'string' ? body.source.slice(0, 120) : (existing?.source || null),
          confirm_token_hash: createHash('sha256').update(token).digest('hex'),
          token_expires_at: new Date(now.getTime() + TOKEN_TTL_MS),
          resend_date: today,
          resend_count: resends + 1,
          unsubscribed_at: null,
        },
      },
      { upsert: true },
    );
    const link = this.confirmUrl(token);
    await this.mailer.send(
      email,
      'تأكيد الاشتراك في نشرة نبض بلس | Confirm your Nabd+ newsletter subscription',
      `<p>لإتمام الاشتراك اضغط الرابط التالي (صالح 24 ساعة):</p><p><a href="${link}">${link}</a></p><p>To confirm your subscription (valid 24 hours), open this link:</p><p><a href="${link}">${link}</a></p>`,
      `Confirm your Nabd+ subscription (valid 24 hours): ${link}`,
    );
    return { status: 'pending' as const, email };
  }

  async confirmWithToken(token: string) {
    const hash = createHash('sha256').update(String(token || '')).digest('hex');
    const sub: any = await this.subs().findOne({ confirm_token_hash: hash });
    if (!sub) throw new BadRequestException('invalid_token');
    if (!sub.token_expires_at || new Date(sub.token_expires_at).getTime() < Date.now()) {
      throw new BadRequestException('link_expired');
    }
    await this.subs().updateOne(
      { email: sub.email },
      {
        $set: { status: 'active', confirmed_at: new Date() },
        $unset: { confirm_token_hash: 1, token_expires_at: 1 },
      },
    );
    return { status: 'active' as const, email: sub.email };
  }

  async unsubscribe(body: UnsubscribeDto) {
    const email = String(body?.email || '').trim().toLowerCase();
    if (!email) throw new BadRequestException('invalid_email');
    // Always ok: never reveal whether the address was subscribed.
    await this.subs().updateOne(
      { email },
      { $set: { status: 'unsubscribed', unsubscribed_at: new Date() }, $unset: { confirm_token_hash: 1, token_expires_at: 1 } },
    );
    return { ok: true };
  }
}

@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly svc: NewsletterService) {}

  @Post('subscribe')
  @Public()
  subscribe(@Body() body: SubscribeDto) {
    return this.svc.subscribe(body);
  }

  @Get('confirm')
  @Public()
  confirm(@Query('token') token?: string) {
    return this.svc.confirmWithToken(token || '');
  }

  @Post('unsubscribe')
  @Public()
  unsubscribe(@Body() body: UnsubscribeDto) {
    return this.svc.unsubscribe(body);
  }
}

@Module({
  controllers: [NewsletterController],
  providers: [NewsletterService],
  exports: [NewsletterService],
})
export class NewsletterModule {}
