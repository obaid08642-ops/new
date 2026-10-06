// ACCEPTANCE — Q-13 "Available now" (owner feature, docs/review/OPENCODE_QUEUE.md Queue A). Written
// by the reviewer before the work; the implementing agent makes it pass and may not edit it.
//
// Depends on the ONE shared availability function (Q37, modules/care/availability.ts, PR #306):
// the 5-minute buffer after bookings, other patients' slot holds and approved leave apply here
// exactly as they do for the slot list and for booking. Implement it on top of that function.
//
// Required behaviour of GET /api/v1/care/doctors?available_within=<minutes>&type=clinic|video|home_visit
// (real controller, real guards, production ValidationPipe, real CareService / SlotService, Mongo):
//   - Returns only doctors with a free slot STARTING within the next <minutes> for that mode
//     (schedule, approved leave, bookings + buffer, other patients' active holds), nearest
//     start first. Each item carries `next_slot_at` (ISO) inside the window.
//   - type=video: a doctor whose online switch is on (what the provider app's online toggle
//     writes: provider_availability.status = 'accepting_orders' for the doctor's account) counts
//     even without a free scheduled slot; `next_slot_at` is then "now". Off switch: slots only.
//     The online switch never counts for clinic or home_visit.
//   - available_within must be a positive whole number of minutes; otherwise 400.
//   - Non-public doctors never appear.
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
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

const MIN = 60_000;
const HOUR = 60 * MIN;
// Open all day, every day (00:00 -> 00:00 is the overnight form: a full 24 h window).
const ALL_DAY = [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, open: '00:00', close: '00:00' }));

describe('Q-13: available now', () => {
  let mongo: MongoMemoryServer;
  let app: INestApplication;
  let conn: Connection;
  const t0 = Date.now();

  const pub = { type: 'doctor', status: 'active', public_eligibility: true, medical_review_status: 'approved', specialty: 'general', working_hours: ALL_DAY };
  const doc = (id: string, modes: string[], extra: Record<string, unknown> = {}) =>
    ({ ...pub, id, user_id: `acc-${id}`, account_id: `acc-${id}`, name_ar: id, consultation_modes: modes, ...extra });
  const booking = (doctor: string, from: number, to: number) => ({
    id: `ap-${doctor}-${from}`, doctor_id: doctor, patient_id: 'p-x', status: 'CONFIRMED',
    slot_start: new Date(from), slot_end: new Date(to), duration_minutes: Math.round((to - from) / MIN),
  });
  const get = (qs: string) => request(app.getHttpServer()).get(`/api/v1/care/doctors?${qs}&limit=50`);
  const ids = (res: request.Response) => (res.body.items as any[]).map((d) => d.id);

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    process.env.JWT_SECRET = 'q13-acceptance-secret';
    const moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongo.getUri(), { dbName: 'q13' }),
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
        { provide: JwtService, useValue: new JwtService({ secret: 'q13-acceptance-secret' }) },
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

    await conn.collection('provider_profiles').insertMany([
      doc('free', ['clinic', 'video', 'home']),                 // nothing booked
      doc('booked', ['clinic']),                                // one booking covers the next 3 hours
      doc('held', ['clinic']),                                  // another patient holds the next 3 hours
      doc('on-leave', ['clinic']),                              // approved leave today and tomorrow
      doc('later', ['clinic']),                                 // booked until now+90 min: free only after the buffer
      doc('vid-online', ['video']),                             // fully booked, online switch ON
      doc('vid-offline', ['video']),                            // fully booked, online switch OFF
      doc('clinic-online', ['clinic']),                         // fully booked, switch ON (does not count for clinic)
      doc('hidden', ['clinic', 'video'], { status: 'pending' }), // not public
    ]);
    await conn.collection('appointments').insertMany([
      booking('booked', t0 - HOUR, t0 + 3 * HOUR),
      booking('later', t0 - 30 * MIN, t0 + 90 * MIN),
      booking('vid-online', t0 - HOUR, t0 + 3 * HOUR),
      booking('vid-offline', t0 - HOUR, t0 + 3 * HOUR),
      booking('clinic-online', t0 - HOUR, t0 + 3 * HOUR),
    ]);
    await conn.collection('slotlocks').insertOne({
      id: 'h-held', provider_id: 'held', patient_id: 'p-other', booking_kind: 'consultation',
      slot_start: new Date(t0 - 10 * MIN), slot_end: new Date(t0 + 3 * HOUR), status: 'held', expires_at: new Date(t0 + HOUR),
    });
    await conn.collection('leaverequests').insertOne({
      provider_account_id: 'acc-on-leave', status: 'approved', type: 'annual',
      start_date: new Date(t0 - 24 * HOUR), end_date: new Date(t0 + 48 * HOUR),
    });
    // Exactly what the provider app's online toggle writes (ProviderOpsService.toggleInstantAvailability).
    for (const [id, on] of [['vid-online', true], ['vid-offline', false], ['clinic-online', true]] as const) {
      await conn.collection('provideravailability').insertOne({ id: `availability_acc-${id}`, provider_id: `acc-${id}`, provider_type: 'doctor', instant_available: on, createdAt: new Date(), updatedAt: new Date() });
      await conn.collection('provider_availability').insertOne({
        provider_account_id: `acc-${id}`, status: on ? 'accepting_orders' : 'offline',
        ...(on ? { last_online_at: new Date() } : { last_offline_at: new Date() }), createdAt: new Date(), updatedAt: new Date(),
      });
    }
  });
  afterAll(async () => { await app?.close(); await mongo?.stop(); });

  it('clinic within 60 min: only doctors with a free slot starting in the window', async () => {
    const res = await get('available_within=60&type=clinic');
    expect(res.status).toBe(200);
    const got = ids(res);
    expect(got).toContain('free');
    for (const out of ['booked', 'held', 'on-leave', 'later', 'clinic-online', 'hidden', 'vid-online']) expect(got).not.toContain(out);
  });

  it('every item carries next_slot_at inside the window, nearest first', async () => {
    const asked = Date.now();
    const res = await get('available_within=60&type=clinic');
    const items: any[] = res.body.items;
    expect(items.length).toBeGreaterThan(0);
    for (const d of items) {
      const at = Date.parse(d.next_slot_at);
      expect(Number.isFinite(at)).toBe(true);
      expect(at).toBeGreaterThanOrEqual(asked - MIN);
      expect(at).toBeLessThanOrEqual(asked + 60 * MIN + MIN);
    }
    for (let i = 1; i < items.length; i++) expect(Date.parse(items[i].next_slot_at)).toBeGreaterThanOrEqual(Date.parse(items[i - 1].next_slot_at));
  });

  it('a wider window finds the doctor who is free after the booking and its 5-minute buffer', async () => {
    const asked = Date.now();
    const res = await get('available_within=150&type=clinic');
    const later = (res.body.items as any[]).find((d) => d.id === 'later');
    expect(later).toBeDefined();
    expect(Date.parse(later.next_slot_at)).toBeGreaterThanOrEqual(t0 + 95 * MIN);
    expect(Date.parse(later.next_slot_at)).toBeLessThanOrEqual(asked + 150 * MIN + MIN);
    // the held and booked doctors stay out: their next free start is after 3 hours
    expect(ids(res)).not.toContain('held');
    expect(ids(res)).not.toContain('booked');
  });

  it('video: an online, accepting doctor counts even without a free slot, next_slot_at = now', async () => {
    const asked = Date.now();
    const res = await get('available_within=15&type=video');
    expect(res.status).toBe(200);
    const got = ids(res);
    expect(got).toContain('vid-online');
    expect(got).not.toContain('vid-offline');
    expect(got).not.toContain('clinic-online'); // no video mode
    expect(got).not.toContain('hidden');
    const online = (res.body.items as any[]).find((d) => d.id === 'vid-online');
    expect(Math.abs(Date.parse(online.next_slot_at) - asked)).toBeLessThanOrEqual(2 * MIN);
  });

  it('video by schedule: a free video slot within the window counts too', async () => {
    expect(ids(await get('available_within=60&type=video'))).toContain('free');
  });

  it('home_visit uses the home schedule and bookings', async () => {
    const got = ids(await get('available_within=60&type=home_visit'));
    expect(got).toContain('free');
    expect(got).not.toContain('booked');
    expect(got).not.toContain('vid-online');
  });

  it('available_within must be a positive whole number of minutes', async () => {
    for (const bad of ['0', '-15', 'abc', '7.5']) {
      expect((await get(`available_within=${bad}&type=clinic`)).status).toBe(400);
    }
  });
});
