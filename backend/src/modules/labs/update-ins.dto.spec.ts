import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateInsDto } from './labs.dto';

describe('UpdateInsDto (lab insurance outcome)', () => {
  const check = (body: object) =>
    validate(plainToInstance(UpdateInsDto, body), { whitelist: true, forbidNonWhitelisted: true });

  it('accepts the rejection reason the provider app sends', async () => {
    expect(await check({ status: 'rejected', reason: 'service not covered', items: [] })).toHaveLength(0);
  });

  it('still refuses unknown fields and a non-string reason', async () => {
    expect((await check({ status: 'rejected', bogus: 1 })).length).toBeGreaterThan(0);
    expect((await check({ status: 'rejected', reason: 5 })).length).toBeGreaterThan(0);
  });
});
