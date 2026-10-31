import { completionBlocker } from './complete-guard';
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
