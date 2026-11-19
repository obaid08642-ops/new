import { RIYADH_TZ } from '../../common/riyadh-clock';
import { DEFAULT_VAT_PERCENT } from '../../common/commission-defaults';
import { EMERGENCY_LINE } from '../chat/consultation-window';
import { REVENUE_TZ } from '../provider-ops/revenue-by-month';
import { SA_CONFIG_V1, SA_MARKET, SA_OPERATOR } from './sa-market.seed';
import { validateMarketConfig } from './market-config.validate';

/** The SA row must say exactly what the code says today. Step 2 deletes the constants; these tests keep the data honest until then. */
describe('SA market config equals today\'s hard-wired values', () => {
  it('time zone is the clock and revenue zone', () => {
    expect(SA_CONFIG_V1.timezone).toBe(RIYADH_TZ);
    expect(SA_CONFIG_V1.timezone).toBe(REVENUE_TZ);
  });
  it('VAT percent is the finance default; the invoice constant is its fraction (billing.module.ts VAT_RATE = 0.15)', () => {
    expect(SA_CONFIG_V1.tax.vat_percent).toBe(DEFAULT_VAT_PERCENT);
    expect(SA_CONFIG_V1.tax.vat_percent / 100).toBe(0.15);
    expect(SA_CONFIG_V1.tax.inclusive).toBe(false);
  });
  it('emergency line is 997', () => expect(SA_CONFIG_V1.emergency_numbers.ambulance).toBe(EMERGENCY_LINE));
  it('currency is SAR with halalas', () => expect(SA_CONFIG_V1.currency).toEqual({ code: 'SAR', exponent: 2 }));
  it('locales are the six shipped ones, Arabic first', () => {
    expect(SA_CONFIG_V1.locales).toEqual({ default: 'ar', enabled: ['ar', 'en', 'ur', 'hi', 'bn', 'fil'] });
  });
  it('phone: +966, 9-digit mobile starting 5, trunk 0 (auth.service.ts canonical form)', () => {
    const p = SA_CONFIG_V1.phone;
    expect(p.default_dial).toBe('+966');
    const re = new RegExp(p.national_number_pattern);
    expect(re.test('501234567')).toBe(true);
    expect(re.test('401234567')).toBe(false);
    expect(re.test('50123456')).toBe(false);
    expect(p.trunk_prefix).toBe('0');
  });
  it('weekend is Friday and Saturday', () => expect(SA_CONFIG_V1.calendar.weekend).toEqual(['friday', 'saturday']));
  it('no partner text: the platform operates SA', () => expect(SA_CONFIG_V1.branding.operated_by).toBeNull());
  it('is valid, and the seed objects are consistent', () => {
    expect(validateMarketConfig(SA_CONFIG_V1)).toEqual([]);
    expect(SA_MARKET.operator_id).toBe(SA_OPERATOR.id);
    expect(SA_MARKET.id).toBe('SA');
  });
});
