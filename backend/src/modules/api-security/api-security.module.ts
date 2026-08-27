/**
 * API Security & Abuse Protection (enterprise layer)
 * ─────────────────────────────────────────────────────────────────
 *  - Granular rate limits: per IP / per user / per device, with separate
 *    budgets for login, OTP, search, uploads, orders, and general API.
 *  - Honeypot endpoints: attractive-looking fake routes that no legit
 *    client ever calls — any hit marks the caller as a bot.
 *  - Auto-blacklist: abusive IPs/devices are blocked (Redis-backed, TTL).
 *  - Scraping detection: sequential-id enumeration + burst patterns.
 *  - Security event log: every auth + abuse event persisted for the
 *    admin health dashboard / monitoring alerts.
 */
import {
  Module, Injectable, Controller, Get, Post, Body, Req, Res, UseGuards,
  NestMiddleware, MiddlewareConsumer, RequestMethod, Logger, HttpStatus,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import { RedisService } from '../redis/redis.service';
import { JwtAuthGuard, Roles, Public } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';

// ── Rate limit budgets per route class ──────────────────────────────
const LIMITS: Array<{ pattern: RegExp; name: string; perMinute: number; perHour: number }> = [
  { pattern: /\/auth\/(login|register|social-login)/, name: 'login', perMinute: 5, perHour: 30 },
  { pattern: /\/auth\/(send-otp|verify-otp|verify-2fa|forgot-password)/, name: 'otp', perMinute: 3, perHour: 10 },
  { pattern: /\/medicines(\?|$)/, name: 'search', perMinute: 30, perHour: 500 },
  { pattern: /\/storage\/upload/, name: 'uploads', perMinute: 10, perHour: 60 },
  { pattern: /\/orders\/create/, name: 'orders', perMinute: 10, perHour: 40 },
  { pattern: /.*/, name: 'general', perMinute: 120, perHour: 3000 },
];

// Honeypot routes — legit clients NEVER call these; any hit = bot signal
const HONEYPOTS = new Set([
  '/api/v1/admin/secret-config',
  '/api/v1/internal/keys',
  '/api/v1/debug/vars',
  '/api/v1/wp-login.php',
  '/api/v1/.env',
  '/api/v1/xmlrpc.php',
  '/api/v1/medicines/export-all',
]);

@Injectable()
export class ApiSecurityService {
  private readonly logger = new Logger('ApiSecurity');

  constructor(
    private readonly redis: RedisService,
    @InjectConnection() private readonly conn: Connection,
  ) {}

  private get events() { return this.conn.collection('security_events'); }
  private client() { return (this.redis as any).getClient?.(); }

  /** Security event — persisted for monitoring + health dashboard. */
  async logEvent(type: string, req: Partial<Request>, extra: Record<string, any> = {}) {
    try {
      await this.events.insertOne({
        type,
        ip: (req as any).ip || (req as any).connection?.remoteAddress || null,
        device_id: req.headers?.['x-device-id'] || null,
        user_agent: req.headers?.['user-agent'] || null,
        path: (req as any).originalUrl || (req as any).url || null,
        ...extra,
        createdAt: new Date(),
      });
    } catch { /* logging must never break requests */ }
  }

  async isBlacklisted(ip: string, deviceId?: string): Promise<boolean> {
    const c = this.client();
    if (!c) return false;
    if (ip && (await c.get(`blacklist:ip:${ip}`))) return true;
    if (deviceId && (await c.get(`blacklist:dev:${deviceId}`))) return true;
    return false;
  }

  async blacklist(key: string, reason: string, ttlSeconds = 3600) {
    const c = this.client();
    if (c) await c.set(key, reason, 'EX', ttlSeconds);
    this.logger.warn(`BLACKLISTED ${key} — ${reason}`);
  }

  /** Granular rate limit: per (class, ip, user, device). Returns verdict. */
  async checkRate(req: Request, userId?: string): Promise<{ allowed: boolean; className: string; retryAfter?: number }> {
    const url = (req as any).originalUrl || req.url || '';
    const ip = (req as any).ip || 'unknown';
    const deviceId = (req.headers?.['x-device-id'] as string) || undefined;

    // Permanent block check first
    if (await this.isBlacklisted(ip, deviceId)) {
      return { allowed: false, className: 'blacklist', retryAfter: 3600 };
    }

    const cls = LIMITS.find(l => l.pattern.test(url)) || LIMITS[LIMITS.length - 1];
    const c = this.client();
    if (!c) return { allowed: true, className: cls.name };

    // Composite keys — IP, user, device each constrained
    const keys = [
      `rl:${cls.name}:ip:${ip}`,
      ...(userId ? [`rl:${cls.name}:user:${userId}`] : []),
      ...(deviceId ? [`rl:${cls.name}:dev:${deviceId}`] : []),
    ];
    for (const k of keys) {
      const n = await c.incr(k);
      if (n === 1) await c.expire(k, 60);
      if (n > cls.perMinute) {
        // Sustained abuse → escalate to hourly count and auto-blacklist at 3×
        const hk = `${k}:h`;
        const hn = await c.incr(hk);
        if (hn === 1) await c.expire(hk, 3600);
        if (hn > cls.perHour) {
          const blkKey = deviceId ? `blacklist:dev:${deviceId}` : `blacklist:ip:${ip}`;
          await this.blacklist(blkKey, `rate-abuse:${cls.name}`, 3600);
          await this.logEvent('abuse.blacklist', req, { className: cls.name, hits: hn });
        }
        return { allowed: false, className: cls.name, retryAfter: 60 };
      }
    }

    // Scraping detection: sequential numeric id enumeration
    const idMatch = url.match(/\/(\d{5,})(?:\/|$|\?)/);
    if (idMatch) {
      const id = parseInt(idMatch[1], 10);
      const seqKey = `seq:${ip}`;
      const streakKey = `seqstreak:${ip}`;
      const last = parseInt((await c.get(seqKey)) || '0', 10);
      if (id === last + 1 || id === last + 2) {
        const streak = await c.incr(streakKey);
        if (streak === 1) await c.expire(streakKey, 120);
        if (streak >= 12) {
          await this.blacklist(`blacklist:ip:${ip}`, 'enumeration-scraping', 7200);
          await this.logEvent('abuse.enumeration', req, { streak });
          return { allowed: false, className: 'enumeration', retryAfter: 600 };
        }
      } else {
        await c.del(streakKey).catch(() => {});
      }
      await c.set(seqKey, String(id), 'EX', 120);
    }

    return { allowed: true, className: cls.name };
  }
}

// ── Middleware enforcing the verdict ────────────────────────────────
@Injectable()
export class ApiSecurityMiddleware implements NestMiddleware {
  constructor(private readonly sec: ApiSecurityService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Honeypot: any hit = instant blacklist + event (serve convincing fake data)
    const url = (req as any).originalUrl || req.url || '';
    if (HONEYPOTS.has(url.split('?')[0])) {
      const ip = (req as any).ip || 'unknown';
      const deviceId = req.headers?.['x-device-id'] as string | undefined;
      await this.sec.blacklist(deviceId ? `blacklist:dev:${deviceId}` : `blacklist:ip:${ip}`, 'honeypot', 86400);
      await this.sec.logEvent('abuse.honeypot', req, {});
      // Fake 200 payload keeps the bot busy (no 403 tell)
      return res.status(200).json({ status: 'ok', data: [] });
    }

    const verdict = await this.sec.checkRate(req, (req as any).user?.id);
    if (!verdict.allowed) {
      await this.sec.logEvent('abuse.rate_limited', req, { className: verdict.className });
      // The middleware short-circuits before Nest's CORS layer — without these
      // headers the browser sees a network error ("Load failed") instead of
      // the real 429 body, which looks like a broken login to users.
      const origin = (req.headers?.origin as string) || '';
      const allowed = (process.env.CORS_ORIGINS || 'https://nabd.plus,https://www.nabd.plus,https://admin.nabd.plus,https://provider.nabd.plus')
        .split(',').map((s) => s.trim().replace(/"/g, ''));
      if (origin && allowed.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
      res.setHeader('Retry-After', String(verdict.retryAfter || 60));
      return res.status(HttpStatus.TOO_MANY_REQUESTS).json({
        statusCode: 429,
        message: 'Too many requests',
        retry_after: verdict.retryAfter || 60,
      });
    }
    next();
  }
}

// ── Security events admin endpoint ──────────────────────────────────
@Controller('admin/security')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class ApiSecurityController {
  constructor(private readonly sec: ApiSecurityService) {}

  @Get('events')
  async events() {
    const rows = await (this.sec as any).events
      .find({}, { projection: { _id: 0 } })
      .sort({ createdAt: -1 }).limit(100).toArray();
    const counts = await (this.sec as any).events.aggregate([
      { $group: { _id: '$type', n: { $sum: 1 } } },
      { $sort: { n: -1 } },
    ]).toArray();
    return { data: rows, counts };
  }

  @Post('blacklist/clear')
  async clear(@Body() body: { key: string }) {
    const c = (this.sec as any).client?.();
    if (c && body?.key) await c.del(`blacklist:ip:${body.key}`, `blacklist:dev:${body.key}`);
    return { ok: true };
  }
}

@Module({
  controllers: [ApiSecurityController],
  providers: [ApiSecurityService, ApiSecurityMiddleware],
  exports: [ApiSecurityService],
})
export class ApiSecurityModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ApiSecurityMiddleware).forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
