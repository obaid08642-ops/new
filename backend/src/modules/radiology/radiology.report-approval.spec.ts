import { reportApprovalFor, reportHandledBy } from './radiology.service';
import { RadiologyBookingState } from '../../schemas/radiology.schema';

/** Gap 16: the app can tell whether the publish button is for this user (the uploader may not publish their own report). */
describe('radiology report approval: who may publish', () => {
  const history = (...entries: Array<[string, string]>) => entries.map(([to, by]) => ({ to, by_user_id: by }));
  const under = (h: any[]) => ({ state: RadiologyBookingState.UNDER_REVIEW, state_history: h });

  it('the user who drafted or sent the report for review cannot approve it', () => {
    const b = under(history([RadiologyBookingState.REPORT_DRAFT, 'tech-1'], [RadiologyBookingState.UNDER_REVIEW, 'tech-1']));
    expect(reportApprovalFor(b, 'tech-1')).toEqual({ report_can_approve: false, report_handled_by_me: true });
    expect(reportHandledBy(b, 'tech-1')).toBe(true);
  });
  it('another specialist can approve it', () => {
    const b = under(history([RadiologyBookingState.REPORT_DRAFT, 'tech-1'], [RadiologyBookingState.UNDER_REVIEW, 'tech-1']));
    expect(reportApprovalFor(b, 'rad-2')).toEqual({ report_can_approve: true, report_handled_by_me: false });
  });
  it('nothing can be approved before the report is under review, or after it is ready', () => {
    expect(reportApprovalFor({ state: RadiologyBookingState.REPORT_DRAFT, state_history: [] }, 'rad-2').report_can_approve).toBe(false);
    expect(reportApprovalFor({ state: RadiologyBookingState.REPORT_READY, state_history: [] }, 'rad-2').report_can_approve).toBe(false);
  });
  it('a booking with no history, or an older one with `status`, is read safely', () => {
    expect(reportApprovalFor({ status: RadiologyBookingState.UNDER_REVIEW }, 'rad-2')).toEqual({ report_can_approve: true, report_handled_by_me: false });
    expect(reportApprovalFor(null, 'rad-2').report_can_approve).toBe(false);
  });
  it('other actions in the history (a booking, a scan) do not count as handling the report', () => {
    const b = under(history([RadiologyBookingState.IN_SCANNING, 'rad-2']));
    expect(reportApprovalFor(b, 'rad-2').report_can_approve).toBe(true);
  });
});
