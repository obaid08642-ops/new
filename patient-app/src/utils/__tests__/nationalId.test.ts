import { normaliseNationalId, readNationalIdStatus } from '../nationalId';

describe('the national ID check (same as the web and the server)', () => {
  it('accepts a valid national ID and iqama number, in any digit script, with spaces or dashes', () => {
    expect(normaliseNationalId('1000000008')).toBe('1000000008');
    expect(normaliseNationalId(' 1000-000 008 ')).toBe('1000000008');
    expect(normaliseNationalId('١٠٠٠٠٠٠٠٠٨')).toBe('1000000008');
    expect(normaliseNationalId('2000000006')).toBe('2000000006');
  });
  it('refuses a wrong length, a wrong first digit and a wrong check digit', () => {
    expect(normaliseNationalId('100000000')).toBeNull();
    expect(normaliseNationalId('3000000000')).toBeNull();
    expect(normaliseNationalId('1000000009')).toBeNull();
    expect(normaliseNationalId('')).toBeNull();
  });
  it('reads whether the number exists', () => {
    expect(readNationalIdStatus({ has_national_id: true })).toBe(true);
    expect(readNationalIdStatus({ data: { has_national_id: false } })).toBe(false);
    expect(readNationalIdStatus(null)).toBeNull();
  });
});
