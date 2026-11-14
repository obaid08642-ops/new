import { withholdLegacyBeforeAcceptance } from './provider-job-privacy';

// R7 (13.R4): lab and radiology inboxes hide the patient's phone and exact address until the request is accepted.
describe('withholdLegacyBeforeAcceptance', () => {
  const booking = (state: string) => ({ id: 'b1', state, patient_name: 'Sara', patient_phone: '0501234567', address: { lat: 24.7, lng: 46.7, address: 'Street 5', city: 'Riyadh', district: 'Olaya' } });

  it('an unaccepted request shows the district only', () => {
    const out: any = withholdLegacyBeforeAcceptance(booking('NEW_REQUEST'), ['NEW_REQUEST']);
    expect(out).toMatchObject({ patient_phone: null, address: null, approx_area: 'Olaya', patient_name: 'Sara', id: 'b1' });
  });

  it('falls back to the city, then to nothing', () => {
    expect((withholdLegacyBeforeAcceptance({ state: 'NEW_REQUEST', address: { city: 'Jeddah' } }, ['NEW_REQUEST']) as any).approx_area).toBe('Jeddah');
    expect((withholdLegacyBeforeAcceptance({ state: 'NEW_REQUEST' }, ['NEW_REQUEST']) as any).approx_area).toBeNull();
  });

  it('after acceptance the full record is returned untouched', () => {
    const b = booking('CONFIRMED');
    expect(withholdLegacyBeforeAcceptance(b, ['NEW_REQUEST'])).toBe(b);
  });
});
