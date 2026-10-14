/** Merge the date part of one Date and the time part of another into a new local Date (no seconds). */
export function mergeDateAndTime(datePart: Date, timePart: Date): Date {
  return new Date(datePart.getFullYear(), datePart.getMonth(), datePart.getDate(), timePart.getHours(), timePart.getMinutes(), 0, 0);
}

/** True when the picked slot is strictly in the future of `now`. */
export function isFutureSlot(slot: Date, now: Date): boolean {
  return slot.getTime() > now.getTime();
}
