import { AppointmentsService } from './appointments.service';
import { UserRole } from '../../common/enums';

// P13-R14: consultation outputs (prescription, recommendations, referral)
// link straight to booking/ordering. Red on the base: getSummary returns
// bare prescription lines (medicine_id only), bare referral test-name strings
// and a bare follow_up flag — nothing the patient can tap to order or book.
describe('P13-R14 consultation outputs link to booking and ordering', () => {
  function svcWith(appt: any, medSlugs: Record<string, string> = {}) {
    const apptModel: any = { findOne: jest.fn(async () => appt) };
    const calls: any[] = [];
    const connection: any = {
      collection: jest.fn((name: string) => {
        calls.push(name);
        if (name === 'medicines') {
          return {
            findOne: jest.fn(async (q: any) => {
              const ors: any[] = q?.$or || [];
              for (const cond of ors) {
                for (const v of Object.values(cond)) {
                  const raw = v instanceof RegExp ? v.source : String((v as any)?.$regex ?? v ?? '');
                  const m = raw.replace(/^\^?|\$$/g, '').replace(/\\/g, '');
                  if (medSlugs[m]) return { id: medSlugs[m] };
                }
              }
              if (typeof q?.id === 'string' && Object.values(medSlugs).includes(q.id)) {
                return { id: q.id, slug: q.id };
              }
              return null;
            }),
          };
        }
        if (name === 'encounterreferrals') {
          return {
            findOne: jest.fn(async () => ({
              requested_lab_tests: ['CBC'],
              requested_radiology_scans: ['Chest X-ray'],
            })),
          };
        }
        return { findOne: jest.fn(async () => null) };
      }),
    };
    const svc = new AppointmentsService(apptModel, {} as any, connection, {} as any, {} as any, {} as any, {} as any);
    return { svc, apptModel, connection, calls };
  }

  const apptOf = (summary: any) => ({
    _id: 'mongo1', id: 'appt-1', patient_id: 'pat-1', doctor_id: 'doc-1', doctor_user_id: 'docu-1',
    status: 'completed', service_type: 'clinic', summary,
  });

  it('a prescription line links straight to ordering it', async () => {
    const { svc } = svcWith(
      apptOf({ diagnosis: 'flu', prescription: [{ name: 'Panadol', qty: 1 }] }),
      { Panadol: 'panadol-abcdef' },
    );
    const out: any = await svc.getSummary('appt-1', { id: 'pat-1', role: UserRole.PATIENT });
    const line = out.prescription[0];
    expect(line.medicine_id).toBe('panadol-abcdef');
    expect(line.action).toMatchObject({ type: 'order_medicine', medicine_id: 'panadol-abcdef' });
    expect(String(line.deep_link)).toContain('panadol-abcdef');
    expect(String(line.web_path)).toContain('panadol-abcdef');
  });

  it('lab and radiology referrals link straight to booking them', async () => {
    const { svc } = svcWith(apptOf({ diagnosis: 'flu' }));
    const out: any = await svc.getSummary('appt-1', { id: 'pat-1', role: UserRole.PATIENT });
    expect(out.referrals).toBeDefined();
    expect(out.referrals.lab_tests).toEqual(['CBC']);
    expect(out.referral_actions.lab.action).toMatchObject({ type: 'book_lab' });
    expect(String(out.referral_actions.lab.deep_link)).toContain('diagnostics');
    expect(out.referral_actions.radiology.action).toMatchObject({ type: 'book_radiology' });
  });

  it('a recommended follow-up links straight to booking it with the same doctor', async () => {
    const { svc } = svcWith(apptOf({ diagnosis: 'flu', follow_up_recommended: true, follow_up_window_days: 14 }));
    const out: any = await svc.getSummary('appt-1', { id: 'pat-1', role: UserRole.PATIENT });
    expect(out.follow_up_action.action).toMatchObject({ type: 'book_followup', doctor_id: 'doc-1' });
    expect(String(out.follow_up_action.deep_link)).toContain('doc-1');
  });

  it('an undecided stranger still gets nothing', async () => {
    const { svc } = svcWith(apptOf({ diagnosis: 'flu' }));
    await expect(svc.getSummary('appt-1', { id: 'other', role: UserRole.PATIENT })).rejects.toThrow();
  });
});
