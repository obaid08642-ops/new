import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { BadRequestException } from '@nestjs/common';
import { assertFollowUp, doctorSubmitProblems, normalizeClinicLocation, normalizeEducation, normalizeGender, normalizeIban, normalizeProcedures } from './doctor-profile-fields';
import { Step2Dto, Step3Dto } from './provider-onboarding.dto';
import { CareService } from '../care/care.service';

describe('doctor profile and registration fields (owner decision 2026-10-24)', () => {
  const NOW = new Date('2026-10-24T00:00:00Z');

  it('education: trimmed entries, a university is required, graduation year is bounded', () => {
    expect(normalizeEducation([{ university: ' King Saud University ', graduation_year: 2010, fellowship_board: 'Saudi Board' }], NOW)).toEqual([{ university: 'King Saud University', graduation_year: 2010, fellowship_board: 'Saudi Board' }]);
    expect(() => normalizeEducation([{ graduation_year: 2010 }], NOW)).toThrow('education_university_required');
    expect(() => normalizeEducation([{ university: 'U', graduation_year: 2999 }], NOW)).toThrow('invalid_graduation_year');
    expect(() => normalizeEducation('x', NOW)).toThrow(BadRequestException);
    expect(() => normalizeEducation(Array.from({ length: 11 }, () => ({ university: 'U' })), NOW)).toThrow('too_many_education_entries');
  });

  it('procedures need a name and a sane price', () => {
    expect(normalizeProcedures([{ name_ar: 'تنظيف', price: 150 }])).toEqual([{ name_ar: 'تنظيف', name_en: null, price: 150 }]);
    expect(() => normalizeProcedures([{ name_ar: '', price: 1 }])).toThrow('procedure_name_required');
    expect(() => normalizeProcedures([{ name_ar: 'x', price: -1 }])).toThrow('invalid_procedure_price');
    expect(() => normalizeProcedures([{ name_ar: 'x', price: '5' }])).toThrow('invalid_procedure_price');
  });

  it('follow-up price and window, clinic point, gender and IBAN', () => {
    expect(() => assertFollowUp(0, 14)).not.toThrow();
    expect(() => assertFollowUp(-1, 14)).toThrow('invalid_follow_up_price');
    expect(() => assertFollowUp(10, 0)).toThrow('invalid_follow_up_window');
    expect(normalizeClinicLocation({ lat: 24.7, lng: 46.7 })).toEqual({ lat: 24.7, lng: 46.7 });
    expect(() => normalizeClinicLocation({ lat: 0, lng: 0 })).toThrow('invalid_clinic_location');
    expect(() => normalizeClinicLocation({ lat: 'x', lng: 1 })).toThrow('invalid_clinic_location');
    expect([normalizeGender('Male'), normalizeGender('أنثى'), normalizeGender('x')]).toEqual(['male', 'female', null]);
    expect(normalizeIban('sa03 8000 0000 6080 1016 7519')).toBe('SA0380000000608010167519');
    expect(normalizeIban('SA123')).toBeNull();
  });

  it('submit needs a title (academic degree), a sub-specialty, an unexpired licence date and an IBAN', () => {
    const ok = { academic_degree: 'consultant', sub_specialties: ['Interventional cardiology'], license_expiry_date: new Date('2027-01-01'), iban: 'SA0380000000608010167519' };
    expect(doctorSubmitProblems(ok, NOW)).toEqual([]);
    expect(doctorSubmitProblems({}, NOW)).toEqual(['academic_degree_required', 'sub_specialty_required', 'license_expiry_date_required', 'valid_iban_required']);
    expect(doctorSubmitProblems({ ...ok, license_expiry_date: new Date('2026-01-01') }, NOW)).toEqual(['license_already_expired']);
    expect(doctorSubmitProblems({ ...ok, academic_degree: 'king', sub_specialties: [' '] }, NOW)).toEqual(['academic_degree_required', 'sub_specialty_required']);
  });

  it('the DTOs validate the new fields', async () => {
    const good = plainToInstance(Step3Dto, { education: [{ university: 'U', graduation_year: 2010 }], procedures: [{ name_ar: 'x', price: 10 }], follow_up_price: 50, follow_up_window_days: 14, clinic_address: 'Riyadh', clinic_location: { lat: 24.7, lng: 46.7 } });
    expect(await validate(good)).toHaveLength(0);
    for (const bad of [{ education: [{ graduation_year: 2010 }] }, { procedures: [{ name_ar: 'x', price: -5 }] }, { follow_up_window_days: 400 }, { clinic_location: { lat: 200, lng: 0 } }, { follow_up_price: 'free' }]) {
      expect((await validate(plainToInstance(Step3Dto, bad))).length).toBeGreaterThan(0);
    }
    expect(await validate(plainToInstance(Step2Dto, { license_expiry_date: '2027-06-30' }))).toHaveLength(0);
    expect((await validate(plainToInstance(Step2Dto, { license_expiry_date: 'soon' }))).length).toBeGreaterThan(0);
  });

  it('the public profile shows the clinic point and education, never the personal address, and the verified certificates', async () => {
    const doc = { id: 'd1', user_id: 'u1', account_id: 'a1', name_en: 'Dr', medical_review_status: 'approved', license_verified: true, gender: 'female', address: 'PERSONAL HOME ADDRESS', location: { lat: 1.11, lng: 2.22 }, clinic_address: 'Olaya St, Riyadh', clinic_location: { lat: 24.7, lng: 46.7 }, education: [{ university: 'KSU', graduation_year: 2010, fellowship_board: null }], follow_up_price: 50, follow_up_window_days: 14, procedures: [{ name_ar: 'تنظيف', price: 100 }] };
    let docsQuery: any;
    const providerModel: any = {
      findOne: async () => doc,
      find: () => ({ limit: () => Promise.resolve([]) }),
      db: { collection: (n: string) => ({ find: (q: any) => { if (n === 'provider_documents') docsQuery = q; const rows = n === 'provider_documents' ? [{ doc_type: 'board_certificate', issuer: 'SCFHS', issued_date: '2015-01-01' }] : []; return { toArray: async () => rows, sort: () => ({ limit: () => ({ toArray: async () => [] }) }) }; } }) },
    };
    const svc: any = new (CareService as any)(providerModel, {}, { findOne: async () => null }, { nextAvailable: async () => null, hasSlotsToday: async () => false });
    const out = await svc.doctorById('d1');
    expect(out).toMatchObject({ gender: 'female', follow_up: { price: 50, window_days: 14 }, clinic: { address: 'Olaya St, Riyadh', lat: 24.7, lng: 46.7 }, education: [{ university: 'KSU', graduation_year: 2010, fellowship_board: null }], procedures: [{ name_ar: 'تنظيف', price: 100 }], education_verified: [{ type: 'board_certificate', issuer: 'SCFHS', issued_date: '2015-01-01' }] });
    expect(JSON.stringify(out)).not.toMatch(/PERSONAL HOME ADDRESS|1\.11|2\.22/);
    expect(docsQuery).toMatchObject({ review_status: 'approved', doc_type: { $in: ['academic_certificate', 'board_certificate'] } });
  });
});
