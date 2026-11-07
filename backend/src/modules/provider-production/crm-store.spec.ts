import { cleanCrmPatch, EMPTY_CRM, listCrmRecords, mergeCrm, readCrm } from './crm-store';
import { ProviderOpsService } from '../provider-ops/provider-ops.module';

type Doc = Record<string, any>;
/** A tiny in-memory collection store: enough of find/findOne/updateOne for the CRM and block-list code. */
function fakeConn(seed: Record<string, Doc[]> = {}) {
  const data: Record<string, Doc[]> = { doctor_patient_crm: [], doctor_blacklist: [], users: [], ...seed };
  const val = (v: any) => (v && typeof v === 'object' && '$eq' in v ? v.$eq : v);
  const match = (d: Doc, f: Doc): boolean => Object.entries(f).every(([k, v]) => {
    if (k === '$or') return (v as Doc[]).some((o) => match(d, o));
    if (v && typeof v === 'object' && '$in' in v) return (v as any).$in.includes(d[k]);
    return d[k] === val(v);
  });
  const col = (name: string) => ({
    findOne: async (f: Doc) => data[name].find((d) => match(d, f)) ?? null,
    find: (f: Doc) => ({ sort: () => ({ limit: () => ({ toArray: async () => data[name].filter((d) => match(d, f)) }) }), toArray: async () => data[name].filter((d) => match(d, f)) }),
    updateOne: async (f: Doc, u: Doc, o: Doc = {}) => {
      let d = data[name].find((x) => match(x, f));
      if (!d && o.upsert) { d = { ...Object.fromEntries(Object.entries(f).map(([k, v]) => [k, val(v)])), ...(u.$setOnInsert ?? {}) }; data[name].push(d); }
      if (d) Object.assign(d, u.$set ?? {});
    },
  });
  return { conn: { collection: col } as any, data };
}

describe('cleanCrmPatch', () => {
  it('keeps only what was sent, with the old limits', () => {
    expect(cleanCrmPatch({ vip: 1 })).toEqual({ vip: true });
    expect(cleanCrmPatch({ tags: ['a'.repeat(100)] }).tags![0]).toHaveLength(60);
    expect(cleanCrmPatch({ notes: [{ text: '' }, { text: 'x' }] }).notes).toHaveLength(1);
    expect(cleanCrmPatch({ blocked: true, blocked_reason: 'سبب' })).toEqual({ blocked: true, blocked_reason: 'سبب' });
    expect(cleanCrmPatch({ blocked: false, blocked_reason: 'old' })).toEqual({ blocked: false, blocked_reason: '' });
    expect(cleanCrmPatch({})).toEqual({});
  });
});

describe('one patient file for both screens', () => {
  it('a patient with no file has the empty one (no 404)', async () => {
    const { conn } = fakeConn();
    expect(await readCrm(conn, 'dr', 'p1')).toEqual(EMPTY_CRM);
  });
  it('a save of one field keeps the others, whichever screen wrote them', async () => {
    const { conn, data } = fakeConn();
    await mergeCrm(conn, 'dr', 'p1', { tags: ['متابعة'], notes: [{ id: 'n1', date: '2026-11-01', text: 'ملاحظة' }], vip: true });
    const after = await mergeCrm(conn, 'dr', 'p1', { favorite: true });
    expect(after).toMatchObject({ tags: ['متابعة'], vip: true, favorite: true, blocked: false });
    expect(after.notes).toHaveLength(1);
    expect(data.doctor_patient_crm).toHaveLength(1);
    expect(data.doctor_patient_crm[0]).toMatchObject({ owner_id: 'dr', patient_id: 'p1' });
  });
  it('a legacy doctor_id file is the starting point, and the save lands on the owner_id file', async () => {
    const { conn, data } = fakeConn({ doctor_patient_crm: [{ doctor_id: 'dr', patient_id: 'p1', data: { tags: ['قديم'], notes: [], vip: true, favorite: false } }] });
    expect((await readCrm(conn, 'dr', 'p1')).tags).toEqual(['قديم']);
    const merged = await mergeCrm(conn, 'dr', 'p1', { favorite: true });
    expect(merged).toMatchObject({ tags: ['قديم'], vip: true, favorite: true });
    expect(data.doctor_patient_crm.filter((d) => d.owner_id === 'dr')).toHaveLength(1);
  });
  it('lists each patient once, the owner_id file first', async () => {
    const { conn } = fakeConn({ doctor_patient_crm: [
      { owner_id: 'dr', patient_id: 'p1', data: { vip: true } },
      { doctor_id: 'dr', patient_id: 'p1', data: { vip: false } },
      { doctor_id: 'dr', patient_id: 'p2', data: {} },
    ] });
    const rows = await listCrmRecords(conn, 'dr');
    expect(rows.map((r) => r.patient_id)).toEqual(['p1', 'p2']);
    expect(rows[0].data.vip).toBe(true);
  });
});

describe('the doctor\'s block list and the patient file say the same', () => {
  it('blocking records the reason in both and shows the patient\'s name; unblocking clears both', async () => {
    const { conn, data } = fakeConn({ users: [{ id: 'p1', full_name: 'سارة أحمد' }] });
    const svc = new ProviderOpsService(conn, { emit: jest.fn() } as never);
    await svc.blacklistPatient('dr', 'p1', 'عدم الحضور المتكرر');
    expect(data.doctor_blacklist[0]).toMatchObject({ doctor_id: 'dr', patient_id: 'p1', active: true, reason: 'عدم الحضور المتكرر' });
    expect(await svc.getPatientCrm('dr', 'p1')).toMatchObject({ blocked: true, blocked_reason: 'عدم الحضور المتكرر' });
    expect(await svc.myBlacklist('dr')).toEqual([expect.objectContaining({ patient_id: 'p1', patient_name: 'سارة أحمد' })]);
    expect(await svc.isBlacklisted('dr', 'p1')).toBe(true);
    await svc.unblacklistPatient('dr', 'p1');
    expect(await svc.isBlacklisted('dr', 'p1')).toBe(false);
    expect(await svc.getPatientCrm('dr', 'p1')).toMatchObject({ blocked: false, blocked_reason: '' });
  });
  it('a partial save from the patient-file screen no longer wipes the notes', async () => {
    const { conn } = fakeConn();
    const svc = new ProviderOpsService(conn, { emit: jest.fn() } as never);
    await svc.putPatientCrm('dr', 'p1', { notes: [{ text: 'مهمة' }], tags: ['t'] });
    const after = await svc.putPatientCrm('dr', 'p1', { vip: true });
    expect(after).toMatchObject({ vip: true, tags: ['t'] });
    expect(after.notes).toHaveLength(1);
  });
});
