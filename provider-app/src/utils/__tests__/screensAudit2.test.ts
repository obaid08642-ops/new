import { confirmBlocker, confirmBlockerText } from '../confirmBlocker';
import { documentsStepError } from '../../screens/registration/kit';
import { toTodayAppointment, isTodayRow } from '../../screens/facility/facility/FacilityHomeTab';

describe('lab and radiology: when a new request can be accepted', () => {
  it('an unpaid card booking waits, cash is only at the facility, everything else can be accepted', () => {
    expect(confirmBlocker({ payment_method: 'card', payment_status: 'pending' })).toBe('card_unpaid');
    expect(confirmBlocker({ payment_method: 'card', payment_status: 'paid' })).toBeNull();
    expect(confirmBlocker({ payment_method: 'cash', location_type: 'home' })).toBe('cash_at_home');
    expect(confirmBlocker({ payment_method: 'cash', location_type: 'facility' })).toBeNull();
    expect(confirmBlocker(null)).toBeNull();
  });
  it('says why, in both languages', () => {
    expect(confirmBlockerText('card_unpaid', false)).toMatch(/card/i);
    expect(confirmBlockerText('cash_at_home', true)).toMatch(/نقدي/);
  });
});

describe('registration: documents step errors', () => {
  const err = (message: string) => ({ response: { data: { message } } });
  it('names the cause when the applicant can fix it, else the generic text', () => {
    expect(documentsStepError(err('invalid_iban'), false)).toMatch(/IBAN/);
    expect(documentsStepError(err('invalid_license_expiry_date'), true)).toMatch(/الترخيص/);
    expect(documentsStepError(err('unsupported mime: image/heic'), false)).toMatch(/JPG/);
    expect(documentsStepError(new Error('Network Error'), false)).toBe('Failed to upload documents');
  });
});

describe('facility home: today\'s schedule from the job queue', () => {
  it('uses the fields the queue returns and keeps only today', () => {
    const now = new Date('2026-10-31T10:00:00');
    const today = { id: 'a', patient_name: 'Sara', scheduled_at: '2026-10-31T09:30:00', domain_state: 'IN_PROGRESS', service_type: 'clinic' };
    const other = { id: 'b', patient_name: 'Omar', scheduled_at: '2026-11-02T09:30:00' };
    expect(isTodayRow(today, now)).toBe(true);
    expect(isTodayRow(other, now)).toBe(false);
    expect(toTodayAppointment(today)).toMatchObject({ id: 'a', patient: 'Sara', status: 'in_progress', type: 'opd' });
    expect(toTodayAppointment({ id: 'c' })).toMatchObject({ patient: '—', time: '', status: 'confirmed' });
  });
});
