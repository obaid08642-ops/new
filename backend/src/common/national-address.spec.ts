import { normalizeShortAddress, parseNationalAddress } from './national-address';

describe('19.7 Saudi National Address helpers', () => {
  it.each([['RRRD2929', 'RRRD2929'], ['rrrd2929', 'RRRD2929'], [' RRRD 2929 ', 'RRRD2929'], ['RRRD-2929', 'RRRD2929'], ['ＲＲＲＤ２９２９', 'RRRD2929']])('reads %j as %s', (raw, code) => {
    expect(normalizeShortAddress(raw)).toBe(code);
  });

  it.each(['', 'RRR2929', 'RRRD292', 'RRRD29290', '1234ABCD', 'RRRD29 29X', 'مرجع', null, undefined, 42, {}])('rejects %j', (raw) => {
    expect(normalizeShortAddress(raw)).toBeNull();
  });

  it('reads the first address of a Saudi Post answer, any key case', () => {
    const a = parseNationalAddress({ Addresses: [{ BuildingNumber: '8228', Street: 'King Fahd Rd', District: 'Olaya', City: 'Riyadh', PostCode: '12611', AdditionalNumber: '2929', RegionName: 'Riyadh', Latitude: '24.69', Longitude: '46.72' }], success: true }, 'RRRD2929');
    expect(a).toEqual({ short_address: 'RRRD2929', building_number: '8228', street: 'King Fahd Rd', district: 'Olaya', city: 'Riyadh', region: 'Riyadh', post_code: '12611', additional_number: '2929', lat: 24.69, lng: 46.72 });
    expect(parseNationalAddress({ address: { city: 'Jeddah', lat: 21.5, lng: 39.2 } }, 'JEDA1234')).toMatchObject({ city: 'Jeddah', lat: 21.5, lng: 39.2 });
  });

  it('treats an answer without any address part as not found, and drops out-of-range pins', () => {
    expect(parseNationalAddress({ Addresses: [] }, 'RRRD2929')).toBeNull();
    expect(parseNationalAddress({ Addresses: [{}] }, 'RRRD2929')).toBeNull();
    expect(parseNationalAddress('x', 'RRRD2929')).toBeNull();
    expect(parseNationalAddress(null, 'RRRD2929')).toBeNull();
    const a = parseNationalAddress({ Addresses: [{ City: 'Riyadh', Latitude: 999, Longitude: 46 }] }, 'RRRD2929');
    expect(a?.lat).toBeUndefined();
  });
});
