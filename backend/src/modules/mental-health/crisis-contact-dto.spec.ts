import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AddCrisisContactDto } from './mental-health.dto';

// Q2: crisis contacts are dialled in an emergency; a non-dialable phone must be refused at the API.
const errorsFor = async (phone: any) =>
  (await validate(plainToInstance(AddCrisisContactDto, { contact_name: 'سارة', phone }))).map((e) => e.property);

describe('AddCrisisContactDto.phone', () => {
  it.each(['0551234567', '+966551234567', '+966 55 123 4567', '055-123-4567', '937'.padStart(7, '0')])('accepts %s', async (p) => {
    expect(await errorsFor(p)).toEqual([]);
  });
  it.each(['abc', '', '12', '+', '05512a4567', '0551234567890123456789'])('refuses %p', async (p) => {
    expect(await errorsFor(p)).toContain('phone');
  });
});
