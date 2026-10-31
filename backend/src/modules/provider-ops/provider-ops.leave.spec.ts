import { ProviderOpsService } from './provider-ops.module';

// PV-13: an independent doctor's vacation must block bookings. Slot search reads `leaverequests` only.
function setup(facilityId: string | null) {
  const cols: Record<string, any[]> = { doctor_leaves: [], leaverequests: [] };
  const match = (row: any, f: any) => Object.entries(f).every(([k, v]) => (k === '$or' ? (v as any[]).some((o) => match(row, o)) : row[k] === v));
  const conn = {
    collection: (name: string) => ({
      findOne: async (f: any) => (name === 'provider_accounts' ? { id: 'doc-1', email: 'd@x.test', facility_id: facilityId } : name === 'provider_profiles' ? { display_name_ar: 'د. أحمد' } : (cols[name] || []).find((r) => match(r, f)) ?? null),
      insertOne: async (d: any) => { (cols[name] ||= []).push({ ...d }); },
      deleteOne: async (f: any) => { const i = (cols[name] || []).findIndex((r) => match(r, f)); if (i >= 0) cols[name].splice(i, 1); },
      updateOne: async (f: any, u: any) => { const r = (cols[name] || []).find((x) => match(x, f)); if (r) Object.assign(r, u.$set); },
    }),
  };
  return { svc: new ProviderOpsService(conn as never), cols };
}
const body = { start_date: '2026-12-01', end_date: '2026-12-05', type: 'vacation' };

describe('doctor leave and slot search', () => {
  it('an independent doctor leave is approved at once, so slot search blocks those days', async () => {
    const { svc, cols } = setup(null);
    const out: any = await svc.addLeave('doc-1', body);
    expect(out.leave.status).toBe('active');
    expect(cols.leaverequests).toHaveLength(1);
    expect(cols.leaverequests[0]).toMatchObject({ id: out.leave.id, provider_account_id: 'doc-1', status: 'approved', type: 'vacation' });
  });

  it('a doctor linked to a facility waits for the facility: pending, not blocking yet', async () => {
    const { svc, cols } = setup('fac-1');
    const out: any = await svc.addLeave('doc-1', body);
    expect(out.leave.status).toBe('pending_facility');
    expect(cols.leaverequests[0]).toMatchObject({ facility_id: 'fac-1', status: 'pending' });
  });

  it('cancelling the leave opens the days again', async () => {
    const { svc, cols } = setup(null);
    const out: any = await svc.addLeave('doc-1', body);
    await svc.cancelLeave('doc-1', out.leave.id);
    expect(cols.leaverequests).toHaveLength(0);
    expect(cols.doctor_leaves[0].status).toBe('cancelled');
  });
});
