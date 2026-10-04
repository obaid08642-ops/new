// Q85: the public GET /care/insurance filtered on `active`, a field insurance
// companies do not have (they use is_active / catalog_status), so pending and
// disabled insurers were listed, as raw records with created_by/updated_by.
// It must show what /catalogs/insurance shows: active companies, public fields.
import { CareService } from './care.service';

type Row = Record<string, unknown>;
const matches = (row: Row, filter: Record<string, unknown>) =>
  Object.entries(filter).every(([k, v]) => {
    if (v && typeof v === 'object' && '$ne' in (v as Row)) return row[k] !== (v as Row).$ne;
    return row[k] === v;
  });

function service(rows: Row[]) {
  const collection = {
    find: (filter: Record<string, unknown>, opts?: { projection?: Record<string, 0 | 1> }) => ({
      toArray: async () => rows.filter((r) => matches(r, filter)).map((r) => {
        const proj = opts?.projection || {};
        const keep = Object.entries(proj).filter(([, on]) => on === 1).map(([k]) => k);
        if (keep.length) return Object.fromEntries(keep.filter((k) => k in r).map((k) => [k, r[k]]));
        return Object.fromEntries(Object.entries(r).filter(([k]) => proj[k] !== 0));
      }),
    }),
  };
  const providerModel = { db: { collection: () => collection } };
  return new CareService(providerModel as never, {} as never, {} as never, {} as never);
}

describe('GET /care/insurance (Q85)', () => {
  const rows: Row[] = [
    { code: 'approved_co', name_ar: 'معتمدة', name_en: 'Approved', is_active: true, catalog_status: 'approved', created_by: 'admin-1', updated_by: 'admin-1', deleted_at: null },
    { code: 'pending_co', name_ar: 'قيد المراجعة', name_en: 'Pending', is_active: false, catalog_status: 'pending_review', created_by: 'admin-1' },
    { code: 'disabled_co', name_ar: 'موقوفة', name_en: 'Disabled', is_active: false, catalog_status: 'disabled', created_by: 'admin-1' },
  ];

  it('lists only active insurers', async () => {
    const out = (await service(rows).insuranceCompanies()) as Row[];
    expect(out.map((r) => r.code)).toEqual(['approved_co']);
  });

  it('returns no internal fields', async () => {
    const [row] = (await service(rows).insuranceCompanies()) as Row[];
    expect(row).not.toHaveProperty('created_by');
    expect(row).not.toHaveProperty('updated_by');
    expect(row).not.toHaveProperty('deleted_at');
    expect(row).toMatchObject({ code: 'approved_co', name_ar: 'معتمدة', name_en: 'Approved' });
  });
});
