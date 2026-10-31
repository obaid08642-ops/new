import { doctorSessionPriceProjection } from './doctor-session-price';

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
