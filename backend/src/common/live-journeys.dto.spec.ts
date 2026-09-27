/**
 * Client payloads the live journeys (tools/live) showed being rejected by the ValidationPipe,
 * copied from the app code that sends them. Each case was a 400 before its DTO fix.
 */
import { ValidationPipe } from '@nestjs/common';
import { Step2Dto, Step3Dto } from '../modules/provider-onboarding/provider-onboarding.dto';
import { CompleteDto, PutHoursDto, ScheduleSettingsDto } from '../modules/provider-ops/provider-ops.dto';
import { CreateCarePlanDto } from '../modules/home-care-compat/home-care-compat.dto';
import { CreateNoteDto } from '../modules/home-care/home-care.dto';
import { CreateDto as PharmacyOrderCreateDto } from '../modules/pharmacy/pharmacy.controllers.dto';

const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const errors = async (dto: any, body: unknown): Promise<string[]> => {
  try { await pipe.transform(body, { type: 'body', metatype: dto }); return []; } catch (e: any) { return e.getResponse().message; }
};
const hours = [{ day: 'sunday', open: '09:00', close: '23:00', open_evening: null, close_evening: null, closed: false }];

describe('live journeys: provider registration wizard payloads', () => {
  it('pharmacy step3 (PharmacyRegistration.tsx)', async () => expect(await errors(Step3Dto, {
    has_own_drivers: true, has_own_delivery: true, delivery_radius_km: 10, delivery_fee: 15, free_delivery_above: 200, min_order_sar: 30,
    express_delivery: false, express_fee: 0, express_minutes: 0, working_hours: hours, accepts_insurance: true, accepted_insurance: ['bupa'],
    insurance_plans: { bupa: ['gold'] }, accepts_cash: true, rx_dispensing: true, otc_selling: true, enabled_categories: ['otc'],
  })).toEqual([]));
  it('older pharmacy builds sending pharmacy_chain:false still pass (treated as absent)', async () =>
    expect(await errors(Step3Dto, { pharmacy_chain: false })).toEqual([]));
  it('pharmacy step2 with a text address (all screens send text)', async () =>
    expect(await errors(Step2Dto, { name_ar: 'ص', address: 'شارع العليا 12', location: { lat: 24.7, lng: 46.6 }, pharmacist_name: 'د', pharmacy_type: 'community' })).toEqual([]));
  it('doctor step3 schedules, transport flag, plan map', async () => expect(await errors(Step3Dto, {
    specialty: 'cardiology', consultation_modes: ['clinic', 'video'], home_transport_fee: true, home_transport_price: 20,
    schedule_clinic: [{ day: 'sun', open: '09:00', close: '17:00' }], schedule_video: [], schedule_home: [], working_hours: hours,
    insurance_plans: { tawuniya: ['a'] },
  })).toEqual([]));
  it('doctor step2 region', async () => expect(await errors(Step2Dto, { region: 'الرياض' })).toEqual([]));
  it('lab/radiology step3 price lists and home collection', async () => expect(await errors(Step3Dto, {
    test_prices: { cbc: 50 }, scan_prices: { xray: 120 }, home_collection_fee: 30, target_genders: 'all', working_hours: hours, schedule_home: [],
  })).toEqual([]));
  it('nursing step3 pricing model', async () => expect(await errors(Step3Dto, {
    pricingModel: ['visit', 'hour'], priceVisit: 150, priceHour: 60, priceDay: 400, priceMonth: 9000, insurance_plans: {},
  })).toEqual([]));
  it('facility rosters are objects', async () => expect(await errors(Step3Dto, {
    doctors_roster: [{ specialty: 'x', working_hours: [] }], pharmacy_roster: [{ name: 'y' }], lab_roster: [], radiology_roster: [], nursing_roster: [],
  })).toEqual([]));
});

describe('live journeys: provider operations payloads', () => {
  it('working hours: the whole week (RealScreens.tsx)', async () =>
    expect(await errors(PutHoursDto, { hours: [{ day: 'sunday', open: '08:00', close: '22:00', closed: false }] })).toEqual([]));
  it('working hours reject a bad time', async () =>
    expect((await errors(PutHoursDto, { hours: [{ day: 'sunday', open: '8am', close: '22:00' }] })).length).toBeGreaterThan(0));
  it('nursing shifts toggles', async () =>
    expect(await errors(ScheduleSettingsDto, { shifts: { morning: true, evening: true, night: false }, maxVisits: 8, emergencyReady: false })).toEqual([]));
  it('ambulance completion vitals', async () =>
    expect(await errors(CompleteDto, { summary: 's', outcome: 'Stable', vitals: { bp: '120/80', hr: '88', spo2: '97' } })).toEqual([]));
  it('care plan tasks are lines of text', async () =>
    expect(await errors(CreateCarePlanDto, { title: 't', tasks: ['قياس الضغط', 'تغيير الضماد'] })).toEqual([]));
  it('nursing note vitals object', async () =>
    expect(await errors(CreateNoteDto, { patient_id: 'p', booking_id: 'b', note: 'n', vitals: { bp: '120/80', pulse: '80', temp: '37', spo2: '98', glucose: '' } })).toEqual([]));
});

describe('live journeys: pharmacy order', () => {
  it('delivery address object with coordinates (pharmacy-draft.ts / checkout-flow.tsx)', async () => expect(await errors(PharmacyOrderCreateDto, {
    items: [{ raw_name: 'بنادول', qty: 2, sku: 'p', intake_source: 'cart' }],
    delivery_address: { label: 'المنزل', street: 'ش', city: 'الرياض', district: 'د', lat: 24.7, lng: 46.6, phone: '+966500000000' },
    prescription_attachments: [],
  })).toEqual([]));
});

// ── Fields the services write that strict schemas used to drop (tools/audit/schemadrift.js) ──
import mongoose from 'mongoose';
import { PharmacyOrderSchema } from '../modules/pharmacy/schemas/pharmacy.schema';
import { ReturnRequestSchema } from '../schemas/returns.schema';
import { PatientProfileSchema } from '../schemas/patient-profile.schema';
import { LoyaltyTransactionSchema } from '../schemas/loyalty.schemas';

describe('live journeys: written fields survive the schema', () => {
  const keep = (name: string, schema: any, doc: any) => {
    const M = mongoose.models[name] || mongoose.model(name, schema);
    return new M(doc).toObject() as any;
  };
  it('pharmacy order keeps quote acceptance, COD, payment method, insurance decision, courier', () => {
    const now = new Date();
    const o = keep('LJPharmacyOrder', PharmacyOrderSchema, { id: 'o', patient_account_id: 'p', quote_accepted_at: now, final_quote_idempotency_key: 'k1', cod_registered_at: now, cod_idempotency_key: 'k2', payment_method: 'cod', coverage_mode: 'cash', insurance_decision: { outcome: 'approved' }, delivery: { courier_name: 'c' } });
    expect(o).toMatchObject({ quote_accepted_at: now, cod_registered_at: now, payment_method: 'cod', coverage_mode: 'cash', insurance_decision: { outcome: 'approved' }, delivery: { courier_name: 'c' } });
  });
  it('return request keeps its items and condition flags', () => {
    const r = keep('LJReturn', ReturnRequestSchema, { patient_id: 'p', items: [{ sku: 's', qty: 1 }], is_opened: true, is_used: false });
    expect(r).toMatchObject({ items: [{ sku: 's', qty: 1 }], is_opened: true });
  });
  it('patient wishlist and loyalty expiry persist', () => {
    expect(keep('LJPatient', PatientProfileSchema, { user_id: 'u', wishlist: ['m1'] }).wishlist).toEqual(['m1']);
    const exp = new Date();
    expect(keep('LJLoyalty', LoyaltyTransactionSchema, { user_id: 'u', points_delta: 5, expires_at: exp, swept: true })).toMatchObject({ expires_at: exp, swept: true });
  });
});
