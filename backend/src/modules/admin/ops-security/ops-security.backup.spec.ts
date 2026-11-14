import { OpsSecurityService } from './ops-security.service';

// 20.8: backup page shows the oplog and DR drill rows, and a stale oplog turns the page red
function service(rows: any[]) {
  const inserted: any[] = [];
  const conn: any = {
    collection: () => ({
      insertOne: async (d: any) => { inserted.push(d); },
      find: () => ({ sort: () => ({ limit: () => ({ toArray: async () => rows }) }) }),
    }),
  };
  const mail: any = { send: async () => ({ ok: true }) };
  return { svc: new OpsSecurityService(conn, mail, {} as any), inserted };
}
const ago = (min: number) => new Date(Date.now() - min * 60_000);
const ok = (kind: string, min: number, extra: object = {}) => ({ kind, ok: true, size_bytes: 10, finished_at: ago(min), ...extra });

describe('backup page: point-in-time recovery (20.8)', () => {
  it('stores the measured RPO and RTO of a DR drill', async () => {
    const { svc, inserted } = service([]);
    await svc.reportBackupRun({ kind: 'dr_drill', ok: true, finished_at: new Date().toISOString(), rpo_seconds: 640, rto_seconds: 412 });
    expect(inserted[0]).toMatchObject({ kind: 'dr_drill', ok: true, rpo_seconds: 640, rto_seconds: 412 });
  });

  it('shows the newest oplog run and DR drill and is not stale when slices are fresh', async () => {
    const { svc } = service([ok('local', 60), ok('offsite', 59), ok('oplog', 4), ok('dr_drill', 1000, { rpo_seconds: 640, rto_seconds: 412 })]);
    const s = await svc.backupSection();
    expect(s.oplog?.ok).toBe(true);
    expect(s.dr_drill).toMatchObject({ ok: true, rpo_seconds: 640, rto_seconds: 412 });
    expect(s.stale).toBe(false);
  });

  it('is stale when the newest oplog slice is older than 30 minutes', async () => {
    const { svc } = service([ok('local', 60), ok('offsite', 59), ok('oplog', 45)]);
    expect((await svc.backupSection()).stale).toBe(true);
  });

  it('does not turn red before any oplog run was ever reported (rollout)', async () => {
    const { svc } = service([ok('local', 60), ok('offsite', 59)]);
    const s = await svc.backupSection();
    expect(s.oplog).toBeNull();
    expect(s.stale).toBe(false);
  });
});
