/**
 * Findings from running Gate P3 live (wsweep on a real Mongo), 2026-09-26.
 */
import { ValidationPipe } from '@nestjs/common';
import { AddAddressDto, UpdateAddressDto } from '../modules/users/users.addresses.dto';
import { loadTestBypass } from '../modules/api-security/api-security.module';

const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const errors = async (dto: any, body: unknown): Promise<string[]> => {
  try { await pipe.transform(body, { type: 'body', metatype: dto }); return []; } catch (e: any) { return e.getResponse().message; }
};

describe('Gate P3 live: patient-web address form payload', () => {
  const web = { label: 'المنزل', line1: 'شارع العليا', line2: 'مبنى 5', city: 'الرياض', district: 'العليا', region: 'الرياض', notes: 'بجوار الصيدلية' };
  it('create accepts the web form fields', async () => expect(await errors(AddAddressDto, web)).toEqual([]));
  it('update accepts the web form fields', async () => expect(await errors(UpdateAddressDto, web)).toEqual([]));
});

describe('Gate P3 live: rate-limit bypass header', () => {
  const saved = { ...process.env };
  afterEach(() => { process.env = { ...saved }; });
  const req = (v: string) => ({ headers: { 'x-bypass-rate-limit': v } }) as any;
  it('the old fixed header value never bypasses', () => {
    delete process.env.LOAD_TEST_BYPASS_TOKEN; process.env.NODE_ENV = 'development';
    expect(loadTestBypass(req('nabd-load-test'))).toBe(false);
  });
  it('never bypasses in production, even with the configured secret', () => {
    process.env.LOAD_TEST_BYPASS_TOKEN = 's3cret-load'; process.env.NODE_ENV = 'production';
    expect(loadTestBypass(req('s3cret-load'))).toBe(false);
  });
  it('non-production load tests can bypass only with the configured secret', () => {
    process.env.LOAD_TEST_BYPASS_TOKEN = 's3cret-load'; process.env.NODE_ENV = 'staging';
    expect(loadTestBypass(req('s3cret-load'))).toBe(true);
    expect(loadTestBypass(req('wrong'))).toBe(false);
  });
});

import { BadRequestException, ForbiddenException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { UsersAddressesController } from '../modules/users/users.addresses.controller';
import { UsersInsuranceController } from '../modules/users/users.insurance.controller';
import { LegalService } from '../modules/legal/legal.module';
import { PharmacyShortageService } from '../modules/pharmacy/services/pharmacy-shortage.service';
import { MoyasarService } from '../modules/moyasar/moyasar.module';
import { ProviderProfileController, ProviderScoreController } from '../modules/provider/provider.controllers';

describe('Gate P3 live: empty bodies do not create records', () => {
  const users: any = { getPatientProfile: async () => ({ addresses: [], insurance: {} }), updatePatientProfile: async () => ({}) };
  it('address needs a street/line1 or coordinates', async () => {
    const c = new UsersAddressesController(users);
    await expect(c.addAddress('p1', {} as any)).rejects.toBeInstanceOf(BadRequestException);
    await expect(c.addAddress('p1', { label: 'المنزل' } as any)).rejects.toBeInstanceOf(BadRequestException);
    await expect(c.addAddress('p1', { line1: 'شارع العليا' } as any)).resolves.toBeDefined();
    await expect(c.addAddress('p1', { lat: 24.7, lng: 46.6 } as any)).resolves.toBeDefined();
  });
  it('insurance needs a company or policy/member number', async () => {
    const c = new UsersInsuranceController(users);
    await expect(c.updateInsurance('p1', {} as any)).rejects.toBeInstanceOf(BadRequestException);
    await expect(c.updateInsurance('p1', { provider: 'bupa', policy_number: 'P-1' } as any)).resolves.toBeDefined();
  });
  it('a new legal policy needs Arabic content and a slug key', async () => {
    const col: any = { findOne: async () => null, insertOne: async () => ({}), updateOne: async () => ({}) };
    const svc = new LegalService({ collection: () => col } as any, {} as any);
    await expect(svc.upsertPolicy('a', 'privacy_policy', {})).rejects.toThrow('policy_content_required');
    await expect(svc.upsertPolicy('a', '00000000-0000-0000-0000-000000000000', { content_ar: 'نص' })).resolves.toBeDefined();
    await expect(svc.upsertPolicy('a', 'Bad Key!', { content_ar: 'نص' })).rejects.toThrow('policy_key_invalid');
  });
  it('a pharmacy shortage flag needs an identified medicine', async () => {
    const svc = new PharmacyShortageService({ create: async (d: any) => d } as any, {} as any, {} as any, {} as any);
    await expect(svc.reportByPharmacy({ id: 'ph', role: 'pharmacy' }, {})).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('Gate P3 live: Moyasar without a key fails closed in production', () => {
  const saved = { ...process.env };
  afterEach(() => { process.env = { ...saved }; });
  const make = () => {
    delete process.env.MOYASAR_API_KEY; delete process.env.MOYASAR_SECRET_KEY; delete process.env.MOYASAR_SECRET;
    const payment: any = { status: 'paid', amount: 100, save: jest.fn() };
    const model: any = { findOne: async () => payment };
    return { svc: new MoyasarService(model, {} as any, { emit: () => true } as any), payment };
  };
  it('refund in production: 503, and the payment is NOT marked refunded', async () => {
    process.env.NODE_ENV = 'production';
    const { svc, payment } = make();
    await expect(svc.refundPayment('pay_live_123', 50)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(payment.status).toBe('paid');
    expect(payment.save).not.toHaveBeenCalled();
  });
  it('refund outside production keeps the sandbox behavior', async () => {
    process.env.NODE_ENV = 'development';
    const { svc, payment } = make();
    await expect(svc.refundPayment('sandbox_1', 50)).resolves.toEqual({ ok: true, sandbox: true });
    expect(payment.status).toBe('refunded');
  });
});

describe('Gate P3 live: provider-only routes', () => {
  it('a patient cannot submit a provider settings delta or recompute a score', async () => {
    const svc: any = { submitDelta: jest.fn(), recompute: jest.fn() };
    const patient = { id: 'p1', role: 'patient' };
    await expect(new ProviderProfileController(svc, {} as any).submitDelta(patient, {} as any)).rejects.toBeInstanceOf(ForbiddenException);
    expect(() => new ProviderScoreController(svc).recompute(patient)).toThrow(ForbiddenException);
    expect(svc.submitDelta).not.toHaveBeenCalled();
    expect(svc.recompute).not.toHaveBeenCalled();
  });
});

// ── Client payloads that the Phase 3 DTOs rejected (found by resolving zod/useState bodies in dtocheck) ──
import { CheckoutDto } from '../modules/cart/cart.dto';
import { RcDto } from '../modules/health/health.dto';
import { SavePolicyDto } from '../modules/insurance-engine/insurance-engine.dto';
import { CreateBookingDto } from '../modules/home-care-compat/home-care-compat.dto';
import { HomeCareCompatController } from '../modules/home-care-compat/home-care-compat.module';
import mongoose from 'mongoose';
import { PatientProfileSchema } from '../schemas/patient-profile.schema';

describe('Gate P3 live: client payloads accepted by the DTOs', () => {
  it('patient-web checkout sends cash:true instead of payment_method_id', async () =>
    expect(await errors(CheckoutDto, { address_id: 'a1', cash: true, coupon_code: 'X' })).toEqual([]));
  it('patient-app reminder form (times, time_zone, counts) is accepted', async () =>
    expect(await errors(RcDto, { medicine_name_ar: 'بنادول', dose: '1', dosage_count: 1, times: ['08:00'], time_zone: 'Asia/Riyadh', frequency: 'daily', duration_days: 30, chronic: false, pills_remaining: 20, refill_date: '2026-10-01' })).toEqual([]));
  it('patient-web reminder form is accepted', async () =>
    expect(await errors(RcDto, { medicine_name_ar: 'بنادول', dose: '1', times: ['08:00'], time_zone: 'Asia/Riyadh', frequency: 'daily', chronic: false, instructions_ar: '', active: true })).toEqual([]));
  it('patient-web insurance policy sends member_id', async () =>
    expect(await errors(SavePolicyDto, { company_id: 'c1', policy_number: 'P1', member_id: 'M1', member_name: 'x', expiry_date: '2027-01-01' })).toEqual([]));
  it('patient-web nursing booking sends address_id and notes', async () =>
    expect(await errors(CreateBookingDto, { service_id: 's1', scheduled_at: '2027-01-01T10:00:00Z', address_id: 'a1', notes: 'الدور 2', payment_method: 'cash' })).toEqual([]));
});

describe('Gate P3 live: the accepted fields are stored, not dropped', () => {
  it('the saved insurance policy (insurance-engine save-policy) keeps the insurer and member id', () => {
    const Model = mongoose.models.GateP3Patient || mongoose.model('GateP3Patient', PatientProfileSchema);
    const policy = { company_id: 'c1', company_name: 'تأمين', plan_class: 'A', member_id: 'M1', policy_number: 'P1', card_image_url: 'https://x/c.png', saved_at: new Date() };
    const ins = (new Model({ user_id: 'u1', insurance: policy }).toObject() as any).insurance;
    expect(ins).toMatchObject({ company_id: 'c1', company_name: 'تأمين', plan_class: 'A', member_id: 'M1', policy_number: 'P1' });
  });

  it('web address fields survive the schema and street/line1 are mirrored for both clients', async () => {
    const Model = mongoose.models.GateP3Patient || mongoose.model('GateP3Patient', PatientProfileSchema);
    const a = (new Model({ user_id: 'u1', addresses: [{ id: 'a', line1: 'L1', district: 'D', region: 'R', notes: 'N' }] }).toObject() as any).addresses[0];
    expect(a).toMatchObject({ line1: 'L1', district: 'D', region: 'R', notes: 'N' });
    let stored: any[] = [];
    const users: any = { getPatientProfile: async () => ({ addresses: [] }), updatePatientProfile: async (_: string, d: any) => { stored = d.addresses; } };
    await new UsersAddressesController(users).addAddress('u1', { line1: 'شارع العليا', city: 'الرياض' } as any);
    expect(stored[0]).toMatchObject({ street: 'شارع العليا', line1: 'شارع العليا' });
  });

  it('nursing booking resolves address_id to the caller\'s own saved address and keeps notes', async () => {
    let created: any;
    const bookings: any = { create: async (d: any) => { created = d; return { id: 'b1', toObject: () => d }; } };
    const services: any = { findOne: () => ({ lean: async () => ({ id: 's1', name_ar: 'تمريض', price: 100 }) }) };
    const conn: any = { collection: () => ({ findOne: async (q: any) => (q.user_id.$eq === 'p1' ? { addresses: [{ id: 'a1', line1: 'شارع', city: 'الرياض', lat: 24.7, lng: 46.6 }] } : null) }) };
    const c = new (HomeCareCompatController as any)(bookings, services, {} as any, {} as any, undefined, conn);
    await c.createBooking({ id: 'p1', role: 'patient' }, { service_id: 's1', scheduled_at: '2027-01-01T10:00:00Z', address_id: 'a1', notes: ' الدور 2 ' } as any);
    expect(created.address).toMatchObject({ address: 'شارع', city: 'الرياض', lat: 24.7 });
    expect(created.notes).toBe('الدور 2');
    await expect(c.createBooking({ id: 'p2', role: 'patient' }, { service_id: 's1', scheduled_at: '2027-01-01T10:00:00Z', address_id: 'a1' } as any)).rejects.toThrow('address_not_found');
  });
});

describe('Gate P3 live: patient profile collection name', () => {
  it("no code reads the non-existent 'patientprofiles' collection (the schema is patient_profiles)", () => {
    const { execSync } = require('child_process');
    const hits = execSync("grep -rln \"collection('patientprofiles')\" src --include=*.ts --exclude=*.spec.ts || true", { cwd: require('path').resolve(__dirname, '../..') }).toString().trim();
    expect(hits).toBe('');
  });
});
