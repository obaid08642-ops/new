import { SLA_SOURCES } from './ops-alert-queries';

describe('a published radiology report closes the booking for the ops views', () => {
  it('REPORT_READY (where the normal publish ends) is closed for the SLA breach query, like REPORT_PUBLISHED', () => {
    const closed = SLA_SOURCES.find((s) => s.kind === 'radiology')!.closed;
    expect(closed).toEqual(expect.arrayContaining(['CANCELLED', 'REPORT_READY', 'REPORT_PUBLISHED']));
  });
});
