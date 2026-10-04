// dbb1ace review: R4 deleted the compat GET /home-care/services that applied
// the medical-review rule and kept PatientHomeCareController.services, which
// filtered only on is_active/kind. Signed-in patients therefore saw services
// that never passed medical review (or were inactive under the schema's
// `active` field). The surviving handler must apply the /nursing/catalog rule.
import { PatientHomeCareController } from './patient-home-care.controller';

type Row = Record<string, unknown>;
const ok = (row: Row, f: Record<string, unknown>) => Object.entries(f).every(([k, v]) => {
  if (v && typeof v === 'object' && '$ne' in (v as Row)) return row[k] !== (v as Row).$ne;
  return row[k] === v;
});

describe('GET /home-care/services shows only medically reviewed services', () => {
  const rows: Row[] = [
    { _id: 1, id: 'svc-ok', active: true, public_eligibility: true, medical_review_status: 'approved' },
    { _id: 2, id: 'svc-pending', active: true, public_eligibility: false, medical_review_status: 'pending' },
    { _id: 3, id: 'svc-off', active: false, public_eligibility: true, medical_review_status: 'approved' },
    { _id: 4, id: 'pkg', active: true, public_eligibility: true, medical_review_status: 'approved', kind: 'package' },
  ];
  const conn = { db: { collection: () => ({ find: (f: Record<string, unknown>) => ({ limit: () => ({ toArray: async () => rows.filter((r) => ok(r, f)) }) }) }) } };
  const ctrl = new PatientHomeCareController(conn as never, {} as never);

  it('lists approved, public, active services only (no packages)', async () => {
    const out = await ctrl.services('50');
    expect(out.data.map((d: Row) => d.id)).toEqual(['svc-ok']);
  });
});
