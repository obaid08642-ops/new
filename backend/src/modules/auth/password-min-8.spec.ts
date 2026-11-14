import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ConvertGuestDto, PatientResetPasswordDto, RegisterDto } from './auth.controller';

/** Owner decision 2026-10-24: the password minimum is 8 on patient register, guest conversion and reset. */
describe('password minimum 8 in the patient auth DTOs', () => {
  const props = async (cls: any, body: Record<string, unknown>) => (await validate(plainToInstance(cls, body))).map((e) => e.property);

  it('register: 7 characters refused, 8 accepted', async () => {
    expect(await props(RegisterDto, { phone: '+966500000000', password: 'Ab1!xyz' })).toContain('password');
    expect(await props(RegisterDto, { phone: '+966500000000', password: 'Ab1!xyzq' })).not.toContain('password');
  });

  it('guest conversion: 7 refused, 8 accepted', async () => {
    const base = { full_name: 'Sara', phone: '+966500000000' };
    expect(await props(ConvertGuestDto, { ...base, password: 'Ab1!xyz' })).toContain('password');
    expect(await props(ConvertGuestDto, { ...base, password: 'Ab1!xyzq' })).not.toContain('password');
  });

  it('reset: 7 refused, 8 accepted', async () => {
    expect(await props(PatientResetPasswordDto, { reset_token: 't', new_password: 'Ab1!xyz' })).toContain('new_password');
    expect(await props(PatientResetPasswordDto, { reset_token: 't', new_password: 'Ab1!xyzq' })).not.toContain('new_password');
  });
});
