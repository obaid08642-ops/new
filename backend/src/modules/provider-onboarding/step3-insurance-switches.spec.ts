import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { Step3Dto } from './provider-onboarding.dto';

/** The doctor wizard's insurance switches (clinic / online / home) are booleans; care.service reads them with Boolean(). */
describe('Step3Dto insurance switches', () => {
  const errors = (body: object) => validateSync(plainToInstance(Step3Dto, body), { whitelist: true, forbidNonWhitelisted: true })
    .filter((e) => e.property.startsWith('insurance_'));

  it('accepts the switches the doctor wizard sends', () => {
    expect(errors({ insurance_clinic: true, insurance_online: false, insurance_home: true })).toEqual([]);
  });

  it('refuses a non-boolean switch', () => {
    expect(errors({ insurance_clinic: 'yes' }).map((e) => e.property)).toEqual(['insurance_clinic']);
  });
});
