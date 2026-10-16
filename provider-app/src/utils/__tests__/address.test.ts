import { addressLine, addressShort, patientMeta } from '../address';

describe('addressLine / addressShort', () => {
  it('reads the booking address object the patient app sends', () => {
    const a = { address: 'شارع الملك فهد 3، الرياض', city: 'الرياض', lat: 24.7, lng: 46.7 };
    expect(addressLine(a)).toBe('شارع الملك فهد 3، الرياض');
    expect(addressShort(a)).toBe('شارع الملك فهد 3');
  });
  it('reads a plain string, a street+city object, and nothing', () => {
    expect(addressLine('Riyadh, Olaya')).toBe('Riyadh, Olaya');
    expect(addressLine({ street: 'Olaya', city: 'Riyadh' })).toBe('Olaya، Riyadh');
    expect(addressLine(undefined)).toBe('');
    expect(addressShort(null)).toBe('');
  });
});

describe('patientMeta', () => {
  it('invents nothing: no age and no gender gives no parts (it used to say 70 yrs | Male)', () => {
    expect(patientMeta({}, false)).toEqual([]);
    expect(patientMeta(undefined, true)).toEqual([]);
  });
  it('uses what the booking carries', () => {
    expect(patientMeta({ age: 42, gender: 'female' }, false)).toEqual(['42 yrs', 'Female']);
    expect(patientMeta({ age: '8', gender: 'ذكر' }, true)).toEqual(['8 سنة', 'ذكر']);
  });
});
