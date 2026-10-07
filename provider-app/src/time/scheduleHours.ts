/**
 * P15.9 — Ramadan / special-hours display helpers for the provider schedule
 * surface.
 *
 * The slot engine honours `ramadan_hours` (weekly, applied while the date
 * falls in Ramadan, Asia/Riyadh) and `special_hours` (per-date, exact
 * YYYY-MM-DD match wins) from the provider profile; GET
 * `/provider/profile/availability` now merges both lists so the app can show
 * the same source it books against. Two rules, mirroring `./providerZone`:
 *
 * 1. "Today" is the Riyadh calendar day derived from `serverNowMs()` (the
 *    15.9 anchor from response `Date` headers), never `new Date()` getters —
 *    a device clock off by ±1 day still resolves the same special entry.
 * 2. Malformed entries are ignored (normal hours apply server-side too), so
 *    display helpers return null/false instead of rendering garbage.
 */
import { serverNowMs } from './serverTime';
import { PROVIDER_TIME_ZONE } from './providerZone';

export type RamadanHoursEntry = {
  day?: unknown;
  open?: unknown;
  close?: unknown;
  open_evening?: unknown;
  close_evening?: unknown;
  closed?: unknown;
};

export type SpecialHoursEntry = {
  date?: unknown;
  open?: unknown;
  close?: unknown;
  closed?: unknown;
  reason?: unknown;
};

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Riyadh calendar day (YYYY-MM-DD) for an instant, via Intl in Asia/Riyadh.
 * `en-CA` yields ISO-order parts without locale-string round-trips.
 */
export function riyadhYmd(nowMs: number = serverNowMs()): string | null {
  if (!Number.isFinite(nowMs)) return null;
  try {
    const bag: Record<string, string> = {};
    for (const p of new Intl.DateTimeFormat('en-CA', {
      timeZone: PROVIDER_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date(nowMs))) {
      if (p.type !== 'literal') bag[p.type] = p.value;
    }
    const ymd = `${bag.year}-${bag.month}-${bag.day}`;
    return YMD.test(ymd) ? ymd : null;
  } catch {
    return null;
  }
}

/** True when the value is an exact YYYY-MM-DD calendar day. */
export function isSpecialDate(value: unknown): value is string {
  return typeof value === 'string' && YMD.test(value);
}

/**
 * Today's special-hours entry (exact Riyadh YYYY-MM-DD match), or null.
 * Defaults to the server-anchored clock so a device set ±1 day cannot hide
 * or invent today's holiday hours.
 */
export function findTodaySpecialHours(
  entries: unknown,
  nowMs: number = serverNowMs(),
): SpecialHoursEntry | null {
  if (!Array.isArray(entries)) return null;
  const today = riyadhYmd(nowMs);
  if (!today) return null;
  const hit = entries.find((e: any) => e && e.date === today);
  return hit && typeof hit === 'object' ? (hit as SpecialHoursEntry) : null;
}

/** True when at least one Ramadan-hours row is configured. */
export function hasRamadanHours(entries: unknown): boolean {
  return Array.isArray(entries) && entries.some((e: any) => e && typeof e === 'object');
}
