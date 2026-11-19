import { validateMarketConfig } from './market-config.validate';
import { SA_CONFIG_V1 } from './sa-market.seed';
import { MarketConfig } from './market-config.types';

const clone = (): MarketConfig => JSON.parse(JSON.stringify(SA_CONFIG_V1));

describe('validateMarketConfig', () => {
  it('accepts a 3-decimal currency (internal test market shape)', () => {
    const c = clone();
    c.currency = { code: 'BHD', exponent: 3 };
    c.timezone = 'Asia/Bahrain';
    expect(validateMarketConfig(c)).toEqual([]);
  });
  it('accepts a partner name as text', () => {
    const c = clone();
    c.branding.operated_by = 'Example Partner';
    expect(validateMarketConfig(c)).toEqual([]);
  });
  it.each([
    ['wrong exponent', (c: MarketConfig) => { c.currency.exponent = 3; }, 'currency.exponent'],
    ['unknown currency', (c: MarketConfig) => { c.currency = { code: 'XXX', exponent: 2 }; }, 'exponent table'],
    ['bad vat', (c: MarketConfig) => { c.tax.vat_percent = 140; }, 'vat_percent'],
    ['bad zone', (c: MarketConfig) => { c.timezone = 'Mars/Base'; }, 'timezone'],
    ['bad weekend', (c: MarketConfig) => { c.calendar.weekend = ['funday' as never]; }, 'weekend'],
    ['default locale missing', (c: MarketConfig) => { c.locales.default = 'xx'; }, 'locales'],
    ['bad dial', (c: MarketConfig) => { c.phone.default_dial = '966'; }, 'default_dial'],
    ['bad regex', (c: MarketConfig) => { c.phone.national_number_pattern = '('; }, 'regex'],
    ['bad emergency', (c: MarketConfig) => { c.emergency_numbers.ambulance = 'abc'; }, 'ambulance'],
    ['blank operated_by', (c: MarketConfig) => { c.branding.operated_by = '  '; }, 'operated_by'],
  ])('refuses %s', (_n, mutate, fragment) => {
    const c = clone();
    mutate(c);
    expect(validateMarketConfig(c).join('|')).toContain(fragment);
  });
});
