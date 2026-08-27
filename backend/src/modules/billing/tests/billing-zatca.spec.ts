/**
 * M7 — ZATCA Phase 1 e-invoice QR (TLV tags 1–5, base64) tests.
 */
import { tlvQr } from '../billing.module';

function parseTlv(base64: string): Record<number, string> {
  const buf = Buffer.from(base64, 'base64');
  const out: Record<number, string> = {};
  let i = 0;
  while (i < buf.length) {
    const tag = buf[i];
    const len = buf[i + 1];
    out[tag] = buf.slice(i + 2, i + 2 + len).toString('utf8');
    i += 2 + len;
  }
  return out;
}

describe('ZATCA tlvQr (Phase 1)', () => {
  it('produces base64 that decodes to TLV tags 1–5 in order', () => {
    const b64 = tlvQr('منصة نَبْض', '300000000000003', '2026-07-24T10:00:00.000Z', 115, 15);
    expect(() => Buffer.from(b64, 'base64')).not.toThrow();
    const tags = parseTlv(b64);
    expect(Object.keys(tags).map(Number).sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('encodes seller name (UTF-8 Arabic), VAT number, ISO date, total, VAT', () => {
    const tags = parseTlv(tlvQr('منصة نَبْض', '300000000000003', '2026-07-24T10:00:00.000Z', 115, 15));
    expect(tags[1]).toBe('منصة نَبْض');
    expect(tags[2]).toBe('300000000000003');
    expect(tags[3]).toBe('2026-07-24T10:00:00.000Z');
    expect(tags[4]).toBe('115.00');
    expect(tags[5]).toBe('15.00');
  });

  it('length byte matches actual UTF-8 byte length for Arabic values', () => {
    const seller = 'شركة الاختبار';
    const b64 = tlvQr(seller, '1', 'd', 1, 0.15);
    const buf = Buffer.from(b64, 'base64');
    expect(buf[0]).toBe(1); // tag 1
    expect(buf[1]).toBe(Buffer.from(seller, 'utf8').length); // byte length, not char count
  });

  it('matches the ZATCA reference TLV encoding for a known ASCII input', () => {
    // Reference vector shape: tag||len||value concatenated then base64
    const expected = Buffer.concat([
      Buffer.from([1, 6]), Buffer.from('Seller'),
      Buffer.from([2, 3]), Buffer.from('123'),
      Buffer.from([3, 3]), Buffer.from('ISO'),
      Buffer.from([4, 5]), Buffer.from('10.00'),
      Buffer.from([5, 4]), Buffer.from('1.50'),
    ]).toString('base64');
    expect(tlvQr('Seller', '123', 'ISO', 10, 1.5)).toBe(expected);
  });
});

describe('VAT extraction (15%% inclusive)', () => {
  const VAT_RATE = 0.15;
  const extract = (total: number) => Math.round((total - total / (1 + VAT_RATE)) * 100) / 100;

  it.each([
    [115, 15],
    [230, 30],
    [100, 13.04],
    [57.5, 7.5],
  ])('total %i → VAT %p', (total, expected) => {
    expect(extract(total)).toBeCloseTo(expected, 2);
  });
});
