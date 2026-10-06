// ACCEPTANCE — N7, part 2 (owner review of #284): every OTHER public read that
// returns an individual provider (doctor, nursing, nurse, home_care) holds no
// account id, phone, email, address, national id or IBAN, and a nurse / home-care
// provider's exact location (their home) is never published: at most a point
// rounded to 2 decimals (~1 km) or the district. Doctors keep their clinic point.
// Written by the reviewer before the fix; the implementing agent makes it pass and
// may not edit it.
//
// Reads covered here (all @Public):
//   SEO:      GET /seo/resolve/:type/:slug, GET /seo/meta/:type/:slug (JSON-LD included),
//             GET /seo/:type/:id, GET /search/global, GET /doctors/:id/recommendations
//   search:   GET /search/providers, GET /care/search, GET /care/facilities/:id (embedded doctors)
//   MCP:      POST /mcp tools/call search_doctors, search_entities; GET /entity-graph/explore
//   reviews:  GET /ratings/provider/:id (by the public provider id)
//   badge:    GET /providers/:id/badge (resolves the public id only, never an account id)
//   map:      GET /providers/map, GET /providers?type=, GET /providers/:id (nurse coordinates)
//   legacy:   GET /doctors, GET /doctors/:id (modules/doctors) while that module exists
// Explicitly out of scope: facilities and businesses (pharmacy, lab, radiology,
// hospital) — their public address and phone are business contact data.
import * as fs from 'fs';
import * as path from 'path';
import mongoose, { Connection, Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { SeoService } from '../../src/modules/seo-search/seo.service';
import { ProviderProfileRepository as SeoProfileRepo } from '../../src/modules/seo-search/seo-repositories/providerprofile.repository';
import { SeoSearchService } from '../../src/modules/seo-search/seo-search.module';
import { ProviderOnboardingService } from '../../src/modules/provider-onboarding/provider-onboarding.module';
import { CareService } from '../../src/modules/care/care.service';
import { ProviderProfileRepository as CareProfileRepo } from '../../src/modules/care/repositories/providerprofile.repository';
import { UserRepository as CareUserRepo } from '../../src/modules/care/repositories/user.repository';
import { FacilityRepository as CareFacilityRepo } from '../../src/modules/care/repositories/facility.repository';
import { McpService } from '../../src/modules/mcp/mcp.service';
import { EntityGraphService } from '../../src/modules/entity-graph/entity-graph.service';
import { SearchIntentService } from '../../src/modules/search-intent/search-intent.service';
import { LocationService } from '../../src/modules/location/location.service';
import { RatingsService } from '../../src/modules/ratings/ratings.module';
import { ProviderBadgeController } from '../../src/modules/provider/provider-badge.controller';
import { ProvidersService } from '../../src/modules/provider/providers.service';
import { ProviderProfileRepository as ProvidersProfileRepo } from '../../src/modules/provider/repositories/providerprofile.repository';
import { UserRepository as ProvidersUserRepo } from '../../src/modules/provider/repositories/user.repository';
import { ProviderProfileSchema } from '../../src/schemas/provider-profile.schema';
import { UserSchema } from '../../src/schemas/user.schema';
import { FacilitySchema } from '../../src/schemas/facility.schema';
import { ProviderBranchSchema } from '../../src/schemas/provider-branch.schema';
import { ConditionSchema } from '../../src/modules/entity-graph/schemas/condition.schema';
import { EntityRelationSchema } from '../../src/modules/entity-graph/schemas/entity-relation.schema';
import { SearchIntentSchema } from '../../src/modules/search-intent/schemas/search-intent.schema';
import { QueryAnalyticsSchema } from '../../src/modules/search-intent/schemas/query-analytics.schema';
import { LocationSchema } from '../../src/modules/location/schemas/location.schema';

jest.setTimeout(90_000);

const PUBLIC = { status: 'active', public_eligibility: true, medical_review_status: 'approved', is_deleted: false, indexing_eligibility: true };
// Synthetic sentinels. Coordinates carry 7 decimals so any unrounded copy is detectable.
const DOCTOR = {
  id: 'n7w-doc', slug: 'dr-wide-privacy', user_id: 'acct-n7w-doc-41aa', account_id: 'acct-n7w-doc-41aa', type: 'doctor', provider_type: 'doctor', ...PUBLIC,
  name_ar: 'د. خصوصية واسعة', name_en: 'Dr Wide Privacy', full_name: 'Dr Wide Privacy', specialty: 'cardiology', city: 'الرياض', district: 'العليا',
  facility_id: 'n7w-fac', clinic_name: 'عيادة واسعة', rating: 4.6, rating_avg: 4.6, rating_count: 2,
  phone: '+966544455566', phone_e164: '+966544455566', email: 'n7w-doc@private.test',
  address: 'شارع-واسع-خاص-1', clinic_address: 'مبنى-واسع-خاص-2', home_address: 'منزل-واسع-خاص-3',
  national_id: '1999999981', iban: 'SA44N7WIDE0000000000001',
  location: { lat: 24.7123456, lng: 46.6789012 }, geo: { lat: 24.7123456, lng: 46.6789012 },
};
const NURSE = {
  id: 'n7w-nurse', slug: 'nurse-wide-privacy', user_id: 'acct-n7w-nurse-52bb', account_id: 'acct-n7w-nurse-52bb', type: 'nursing', provider_type: 'nursing', ...PUBLIC,
  name_ar: 'ممرضة خصوصية واسعة', name_en: 'Nurse Wide Privacy', full_name: 'Nurse Wide Privacy', specialty: 'nursing', city: 'الرياض', district: 'النخيل',
  rating: 4.9, rating_avg: 4.9, rating_count: 4, nursing_services: [{ key: 'svc-n7w' }],
  phone: '+966555566677', phone_e164: '+966555566677', email: 'n7w-nurse@private.test',
  address: 'شارع-واسع-خاص-4', home_address: 'منزل-واسع-خاص-5',
  national_id: '1999999982', iban: 'SA44N7WIDE0000000000002',
  location: { lat: 24.7512345, lng: 46.7045678 }, geo: { lat: 24.7512345, lng: 46.7045678 }, base_location: { lat: 24.7512345, lng: 46.7045678 },
};
const REVIEWER_ACCOUNT = 'acct-n7w-reviewer-63cc';

const secrets = (p: Record<string, any>) => [
  p.user_id, p.phone, p.phone.replace('+966', ''), p.email, p.address, p.home_address, p.clinic_address, p.national_id, p.iban,
].filter(Boolean) as string[];
const NURSE_EXACT_POINT = ['24.751234', '46.704567'];
const DOCTOR_CLINIC_POINT = ['24.712345', '46.678901'];

function leaks(response: unknown, provider: Record<string, any>, extra: string[] = []): string[] {
  const text = JSON.stringify(response) ?? '';
  return [...secrets(provider), ...extra].filter((s) => text.includes(s));
}
function hasKey(v: unknown, key: string): boolean {
  if (Array.isArray(v)) return v.some((x) => hasKey(x, key));
  if (v && typeof v === 'object') return Object.entries(v).some(([k, x]) => k === key || hasKey(x, key));
  return false;
}
const plain = (v: unknown) => JSON.parse(JSON.stringify(v ?? null));

describe('N7: every other public read of an individual provider', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let profiles: Model<any>;
  let seo: SeoService;
  let seoSearch: SeoSearchService;
  let onboarding: ProviderOnboardingService;
  let care: CareService;
  let mcp: McpService;
  let graph: EntityGraphService;
  let ratings: RatingsService;
  let badge: ProviderBadgeController;
  let providers: ProvidersService;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'n7wide' }).asPromise();
    profiles = conn.model('ProviderProfile', ProviderProfileSchema);
    const users = conn.model('User', UserSchema);
    const facilities = conn.model('Facility', FacilitySchema);
    const branches = conn.model('ProviderBranch', ProviderBranchSchema);
    const location = new LocationService(conn.model('Location', LocationSchema) as never);
    seo = new SeoService({} as never, {} as never, {} as never, {} as never, new SeoProfileRepo(profiles as never), {} as never, conn);
    seoSearch = new SeoSearchService(conn);
    onboarding = new ProviderOnboardingService(users as never, profiles as never, { emit: async () => undefined } as never, {} as never);
    care = new CareService(new CareProfileRepo(profiles as never), new CareUserRepo(users as never), new CareFacilityRepo(facilities as never),
      new Proxy({}, { get: () => async () => null }) as never);
    graph = new EntityGraphService(conn.model('Condition', ConditionSchema) as never, conn.model('EntityRelation', EntityRelationSchema) as never, conn, location);
    const intents = new SearchIntentService(conn.model('SearchIntent', SearchIntentSchema) as never, conn.model('QueryAnalytics', QueryAnalyticsSchema) as never, location);
    mcp = new McpService(intents, graph, location, conn);
    ratings = new RatingsService(conn);
    badge = new ProviderBadgeController(conn);
    providers = new ProvidersService(new ProvidersUserRepo(users as never), new ProvidersProfileRepo(profiles as never), branches as never,
      { emit: () => true } as never, { refresh: async () => undefined } as never);

    await profiles.collection.insertMany([{ ...DOCTOR }, { ...NURSE }]);
    await facilities.collection.insertOne({ id: 'n7w-fac', name_ar: 'مجمع عام', type: 'clinic', is_active: true, public_eligibility: true, medical_review_status: 'approved', city: 'الرياض' });
    await conn.collection('ratings').insertMany([
      { id: 'r1', user_id: REVIEWER_ACCOUNT, user_name: 'مراجع', entity_type: 'appointment', entity_id: 'appt-1', provider_id: DOCTOR.account_id, score: 5, comment: 'ممتاز', status: 'published', createdAt: new Date() },
      { id: 'r2', user_id: REVIEWER_ACCOUNT, user_name: 'مراجع', entity_type: 'home_care', entity_id: 'hc-1', provider_id: NURSE.account_id, score: 5, comment: 'رائعة', status: 'published', createdAt: new Date() },
    ]);
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });

  describe('SEO and website reads', () => {
    it('GET /seo/resolve/doctor/:slug holds no private field', async () => {
      const res = plain(await seo.resolve('doctor', DOCTOR.slug));
      expect(JSON.stringify(res)).toContain(DOCTOR.name_ar);
      expect(leaks(res, DOCTOR)).toEqual([]);
    });
    it('GET /seo/meta/doctor/:slug (entity + JSON-LD) holds no private field', async () => {
      const res = plain(await seo.meta('doctor', DOCTOR.slug));
      expect(JSON.stringify(res)).toContain(DOCTOR.name_ar);
      expect(leaks(res, DOCTOR)).toEqual([]);
      expect(hasKey(res, 'telephone')).toBe(false);
    });
    it('GET /seo/:type/:id for a doctor and a nurse holds no private field', async () => {
      expect(leaks(plain(await seoSearch.metadata('doctor', DOCTOR.id)), DOCTOR)).toEqual([]);
      expect(leaks(plain(await seoSearch.metadata('nursing', NURSE.id)), NURSE, NURSE_EXACT_POINT)).toEqual([]);
    });
    it('GET /search/global and GET /doctors/:id/recommendations hold no private field', async () => {
      expect(leaks(plain(await seoSearch.globalSearch('خصوصية', 10)), DOCTOR)).toEqual([]);
      expect(leaks(plain(await seoSearch.doctorRecommendations(DOCTOR.id, 10)), DOCTOR)).toEqual([]);
    });
  });

  describe('public search', () => {
    it('GET /search/providers?type=doctor holds no private field', async () => {
      const res = plain(await onboarding.unifiedSearch({ type: 'doctor' as never }));
      expect(JSON.stringify(res)).toContain(DOCTOR.name_ar);
      expect(leaks(res, DOCTOR)).toEqual([]);
    });
    it('GET /search/providers?type=nursing holds no private field and no exact home point', async () => {
      const res = plain(await onboarding.unifiedSearch({ type: 'nursing' as never }));
      expect(JSON.stringify(res)).toContain(NURSE.name_ar);
      expect(leaks(res, NURSE, NURSE_EXACT_POINT)).toEqual([]);
    });
    it('GET /care/search and GET /care/facilities/:id (embedded doctors) hold no private field', async () => {
      const found = plain(await care.smartSearch('خصوصية'));
      expect(leaks(found, DOCTOR)).toEqual([]);
      const fac = plain(await care.facilityById('n7w-fac'));
      expect(JSON.stringify(fac)).toContain(DOCTOR.name_ar);
      expect(leaks(fac, DOCTOR)).toEqual([]);
    });
  });

  describe('MCP and the entity graph', () => {
    // The tool result is JSON carried as text in result.content[0].text: read that payload.
    const call = async (name: string, args: Record<string, unknown>) => {
      const rpc: any = plain(await mcp.handleRpcRequest({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }));
      const text = rpc?.result?.content?.[0]?.text;
      return typeof text === 'string' ? JSON.parse(text) : rpc;
    };
    it('tools/call search_doctors holds no private field', async () => {
      const res = await call('search_doctors', { specialty: 'cardiology', city: 'الرياض' });
      expect(JSON.stringify(res)).toContain(DOCTOR.id);
      expect(leaks(res, DOCTOR)).toEqual([]);
    });
    it('tools/call search_entities holds no private field of a doctor or a nurse', async () => {
      const res = await call('search_entities', { query: 'خصوصية', location: 'الرياض' });
      expect(leaks(res, DOCTOR)).toEqual([]);
      expect(leaks(res, NURSE, NURSE_EXACT_POINT)).toEqual([]);
    });
    it('GET /entity-graph/explore returns no internal database id and no private field', async () => {
      const res = plain(await graph.explore({ city: 'الرياض' }));
      expect(JSON.stringify(res)).toContain(DOCTOR.name_ar);
      expect(hasKey(res, '_id')).toBe(false);
      expect(leaks(res, DOCTOR)).toEqual([]);
      expect(leaks(res, NURSE, NURSE_EXACT_POINT)).toEqual([]);
    });
  });

  describe('public reviews', () => {
    it('GET /ratings/provider/:id answers by the public provider id, with no account id (provider or reviewer)', async () => {
      const doc = plain(await ratings.forProvider(DOCTOR.id));
      expect(JSON.stringify(doc)).toContain('ممتاز');
      expect(leaks(doc, DOCTOR, [REVIEWER_ACCOUNT])).toEqual([]);
      const nurse = plain(await ratings.forProvider(NURSE.id));
      expect(JSON.stringify(nurse)).toContain('رائعة');
      expect(leaks(nurse, NURSE, [REVIEWER_ACCOUNT])).toEqual([]);
    });
  });

  describe('badge', () => {
    it('GET /providers/:id/badge resolves the public id, never an account id', async () => {
      await expect(badge.badge(DOCTOR.id)).resolves.toBeTruthy();
      await expect(badge.badge(DOCTOR.account_id)).rejects.toThrow();
    });
  });

  describe('coordinates', () => {
    it('a nurse\'s exact point is never published (map, list, card); a doctor keeps the clinic point', async () => {
      const map = plain(await providers.mapProviders());
      expect(JSON.stringify(map)).toContain(NURSE.name_ar);
      expect(leaks(map, NURSE, NURSE_EXACT_POINT)).toEqual([]);
      expect(DOCTOR_CLINIC_POINT.every((p) => JSON.stringify(map).includes(p))).toBe(true);
      expect(leaks(plain(await providers.listPublic('nursing' as never)), NURSE, NURSE_EXACT_POINT)).toEqual([]);
      expect(leaks(plain(await providers.getPublicById(NURSE.id)), NURSE, NURSE_EXACT_POINT)).toEqual([]);
    });
  });

  describe('legacy doctors engine (modules/doctors), while it exists', () => {
    const file = path.join(__dirname, '../../src/modules/doctors/doctors.module.ts');
    it('GET /doctors and GET /doctors/:id hold no account id or clinic street address', async () => {
      if (!fs.existsSync(file)) return; // removed (31b1a1e): nothing public left to leak
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { DoctorsService } = require(file);
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { DoctorSchema } = require(path.join(__dirname, '../../src/modules/doctors/doctors.schemas.ts'));
      const doctors = conn.model('Doctor', DoctorSchema);
      await doctors.collection.insertOne({
        id: 'n7w-legacy', name_ar: 'د. قديم', specialty: 'cardiology', provider_account_id: 'acct-n7w-legacy-77dd', active: true, status: 'published',
        clinic_location: { city: 'الرياض', name: 'عيادة', address: 'شارع-قديم-خاص-8', lat: 24.7, lng: 46.7 },
      });
      const svc = new DoctorsService(doctors, {}, {}, {}, {}, { emit: async () => undefined });
      const secretsLegacy = ['acct-n7w-legacy-77dd', 'شارع-قديم-خاص-8'];
      const list = JSON.stringify(plain(await svc.listDoctors({})));
      const one = JSON.stringify(plain(await svc.doctorDetail('n7w-legacy')));
      expect(secretsLegacy.filter((s) => list.includes(s) || one.includes(s))).toEqual([]);
    });
  });
});
