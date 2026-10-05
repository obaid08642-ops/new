// d0b9ce9 / R83: the doctor's clinic address entered during onboarding reaches
// the public doctor page (GET /care/doctors/:id). The registration screen sends
// the street address in step 2 (`address`) and the clinic name + clinic address
// in step 3 (`clinic_name`, `clinic_address`). Step 2 never carried
// clinic_address, so that unused DTO field is gone.
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ProviderOnboardingService } from '../provider-onboarding/provider-onboarding.module';
import { Step2Dto, Step3Dto } from '../provider-onboarding/provider-onboarding.dto';
import { CareService } from './care.service';

type Doc = Record<string, unknown> & { save: () => Promise<void>; toObject: () => Record<string, unknown>; markModified: () => void };

function onboardingWith(profile: Doc) {
  const providerModel = { findOne: jest.fn(async () => profile), db: { collection: jest.fn() } };
  return new ProviderOnboardingService({} as never, providerModel as never, { emit: jest.fn() } as never, {} as never);
}

function careWith(stored: Record<string, unknown>) {
  const reviews = { find: () => ({ sort: () => ({ limit: () => ({ toArray: async () => [] }) }) }) };
  const providerModel = {
    findOne: jest.fn(async (filter: Record<string, unknown>) => {
      const ok = Object.entries(filter).every(([k, v]) => stored[k] === v);
      return ok ? stored : null;
    }),
    find: () => ({ limit: async () => [] }),
    db: { collection: () => reviews },
  };
  return new CareService(providerModel as never, {} as never, {} as never, { nextAvailable: async () => null } as never);
}

function newDoctorProfile(): Doc {
  const doc: Doc = {
    id: 'doc-r83', user_id: 'u-r83', type: 'doctor', status: 'active', public_eligibility: true, medical_review_status: 'approved',
    name_ar: 'د. ريم', specialty: 'cardiology',
    save: async () => undefined,
    toObject: () => Object.fromEntries(Object.entries(doc).filter(([, v]) => typeof v !== 'function')),
    markModified: () => undefined,
  };
  return doc;
}

describe('R83 clinic name/address: onboarding -> /care/doctors/:id', () => {
  it('step 2 address and step 3 clinic name/address show on the public doctor', async () => {
    const profile = newDoctorProfile();
    const onboarding = onboardingWith(profile);
    await onboarding.step2({ id: 'u-r83' }, { city: 'الرياض', district: 'العليا', address: 'شارع العليا 12' });
    await onboarding.step3({ id: 'u-r83' }, { clinic_name: 'عيادة النخبة', clinic_address: 'برج النخبة، شارع العليا 12' });
    const out = await careWith(profile.toObject()).doctorById('doc-r83');
    expect(out.clinic_name).toBe('عيادة النخبة');
    expect(out.clinic_address).toBe('برج النخبة، شارع العليا 12');
  });

  it('a doctor registered with only the step-2 address shows it as the clinic address', async () => {
    const profile = newDoctorProfile();
    await onboardingWith(profile).step2({ id: 'u-r83' }, { address: 'شارع التحلية 5' });
    const out = await careWith(profile.toObject()).doctorById('doc-r83');
    expect(out.clinic_address).toBe('شارع التحلية 5');
  });

  it('step 2 no longer accepts clinic_address (no client sends it there); step 3 does', async () => {
    const opts = { whitelist: true, forbidNonWhitelisted: true };
    const step2Errors = await validate(plainToInstance(Step2Dto, { clinic_address: 'x' }), opts);
    expect(step2Errors.map((e) => e.property)).toContain('clinic_address');
    const step3Errors = await validate(plainToInstance(Step3Dto, { clinic_address: 'x', clinic_name: 'y' }), opts);
    expect(step3Errors).toEqual([]);
  });
});
