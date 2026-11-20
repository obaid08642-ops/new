import { buildPhonePlugin } from './phone.plugin';
import { saIdentityPlugin, maskLast3 } from './identity.plugin';
import { pluginsFor, registerAddressTemplate, registerIdentityPlugin, PluginNotFoundError, SA_PLUGINS } from './registry';
import { SA_CONFIG_V1 } from '../sa-market.seed';
import { normalizeDigits } from './digits';
import { validateMarketConfig } from '../market-config.validate';
import { MarketConfig } from '../market-config.types';

/** ORACLE: the pre-step-4 implementations, copied verbatim. The plugins must give the same answer for every input. */
function oldNormalizePhone(raw: string): string {
  const digits = normalizeDigits(raw).replace(/[\s\-().]/g, '');
  if (/^\+\d{7,15}$/.test(digits)) return digits;
  const bare = digits.replace(/^\+/, '');
  if (/^00\d{7,14}$/.test(bare)) return `+${bare.slice(2)}`;
  if (/^0\d{9}$/.test(bare)) return `+966${bare.slice(1)}`;
  if (/^966\d{9}$/.test(bare)) return `+${bare}`;
  if (/^5\d{8}$/.test(bare)) return `+966${bare}`;
  return raw.trim();
}
function oldNormaliseNationalId(raw: unknown): string | null {
  const asciiDigits = (r: string) => r.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0)).replace(/[\s-]/g, '');
  const v = typeof raw === 'string' ? asciiDigits(raw.trim()) : '';
  if (!/^[12]\d{9}$/.test(v)) return null;
  let sum = 0;
  for (let i = 0; i < 10; i++) { const d = Number(v[i]); if (i % 2 === 0) { const t = d * 2; sum += t > 9 ? t - 9 : t; } else sum += d; }
  return sum % 10 === 0 ? v : null;
}
const oldMask = (id: string | null | undefined) => { const s = typeof id === 'string' ? id.trim() : ''; if (!s) return null; return s.length <= 3 ? '*'.repeat(s.length) : '*'.repeat(s.length - 3) + s.slice(-3); };

function lcg(seed: number) { let s = seed; return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296; }

describe('SA phone plugin == old AuthService.normalizePhone', () => {
  const p = buildPhonePlugin(SA_CONFIG_V1.phone);
  const fixed = ['0501234567', '050 123 4567', '00966501234567', '+966501234567', '966501234567', '501234567', '٠٥٠١٢٣٤٥٦٧', '۰۵۰۱۲۳۴۵۶۷', '+٩٦٦٥٠١٢٣٤٥٦٧', '', '  ', 'abc', 'a@b.sa', '+20 100 123 4567', '0123456789', '4012345678', '12345', '+1 (415) 555-0100', '(050) 123-4567', '00201001234567'];
  it.each(fixed.map((x) => [x]))('%p', (x) => expect(p.canonicalise(x)).toBe(oldNormalizePhone(x)));
  it('agrees on 20000 pseudo-random digit/symbol strings', () => {
    const r = lcg(42); const alphabet = '0123456789+ -()٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹a';
    for (let i = 0; i < 20000; i++) {
      const len = 1 + Math.floor(r() * 16);
      let s = ''; for (let k = 0; k < len; k++) s += alphabet[Math.floor(r() * alphabet.length)];
      expect(p.canonicalise(s)).toBe(oldNormalizePhone(s));
    }
  });
  it('a non-Saudi config (EG-shaped, test only) uses its own dial and trunk', () => {
    const eg = buildPhonePlugin({ default_dial: '+20', national_number_pattern: '^1[0-25]\\d{8}$', trunk_prefix: '0', national_length: 10 });
    expect(eg.canonicalise('01001234567')).toBe('+201001234567');
    expect(eg.canonicalise('1001234567')).toBe('+201001234567');
    expect(eg.canonicalise('201001234567')).toBe('+201001234567');
    expect(eg.canonicalise('+966501234567')).toBe('+966501234567');
  });
});

describe('SA identity plugin == old normaliseNationalId / maskId', () => {
  const valid = (n: string) => { for (let c = 0; c < 10; c++) { const x = n + c; if (oldNormaliseNationalId(x)) return x; } return ''; };
  it('agrees on valid, invalid, non-string and Arabic-digit inputs', () => {
    const inputs: unknown[] = [valid('108958230'), valid('224567890'), '1234567890', '3000000000', '١٠٨٩٥٨٢٣٠٠', null, undefined, 12, '', ' 10 8958 2300 '];
    for (const x of inputs) expect(saIdentityPlugin.normalise(x)).toBe(oldNormaliseNationalId(x));
  });
  it('agrees on random 10-digit strings', () => {
    const r = lcg(7);
    for (let i = 0; i < 5000; i++) { const s = String(1 + Math.floor(r() * 2)) + String(Math.floor(r() * 1e9)).padStart(9, '0'); expect(saIdentityPlugin.normalise(s)).toBe(oldNormaliseNationalId(s)); }
  });
  it('mask is the old mask', () => { for (const x of ['', ' ', 'ab', 'abc', 'abcd', '1089582300', null, undefined]) expect(maskLast3(x as never)).toBe(oldMask(x as never)); });
});

describe('registry', () => {
  it('SA is registered; an unknown market has no silent Saudi fallback', () => {
    expect(SA_PLUGINS.address.id).toBe('sa-short-address');
    expect(() => pluginsFor('EG', SA_CONFIG_V1)).toThrow(PluginNotFoundError);
  });
  it('a market becomes usable by registering data next to its config', () => {
    registerIdentityPlugin('ZZ', { type_id: 'zz', normalise: (x) => (typeof x === 'string' ? x : null), mask: maskLast3 });
    registerAddressTemplate('ZZ', { id: 'zz', fields: [{ key: 'city', required: true }], verification: null });
    expect(pluginsFor('ZZ', SA_CONFIG_V1).address.id).toBe('zz');
  });
  it('SA address template: required fields and short-address pattern', () => {
    const f = Object.fromEntries(SA_PLUGINS.address.fields.map((x) => [x.key, x]));
    expect(f.city.required && f.district.required && f.street.required).toBe(true);
    expect(new RegExp(f.short_address.pattern as string).test('RRRD2929')).toBe(true);
  });
});

describe('phone config validation', () => {
  const c = (): MarketConfig => JSON.parse(JSON.stringify(SA_CONFIG_V1));
  it('requires national_length', () => { const x = c(); (x.phone as { national_length: number }).national_length = 2; expect(validateMarketConfig(x).join()).toContain('national_length'); });
});
