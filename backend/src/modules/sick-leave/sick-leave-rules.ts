import { BadRequestException } from '@nestjs/common';
import { randomInt } from 'crypto';

/**
 * Owner decision PT-08 (2026-11-09): a sick leave is a stamped certificate. These are its rules, as pure functions.
 *  - It cannot start before the day of the consultation it was issued on (no back-dating), and not more than 30 days after it.
 *  - It lasts 1 to 30 days; the end date is the last day OFF (inclusive): 3 days from the 9th end on the 11th.
 *  - Days are Saudi calendar days (Asia/Riyadh, UTC+3 all year) and are stored as the UTC midnight of that calendar date.
 */
export const MAX_LEAVE_DAYS = 30;
export const MAX_START_AFTER_CONSULTATION_DAYS = 30;
const RIYADH_OFFSET_MS = 3 * 3600_000;
const DAY_MS = 86_400_000;

/** The calendar day ('YYYY-MM-DD') of a moment in Riyadh. */
export function riyadhDay(d: Date): string {
  return new Date(d.getTime() + RIYADH_OFFSET_MS).toISOString().slice(0, 10);
}
const dayMs = (day: string) => Date.parse(`${day}T00:00:00.000Z`);

export interface LeavePlan { start: Date; end: Date; days: number }

/** The leave the doctor asked for, or a 400. `consultationAt` is the booked time of the consultation, `now` the moment of issue. */
export function planLeave(input: { start_date?: unknown; duration_days?: unknown }, consultationAt: Date, now: Date): LeavePlan {
  let days = 1;
  if (input.duration_days !== undefined && input.duration_days !== null && input.duration_days !== '') {
    days = Number(input.duration_days);
    if (!Number.isInteger(days) || days < 1 || days > MAX_LEAVE_DAYS) throw new BadRequestException('sick_leave_duration_invalid');
  }
  const consultationDay = riyadhDay(consultationAt);
  // no start given: today, or the consultation day if the visit was opened before its day
  let startDay = riyadhDay(now) < consultationDay ? consultationDay : riyadhDay(now);
  if (input.start_date !== undefined && input.start_date !== null && input.start_date !== '') {
    const raw = String(input.start_date);
    if (!/^\d{4}-\d{2}-\d{2}/.test(raw) || isNaN(Date.parse(raw.slice(0, 10)))) throw new BadRequestException('invalid start_date');
    startDay = raw.slice(0, 10);
  }
  if (dayMs(startDay) < dayMs(consultationDay)) throw new BadRequestException('sick_leave_before_consultation');
  if (dayMs(startDay) > dayMs(consultationDay) + MAX_START_AFTER_CONSULTATION_DAYS * DAY_MS) throw new BadRequestException('sick_leave_start_too_late');
  const start = new Date(dayMs(startDay));
  return { start, end: new Date(dayMs(startDay) + (days - 1) * DAY_MS), days };
}

/** Letters that cannot be mistaken for each other on paper: no 0/O, 1/I. 31 characters, 8 of them: about 8.5e11 codes. */
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_RE = /^[A-HJ-NP-Z2-9]{8}$/;
export function newVerifyCode(): string {
  let s = '';
  for (let i = 0; i < 8; i++) s += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return s;
}
export const serialOf = (year: number, seq: number) => `SLC-${year}-${String(seq).padStart(6, '0')}`;

/** An ID / iqama number for a list: only the last 3 characters show. */
export function maskNationalId(id: unknown): string | null {
  const s = typeof id === 'string' ? id.trim() : '';
  if (!s) return null;
  return s.length <= 3 ? '*'.repeat(s.length) : '*'.repeat(s.length - 3) + s.slice(-3);
}

/** 'Sara Ahmed Ali' -> 'S. A. A.'; at most 3 initials; null when there is no name. */
export function initialsOf(name: unknown): string | null {
  const parts = typeof name === 'string' ? name.trim().split(/\s+/).filter(Boolean) : [];
  if (!parts.length) return null;
  return parts.slice(0, 3).map((p) => `${Array.from(p)[0].toUpperCase()}.`).join(' ');
}
