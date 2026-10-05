// ACCEPTANCE — N7 (owner decision 2026-10-05, REVIEW_REAUDIT Round 12 Phase A #10):
// "Individual providers' public views show only name, specialty, clinic/district
// and ratings. No phone, address or internal IDs; contact happens in-app."
// Written by the reviewer before the fix; the implementing agent makes it pass and
// may not edit it.
//
// Individual providers = doctors and nurses (provider types doctor, nursing,
// nurse, home_care). Every public (no-session) read that returns one of them must
// not contain, anywhere in the response:
//   - the provider's account id (user_id / account_id; the public id is the
//     profile `id` or `slug`, and bookings resolve the account server-side),
//   - phone (phone / phone_e164 / mobile), email,
//   - any street or home address (address / clinic_address / home_address),
//   - national_id or IBAN.
// They keep what the patient chooses by: name, specialty (doctors), clinic name /
// district, rating. Businesses (pharmacy, lab, radiology, hospital) are not
// individuals: their public contact phone stays.
//
// Reads covered (patient app + website, all @Public):
//   GET /providers?type=  GET /providers/:id  GET /providers/map?type=
//   GET /care/doctors     GET /care/doctors/:id
//   GET /home-care/providers  GET /home-care/providers/:id  GET /nursing/nurses/:id
// The values below are synthetic sentinels; the test scans each whole response for them.
import mongoose, { Connection, Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ProvidersService } from '../../src/modules/provider/providers.service';
import { ProviderProfileRepository as ProvidersProfileRepo } from '../../src/modules/provider/repositories/providerprofile.repository';
import { UserRepository as ProvidersUserRepo } from '../../src/modules/provider/repositories/user.repository';
import { CareService } from '../../src/modules/care/care.service';
import { ProviderProfileRepository as CareProfileRepo } from '../../src/modules/care/repositories/providerprofile.repository';
import { UserRepository as CareUserRepo } from '../../src/modules/care/repositories/user.repository';
import { FacilityRepository as CareFacilityRepo } from '../../src/modules/care/repositories/facility.repository';
import { HomeCareCompatController } from '../../src/modules/home-care/home-care-compat.module';
import { PatientNurseProfileController } from '../../src/modules/home-care/nurse-profile.controller';
import { ProviderProfileSchema } from '../../src/schemas/provider-profile.schema';
import { UserSchema } from '../../src/schemas/user.schema';
import { FacilitySchema } from '../../src/schemas/facility.schema';
import { ProviderBranchSchema } from '../../src/schemas/provider-branch.schema';

jest.setTimeout(60_000);

const PUBLIC = { status: 'active', public_eligibility: true, medical_review_status: 'approved', is_deleted: false };
const DOCTOR = {
  id: 'n7-doc', slug: 'n7-doc-slug', user_id: 'acct-n7-doc-7f3a', account_id: 'acct-n7-doc-7f3a', type: 'doctor', ...PUBLIC,
  name_ar: 'د. خصوصية', name_en: 'Dr Privacy', specialty: 'cardiology', clinic_name: 'عيادة الخصوصية', city: 'الرياض', district: 'العليا',
  rating: 4.5, rating_avg: 4.5, rating_count: 3, reviews_count: 3, consultation_fee: 150, consultation_modes: ['clinic'],
  phone: '+966511122233', phone_e164: '+966511122233', mobile: '0511122233', email: 'n7-doc@private.test',
  address: 'شارع-خاص-7', clinic_address: 'مبنى-خاص-9', home_address: 'منزل-خاص-3',
  national_id: '1999999997', iban: 'SA44N7PRIVATE000000000001', location: { lat: 24.71, lng: 46.67 },
};
const NURSE = {
  id: 'n7-nurse', slug: 'n7-nurse-slug', user_id: 'acct-n7-nurse-9b2c', account_id: 'acct-n7-nurse-9b2c', type: 'nursing', ...PUBLIC,
  name_ar: 'ممرضة خصوصية', name_en: 'Nurse Privacy', city: 'الرياض', district: 'النخيل',
  rating: 4.8, rating_avg: 4.8, rating_count: 5, reviews_count: 5, nursing_services: [{ key: 'svc-n7' }], gender: 'female',
  phone: '+966522233344', phone_e164: '+966522233344', mobile: '0522233344', email: 'n7-nurse@private.test',
  address: 'شارع-خاص-11', home_address: 'منزل-خاص-12',
  national_id: '1999999998', iban: 'SA44N7PRIVATE000000000002', location: { lat: 24.75, lng: 46.70 },
};
const PHARMACY = { id: 'n7-pharm', user_id: 'acct-n7-pharm', type: 'pharmacy', ...PUBLIC, name_ar: 'صيدلية عامة', phone: '+966533344455', city: 'الرياض' };

const SECRETS = (p: Record<string, any>) => [
  p.user_id, p.phone, p.phone.replace('+966', ''), p.mobile, p.email, p.address, p.home_address, p.clinic_address, p.national_id, p.iban,
].filter(Boolean) as string[];

function leaks(response: unknown, provider: Record<string, any>): string[] {
  const text = JSON.stringify(response);
  return SECRETS(provider).filter((s) => text.includes(s));
}

describe('individual providers\' public views hold no phone, address or internal ids (N7)', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let providers: ProvidersService;
  let care: CareService;
  let homeCare: HomeCareCompatController;
  let nurseProfile: PatientNurseProfileController;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'n7' }).asPromise();
    const profiles: Model<any> = conn.model('ProviderProfile', ProviderProfileSchema);
    const users: Model<any> = conn.model('User', UserSchema);
    const facilities: Model<any> = conn.model('Facility', FacilitySchema);
    const branches: Model<any> = conn.model('ProviderBranch', ProviderBranchSchema);
    const services: Model<any> = conn.model('HomeCareService', new mongoose.Schema({}, { strict: false, collection: 'home_care_services' }));
    providers = new ProvidersService(new ProvidersUserRepo(users as never), new ProvidersProfileRepo(profiles as never), branches as never,
      { emit: () => true } as never, { refresh: async () => undefined } as never);
    // Slot preview is not under test here: every slot lookup answers "nothing free".
    const slots = new Proxy({}, { get: () => async () => null });
    care = new CareService(new CareProfileRepo(profiles as never), new CareUserRepo(users as never), new CareFacilityRepo(facilities as never), slots as never);
    homeCare = new HomeCareCompatController({} as never, services as never, profiles as never, {} as never, undefined, conn);
    nurseProfile = new PatientNurseProfileController(conn);
    await profiles.collection.insertMany([{ ...DOCTOR }, { ...NURSE }, { ...PHARMACY }]);
    await services.collection.insertOne({ id: 'svc-n7', name_ar: 'خدمة', price: 100, active: true, public_eligibility: true, medical_review_status: 'approved' });
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });

  describe('the doctor', () => {
    it('GET /providers?type=doctor', async () => {
      const res = await providers.listPublic('doctor' as never);
      expect(JSON.stringify(res)).toContain(DOCTOR.name_ar); // still listed
      expect(leaks(res, DOCTOR)).toEqual([]);
    });
    it('GET /providers/:id (public id) keeps name, specialty, district and rating', async () => {
      const res = await providers.getPublicById(DOCTOR.id);
      const card = JSON.parse(JSON.stringify(res));
      expect(card).toEqual(expect.objectContaining({ name_ar: DOCTOR.name_ar, specialty: DOCTOR.specialty, district: DOCTOR.district }));
      expect(JSON.stringify(card)).toContain('4.5');
      expect(leaks(card, DOCTOR)).toEqual([]);
    });
    it('GET /providers/map?type=doctor', async () => {
      const res = await providers.mapProviders('doctor');
      expect(JSON.stringify(res)).toContain(DOCTOR.name_ar);
      expect(leaks(res, DOCTOR)).toEqual([]);
    });
    it('GET /care/doctors', async () => {
      const res = await care.listDoctors({ page: 1, limit: 20 });
      expect(JSON.stringify(res)).toContain(DOCTOR.name_ar);
      expect(leaks(res, DOCTOR)).toEqual([]);
    });
    it('GET /care/doctors/:id', async () => {
      const res = await care.doctorById(DOCTOR.id);
      expect(JSON.stringify(res)).toContain(DOCTOR.name_ar);
      expect(leaks(res, DOCTOR)).toEqual([]);
    });
  });

  describe('the nurse', () => {
    it('GET /providers?type=nursing', async () => {
      const res = await providers.listPublic('nursing' as never);
      expect(JSON.stringify(res)).toContain(NURSE.name_ar);
      expect(leaks(res, NURSE)).toEqual([]);
    });
    it('GET /providers/:id', async () => {
      const res = await providers.getPublicById(NURSE.id);
      expect(JSON.stringify(res)).toContain(NURSE.name_ar);
      expect(leaks(res, NURSE)).toEqual([]);
    });
    it('GET /home-care/providers (service-details list)', async () => {
      const res = await homeCare.providers({ type: 'svc-n7' });
      expect(JSON.stringify(res)).toContain(NURSE.name_ar);
      expect(leaks(res, NURSE)).toEqual([]);
    });
    it('GET /home-care/providers/:id by the public id', async () => {
      const res = await homeCare.provider(NURSE.id, 'svc-n7');
      expect(JSON.stringify(res)).toContain(NURSE.name_ar);
      expect(leaks(res, NURSE)).toEqual([]);
    });
    it('GET /nursing/nurses/:id (website nurse page) by the public id', async () => {
      const res = await nurseProfile.one(undefined, NURSE.id);
      expect(JSON.stringify(res)).toContain(NURSE.name_ar);
      expect(leaks(res, NURSE)).toEqual([]);
    });
  });

  it('a business (pharmacy) keeps its public contact phone', async () => {
    const res = await providers.listPublic('pharmacy' as never);
    expect(JSON.stringify(res)).toContain(PHARMACY.phone);
  });
});
