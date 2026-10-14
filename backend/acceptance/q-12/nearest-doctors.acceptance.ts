// ACCEPTANCE — Q-12 "Nearest" (owner feature, docs/review/OPENCODE_QUEUE.md Queue A). Written by
// the reviewer before the work; the implementing agent makes it pass and may not edit it.
//
// Required behaviour of GET /api/v1/care/doctors (real controller, real JwtAuthGuard + WriteGuard,
// production ValidationPipe, real CareService / SlotService, real Mongo models):
//   - Writers keep sending the clinic point as `location: { lat, lng }` (onboarding, admin, apps).
//     The profile also stores it as a GeoJSON point with a 2dsphere index, kept in step on create
//     AND on update, so the database answers "nearest" (no in-memory sort of a capped batch).
//   - `sort=distance&lat=&lng=` returns doctors nearest first, each with `distance_km`
//     (km, one decimal). Paging continues in distance order without repeats.
//   - `type=clinic|video|home_visit` filters the mode (home_visit = the stored mode `home`).
//     "Nearest" applies to clinic and home-visit only: `type=video&sort=distance` -> 400.
//   - No lat/lng: a signed-in patient falls back to their city (`users.city`): only doctors in that
//     city, `distance_km: null`. Anonymous without a location -> 400. Out-of-range lat/lng -> 400.
//   - Doctors that are not public (pending, not approved) never appear.
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { MongooseModule, getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { CareController } from '../../src/modules/care/care.controller';
import { CareService } from '../../src/modules/care/care.service';
import { SlotService } from '../../src/modules/care/slot.service';
import { AppointmentRepository } from '../../src/modules/care/repositories/appointment.repository';
import { FacilityRepository } from '../../src/modules/care/repositories/facility.repository';
import { ProviderProfileRepository } from '../../src/modules/care/repositories/providerprofile.repository';
import { UserRepository } from '../../src/modules/care/repositories/user.repository';
import { ProviderProfile, ProviderProfileSchema } from '../../src/schemas/provider-profile.schema';
import { User, UserSchema } from '../../src/schemas/user.schema';
import { Appointment, AppointmentSchema } from '../../src/schemas/appointment.schema';
import { Facility, FacilitySchema } from '../../src/schemas/facility.schema';
import { LeaveRequest, LeaveRequestSchema } from '../../src/schemas/leave-request.schema';
import { PatientProfile, PatientProfileSchema } from '../../src/schemas/patient-profile.schema';
import { SlotLock, SlotLockSchema } from '../../src/schemas/slot-lock.schema';
import { JwtAuthGuard } from '../../src/common/auth.guard';
import { WriteGuard } from '../../src/common/write-guard';
import { ImpersonationSessionService } from '../../src/common/impersonation-session.service';

jest.setTimeout(180_000);

const SECRET = 'q12-acceptance-secret';
const patientToken = (id: string) => new JwtService({ secret: SECRET }).sign({ id, sub: id, role: 'patient' });

// The patient stands at Jeddah Corniche.
const ME = { lat: 21.5433, lng: 39.1728 };
const haversine = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const r = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
};

describe('Q-12: nearest doctors (clinic and home visit)', () => {
  let mongo: MongoMemoryServer;
  let app: INestApplication;
  let conn: Connection;
  let profiles: Model<any>;

  const pub = { type: 'doctor', status: 'active', public_eligibility: true, medical_review_status: 'approved', specialty: 'general' };
  // Three clinics in Jeddah at known distances from ME, created LAST so that a capped
  // "first N documents, then sort in memory" implementation cannot find them.
  const NEAR = [
    { id: 'jed-1', loc: { lat: 21.5500, lng: 39.1700 } },
    { id: 'jed-2', loc: { lat: 21.5800, lng: 39.1600 } },
    { id: 'jed-3', loc: { lat: 21.6500, lng: 39.1300 } },
  ];
  const get = (qs: string, token?: string) => {
    const r = request(app.getHttpServer()).get(`/api/v1/care/doctors?${qs}`);
    return token ? r.set('Authorization', `Bearer ${token}`) : r;
  };

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    process.env.JWT_SECRET = SECRET;
    const moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongo.getUri(), { dbName: 'q12' }),
        MongooseModule.forFeature([
          { name: ProviderProfile.name, schema: ProviderProfileSchema },
          { name: User.name, schema: UserSchema },
          { name: Appointment.name, schema: AppointmentSchema },
          { name: Facility.name, schema: FacilitySchema },
          { name: LeaveRequest.name, schema: LeaveRequestSchema },
          { name: PatientProfile.name, schema: PatientProfileSchema },
          { name: SlotLock.name, schema: SlotLockSchema },
        ]),
      ],
      controllers: [CareController],
      providers: [
        CareService, SlotService,
        { provide: 'AppointmentRepository', useClass: AppointmentRepository },
        { provide: 'FacilityRepository', useClass: FacilityRepository },
        { provide: 'ProviderProfileRepository', useClass: ProviderProfileRepository },
        { provide: 'UserRepository', useClass: UserRepository },
        { provide: JwtService, useValue: new JwtService({ secret: SECRET }) },
        Reflector,
        { provide: ImpersonationSessionService, useValue: {} },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: WriteGuard },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    conn = moduleRef.get<Connection>(getConnectionToken());
    profiles = moduleRef.get<Model<any>>(getModelToken(ProviderProfile.name));
    await profiles.syncIndexes();

    // 230 public doctors in Riyadh (~850 km away), created first.
    const riyadh = Array.from({ length: 230 }, (_, i) => ({
      ...pub, id: `ryd-${i}`, user_id: `u-ryd-${i}`, name_ar: `د ${i}`, city: 'Riyadh', rating: 5,
      consultation_modes: ['clinic', 'video', 'home'], location: { lat: 24.70 + i * 0.001, lng: 46.67 },
    }));
    await profiles.create(riyadh);
    await profiles.create([
      // not public: must never appear, even though it is the closest
      { ...pub, id: 'jed-pending', user_id: 'u-jed-pending', name_ar: 'معلق', city: 'Jeddah', status: 'pending', consultation_modes: ['clinic'], location: { lat: 21.5434, lng: 39.1729 } },
      // video only: excluded from type=clinic / home_visit
      { ...pub, id: 'jed-video', user_id: 'u-jed-video', name_ar: 'فيديو', city: 'Jeddah', rating: 1, consultation_modes: ['video'], location: { lat: 21.5440, lng: 39.1730 } },
      // in Jeddah but without a stored point (city fallback only)
      { ...pub, id: 'jed-nopoint', user_id: 'u-jed-nopoint', name_ar: 'بدون موقع', city: 'Jeddah', rating: 1, consultation_modes: ['clinic'] },
      { ...pub, id: 'jed-3', user_id: 'u-jed-3', name_ar: 'ج3', city: 'Jeddah', rating: 1, consultation_modes: ['clinic', 'home'], location: NEAR[2].loc },
      { ...pub, id: 'jed-2', user_id: 'u-jed-2', name_ar: 'ج2', city: 'Jeddah', rating: 1, consultation_modes: ['clinic'], location: NEAR[1].loc },
      { ...pub, id: 'jed-1', user_id: 'u-jed-1', name_ar: 'ج1', city: 'Jeddah', rating: 1, consultation_modes: ['clinic', 'home'], location: NEAR[0].loc },
      // created far away, then MOVES next to the patient through an update (clinic relocated)
      { ...pub, id: 'moved', user_id: 'u-moved', name_ar: 'انتقل', city: 'Jeddah', rating: 1, consultation_modes: ['clinic'], location: { lat: 26.0, lng: 50.0 } },
    ]);
    await profiles.updateOne({ id: 'moved' }, { $set: { location: { lat: 21.5600, lng: 39.1650 } } });
    await conn.collection('users').insertMany([
      { id: 'pat-jed', full_name: 'P', role: 'patient', city: 'Jeddah', active: true },
      { id: 'pat-nocity', full_name: 'Q', role: 'patient', active: true },
    ]);
  });
  afterAll(async () => { await app?.close(); await mongo?.stop(); });

  it('the profile stores a GeoJSON point with a 2dsphere index', async () => {
    const indexes = await conn.collection('provider_profiles').indexes();
    expect(indexes.some((ix) => Object.values(ix.key).includes('2dsphere'))).toBe(true);
    const doc: any = await conn.collection('provider_profiles').findOne({ id: 'jed-1' });
    const points = Object.values(doc).filter((v: any) => v && v.type === 'Point' && Array.isArray(v.coordinates));
    expect(points).toContainEqual({ type: 'Point', coordinates: [NEAR[0].loc.lng, NEAR[0].loc.lat] });
  });

  it('sort=distance returns the nearest clinics first with distance_km, found among 230+ doctors', async () => {
    const res = await get(`sort=distance&lat=${ME.lat}&lng=${ME.lng}&type=clinic&limit=5`);
    expect(res.status).toBe(200);
    const items: any[] = res.body.items;
    const ids = items.map((d) => d.id);
    expect(ids.slice(0, 3)).toEqual(['jed-1', 'moved', 'jed-2']);
    expect(ids).not.toContain('jed-pending');
    expect(ids).not.toContain('jed-video');
    for (const d of items) expect(typeof d.distance_km).toBe('number');
    const want = Math.round(haversine(ME, NEAR[0].loc) * 10) / 10;
    expect(Math.abs(items[0].distance_km - want)).toBeLessThanOrEqual(0.1);
    for (let i = 1; i < items.length; i++) expect(items[i].distance_km).toBeGreaterThanOrEqual(items[i - 1].distance_km);
  });

  it('a clinic that moved (location updated) is found at its new place', async () => {
    const res = await get(`sort=distance&lat=${ME.lat}&lng=${ME.lng}&type=clinic&limit=5`);
    const moved = res.body.items.find((d: any) => d.id === 'moved');
    expect(moved.distance_km).toBeLessThan(5);
  });

  it('page 2 continues in distance order without repeats', async () => {
    const p1 = await get(`sort=distance&lat=${ME.lat}&lng=${ME.lng}&type=clinic&limit=5&page=1`);
    const p2 = await get(`sort=distance&lat=${ME.lat}&lng=${ME.lng}&type=clinic&limit=5&page=2`);
    expect(p2.status).toBe(200);
    const a: any[] = p1.body.items; const b: any[] = p2.body.items;
    expect(b.length).toBe(5);
    expect(b.filter((d) => a.some((x) => x.id === d.id))).toEqual([]);
    expect(b[0].distance_km).toBeGreaterThanOrEqual(a[a.length - 1].distance_km);
  });

  it('home visits: type=home_visit keeps only doctors who visit, nearest first', async () => {
    const res = await get(`sort=distance&lat=${ME.lat}&lng=${ME.lng}&type=home_visit&limit=5`);
    expect(res.status).toBe(200);
    const ids = res.body.items.map((d: any) => d.id);
    expect(ids.slice(0, 2)).toEqual(['jed-1', 'jed-3']);
    expect(ids).not.toContain('jed-2');
  });

  it('nearest does not apply to video: type=video&sort=distance -> 400', async () => {
    const res = await get(`sort=distance&lat=${ME.lat}&lng=${ME.lng}&type=video`);
    expect(res.status).toBe(400);
  });

  it('out-of-range coordinates -> 400', async () => {
    expect((await get('sort=distance&lat=123&lng=39.1&type=clinic')).status).toBe(400);
    expect((await get('sort=distance&lat=21.5&lng=-200&type=clinic')).status).toBe(400);
  });

  it('no location, signed-in patient: falls back to the patient\'s city', async () => {
    const res = await get('sort=distance&type=clinic&limit=50', patientToken('pat-jed'));
    expect(res.status).toBe(200);
    const items: any[] = res.body.items;
    expect(items.length).toBeGreaterThan(0);
    for (const d of items) {
      expect(d.city).toBe('Jeddah');
      expect(d.distance_km ?? null).toBeNull();
    }
    expect(items.map((d) => d.id)).toEqual(expect.arrayContaining(['jed-1', 'jed-2', 'jed-3', 'jed-nopoint', 'moved']));
    expect(items.map((d) => d.id)).not.toContain('jed-pending');
  });

  it('no location and nothing to fall back on -> 400 (anonymous, or a patient without a city)', async () => {
    expect((await get('sort=distance&type=clinic')).status).toBe(400);
    expect((await get('sort=distance&type=clinic', patientToken('pat-nocity'))).status).toBe(400);
  });
});
