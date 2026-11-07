import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { RouteClass, routeClass } from './route-classes';
import { OverloadLevel, overload, setLowPriorityFill } from './overload';
import { registerGauge } from './metrics.service';

/**
 * R16: admission control by route class, so browsing and reports can never use up what payments, bookings and sign-in need.
 *
 * Critical classes (payment, auth, booking, realtime) are NEVER refused here. The low-priority classes (search, public_read, user_read, admin, other) share ONE budget of
 * in-flight requests (LOW_PRIORITY_MAX_INFLIGHT, default 48 = 60 % of the API's 80-connection database pool, docs/platform/R7), and each class has its own cap inside it,
 * so a slow report cannot take the whole low-priority budget from search. Over a cap a safe read (GET/HEAD) is answered at once with 503 `server_busy` + Retry-After
 * instead of queueing behind the critical traffic. Writes in low classes are not refused (a chat message or a "mark as read" is cheap and users notice a loss);
 * they still count as in-flight. On top of the caps, the overload level sheds whole classes of reads: level 1 (strained) admin only, level 2 (overloaded) also other, search, public_read and user_read.
 * Always open: config, health, observability, sign-in/me (the app and the platform must be able to look at themselves).
 */
const LOW: RouteClass[] = ['search', 'public_read', 'user_read', 'admin', 'other'];
export const ADMISSION = {
  totalLow: Number(process.env.LOW_PRIORITY_MAX_INFLIGHT) || 48,
  perClass: { search: 24, public_read: 32, user_read: 40, admin: 12, other: 24 } as Record<string, number>,
  retryAfterSeconds: 3,
};
const ALWAYS_OPEN = /^\/(?:api\/v\d+\/)?(?:config|health|observability|\.well-known|auth\/(?:me|refresh|session))(?:\/|$|\?)/;
const SHED_AT_LEVEL: Record<1 | 2, RouteClass[]> = { 1: ['admin'], 2: ['admin', 'other', 'search', 'public_read', 'user_read'] };

export const admissionStats = { rejectedCap: 0, rejectedLevel: 0, lowInflight: 0, byClass: {} as Record<string, number> };
setLowPriorityFill(() => admissionStats.lowInflight / ADMISSION.totalLow);
registerGauge('nabd_admission_low_inflight', 'In-flight low-priority requests (search, public reads, user reads, admin, other).', () => admissionStats.lowInflight);
registerGauge('nabd_admission_rejected_cap_total', 'Reads refused because a low-priority in-flight cap was full.', () => admissionStats.rejectedCap, 'counter');
registerGauge('nabd_admission_rejected_level_total', 'Reads refused because the overload level sheds their class.', () => admissionStats.rejectedLevel, 'counter');

export function admit(cls: RouteClass, method: string, url: string, level: OverloadLevel): 'ok' | 'cap' | 'level' {
  if (!LOW.includes(cls)) return 'ok';
  const safe = method === 'GET' || method === 'HEAD';
  if (!safe || ALWAYS_OPEN.test(url)) return 'ok';
  if (level > 0 && SHED_AT_LEVEL[level as 1 | 2].includes(cls)) return 'level';
  if (admissionStats.lowInflight >= ADMISSION.totalLow || (admissionStats.byClass[cls] ?? 0) >= (ADMISSION.perClass[cls] ?? ADMISSION.totalLow)) return 'cap';
  return 'ok';
}

@Injectable()
export class AdmissionMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const url = req.originalUrl || req.url || '';
    const cls = routeClass(url.split('?')[0]);
    const verdict = admit(cls, req.method, url, overload().level());
    if (verdict !== 'ok') {
      if (verdict === 'cap') admissionStats.rejectedCap++; else admissionStats.rejectedLevel++;
      res.setHeader('Retry-After', String(ADMISSION.retryAfterSeconds));
      res.status(503).json({ statusCode: 503, error: 'server_busy', message: verdict === 'cap' ? 'server_busy' : 'server_shedding_load', retry_after_seconds: ADMISSION.retryAfterSeconds });
      return;
    }
    if (LOW.includes(cls)) {
      admissionStats.lowInflight++; admissionStats.byClass[cls] = (admissionStats.byClass[cls] ?? 0) + 1;
      let done = false;
      const release = () => { if (done) return; done = true; admissionStats.lowInflight--; admissionStats.byClass[cls]--; };
      res.on('finish', release); res.on('close', release);
    }
    next();
  }
}
