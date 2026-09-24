/**
 * Gate P2: provider onboarding journey end-to-end (pharmacy + doctor + lab + nurse).
 * start → step2 → step3 → submit → admin approve → /provider/auth/login →
 * /provider/me + /provider/kyc/documents + /provider/profile/availability = 200.
 * Suspend → login 403. Reactivate → login 200.
 *
 * REAL services + REAL guards + REAL bcrypt/JWT over HTTP; only persistence is
 * faked (in-memory FakeDb shared across repositories and raw collections, with
 * $set/$inc/$push semantics), plus stubbed bus/events/seo/contracts/otp.
 */
import { INestApplication, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventBusService } from '../../src/modules/events/event-bus.service';
import { AutoEntitySeoPipelineService } from '../../src/modules/events/auto-entity-seo-pipeline.service';
import { ContractPdfService } from '../../src/modules/provider-onboarding/contract-pdf.service';
import { StorageService } from '../../src/modules/storage/storage.module';
import { ProviderOtpService } from '../../src/modules/provider/services/provider-otp.service';
import { ProviderImageProcessorService } from '../../src/modules/provider/services/provider-image-processor.service';
import { JwtAuthGuard } from '../../src/common/auth.guard';
import { WriteGuard } from '../../src/common/write-guard';
import { ImpersonationSessionService } from '../../src/common/impersonation-session.service';
import { ProviderOnboardingController } from '../../src/modules/provider-onboarding/provider-onboarding.module';
import { ProviderOnboardingService } from '../../src/modules/provider-onboarding/provider-onboarding.module';
import { ProviderAdminController } from '../../src/modules/provider/provider.controllers';
import { ProviderAdminService } from '../../src/modules/provider/services/provider-admin.service';
import { ProviderAuthController } from '../../src/modules/provider/provider.controllers';
import { ProviderAuthService } from '../../src/modules/provider/services/provider-auth.service';
import { ProviderProfileController } from '../../src/modules/provider/provider.controllers';
import { ProviderProfileService } from '../../src/modules/provider/services/provider-profile.service';
import { ProviderDashboardController } from '../../src/modules/provider/provider.controllers';
import { ProviderDashboardService } from '../../src/modules/provider/services/provider-dashboard.service';
import { ProviderSeedService } from '../../src/modules/provider/services/provider-seed.service';
import { ProviderProductionController } from '../../src/modules/provider-production/provider-production.module';
import { ProviderProductionService } from '../../src/modules/provider-production/provider-production.module';
import { TEST_JWT_SECRET, signToken, tokenFor } from '../security/harness';
import request from 'supertest';

jest.setTimeout(180_000);

// ---------- minimal in-memory mongo ---------- */
let seq = 0;
const uid = (p: string) => `${p || 'id'}-${Date.now()}-${seq++}`;

function matches(doc: any, filter: any): boolean {
  if (!filter || !Object.keys(filter).length) return true;
  for (const [k, v] of Object.entries(filter)) {
    if (k === '$or') {
      if (!(v as any[]).some((c) => matches(doc, c))) return false;
      continue;
    }
    const dv = doc?.[k];
    if (v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof RegExp)) {
      const ops = v as any;
      if ('$in' in ops) { if (!ops.$in.some((x: any) => String(x) === String(dv))) return false; continue; }
      if ('$ne' in ops) { if (String(dv) === String(ops.$ne)) return false; continue; }
      if ('$exists' in ops) { if (!!ops.$exists !== (dv !== undefined)) return false; continue; }
      if ('$regex' in ops) { if (!new RegExp(ops.$regex, ops.$options || '').test(String(dv ?? ''))) return false; continue; }
      if (JSON.stringify(dv) !== JSON.stringify(v)) return false;
      continue;
    }
    if (v instanceof RegExp) { if (!v.test(String(dv ?? ''))) return false; continue; }
    if (String(dv ?? '__undef__') !== String((v as any) ?? '__undef__')) return false;
  }
  return true;
}

function applyUpdate(doc: any, update: any) {
  for (const [op, fields] of Object.entries(update || {})) {
    if (op === '$set') for (const [k, v] of Object.entries(fields as any)) doc[k] = v;
    else if (op === '$inc') for (const [k, v] of Object.entries(fields as any)) doc[k] = Number(doc[k] || 0) + Number(v);
    else if (op === '$push') for (const [k, v] of Object.entries(fields as any)) { (doc[k] = doc[k] || []).push(v); }
    else if (op === '$setOnInsert') { /* updateOne path never inserts */ }
  }
}

class FakeDoc {
  [k: string]: any;
  constructor(private store: Map<string, any>, data: any) { Object.assign(this, data); }
  async save() { this.store.set(this.id, this); return this; }
  toObject() { const { store, ...rest } = this as any; return { ...rest }; }
  markModified() {}
}

class FakeQuery {
  constructor(protected docs: any[]) {}
  protected plainOne() {
    const d = this.docs[0];
    if (!d) return null;
    const { save, toObject, markModified, ...rest } = d;
    return { ...rest };
  }
  lean() { return Promise.resolve(this.plainOne()); }
  exec() { return Promise.resolve(this.docs[0] || null); }
  sort() { return this; }
  limit() { return this; }
  toArray() { return this.lean(); }
  then(res: any, rej?: any) { return Promise.resolve(this.docs[0] || null).then(res, rej); }
  catch(rej: any) { return Promise.resolve(this.docs[0] || null).catch(rej); }
}

class FakeMany extends FakeQuery {
  lean() {
    return Promise.resolve(
      this.docs.map((d) => {
        const { save, toObject, markModified, ...rest } = d || {};
        return d ? { ...rest } : d;
      }),
    );
  }
  then(res: any, rej?: any) { return Promise.resolve(this.docs).then(res, rej); }
}

class FakeCollection {
  store = new Map<string, any>();
  constructor(public name: string) {}
  private all() { return [...this.store.values()]; }
  findOne(filter: any) { return new FakeQuery([this.all().find((d) => matches(d, filter))].filter(Boolean)); }
  find(filter: any) { return new FakeMany(this.all().filter((d) => matches(d, filter))); }
  async insertOne(doc: any) {
    const d = new FakeDoc(this.store, { id: doc.id || uid(this.name), ...doc });
    this.store.set(d.id, d);
    return { acknowledged: true, insertedId: d.id };
  }
  async create(data: any) {
    const d = new FakeDoc(this.store, { id: data.id || uid(this.name), ...data });
    this.store.set(d.id, d);
    return d;
  }
  async updateOne(filter: any, update: any) {
    const d = this.all().find((x) => matches(x, filter));
    if (!d) return { acknowledged: true, matchedCount: 0, modifiedCount: 0 };
    applyUpdate(d, update);
    return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
  }
  async updateMany(filter: any, update: any) {
    let n = 0;
    for (const d of this.all().filter((x) => matches(x, filter))) { applyUpdate(d, update); n++; }
    return { acknowledged: true, matchedCount: n, modifiedCount: n };
  }
  async countDocuments(filter: any = {}) { return this.all().filter((d) => matches(d, filter)).length; }
  async deleteOne(filter: any) {
    const d = this.all().find((x) => matches(x, filter));
    if (d) this.store.delete(d.id);
    return { acknowledged: true, deletedCount: d ? 1 : 0 };
  }
}

function makeDb() {
  const cols = new Map<string, FakeCollection>();
  const collection = (name: string) => {
    if (!cols.has(name)) cols.set(name, new FakeCollection(name));
    return cols.get(name)!;
  };
  const model = (name: string) => {
    const c = collection(name);
    return {
      findOne: (f: any) => c.findOne(f),
      find: (f: any) => c.find(f),
      create: (d: any) => c.create(d),
      updateOne: (f: any, u: any) => c.updateOne(f, u),
      updateMany: (f: any, u: any) => c.updateMany(f, u),
      countDocuments: (f: any) => c.countDocuments(f),
      db: { collection },
    };
  };
  return { collection, model };
}

describe('Gate P2 provider onboarding journeys', () => {
  let app: INestApplication;
  const post = (url: string, token: string, body: any = {}) =>
    request(app.getHttpServer()).post(url).set('Authorization', `Bearer ${token}`).send(body);
  const get = (url: string, token: string) =>
    request(app.getHttpServer()).get(url).set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    process.env.JWT_SECRET = TEST_JWT_SECRET;
    const db = makeDb();
    const repo = (name: string) => {
      const m = db.model(name);
      return { findOne: m.findOne, find: m.find, create: m.create, updateOne: m.updateOne, updateMany: m.updateMany, countDocuments: m.countDocuments, model: m };
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [
        ProviderOnboardingController,
        ProviderAdminController,
        ProviderAuthController,
        ProviderProfileController,
        ProviderProductionController,
        ProviderDashboardController,
      ],
      providers: [
        ProviderOnboardingService,
        ProviderAdminService,
        ProviderAuthService,
        ProviderProfileService,
        ProviderProductionService,
        ProviderDashboardService,
        { provide: ProviderSeedService, useValue: {} },
        { provide: getModelToken('User'), useValue: db.model('users') },
        { provide: getModelToken('ProviderProfile'), useValue: db.model('provider_profiles') },
        { provide: 'UserRepository', useValue: repo('users') },
        { provide: 'PatientProfileRepository', useValue: repo('patient_profiles') },
        { provide: 'ProviderAccountRepository', useValue: repo('provider_accounts') },
        { provide: 'ProviderAccountProfileRepository', useValue: repo('provider_account_profiles') },
        { provide: 'ProviderDocumentRepository', useValue: repo('provider_documents') },
        { provide: 'ProviderBankAccountRepository', useValue: repo('provider_bank_accounts') },
        { provide: 'ProviderAuditLogRepository', useValue: repo('provider_audit_logs') },
        { provide: 'ProviderSessionRepository', useValue: repo('provider_sessions') },
        { provide: 'ProviderRequestRepository', useValue: repo('provider_requests') },
        { provide: 'ProviderAvailabilityRepository', useValue: repo('provider_availability') },
        { provide: ProviderImageProcessorService, useValue: {} },
        { provide: JwtService, useValue: new JwtService({ secret: TEST_JWT_SECRET }) },
        { provide: EventBusService, useValue: { emit: () => Promise.resolve() } },
        { provide: EventEmitter2, useValue: { emit: () => ({}) } },
        { provide: AutoEntitySeoPipelineService, useValue: { processEntity: async () => ({}) } },
        { provide: ContractPdfService, useValue: { generate: async () => ({ pdf: Buffer.from('fake-pdf'), sha256: 'abc123' }) } },
        { provide: StorageService, useValue: {} },
        { provide: ProviderOtpService, useValue: {} },
        Reflector,
        { provide: getConnectionToken(), useValue: { collection: (n: string) => db.collection(n), model: () => null } },
        { provide: ImpersonationSessionService, useValue: {} },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: WriteGuard },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    await app.init();
  });
  afterAll(async () => { await app?.close(); });

  const legs = [
    { type: 'pharmacy', email: 'jphp@example.test', phone: '+966511111111', step3: { pharmacy_type: 'retail' } },
    { type: 'doctor', email: 'jdoc@example.test', phone: '+966522222222', step3: { specialty: 'general_medicine' } },
    { type: 'lab', email: 'jlab@example.test', phone: '+966533333333', step3: { lab_category: 'general' } },
    { type: 'nursing', email: 'jnurse@example.test', phone: '+966544444444', step3: {} },
  ];

  for (const leg of legs) {
    describe(`onboarding journey (${leg.type})`, () => {
      let userId = '';
      let guest = '';
      let providerToken = '';
      const admin = tokenFor('admin-1', 'admin');

      it('start → step2 → step3 → submit', async () => {
        const s = await post('/api/v1/provider-onboarding/start', '', {
          phone: leg.phone, password: 'Secret123', full_name: 'Journey User', email: leg.email, type: leg.type,
        });
        expect([200, 201]).toContain(s.status);
        userId = s.body.user_id;
        expect(userId).toBeTruthy();
        guest = signToken({ id: userId, role: 'guest' });
        await post('/api/v1/provider-onboarding/step2', guest, { name_ar: 'اسم', city: 'الرياض' }).expect(201);
        await post('/api/v1/provider-onboarding/step3', guest, leg.step3).expect(201);
        const sub = await post('/api/v1/provider-onboarding/submit', guest, { signer_name: 'S', signer_role: 'owner' });
        expect([200, 201]).toContain(sub.status);
      });

      it('admin approve → login → me/kyc/availability = 200', async () => {
        // P2.1: account id === user id.
        const ap = await post(`/api/v1/admin/providers/${userId}/approve`, admin, {});
        if (ap.status !== 201) console.log('APPROVE-BODY', ap.status, JSON.stringify(ap.body).slice(0, 300));
        expect([200, 201]).toContain(ap.status);
        const login = await post('/api/v1/provider/auth/login', '', { email: leg.email, password: 'Secret123' });
        expect([200, 201]).toContain(login.status);
        providerToken = login.body.access_token;
        expect(providerToken).toBeTruthy();
        await get('/api/v1/provider/me', providerToken).expect(200);
        await get('/api/v1/provider/kyc/documents', providerToken).expect(200);
        await get('/api/v1/provider/profile/availability', providerToken).expect(200);
      });

      it('suspend → login 403; reactivate → login 200', async () => {
        await post(`/api/v1/admin/providers/${userId}/suspend`, admin, { reason: 'audit' }).expect(201);
        await post('/api/v1/provider/auth/login', '', { email: leg.email, password: 'Secret123' }).expect(403);
        await post(`/api/v1/admin/providers/${userId}/reactivate`, admin, {}).expect(201);
        const back = await post('/api/v1/provider/auth/login', '', { email: leg.email, password: 'Secret123' });
        expect([200, 201]).toContain(back.status);
      });
    });
  }
});
