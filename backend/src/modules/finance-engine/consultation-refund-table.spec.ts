import { RefundService } from '../insurance-engine/insurance-engine.module';
import { consultationRefundWindow, consultationRefundWindows, consultationTable } from './consultation-refund-table';

const NOW = Date.parse('2026-11-08T12:00:00Z');
const inHours = (h: number) => new Date(NOW + h * 3_600_000);

describe('a patient refund request follows the admin consultation policy (screens-audit-3 gap 23)', () => {
  const policy = { consultation: { full_refund_min_hours: 12, late_refund_percent: 40, patient_no_show_percent: 10 } };

  it('full_refund_min_hours or more before the start: 100 %', () => {
    expect(consultationRefundWindow(inHours(12), policy, NOW).percent).toBe(100);
    expect(consultationRefundWindow(inHours(48), policy, NOW).percent).toBe(100);
  });

  it('later but before the start: late_refund_percent', () => {
    expect(consultationRefundWindow(inHours(11.9), policy, NOW).percent).toBe(40);
    expect(consultationRefundWindow(inHours(0.5), policy, NOW).percent).toBe(40);
  });

  it('after the start (not attending): patient_no_show_percent', () => {
    expect(consultationRefundWindow(inHours(-0.5), policy, NOW).percent).toBe(10);
    expect(consultationRefundWindow(inHours(-30), policy, NOW).percent).toBe(10);
  });

  it('with no start time the full refund, as the fixed windows did', () => {
    expect(consultationRefundWindow(undefined, policy, NOW).percent).toBe(100);
    expect(consultationRefundWindow(new Date('not a date'), policy, NOW).percent).toBe(100);
  });

  it('no stored policy: the owner\'s defaults (2 hours, 50 %, 0 %)', () => {
    expect(consultationTable(undefined)).toEqual({ full_refund_min_hours: 2, late_refund_percent: 50, patient_no_show_percent: 0 });
    expect(consultationRefundWindow(inHours(3), undefined, NOW).percent).toBe(100);
    expect(consultationRefundWindow(inHours(1), undefined, NOW).percent).toBe(50);
    expect(consultationRefundWindow(inHours(-1), undefined, NOW).percent).toBe(0);
  });

  it('an invalid stored figure falls back to its default, the others are kept', () => {
    expect(consultationTable({ consultation: { full_refund_min_hours: -5, late_refund_percent: 101, patient_no_show_percent: 25 } }))
      .toEqual({ full_refund_min_hours: 2, late_refund_percent: 50, patient_no_show_percent: 25 });
  });

  it('the note says what applies, with the policy\'s own numbers', () => {
    expect(consultationRefundWindow(inHours(1), policy, NOW).note_ar).toContain('40%');
    expect(consultationRefundWindow(inHours(20), policy, NOW).note_ar).toContain('12');
  });

  it('the preview table lists the same two windows, hours_before descending, plus the no-show share', () => {
    expect(consultationRefundWindows(policy)).toEqual({
      windows: [
        expect.objectContaining({ hours_before: 12, percent: 100 }),
        expect.objectContaining({ hours_before: 0, percent: 40 }),
      ],
      no_show_percent: 10,
    });
  });
});

describe('RefundService.policyForRequest', () => {
  const service = (policyValue: any, withConn = true) => {
    const conn = { collection: () => ({ findOne: async () => (policyValue === undefined ? null : { value: policyValue }) }) };
    return new RefundService({} as any, { emit: jest.fn() } as any, {} as any, (withConn ? conn : undefined) as any);
  };

  it('reads the stored policy', async () => {
    const s = service({ consultation: { full_refund_min_hours: 1, late_refund_percent: 25, patient_no_show_percent: 0 } });
    expect((await s.policyForRequest(new Date(Date.now() + 30 * 60_000))).percent).toBe(25);
    expect((await s.policyForRequest(new Date(Date.now() + 5 * 3_600_000))).percent).toBe(100);
  });

  it('without a stored policy the defaults apply; without a connection the fixed windows stay (unit-test setups)', async () => {
    expect((await service(undefined).policyForRequest(new Date(Date.now() + 3600_000))).percent).toBe(50);
    expect((await service(undefined, false).policyForRequest(new Date(Date.now() + 10 * 3_600_000))).percent).toBe(50);   // old window: 4-24 h = 50 %
  });

  it('policyTable lists the stored table', async () => {
    const t = await service({ consultation: { full_refund_min_hours: 6, late_refund_percent: 30, patient_no_show_percent: 5 } }).policyTable();
    expect(t.windows[0]).toMatchObject({ hours_before: 6, percent: 100 });
    expect(t.no_show_percent).toBe(5);
  });
});
