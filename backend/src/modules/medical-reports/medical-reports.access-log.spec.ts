/**
 * 16.9 Verify: "every read of a medical record writes an access-log row" - for the reads of MedicalReportsService.
 */
import { MedicalReportsService } from './medical-reports.service';

const report = (id: string, patient = 'p1') => ({
  id, patient_id: patient, viewed_by_patient: true, shared_with_doctor_ids: ['dp1'],
  toObject() { return { id, patient_id: patient, summary: 'plain' }; }, save: async () => undefined,
});

function build(rows: any[]) {
  const calls: Array<{ one?: boolean; many?: boolean; args: any[] }> = [];
  const access: any = {
    record: async (...args: any[]) => { calls.push({ one: true, args }); },
    recordMany: async (...args: any[]) => { calls.push({ many: true, args }); },
  };
  const chain = (data: any) => ({ sort: () => ({ limit: async () => data }) });
  const model: any = {
    findOne: async () => rows[0] ?? null,
    find: () => chain(rows),
  };
  const connection: any = { collection: () => ({ findOne: async () => ({ id: 'dp1' }) }) };
  const svc = new MedicalReportsService(model, { emit: () => undefined } as any, connection, access);
  return { svc, calls };
}

describe('16.9 medical report reads write an access-log row', () => {
  it('one(): a row naming the reader, the report and the patient', async () => {
    const { svc, calls } = build([report('r1')]);
    const out: any = await svc.one({ id: 'p1', role: 'patient' }, 'r1');
    expect(out.summary).toBe('plain');
    expect(calls).toHaveLength(1);
    const [ctx, rec] = calls[0].args;
    expect(ctx).toMatchObject({ actor_id: 'p1', actor_kind: 'patient' });
    expect(rec).toMatchObject({ kind: 'medical_report', id: 'r1', action: 'read', subject_id: 'p1' });
  });

  it('a doctor with a share is logged as a provider; a stranger gets 404 and no record is returned', async () => {
    const { svc, calls } = build([report('r2')]);
    await svc.one({ id: 'doc-user', role: 'doctor' }, 'r2');
    expect(calls[0].args[0]).toMatchObject({ actor_id: 'doc-user', actor_kind: 'provider' });
    const other = build([report('r3')]);
    await expect(other.svc.one({ id: 'stranger', role: 'patient' }, 'r3')).rejects.toThrow();
    expect(other.calls).toHaveLength(0);
  });

  it('byTracking(): a row with action read_by_tracking', async () => {
    const { svc, calls } = build([report('r4')]);
    await svc.byTracking('TRK-1', { id: 'p1', role: 'patient' });
    expect(calls[0].args[1]).toMatchObject({ kind: 'medical_report', id: 'r4', action: 'read_by_tracking', subject_id: 'p1' });
  });

  it('list(): one row per report shown', async () => {
    const { svc, calls } = build([report('r5'), report('r6')]);
    await svc.list({ id: 'p1', role: 'patient' }, {});
    expect(calls).toHaveLength(1);
    expect(calls[0].many).toBe(true);
    expect(calls[0].args[1].map((r: any) => [r.id, r.action])).toEqual([['r5', 'list'], ['r6', 'list']]);
  });

  it('sharedWithMe(): the doctor reading the shared inbox is logged per report, with the patient as subject', async () => {
    const { svc, calls } = build([report('r7', 'pX')]);
    await svc.sharedWithMe({ id: 'doc-user', role: 'doctor' });
    expect(calls[0].args[1]).toMatchObject({ id: 'r7', action: 'list_shared', subject_id: 'pX' });
  });
});
