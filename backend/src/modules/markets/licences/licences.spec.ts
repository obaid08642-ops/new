import { licenceExpiryState, licencesFromLegacyProfile, licenceTypesFor, registerLicenceTypes, SA_LICENCE_TYPES } from './licence-types';
import { onboardingFieldSet, SA_ONBOARDING } from './onboarding-field-sets';
import { doctorSubmitProblems } from '../../provider-onboarding/doctor-profile-fields';
import { facilityLicenseProblems, LICENSED_FACILITY_TYPES } from '../../provider-onboarding/facility-license';
import { ProviderType } from '../../../common/enums';
import { SA_CONFIG_V1 } from '../sa-market.seed';

describe('licence expiry: valid through the end of the expiry day in the market time zone (A2)', () => {
  const tz = SA_CONFIG_V1.timezone;
  it('is valid all day on the expiry date in Riyadh, expired from the next calendar day', () => {
    expect(licenceExpiryState('2026-12-01', new Date('2026-12-01T20:59:59Z'), tz)).toEqual({ state: 'valid', days_left: 0 }); // 23:59:59 Riyadh
    expect(licenceExpiryState('2026-12-01', new Date('2026-12-01T21:00:00Z'), tz)).toEqual({ state: 'expired', days_left: -1 }); // 00:00 Dec 2 Riyadh
  });
  it('counts days left on the market calendar', () => {
    expect(licenceExpiryState('2026-12-31', new Date('2026-12-01T10:00:00Z'), tz).days_left).toBe(30);
  });
  it('works for a zone with daylight saving (Cairo): the offset change moves the boundary, the calendar day does not', () => {
    const cairo = 'Africa/Cairo';
    expect(licenceExpiryState('2026-07-01', new Date('2026-07-01T20:59:00Z'), cairo).state).toBe('valid'); // 23:59 at UTC+3 (summer)
    expect(licenceExpiryState('2026-07-01', new Date('2026-07-01T21:00:00Z'), cairo).state).toBe('expired');
    expect(licenceExpiryState('2026-01-15', new Date('2026-01-15T21:59:00Z'), cairo).state).toBe('valid'); // 23:59 at UTC+2 (winter)
    expect(licenceExpiryState('2026-01-15', new Date('2026-01-15T22:00:00Z'), cairo).state).toBe('expired');
  });
});

describe('licence types per jurisdiction', () => {
  it('SA: practitioners need SCFHS, facilities need MoH + CR, pharmacies also SFDA; all admin-reviewed (no registry API)', () => {
    expect(licenceTypesFor('SA', 'doctor').map((t) => t.id)).toEqual(['sa-scfhs']);
    expect(licenceTypesFor('SA', 'lab').map((t) => t.id)).toEqual(['sa-moh-facility', 'sa-commercial-register']);
    expect(licenceTypesFor('SA', 'pharmacy').map((t) => t.id).sort()).toEqual(['sa-commercial-register', 'sa-moh-facility', 'sa-scfhs', 'sa-sfda-pharmacy']);
    expect(SA_LICENCE_TYPES.every((t) => t.verification === 'admin_document_review')).toBe(true);
  });
  it('an unregistered market has no Saudi fallback; registering data makes it work', () => {
    expect(() => licenceTypesFor('EG', 'doctor')).toThrow('licence_types_not_found:EG');
    registerLicenceTypes('EG', [{ id: 'eg-syndicate', jurisdiction: 'EG', issuer: 'syndicate', provider_types: ['doctor'], has_expiry: true, verification: 'admin_document_review' }]);
    expect(licenceTypesFor('EG', 'doctor')).toHaveLength(1);
  });
  it('legacy profile columns read as a licence list', () => {
    const l = licencesFromLegacyProfile({ scfhs_license_number: ' 12-345 ', license_expiry_date: '2027-03-04T00:00:00.000Z', license_status: 'verified', cr_number: '10100', moh_license_number: '' });
    expect(l).toEqual([
      { jurisdiction: 'SA', type: 'sa-scfhs', number: '12-345', expiry: '2027-03-04', document_ids: [], verified: true },
      { jurisdiction: 'SA', type: 'sa-commercial-register', number: '10100', expiry: null, document_ids: [], verified: false },
    ]);
    expect(licencesFromLegacyProfile({})).toEqual([]);
  });
});

describe('SA onboarding field sets agree with what the server enforces at submit', () => {
  it('every provider type has a set; licence links point at real licence types', () => {
    const ids = new Set(SA_LICENCE_TYPES.map((t) => t.id));
    for (const t of Object.values(ProviderType)) {
      const s = onboardingFieldSet('SA', t);
      expect(s).not.toBeNull();
      for (const fld of s!.fields) if (fld.licence_type) expect(ids.has(fld.licence_type)).toBe(true);
    }
    expect(SA_ONBOARDING.length).toBe(Object.values(ProviderType).length);
  });
  it('doctor: required fields == the problems doctorSubmitProblems reports for an empty profile', () => {
    const required = onboardingFieldSet('SA', 'doctor')!.fields.filter((x) => x.required).map((x) => x.key).sort();
    const problems = doctorSubmitProblems({}).map((p) => ({ academic_degree_required: 'academic_degree', sub_specialty_required: 'sub_specialties', license_expiry_date_required: 'license_expiry_date', valid_iban_required: 'iban' } as Record<string, string>)[p]).sort();
    expect(required).toEqual(problems);
  });
  it('facilities: the expiry date is the only enforced licence field and only behind the switch, so it is not required here', () => {
    for (const t of LICENSED_FACILITY_TYPES) {
      expect(facilityLicenseProblems({ type: t }, new Date(), false)).toEqual([]);
      expect(onboardingFieldSet('SA', t)!.fields.filter((x) => x.required)).toEqual([]);
      expect(onboardingFieldSet('SA', t)!.fields.some((x) => x.key === 'license_expiry_date')).toBe(true);
    }
  });
  it('an unregistered market throws, no Saudi fallback', () => expect(() => onboardingFieldSet('ZZ', 'doctor')).toThrow('onboarding_field_sets_not_found:ZZ'));
});

describe('GET /provider-onboarding/field-set', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ProviderOnboardingController } = require('../../provider-onboarding/provider-onboarding.module');
  const ctrl = new ProviderOnboardingController({} as never);
  it('returns the SA set and licence types for the launch market', () => {
    const r = ctrl.fieldSet({ type: 'doctor' });
    expect(r.market_id).toBe('SA');
    expect(r.fields.find((x: { key: string }) => x.key === 'iban').required).toBe(true);
    expect(r.licence_types.map((t: { id: string }) => t.id)).toEqual(['sa-scfhs']);
  });
  it('is 404 for a type without a set', () => {
    expect(() => ctrl.fieldSet({ type: 'unknown' })).toThrow('onboarding_field_set_not_found');
  });
});
