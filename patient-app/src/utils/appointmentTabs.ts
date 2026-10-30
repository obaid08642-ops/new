import { statusIs } from './statusCase';

// Q-18: tab buckets for the server's UPPERCASE APPT_STATES. Three tabs: upcoming (booked, waiting for the day), current
// (the visit is happening: checked in, on the way, arrived, in progress) and past (finished, cancelled, no-show).
// Case-insensitivity comes from statusIs.
export const CURRENT = ['checked_in', 'en_route', 'arrived', 'in_progress'];
export const BOOKED = ['confirmed', 'pending', 'pending_payment', 'pending_copay', 'scheduled', 'rescheduled'];
// Upcoming (the Q-18 bucket) is every visit not yet finished: booked plus under way. The Current tab narrows it to the visits under way.
export const UPCOMING = [...BOOKED, ...CURRENT];
export const PAST = ['completed', 'cancelled', 'no_show'];

export type AppointmentTab = 'upcoming' | 'current' | 'past';

const BUCKETS: Record<AppointmentTab, string[]> = { upcoming: UPCOMING, current: CURRENT, past: PAST };

/** True when a server status belongs on the given tab. */
export function onTab(status: unknown, tab: AppointmentTab): boolean {
  return statusIs(status, BUCKETS[tab]);
}

/** The one screen tab a status shows on (current wins over upcoming), or null for a status no tab lists. */
export function tabOf(status: unknown): AppointmentTab | null {
  return (['current', 'upcoming', 'past'] as const).find((tab) => onTab(status, tab)) ?? null;
}
