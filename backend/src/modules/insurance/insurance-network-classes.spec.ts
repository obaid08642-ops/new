import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateInsuranceNetworkDto } from './insurance.dto';
import { InsuranceNetworkSchema } from '../../schemas/insurance.schema';

const base = { code: 'gold', name_ar: 'ذهبية', name_en: 'Gold' };
const errorsOf = async (extra: Record<string, unknown>) => (await validate(plainToInstance(CreateInsuranceNetworkDto, { ...base, ...extra }))).map((e) => e.property);

describe('an insurer class carries optional copay figures', () => {
  it('accepts a class without figures (none is published officially; none is invented)', async () => {
    expect(await errorsOf({})).toEqual([]);
  });

  it('accepts copay_percent 0-100 and copay_cap_sar 0-1,000,000', async () => {
    expect(await errorsOf({ copay_percent: 20, copay_cap_sar: 150 })).toEqual([]);
    expect(await errorsOf({ copay_percent: 0, copay_cap_sar: 0 })).toEqual([]);
    expect(await errorsOf({ copay_percent: 100, copay_cap_sar: 1_000_000 })).toEqual([]);
  });

  it.each([[{ copay_percent: -1 }, 'copay_percent'], [{ copay_percent: 101 }, 'copay_percent'], [{ copay_percent: '20' }, 'copay_percent'], [{ copay_cap_sar: -5 }, 'copay_cap_sar'], [{ copay_cap_sar: 1_000_001 }, 'copay_cap_sar']])(
    'rejects %p',
    async (extra, field) => {
      expect(await errorsOf(extra)).toContain(field);
    },
  );

  it('stores the figures on the network document', () => {
    expect(InsuranceNetworkSchema.path('copay_percent')).toBeDefined();
    expect(InsuranceNetworkSchema.path('copay_cap_sar')).toBeDefined();
  });
});
