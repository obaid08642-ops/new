import { Injectable, NestMiddleware } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import type { NextFunction, Request, Response } from 'express';
import { isVersionBelow } from './app-version';
import { recordClientVersion } from './metrics.service';

/**
 * R12: server-side enforcement of the admin-managed minimum app version (`system_configs.app_versions`, edited with PUT /admin/app-versions).
 * A mobile build that sends `X-App-Id` (patient | provider | driver | pharmacy) and `X-App-Version` below that app's `min_version` gets HTTP 426
 * `app_update_required` with the admin's message, on every route except config/health/observability. The in-app AppGate is the friendly screen; this
 * is the part that also protects the API from a build whose gate is old or bypassed.
 *
 * Not enforced (on purpose, stated in docs/platform/R12-mobile-compat.md): a request without the headers (builds before this change, scripts, web) and
 * any failure to read the config (fail-open: a broken config store must not lock every user out). Traffic per app and version is counted for the deprecation decision.
 */
const APPS = new Set(['patient', 'provider', 'driver', 'pharmacy']);
const EXEMPT = /^\/(?:api\/v\d+\/)?(?:config|health|observability|\.well-known)(?:\/|$|\?)/;
const TTL_MS = 30_000;

@Injectable()
export class AppVersionMiddleware implements NestMiddleware {
  private cache: { at: number; apps: Record<string, any> } | null = null;
  constructor(@InjectConnection() private readonly conn: Connection) {}

  private async apps(): Promise<Record<string, any>> {
    const now = Date.now();
    if (this.cache && now - this.cache.at < TTL_MS) return this.cache.apps;
    try {
      const doc: any = await this.conn.collection('system_configs').findOne({ key: 'app_versions' } as any);
      const apps = doc?.value?.apps && typeof doc.value.apps === 'object' ? doc.value.apps : {};
      this.cache = { at: now, apps };
      return apps;
    } catch {
      return this.cache?.apps ?? {};            // fail-open: last good copy, else nothing enforced
    }
  }

  async use(req: Request, res: Response, next: NextFunction) {
    const h = (n: string) => { const v = req.headers[n]; const t = Array.isArray(v) ? v[0] : v; return typeof t === 'string' ? t.trim() : ''; };
    const app = h('x-app-id').toLowerCase();
    const version = h('x-app-version').slice(0, 20);
    if (!APPS.has(app) || !version) return next();
    recordClientVersion(app, version);
    if (EXEMPT.test(req.originalUrl || req.url || '')) return next();
    const entry = (await this.apps())[app];
    if (entry && isVersionBelow(version, entry.min_version)) {
      return res.status(426).json({
        statusCode: 426, error: 'app_update_required', message: 'app_update_required',
        min_version: entry.min_version, latest_version: entry.latest_version ?? null,
        message_ar: entry.message_ar ?? null, message_en: entry.message_en ?? null,
      });
    }
    return next();
  }
}
