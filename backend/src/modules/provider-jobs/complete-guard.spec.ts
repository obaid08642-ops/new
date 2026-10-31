import { acceptBlocker, completionBlocker } from './complete-guard';
import { ServiceState } from '../../common/enums';

describe('lab completion needs a result', () => {
  it('refuses a lab job with no report, an empty report row, or none at all', () => {
    expect(completionBlocker('lab', ServiceState.COMPLETED, {})).toBe('lab_report_required');
    expect(completionBlocker('lab', ServiceState.COMPLETED, { reports: [] })).toBe('lab_report_required');
    expect(completionBlocker('lab', ServiceState.COMPLETED, { reports: [{ name: 'x.pdf' }] })).toBe('lab_report_required');
  });
  it('allows it once a stored file, a generated PDF or entered values exist', () => {
    expect(completionBlocker('lab', ServiceState.COMPLETED, { reports: [{ storage_object_id: 's1' }] })).toBeNull();
    expect(completionBlocker('lab', ServiceState.COMPLETED, { reports: [{ base64: 'AAA' }] })).toBeNull();
    expect(completionBlocker('lab', ServiceState.COMPLETED, { reports: [{ entries: [{ name: 'Hb' }] }] })).toBeNull();
  });
  it('does not touch other steps or other kinds', () => {
    expect(completionBlocker('lab', ServiceState.IN_PROGRESS, {})).toBeNull();
    expect(completionBlocker('pharmacy', ServiceState.COMPLETED, {})).toBeNull();
    expect(completionBlocker('nursing', ServiceState.COMPLETED, {})).toBeNull();
  });

  it('radiology completes only after the second person published the report', () => {
    expect(completionBlocker('radiology', ServiceState.COMPLETED, {})).toBe('radiology_report_not_published');
    expect(completionBlocker('radiology', ServiceState.COMPLETED, { report_status: 'under_review' })).toBe('radiology_report_not_published');
    expect(completionBlocker('radiology', ServiceState.COMPLETED, { report_status: 'ready' })).toBeNull();
    expect(completionBlocker('radiology', ServiceState.IN_PROGRESS, {})).toBeNull();
  });
});

describe('lab and radiology accept follow the payment rule', () => {
  const C = ServiceState.CONFIRMED;
  it('card must be paid', () => {
    expect(acceptBlocker('lab', C, { payment_method: 'card', payment_status: 'pending' })).toBe('card_payment_not_completed');
    expect(acceptBlocker('radiology', C, { payment_method: 'card' })).toBe('card_payment_not_completed');
    expect(acceptBlocker('lab', C, { payment_method: 'card', payment_status: 'paid' })).toBeNull();
  });
  it('insurance needs the coverage decision', () => {
    expect(acceptBlocker('lab', C, { payment_method: 'insurance', insurance_status: 'pending' })).toBe('insurance_booking_requires_coverage_decision');
    expect(acceptBlocker('radiology', C, { payment_method: 'insurance', insurance_status: 'none' })).toBe('insurance_booking_requires_coverage_decision');
    expect(acceptBlocker('lab', C, { payment_method: 'insurance', insurance_status: 'approved' })).toBeNull();
  });
  it('cash only at the facility (lab: facility; radiology: not home)', () => {
    expect(acceptBlocker('lab', C, { payment_method: 'cash', location_type: 'home' })).toBe('cash_only_at_facility');
    expect(acceptBlocker('lab', C, { payment_method: 'cash', location_type: 'facility' })).toBeNull();
    expect(acceptBlocker('radiology', C, { payment_method: 'cash', location_type: 'home' })).toBe('cash_only_at_facility');
    expect(acceptBlocker('radiology', C, { payment_method: 'cash', location_type: 'facility' })).toBeNull();
  });
  it('other kinds and other steps are untouched', () => {
    expect(acceptBlocker('pharmacy', C, { payment_method: 'card' })).toBeNull();
    expect(acceptBlocker('lab', ServiceState.IN_PROGRESS, { payment_method: 'card' })).toBeNull();
  });
});
