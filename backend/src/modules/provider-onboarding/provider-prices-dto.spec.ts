import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Step3Dto } from './provider-onboarding.dto';

const check = async (body: object) => {
  const dto = plainToInstance(Step3Dto, body);
  return { dto, errors: (await validate(dto, { whitelist: true })).filter((e) => ['test_prices', 'scan_prices'].includes(e.property)) };
};

describe('lab / radiology price maps (the app sends text)', () => {
  it('turns "95", "٩٥" and "1,200.50" into numbers and keeps numbers', async () => {
    const { dto, errors } = await check({ test_prices: { a: '95', b: '٩٥', c: '1,200.50', d: 40 }, scan_prices: { x: '300' } });
    expect(errors).toHaveLength(0);
    expect(dto.test_prices).toEqual({ a: 95, b: 95, c: 1200.5, d: 40 });
    expect(dto.scan_prices).toEqual({ x: 300 });
  });
  it('an emptied price box is dropped, not rejected', async () => {
    const { dto, errors } = await check({ test_prices: { a: '', b: ' ', c: '80' } });
    expect(errors).toHaveLength(0);
    expect(dto.test_prices).toEqual({ c: 80 });
  });
  it.each([[{ a: 'free' }], [{ a: -5 }], [{ a: '12 SAR' }], [{ a: null }], [['95']]])('rejects %j', async (map) => {
    const { errors } = await check({ test_prices: map });
    expect(errors).toHaveLength(1);
  });
});
