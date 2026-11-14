import { consultationFees, homeCollectionFee, homeVisitFee, transportFee } from './provider-home-fees';

const PLATFORM = { service_fee: 15, home_visit_fee: 100, transportation_fee: 50 };

describe('home fees: the provider\'s own fee when set, else the platform default', () => {
  it('a home consultation charges the doctor\'s own home-visit and transport fees', () => {
    expect(consultationFees({ home_visit_fee: 180, home_transport_fee: true, home_transport_price: 30 }, 'home', PLATFORM)).toEqual({ service_fee: 15, home_visit_fee: 180, transportation_fee: 30 });
  });
  it('a doctor who set none is charged the platform\'s 100 + 50', () => {
    expect(consultationFees({}, 'home', PLATFORM)).toEqual({ service_fee: 15, home_visit_fee: 100, transportation_fee: 50 });
    expect(consultationFees(null, 'home', PLATFORM)).toEqual({ service_fee: 15, home_visit_fee: 100, transportation_fee: 50 });
  });
  it('a doctor who said they charge no transport surcharge is charged none; a surcharge flagged without a price falls back', () => {
    expect(transportFee({ home_transport_fee: false, home_transport_price: 30 }, 50)).toBe(0);
    expect(transportFee({ home_transport_fee: true }, 50)).toBe(50);
  });
  it('a clinic or video visit has no home lines, whatever the doctor typed', () => {
    for (const type of ['clinic', 'video']) expect(consultationFees({ home_visit_fee: 180, home_transport_price: 30 }, type, PLATFORM)).toEqual({ service_fee: 15, home_visit_fee: 0, transportation_fee: 0 });
  });
  it('a zero, negative or non-number fee is "not set"', () => {
    for (const bad of [0, -5, '120', null, undefined, NaN]) expect(homeVisitFee({ home_visit_fee: bad }, 100)).toBe(100);
  });
  it('a lab\'s own home-collection fee, else the platform\'s', () => {
    expect(homeCollectionFee({ home_collection_fee: 40 }, 25)).toBe(40);
    expect(homeCollectionFee({}, 25)).toBe(25);
    expect(homeCollectionFee({ home_collection_fee: 0 }, 25)).toBe(25);
  });
});
