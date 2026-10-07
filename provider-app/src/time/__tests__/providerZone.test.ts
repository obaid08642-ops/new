/**
 * P15.9 — provider schedule times display in Asia/Riyadh however wrong the
 * device clock or zone is, and the past-slot guard answers against server
 * time.
 *
 * Midnight-straddling instants are deliberate: 21:30Z is 00:30 the *next* day
 * in Riyadh (UTC+3, no DST), so formatting in the device/UTC zone renders the
 * wrong day — the test goes red if the implementation ever reads the device
 * zone instead of the provider zone.
 */
import { noteServerDate, resetServerTimeForTests, serverNowMs } from '../serverTime';
import {
  PROVIDER_TIME_ZONE,
  formatInProviderZone,
  formatServerInstant,
  isPastSlot,
  isValidServerInstant,
} from '../providerZone';

const DAY = 86_400_000;

beforeEach(() => {
  resetServerTimeForTests();
});

describe('P15.9 Asia/Riyadh display', () => {
  it('pins the provider zone constant', () => {
    expect(PROVIDER_TIME_ZONE).toBe('Asia/Riyadh');
  });

  it('formats a server instant in Riyadh, not the device zone', () => {
    // 2026-10-05T21:30:00Z → 2026-10-06 00:30 in Riyadh, still Oct 5 in UTC.
    const out = formatInProviderZone('2026-10-05T21:30:00.000Z', 'en-GB', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
    expect(out).toContain('06/10/2026');
    expect(out).toContain('00:30');
  });

  it('renders Arabic locale output for the schedule screens', () => {
    const out = formatInProviderZone('2026-10-05T21:30:00.000Z', 'ar-SA-u-ca-gregory', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
    expect(out).not.toBeNull();
    // Gregorian calendar pinned: the Riyadh day is the 6th, never a Hijri date.
    // (Arabic output carries U+200E/U+200F bidi marks and Eastern Arabic
    // digits; strip the marks and compare the real rendered form.)
    const plain = (out as string).replace(/[\u200e\u200f]/g, '');
    expect(plain).toContain('٦/١٠/٢٠٢٦');
  });

  it('supports time-only output for schedule chips', () => {
    const out = formatInProviderZone('2026-10-05T18:30:00.000Z', 'en-GB', {
      dateStyle: undefined,
      timeStyle: 'short',
    });
    // 18:30Z → 21:30 Riyadh, no date part.
    expect(out).toBe('21:30');
  });

  it('an explicit zone override still works for non-provider times', () => {
    const out = formatServerInstant('2026-10-05T21:30:00.000Z', 'en-GB', {
      timeZone: 'UTC',
      dateStyle: 'short',
      timeStyle: 'short',
    });
    expect(out).toContain('05/10/2026');
  });

  it('returns null for anything unparseable instead of "Invalid Date"', () => {
    expect(formatInProviderZone(null, 'en-GB')).toBeNull();
    expect(formatInProviderZone('', 'en-GB')).toBeNull();
    expect(formatInProviderZone('tomorrow-ish', 'en-GB')).toBeNull();
    expect(formatServerInstant(undefined, 'en-GB')).toBeNull();
    expect(isValidServerInstant('2026-10-05T00:00:00Z')).toBe(true);
    expect(isValidServerInstant(123)).toBe(false);
  });
});

describe('P15.9 past-slot guard with device clock ±1 day', () => {
  // Server says 07:00Z; the slot under test is 08:00Z (one hour in the future).
  const SERVER_MS = Date.parse('Wed, 21 Oct 2026 07:00:00 GMT');
  const SLOT_MS = SERVER_MS + 3_600_000;

  it.each([[-DAY, 'a day behind'], [DAY, 'a day ahead']])(
    'a future slot is not past when the device clock is %s',
    (skew) => {
      const deviceNow = SERVER_MS + skew;
      expect(noteServerDate(new Date(SERVER_MS).toUTCString(), deviceNow)).toBe(true);
      // Default `nowMs` is serverNowMs(): the skewed device clock is corrected.
      expect(isPastSlot(SLOT_MS, serverNowMs(deviceNow))).toBe(false);
      // …while the raw device clock would decide wrong in the "ahead" case.
      expect(isPastSlot(SLOT_MS, deviceNow)).toBe(skew > 0);
    },
  );

  it('a genuinely past slot stays past', () => {
    expect(noteServerDate(new Date(SERVER_MS).toUTCString(), SERVER_MS)).toBe(true);
    expect(isPastSlot(SERVER_MS - 1, serverNowMs(SERVER_MS))).toBe(true);
  });

  it('a non-finite slot fails closed', () => {
    expect(isPastSlot(Number.NaN)).toBe(true);
  });
});
