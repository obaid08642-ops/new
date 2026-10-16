import { Injectable, NestMiddleware, ServiceUnavailableException } from '@nestjs/common';
import { KillSwitchesService } from './kill-switches.service';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Paths that keep working during emergency maintenance: the admin panel (it is how maintenance is lifted), sign-in
 * (an admin must be able to sign in), the public reads the apps use to show the maintenance screen, and the signed
 * callbacks of payment and call providers (money already taken must still be recorded).
 */
const EXEMPT_PREFIXES = ['auth', 'kill-switches', 'modules', 'config', 'health', 'webhooks', 'payments/webhook', 'moyasar/webhook', 'calls/webhook'];

export function isEmergencyExempt(rawPath: string): boolean {
  const clean = rawPath.split('?')[0].replace(/^\/api\/v\d+\//, '').replace(/^\/+/, '');
  if (/(^|\/)admin(\/|$)/.test(clean)) return true;
  return EXEMPT_PREFIXES.some((p) => clean === p || clean.startsWith(p + '/'));
}

/** Emergency maintenance: refuses every non-admin write with 503 `emergency_maintenance` before anything is stored. */
@Injectable()
export class EmergencyMaintenanceMiddleware implements NestMiddleware {
  constructor(private readonly switches: KillSwitchesService) {}

  async use(req: { method?: string; originalUrl?: string; url?: string }, _res: unknown, next: () => void) {
    if (!WRITE_METHODS.has(String(req.method || 'GET').toUpperCase())) return next();
    const path = String(req.originalUrl || req.url || '');
    if (isEmergencyExempt(path)) return next();
    if (!(await this.switches.isEmergencyActive())) return next();
    throw new ServiceUnavailableException({ statusCode: 503, code: 'emergency_maintenance', message: 'emergency_maintenance' });
  }
}
