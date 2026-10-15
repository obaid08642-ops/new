import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Observable, catchError, from, mergeMap } from 'rxjs';

/**
 * D-34 — counts of security events that really happened, for the admin
 * "Operations & Security" page. Observes only: it records the row, then
 * rethrows the identical error, so responses never change.
 *
 * - failed_sign_in:  400/401 from POST /auth/login (wrong password, ...).
 * - rate_limited:    any 429 (throttled, e.g. step-up attempts).
 * - blocked_request: 403s refused by a security guard (device_not_enrolled,
 *                    admin_gate_required, admin_session_idle_expired).
 * - step_up_failure: non-429 4xx/5xx from POST /auth/step-up/issue.
 */
const BLOCKED_MESSAGES = new Set(['device_not_enrolled', 'admin_gate_required', 'admin_session_idle_expired']);

@Injectable()
export class SecurityEventsInterceptor implements NestInterceptor {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const path = String(req?.originalUrl || req?.url || '').split('?')[0];
    return next.handle().pipe(
      catchError((err: any) => {
        const status = Number(err?.status ?? err?.statusCode);
        const message = String(err?.message ?? '');
        let type: string | null = null;
        if (status === 429) {
          type = 'rate_limited';
        } else if (path.endsWith('/auth/step-up/issue') && status >= 400) {
          type = 'step_up_failure';
        } else if (path.endsWith('/auth/login') && (status === 400 || status === 401)) {
          type = 'failed_sign_in';
        } else if (status === 403 && BLOCKED_MESSAGES.has(message)) {
          type = 'blocked_request';
        }
        if (!type) throw err;
        return from(this.record(type, path, message)).pipe(
          mergeMap(() => {
            throw err;
          }),
        );
      }),
    );
  }

  /** Awaited before the error is rethrown (read-after-write for the page). Never throws. */
  private async record(type: string, path: string, message: string): Promise<void> {
    try {
      await this.conn.collection('security_events').insertOne({ type, at: new Date(), path, message });
    } catch {
      // Observability must never break auth or throttling on DB hiccups.
    }
  }
}
