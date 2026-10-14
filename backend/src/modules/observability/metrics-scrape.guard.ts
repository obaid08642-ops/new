import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';

/**
 * The scrape surface (`/observability/metrics`, `/observability/summary`) lists every route pattern with its error rate,
 * latency, heap and event-loop delay: an attacker's map of the API and of what is struggling. It is not public.
 *
 * Prometheus sends `Authorization: Bearer <token>` (`authorization.credentials` / `bearer_token_file` in the scrape
 * config); the token is METRICS_SCRAPE_TOKEN (at least 32 characters). Without a configured token, or with a wrong one,
 * the route answers 404, as if it did not exist (fail closed, nothing to probe).
 */
@Injectable()
export class MetricsScrapeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.METRICS_SCRAPE_TOKEN || '';
    const header = String(context.switchToHttp().getRequest()?.headers?.authorization || '');
    const given = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (expected.length < 32 || !given) throw new NotFoundException();
    const a = Buffer.from(given);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new NotFoundException();
    return true;
  }
}
