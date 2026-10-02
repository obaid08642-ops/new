import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { UpdateProfileDto } from './maternity.dto';

// R51: the cycle setup (app + website) sends is_regular as a boolean; the DTO required a string, so every
// cycle profile was rejected with 400 while the service itself requires a boolean.
describe('maternity cycle setup payload (R51)', () => {
  const opts = { whitelist: true, forbidNonWhitelisted: true };
  it('accepts the screen payload with is_regular boolean', () => {
    const dto = plainToInstance(UpdateProfileDto, { is_pregnant: false, last_period_date: '2026-09-10', cycle_length: 28, is_regular: true });
    expect(validateSync(dto, opts)).toEqual([]);
  });
  it('rejects a string is_regular', () => {
    const dto = plainToInstance(UpdateProfileDto, { is_regular: 'true' });
    expect(validateSync(dto, opts).map((e) => e.property)).toEqual(['is_regular']);
  });
});
