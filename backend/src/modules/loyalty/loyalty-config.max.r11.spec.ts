// R11 §5 lead 8: max_redeem_percent had only @Min(0); a value above 100 would
// let points pay more than the whole order. The plan (A5) keeps it admin-
// configurable, so the bound is 100, not the 10 % default.
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoyaltyConfigDto } from './loyalty.dto';

describe('LoyaltyConfigDto.max_redeem_percent bounds (R11 §5)', () => {
  const errorsFor = async (v: number) => validate(plainToInstance(LoyaltyConfigDto, { max_redeem_percent: v }));
  it('accepts 0, the 10 % default and 100', async () => {
    for (const v of [0, 10, 100]) expect(await errorsFor(v)).toHaveLength(0);
  });
  it('refuses more than 100 %', async () => {
    expect((await errorsFor(150)).map((e) => e.property)).toContain('max_redeem_percent');
  });
});
