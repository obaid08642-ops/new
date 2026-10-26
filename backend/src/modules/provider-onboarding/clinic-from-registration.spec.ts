import { clinicFromRegistration } from './doctor-profile-fields';
import { ProviderOnboardingService } from './provider-onboarding.module';
import { ProviderType } from '../../common/enums';

describe('LR-10: the registration clinic address reaches the doctor page fields', () => {
  it('fills clinic_address and clinic_location from address and location when they are empty', () => {
    expect(clinicFromRegistration({}, { address: ' Street 1, Olaya ', location: { lat: 24.7, lng: 46.7 } })).toEqual({ clinic_address: 'Street 1, Olaya', clinic_location: { lat: 24.7, lng: 46.7 } });
  });
  it('never overwrites what the profile editor set, and ignores a bad or missing point', () => {
    expect(clinicFromRegistration({ clinic_address: 'Set later', clinic_location: { lat: 21.5, lng: 39.2 } }, { address: 'Other', location: { lat: 24.7, lng: 46.7 } })).toEqual({});
    expect(clinicFromRegistration({}, { address: 'A', location: { lat: 0, lng: 0 } })).toEqual({ clinic_address: 'A' });
    expect(clinicFromRegistration({}, { address: '', location: { lat: '24', lng: 46 } })).toEqual({});
  });

  it('step 2 does it for a doctor and not for a pharmacy', async () => {
    const make = (type: ProviderType) => {
      const profile: any = { user_id: 'u', type, onboarding_step: 1, save: jest.fn().mockResolvedValue(undefined), toObject() { return this; }, markModified: jest.fn() };
      const providerModel = { findOne: jest.fn().mockResolvedValue(profile) };
      return { profile, service: new ProviderOnboardingService({} as any, providerModel as any, { emit: jest.fn() } as any, {} as any, {} as any) };
    };
    const doctor = make(ProviderType.DOCTOR);
    await doctor.service.step2({ id: 'u' }, { address: 'Clinic street', location: { lat: 24.7, lng: 46.7 } });
    expect(doctor.profile).toMatchObject({ address: 'Clinic street', clinic_address: 'Clinic street', clinic_location: { lat: 24.7, lng: 46.7 } });
    const pharmacy = make(ProviderType.PHARMACY);
    await pharmacy.service.step2({ id: 'u' }, { address: 'Shop street', location: { lat: 24.7, lng: 46.7 } });
    expect(pharmacy.profile.address).toBe('Shop street');
    expect(pharmacy.profile.clinic_address).toBeUndefined();
  });
});
