import { useSyncExternalStore } from 'react';

/**
 * Issue 684 (owner decision 13 of 2026-10-14): a consultation booked on behalf of a family member. The member page sets
 * who the booking is for, the confirm step sends it as `for_member_id` (the server checks the family group and the booking
 * permission) and clears it once the appointment exists. In memory only: a restarted app books for the person signed in.
 */
export type BookingFor = { id: string; name: string };

let current: BookingFor | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export function setBookingFor(next: BookingFor | null) {
  current = next && next.id ? { id: next.id, name: next.name } : null;
  emit();
}

export const getBookingFor = (): BookingFor | null => current;

export function useBookingFor(): BookingFor | null {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    () => current,
    () => current,
  );
}
