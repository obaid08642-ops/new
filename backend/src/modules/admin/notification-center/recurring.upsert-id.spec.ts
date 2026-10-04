// 54cca5f review (7E.N8): a new recurring rule was inserted without an `id`, so
// toggleRule/upsertRule (which match on id) could never reach it again.
import { RecurringNotificationService } from './recurring.service';

describe('recurring notification rules get an id (7E.N8)', () => {
  const store: Record<string, unknown>[] = [];
  const rules = {
    insertOne: async (d: Record<string, unknown>) => { store.push(d); return {}; },
    updateOne: async (f: { id: string }, u: { $set: Record<string, unknown> }) => {
      const row = store.find((r) => r.id === f.id);
      if (row) Object.assign(row, u.$set);
      return { modifiedCount: row ? 1 : 0 };
    },
    findOne: async (f: { id: string }) => store.find((r) => r.id === f.id) ?? null,
  };
  const conn = { collection: () => rules };
  const svc = new RecurringNotificationService(conn as never, {} as never);
  const rule = { name: 'Weekly tip', audience: { type: 'all', filters: {} }, frequency: 'weekly' as const, sendTime: '09:00', startDate: '2026-10-05', title: { ar: 'ن' }, body: { ar: 'ن' }, enabled: true };

  it('a created rule can be switched off afterwards', async () => {
    const out = await svc.upsertRule('admin-1', rule);
    expect(typeof out.id).toBe('string');
    await svc.toggleRule(out.id, false);
    expect(store[0]).toMatchObject({ id: out.id, enabled: false });
  });
});
