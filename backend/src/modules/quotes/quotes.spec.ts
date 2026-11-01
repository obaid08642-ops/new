import { BadRequestException } from '@nestjs/common';
import { buildQuote } from '../../common/quote';
import { consultationPricing } from '../care/consultation-pricing';
import { AppointmentsService } from '../care/appointments.service';
import { HomeCareSvc } from '../home-care/home-care.service';
import { QuotesController } from './quotes.module';

describe('buildQuote', () => {
  it('the total is the lines less the discount; VAT is inside it', () => {
    const q = buildQuote({ kind: 'x', lines: [{ key: 'a', amount: 100 }, { key: 'b', amount: 15 }], discount: 0, vat_rate: 0.15, allowed_methods: ['card'] });
    expect(q).toMatchObject({ total: 115, vat: 15, subtotal: 100, discount: 0, vat_rate: 0.15, currency: 'SAR' });
    expect(buildQuote({ kind: 'x', lines: [{ key: 'a', amount: 115 }], discount: 15, vat_rate: 0.15, allowed_methods: [] }).total).toBe(100);
  });
  it('subtotal + vat is always the total, rounded to halalas', () => {
    for (const total of [33.33, 99.99, 1, 250.5]) {
      const q = buildQuote({ kind: 'x', lines: [{ key: 'a', amount: total }], vat_rate: 0.15, allowed_methods: [] });
      expect(Math.round((q.subtotal + q.vat) * 100) / 100).toBe(q.total);
    }
  });
});

describe('consultationPricing is the one price the booking charges', () => {
  const doctor = { price_clinic: 150, price_online: 120, price_home: 200 };
  it('clinic and video: the price and the platform fee', () => {
    expect(consultationPricing(doctor, 'clinic')).toMatchObject({ price: 150, service_fee: 15, home_visit_fee: 0, transportation_fee: 0, total_price: 165 });
  });
  it('home: the home-visit and transport fees on top, the doctor\'s own when set', () => {
    expect(consultationPricing(doctor, 'home').total_price).toBe(200 + 15 + 100 + 50);
    expect(consultationPricing({ ...doctor, home_visit_fee: 80, home_transport_price: 20 }, 'home').total_price).toBe(200 + 15 + 80 + 20);
  });
  it('no price for the visit type is refused', () => {
    expect(() => consultationPricing({ price_clinic: 150 }, 'video')).toThrow(BadRequestException);
  });
});

describe('AppointmentsService.quote', () => {
  function svc(doctor: any, vat?: number) {
    const s = Object.create(AppointmentsService.prototype) as any;
    s.providerModel = { findOne: jest.fn(async () => doctor) };
    s.connection = { collection: () => ({ findOne: async () => (vat === undefined ? null : { tax: { vat_percent: vat } }) }) };
    return s as AppointmentsService;
  }
  const doctor = { id: 'd1', price_clinic: 150, price_home: 200, consultation_modes: ['clinic', 'home'] };

  it('states every line, VAT and the total a booking would charge', async () => {
    const q: any = await svc(doctor).quote('d1', 'home');
    expect(q.lines.map((l: any) => [l.key, l.amount])).toEqual([['consultation_fee', 200], ['platform_fee', 15], ['home_visit_fee', 100], ['transport_fee', 50]]);
    expect(q).toMatchObject({ kind: 'consultation', total: 365, vat: 47.61, subtotal: 317.39, allowed_methods: ['card', 'insurance'] });
    expect(q.total).toBe(consultationPricing(doctor, 'home').total_price);
  });
  it('clinic allows cash; the VAT rate is the finance config\'s', async () => {
    const q: any = await svc(doctor, 10).quote('d1', 'clinic');
    expect(q).toMatchObject({ total: 165, vat_rate: 0.1, allowed_methods: ['cash', 'card', 'insurance'] });
  });
  it('refuses a visit type the doctor does not offer, an unknown type, a missing or object doctor id', async () => {
    await expect(svc(doctor).quote('d1', 'video')).rejects.toThrow('does not support');
    await expect(svc(doctor).quote('d1', 'teleport')).rejects.toThrow('service_type_invalid');
    await expect(svc(doctor).quote({ $ne: 1 }, 'clinic')).rejects.toThrow('doctor_id_required');
    await expect(svc(null).quote('nobody', 'clinic')).rejects.toThrow('doctor_not_found');
  });
});

describe('HomeCareSvc.quote', () => {
  function svc(nursePrice: number | undefined, catalogue = 100) {
    const s = Object.create(HomeCareSvc.prototype) as any;
    const service = { id: 'n1', price: catalogue, booking_modes: undefined };
    s.svcModel = { findOne: jest.fn(async () => service), db: { collection: () => ({ find: () => ({ toArray: async () => (nursePrice === undefined ? [] : [{ account_id: 'nurse-1', nursing_services: [{ key: 'n1', price: nursePrice }] }]) }), findOne: async () => null }) } };
    return s as HomeCareSvc;
  }
  it('quotes the catalogue price for one visit, VAT inside, home-visit methods; the booking prices by the same function', async () => {
    const q: any = await svc(undefined, 100).quote({ service_id: 'n1' });
    expect(q).toMatchObject({ kind: 'nursing', total: 100, vat: 13.04, subtotal: 86.96, sessions_count: 1, provider_id: null, allowed_methods: ['card', 'insurance'] });
    expect(q.lines).toEqual([{ key: 'visits', amount: 100, qty: 1, unit_price: 100 }]);
  });
  it('a service with no price anywhere is refused, not quoted as NaN', async () => {
    await expect(svc(undefined, null as unknown as number).quote({ service_id: 'n1' })).rejects.toThrow('service_price_not_set');
  });
  it('refuses a missing service id, and an object service id', async () => {
    await expect(svc(undefined).quote({})).rejects.toThrow('service_id required');
    await expect(svc(undefined).quote({ service_id: { $ne: 1 } })).rejects.toThrow('service_id required');
  });
});

describe('QuotesController', () => {
  const ctl = new QuotesController({ quote: jest.fn(async () => ({ kind: 'consultation' })) } as any, { quote: jest.fn(async () => ({ kind: 'nursing' })) } as any);
  it('routes by kind', async () => {
    await expect(ctl.quote({ kind: 'consultation', doctor_id: 'd', service_type: 'clinic' })).resolves.toEqual({ kind: 'consultation' });
    await expect(ctl.quote({ kind: 'nursing', service_id: 's' })).resolves.toEqual({ kind: 'nursing' });
  });
  it('lab, radiology and pharmacy point at their own quote; anything else is refused', () => {
    expect(() => ctl.quote({ kind: 'lab' })).toThrow('use_ordering_quote');
    expect(() => ctl.quote({ kind: 'radiology' })).toThrow('use_ordering_quote');
    expect(() => ctl.quote({ kind: 'pharmacy' })).toThrow('use_pharmacy_offer_snapshot');
    expect(() => ctl.quote({})).toThrow('kind_invalid');
  });
});
