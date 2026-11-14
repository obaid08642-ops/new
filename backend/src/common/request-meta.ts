/**
 * 21.7 — who is calling, for the session list: the client address, the user agent and the device id of the request in
 * flight. A separate async context from the log one, so the sign-in code can record it without being handed a request.
 */
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
  deviceId?: string;
}

const storage = new AsyncLocalStorage<RequestMeta>();

export function currentRequestMeta(): RequestMeta {
  return storage.getStore() ?? {};
}

export function runWithRequestMeta<T>(meta: RequestMeta, fn: () => T): T {
  return storage.run(meta, fn);
}

const header = (req: Request, name: string): string | undefined => {
  const v = req.headers[name];
  const s = Array.isArray(v) ? v[0] : v;
  return typeof s === 'string' && s ? s : undefined;
};

@Injectable()
export class RequestMetaMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    runWithRequestMeta(
      {
        ip: typeof req.ip === 'string' ? req.ip.slice(0, 64) : undefined,
        userAgent: header(req, 'user-agent')?.slice(0, 200),
        deviceId: header(req, 'x-device-id')?.slice(0, 64),
      },
      next,
    );
  }
}

/** "iPhone · Nabd+ app", "Chrome on Windows": a label a person recognises, from the user agent. Never the raw string. */
export function describeClient(userAgent?: string | null): { platform: string; label: string } {
  const ua = String(userAgent || '');
  if (!ua) return { platform: 'unknown', label: 'unknown' };
  const platform = /iPhone|iPad|iPod|iOS/i.test(ua) ? 'ios' : /Android/i.test(ua) ? 'android' : /Windows|Macintosh|Mac OS X|Linux|CrOS/i.test(ua) ? 'web' : /okhttp|CFNetwork|Expo/i.test(ua) ? 'app' : 'unknown';
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\/|Opera/.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : null;
  const os = /Windows/i.test(ua) ? 'Windows' : /Android/i.test(ua) ? 'Android' : /iPhone|iPad|iPod/i.test(ua) ? 'iOS' : /Macintosh|Mac OS X/i.test(ua) ? 'macOS' : /CrOS/i.test(ua) ? 'ChromeOS' : /Linux/i.test(ua) ? 'Linux' : null;
  const label = browser && os ? `${browser} · ${os}` : browser || os || (/okhttp|CFNetwork|Expo/i.test(ua) ? 'Nabd+ app' : 'unknown');
  return { platform, label };
}

/** The address with its host part hidden: shown to the owner of the account, never the full value. */
export function maskIp(ip?: string | null): string | null {
  if (!ip) return null;
  const v4 = ip.replace(/^::ffff:/, '');
  if (/^\d+\.\d+\.\d+\.\d+$/.test(v4)) return v4.split('.').slice(0, 2).join('.') + '.*.*';
  const parts = v4.split(':');
  return parts.length > 2 ? parts.slice(0, 2).join(':') + ':*' : null;
}
