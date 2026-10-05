/**
 * 15.9 — a device clock off by ±1 day must not move what the user sees.
 *
 * The anchor is derived from a backend response `Date` header (the same math
 * as the patient-web sibling): `offset = serverMs - deviceMs`, so both sides
 * of a ±1-day error cancel out. Day strips, past-slot guards and dose logs
 * read `serverNowMs()`, never `Date.now()` directly.
 */
import {
  PROVIDER_TIME_ZONE,
  dayStripBaseMs,
  formatInProviderZone,
  formatServerInstant,
  formatSlotTime,
  getServerTimeOffsetMs,
  isPastSlot,
  isServerTimeAnchored,
  noteServerDate,
  resetServerTimeForTests,
  resolveUserTimeZone,
  serverNowMs,
} from './serverTime';
import { httpRequest } from '../http/client';

const DAY_MS = 86_400_000;
// A fixed "true" instant both test and server agree on.
const TRUE_NOW = Date.parse('2026-10-06T07:00:00.000Z');
const SERVER_DATE_HEADER = new Date(TRUE_NOW).toUTCString();

function textResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  const lower: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) lower[k.toLowerCase()] = v;
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { forEach: (fn: (v: string, k: string) => void) => Object.entries(lower).forEach(([k, v]) => fn(v, k)) },
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  } as unknown as Response;
}

beforeEach(() => {
  resetServerTimeForTests();
  jest.restoreAllMocks();
});

describe('15.9 · the anchor cancels a ±1-day device error', () => {
  it.each([['+1 day', TRUE_NOW + DAY_MS], ['-1 day', TRUE_NOW - DAY_MS]])(
    'device clock %s: serverNowMs() recovers true time from one Date header',
    (_label, deviceNow) => {
      expect(isServerTimeAnchored()).toBe(false);
      expect(serverNowMs(deviceNow)).toBe(deviceNow); // unanchored: honest fallback

      expect(noteServerDate(SERVER_DATE_HEADER, deviceNow)).toBe(true);
      expect(isServerTimeAnchored()).toBe(true);
      expect(getServerTimeOffsetMs()).toBe(TRUE_NOW - deviceNow);
      expect(serverNowMs(deviceNow)).toBe(TRUE_NOW);
    },
  );

  it('a broken or missing Date header never poisons the anchor', () => {
    expect(noteServerDate(null, TRUE_NOW)).toBe(false);
    expect(noteServerDate(undefined, TRUE_NOW)).toBe(false);
    expect(noteServerDate('', TRUE_NOW)).toBe(false);
    expect(noteServerDate('not-a-date', TRUE_NOW)).toBe(false);
    expect(isServerTimeAnchored()).toBe(false);

    // A good anchor survives a later broken header.
    expect(noteServerDate(SERVER_DATE_HEADER, TRUE_NOW)).toBe(true);
    expect(noteServerDate('garbage', TRUE_NOW + 999)).toBe(false);
    expect(serverNowMs(TRUE_NOW)).toBe(TRUE_NOW);
  });

  it('the day strip starts on the true date, not the device date', () => {
    for (const deviceNow of [TRUE_NOW + DAY_MS, TRUE_NOW - DAY_MS]) {
      noteServerDate(SERVER_DATE_HEADER, deviceNow);
      const base = new Date(dayStripBaseMs(serverNowMs(deviceNow)));
      expect(base.toISOString().slice(0, 10)).toBe('2026-10-06');
      // What the device clock alone would have shown — the bug being fixed.
      expect(new Date(deviceNow).toISOString().slice(0, 10)).not.toBe('2026-10-06');
    }
  });

  it('a future slot is not hidden when the device thinks it is past', () => {
    const slotMs = TRUE_NOW + 3_600_000; // one hour after true now
    const deviceNow = TRUE_NOW + DAY_MS; // device a day fast
    noteServerDate(SERVER_DATE_HEADER, deviceNow);

    expect(isPastSlot(slotMs, deviceNow)).toBe(true); // the device-clock bug
    expect(isPastSlot(slotMs, serverNowMs(deviceNow))).toBe(false); // anchored: correct
    expect(isPastSlot(TRUE_NOW - 1, serverNowMs(deviceNow))).toBe(true); // genuinely past stays past
  });

  it('a past slot is not admitted when the device thinks it is future', () => {
    const slotMs = TRUE_NOW - 3_600_000;
    const deviceNow = TRUE_NOW - DAY_MS; // device a day slow
    noteServerDate(SERVER_DATE_HEADER, deviceNow);

    expect(isPastSlot(slotMs, deviceNow)).toBe(false); // the device-clock bug
    expect(isPastSlot(slotMs, serverNowMs(deviceNow))).toBe(true); // anchored: correct
  });
});

describe('15.9 · timezone display helpers', () => {
  it('formats a server instant in an explicit zone, deterministically', () => {
    // 07:00Z is 10:00 in Asia/Riyadh (UTC+3, no DST).
    expect(formatSlotTime('2026-10-06T07:00:00.000Z', 'en-US', 'Asia/Riyadh')).toContain('10:00');
    expect(formatServerInstant('2026-10-06T07:00:00.000Z', 'en-US', { timeZone: 'UTC' })).toContain('7:00');
  });

  it('provider-attributed times pin to Asia/Riyadh', () => {
    expect(PROVIDER_TIME_ZONE).toBe('Asia/Riyadh');
    expect(formatInProviderZone('2026-10-06T07:00:00.000Z', 'en-US')).toContain('10:00');
  });

  it('never renders "Invalid Date": junk in, null out', () => {
    expect(formatServerInstant('', 'en-US')).toBeNull();
    expect(formatServerInstant(null, 'en-US')).toBeNull();
    expect(formatServerInstant('not-a-date', 'en-US')).toBeNull();
    expect(formatSlotTime(undefined, 'en-US')).toBeNull();
    expect(isPastSlot(Number.NaN)).toBe(true);
  });

  it('resolves a usable user zone, UTC when unreadable', () => {
    expect(typeof resolveUserTimeZone()).toBe('string');
    expect(resolveUserTimeZone().length).toBeGreaterThan(0);
  });
});

describe('15.9 · every settled response re-anchors the clock', () => {
  it('httpRequest notes the Date header without changing the payload', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      textResponse(200, { slots: [] }, { date: SERVER_DATE_HEADER }),
    );
    const deviceNow = TRUE_NOW + DAY_MS;
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(deviceNow);

    const res = await httpRequest<{ slots: unknown[] }>({
      url: 'https://api.test/slots',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(res.data).toEqual({ slots: [] });
    expect(isServerTimeAnchored()).toBe(true);
    // The client used the mocked device clock for the anchor math.
    expect(serverNowMs()).toBe(TRUE_NOW);
    expect(getServerTimeOffsetMs()).toBe(-DAY_MS);
    nowSpy.mockRestore();
  });

  it('a response without a Date header leaves a missing anchor missing', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(textResponse(200, { ok: true }));
    await httpRequest({ url: 'https://api.test/x', fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(isServerTimeAnchored()).toBe(false);
  });
});
