import { doctorPricingProjection, doctorSessionPriceProjection } from './doctor-session-price';

describe('doctorSessionPriceProjection', () => {
  it('maps the booked consultation types to the profile price fields', () => {
    expect(doctorSessionPriceProjection({ consultation_type: 'clinic', price: 250 })).toEqual({ field: 'price_clinic', price: 250 });
    expect(doctorSessionPriceProjection({ consultation_type: 'video', price: 150.456 })).toEqual({ field: 'price_online', price: 150.46 });
    expect(doctorSessionPriceProjection({ consultation_type: 'home', price: 400 })).toEqual({ field: 'price_home', price: 400 });
  });
  it('projects nothing for voice/chat, an unavailable session, or a missing or non-positive price', () => {
    expect(doctorSessionPriceProjection({ consultation_type: 'voice', price: 100 })).toBeNull();
    expect(doctorSessionPriceProjection({ consultation_type: 'chat', price: 100 })).toBeNull();
    expect(doctorSessionPriceProjection({ consultation_type: 'clinic', price: 100, available: false })).toBeNull();
    expect(doctorSessionPriceProjection({ consultation_type: 'clinic', price: 0 })).toBeNull();
    expect(doctorSessionPriceProjection({ consultation_type: 'clinic' })).toBeNull();
    expect(doctorSessionPriceProjection(null)).toBeNull();
  });
});

describe('doctorPricingProjection (the pricing settings the doctor saves)', () => {
  it('projects the three prices and their flags onto the profile fields', () => {
    expect(doctorPricingProjection({ price_clinic: 250, price_online: '150', price_home: null, active_clinic: true, active_online: true, active_home: false }))
      .toEqual({ price_clinic: 250, active_clinic: true, price_online: 150, active_online: true, price_home: null, active_home: false });
  });
  it('a switched-off type has no bookable price, and a price that is not a positive number is ignored', () => {
    expect(doctorPricingProjection({ price_clinic: 250, active_clinic: false })).toEqual({ price_clinic: null, active_clinic: false });
    expect(doctorPricingProjection({ price_clinic: -5, price_online: 'abc' })).toBeNull();
  });
  it('projects nothing for other settings payloads', () => {
    expect(doctorPricingProjection({ delivery_fee: 10 })).toBeNull();
    expect(doctorPricingProjection(null)).toBeNull();
  });
});
