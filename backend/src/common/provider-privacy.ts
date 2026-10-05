/**
 * PRODUCT.md "Privacy" (and REVIEW_P13 13.R4): before a provider accepts a
 * request it sees only the neighbourhood and an approximate distance, never the
 * patient's exact address, coordinates or phone. Lab and radiology inboxes, the
 * nursing pool and the unified provider queue returned all three.
 */
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';

/** Booking states (any domain) in which the provider has not accepted yet. */
// PROVIDER_ASSIGNED: a nurse the patient picked (or who claimed an open
// request) has not accepted yet; acceptance is CONFIRMED.
export const PRE_ACCEPTANCE_STATES = new Set([
  'NEW_REQUEST', 'PENDING', 'CREATED', 'BROADCASTING', 'PENDING_INSURANCE', 'WAITING_COPAY', 'PROVIDER_ASSIGNED',
]);

const CONTACT_KEYS = [
  'patient_phone', 'phone', 'patient_email', 'email', 'contact', 'patient_contact',
  'gps_lat', 'gps_lng', 'lat', 'lng', 'location', 'coordinates', 'patient_location',
];
const ADDRESS_KEYS = ['address', 'delivery_address', 'patient_address'];
const AREA_KEYS = ['district', 'neighborhood', 'neighbourhood', 'city', 'region'];

function areaOnly(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  const area: Record<string, unknown> = {};
  for (const k of AREA_KEYS) if ((value as Record<string, unknown>)[k]) area[k] = (value as Record<string, unknown>)[k];
  return Object.keys(area).length ? area : null;
}

/** The row with the exact address, coordinates and phone removed. */
export function withoutPatientContact<T extends object>(row: T): T {
  const out: Record<string, unknown> = { ...(row as Record<string, unknown>) };
  for (const k of CONTACT_KEYS) delete out[k];
  for (const k of ADDRESS_KEYS) if (k in out) out[k] = areaOnly(out[k]);
  out.contact_hidden_until_accepted = true;
  return out as T;
}

const isAdmin = (user: { role?: string } | undefined) => user?.role === 'admin' || user?.role === 'super_admin';

/** True when this caller is a provider looking at someone else's not-yet-accepted booking. */
export function mustHidePatientContact(user: { id?: string; role?: string } | undefined, row: Record<string, unknown>): boolean {
  if (!user || isAdmin(user) || user.role === 'patient') return false;
  if (!row || typeof row !== 'object' || !row.patient_id || row.patient_id === user.id) return false;
  const state = String(row.state ?? row.status ?? '');
  return PRE_ACCEPTANCE_STATES.has(state);
}

function plain(value: unknown): unknown {
  const v = value as { toObject?: () => unknown } | null;
  return v && typeof v === 'object' && typeof v.toObject === 'function' ? v.toObject() : value;
}

function apply(user: { id?: string; role?: string }, value: unknown, depth: number): unknown {
  if (depth > 3 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => apply(user, v, depth + 1));
  const obj = plain(value) as Record<string, unknown>;
  if (mustHidePatientContact(user, obj)) return withoutPatientContact(obj);
  if (obj !== value) return value;
  let changed = false;
  const out: Record<string, unknown> = { ...obj };
  for (const k of ['data', 'items', 'bookings', 'booking', 'results']) {
    if (out[k] && typeof out[k] === 'object') {
      const next = apply(user, out[k], depth + 1);
      if (next !== out[k]) { out[k] = next; changed = true; }
    }
  }
  return changed ? out : value;
}

/** Hides patient contact on every booking a provider receives before it accepts. */
@Injectable()
export class ProviderPrivacyInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const user = context.switchToHttp().getRequest()?.user;
    return next.handle().pipe(map((body) => (user && !isAdmin(user) && user.role !== 'patient' ? apply(user, body, 0) : body)));
  }
}
