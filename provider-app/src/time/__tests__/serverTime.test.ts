/**
 * P15.9 — the server-time anchor survives a device clock off by ±1 day.
 *
 * Each test pins "device now" explicitly instead of touching the real clock:
 * the anchor stores `offset = serverMs - deviceMs`, so when both the anchor
 * recording and the later `serverNowMs()` read use the same skewed device
 * clock, the error cancels out.
 */
import {
  getServerTimeOffsetMs,
  isServerTimeAnchored,
  noteServerDate,
  resetServerTimeForTests,
  serverNowMs,
} from '../serverTime';

const DAY = 86_400_000;
// A fixed server instant; the header is the format backends actually send.
const SERVER_MS = Date.parse('Wed, 21 Oct 2026 07:00:00 GMT');
const SERVER_HEADER = 'Wed, 21 Oct 2026 07:00:00 GMT';

beforeEach(() => {
  resetServerTimeForTests();
});

describe('P15.9 server-time anchor', () => {
  it('starts unanchored: serverNowMs is the device clock, offset is null', () => {
    expect(isServerTimeAnchored()).toBe(false);
    expect(getServerTimeOffsetMs()).toBeNull();
    expect(serverNowMs(1_000)).toBe(1_000);
  });

  it.each([[-DAY, 'behind'], [0, 'exact'], [DAY, 'ahead']])(
    'anchors with the device clock %i ms (%s): serverNowMs recovers server time',
    (skew) => {
      const deviceNow = SERVER_MS + skew;
      expect(noteServerDate(SERVER_HEADER, deviceNow)).toBe(true);
      expect(isServerTimeAnchored()).toBe(true);
      // The device clock is still off by `skew` when "now" is read.
      expect(serverNowMs(deviceNow)).toBe(SERVER_MS);
      // (-0 === 0 normalises the exact-clock case: toBe uses Object.is.)
      expect(getServerTimeOffsetMs()).toBe(-skew === 0 ? 0 : -skew);
    },
  );

  it('a missing or unparseable Date header never poisons the anchor', () => {
    expect(noteServerDate(null, SERVER_MS)).toBe(false);
    expect(noteServerDate('', SERVER_MS)).toBe(false);
    expect(noteServerDate('not a date', SERVER_MS)).toBe(false);
    expect(isServerTimeAnchored()).toBe(false);
    expect(serverNowMs(SERVER_MS)).toBe(SERVER_MS);
  });

  it('a broken header keeps the previous good offset', () => {
    expect(noteServerDate(SERVER_HEADER, SERVER_MS)).toBe(true);
    expect(noteServerDate('garbage', SERVER_MS)).toBe(false);
    expect(serverNowMs(SERVER_MS)).toBe(SERVER_MS);
    expect(getServerTimeOffsetMs()).toBe(0);
  });

  it('a later response re-anchors (clock drift correction)', () => {
    expect(noteServerDate(SERVER_HEADER, SERVER_MS + DAY)).toBe(true);
    expect(serverNowMs(SERVER_MS + DAY)).toBe(SERVER_MS);
    const laterHeader = new Date(SERVER_MS + 3_600_000).toUTCString();
    expect(noteServerDate(laterHeader, SERVER_MS + DAY + 3_600_000)).toBe(true);
    expect(serverNowMs(SERVER_MS + DAY + 3_600_000)).toBe(SERVER_MS + 3_600_000);
  });
});
