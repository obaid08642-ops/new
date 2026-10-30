import { statusIs } from './statusCase';

// Q-18: tab buckets for the server's UPPERCASE APPT_STATES. Widened so
// pending-payment / scheduled / in-progress / no-show land in a tab instead of
// none; case-insensitivity comes from statusIs.
export const UPCOMING = ['confirmed', 'pending', 'pending_payment', 'scheduled', 'rescheduled', 'checked_in', 'en_route', 'arrived', 'in_progress'];
export const PAST = ['completed', 'cancelled', 'no_show'];

/** True when a server status belongs on the given tab. */
export function onTab(status: unknown, tab: 'upcoming' | 'past'): boolean {
  return statusIs(status, tab === 'upcoming' ? UPCOMING : PAST);
}
