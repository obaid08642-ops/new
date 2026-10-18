import { ServiceState } from '../../common/enums';
import { withholdBeforeAcceptance } from './provider-job-privacy';

const job = (universal_state: string, address: unknown = { district: 'العليا', city: 'الرياض', line1: 'شارع 5، مبنى 12' }) => ({
  universal_state,
  address,
  contact: { name: 'Patient', phone: '+966500000000' },
  patient_phone: '+966500000000',
  patient_name: 'Patient',
});

describe('withholdBeforeAcceptance (13.R4)', () => {
  it.each([ServiceState.REQUESTED, ServiceState.MATCHING])('hides the exact address, contact and phone while %s', (state) => {
    const view = withholdBeforeAcceptance(job(state));
    expect(view.address).toBeNull();
    expect(view.contact).toBeNull();
    expect(view.patient_phone).toBeNull();
    expect(view.approx_area).toBe('العليا');
  });

  it('falls back to the city when there is no district', () => {
    expect(withholdBeforeAcceptance(job(ServiceState.REQUESTED, { city: 'جدة', line1: 'x' })).approx_area).toBe('جدة');
  });

  it('gives no area when the address has neither district nor city', () => {
    expect(withholdBeforeAcceptance(job(ServiceState.REQUESTED, { line1: 'x' })).approx_area).toBeNull();
    expect(withholdBeforeAcceptance(job(ServiceState.REQUESTED, null)).approx_area).toBeNull();
  });

  it.each([ServiceState.ASSIGNED, ServiceState.CONFIRMED, ServiceState.IN_PROGRESS, ServiceState.COMPLETED])(
    'keeps the full record once accepted (%s)',
    (state) => {
      const full = job(state);
      const view = withholdBeforeAcceptance(full);
      expect(view.address).toEqual(full.address);
      expect(view.contact).toEqual(full.contact);
      expect(view.patient_phone).toBe(full.patient_phone);
      expect(view.approx_area).toBeNull();
    },
  );
});
