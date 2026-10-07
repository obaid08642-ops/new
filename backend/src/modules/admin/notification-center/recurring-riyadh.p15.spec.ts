/**
 * 15.9 — Reminders run on server time in Asia/Riyadh: a daily rule with
 * sendTime '08:00' fires when the SERVER instant is 05:00Z (08:00 Riyadh)
 * and stays silent at 06:00Z. A wrong device clock cannot move the cron or
 * the due computation — both read the server clock only.
 *
 * runDueRules is exercised end-to-end (mocked collections); the private
 * isRuleDue/getPeriodKey logic is pinned through it. Reverting the Riyadh
 * conversion in runDueRules (e.g. reading getHours() directly) makes the
 * 05:00Z test silent under TZ=UTC — see P15_NOTES.md for the probe.
 */
import { RecurringNotificationService } from './recurring.service';

const RULE = {
  id: 'rule-1',
  name: 'morning',
  audience: { type: 'all', filters: {} },
  frequency: 'daily',
  sendTime: '08:00',
  startDate: '2027-01-01',
  title: { ar: 'تذكير', en: 'Reminder' },
  body: { ar: 'حان الموعد', en: 'Due' },
  enabled: true,
};

const build = (runsExisting: any = null) => {
  const inserted: any[] = [];
  const created: any[] = [];
  const conn: any = {
    collection: jest.fn((name: string) => {
      if (name === 'notification_recurring_rules') {
        return { find: jest.fn(() => ({ toArray: jest.fn(async () => [{ ...RULE }]) })) };
      }
      if (name === 'notification_recurring_runs') {
        return { findOne: jest.fn(async () => runsExisting), insertOne: jest.fn(async (d: any) => { inserted.push(d); }) };
      }
      if (name === 'users') {
        return { find: jest.fn(() => ({ limit: jest.fn(() => ({ toArray: jest.fn(async () => [{ id: 'p-1' }]) })) })) };
      }
      throw new Error(`unexpected collection ${name}`);
    }),
  };
  const notifications: any = { create: jest.fn(async (d: any) => { created.push(d); }) };
  return { svc: new RecurringNotificationService(conn, notifications), inserted, created };
};

describe('15.9 recurring reminders follow server Riyadh time (mocked collections)', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  it('fires an 08:00 Riyadh rule when the server instant is 05:00Z', async () => {
    jest.setSystemTime(new Date('2027-06-01T05:00:00Z')); // 08:00 Asia/Riyadh
    const { svc, created, inserted } = build();
    await svc.runDueRules();
    expect(created).toHaveLength(1);
    expect(inserted).toHaveLength(1);
    expect(inserted[0].period).toBe('2027-06-01');
  });

  it('stays silent at 06:00Z (09:00 Riyadh, not the rule time)', async () => {
    jest.setSystemTime(new Date('2027-06-01T06:00:00Z'));
    const { svc, created } = build();
    await svc.runDueRules();
    expect(created).toHaveLength(0);
  });

  it('does not resend within the same Riyadh day', async () => {
    jest.setSystemTime(new Date('2027-06-01T05:10:00Z'));
    const { svc, created } = build({ rule_id: 'rule-1', period: '2027-06-01' });
    await svc.runDueRules();
    expect(created).toHaveLength(0);
  });
});
