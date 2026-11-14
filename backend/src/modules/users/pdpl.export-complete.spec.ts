import { PdplService } from './pdpl.service';

// Scenario PT-37 (data export, PDPL): the export must contain every collection the erasure touches. Before this,
// exportPatientData walked OWNED only, so orders, invoices, e-invoices, payments, wallet and returns (OWNED_EXTRA,
// which the erasure did walk) were deleted/anonymised on request but never handed to the patient.
describe('PDPL export covers the same collections as the erasure', () => {
  const EXTRA = ['orders', 'invoices', 'einvoices', 'moyasar_payments', 'wallet_transactions', 'returnrequests', 'patient_profiles'];

  function build(present: string[], rowsOf: (c: string) => any[]) {
    const queried: string[] = [];
    const conn: any = {
      db: { listCollections: () => ({ toArray: () => Promise.resolve(present.map((name) => ({ name }))) }) },
      collection: (name: string) => ({
        find: () => ({ toArray: () => { queried.push(name); return Promise.resolve(rowsOf(name)); }, sort: () => ({ limit: () => ({ toArray: () => Promise.resolve([]) }) }) }),
        insertOne: () => Promise.resolve({}),
        findOne: () => Promise.resolve(null),
        countDocuments: () => Promise.resolve(0),
        createIndex: () => Promise.resolve('i'),
      }),
    };
    const userModel: any = { findOne: () => ({ lean: () => Promise.resolve({ id: 'u1', role: 'patient', password_hash: 'x' }) }) };
    return { svc: new PdplService(conn, userModel), queried };
  }

  it('reads and returns the extra collections, with secrets removed', async () => {
    const { svc, queried } = build(EXTRA, (c) => [{ _id: 'o', id: `${c}-1`, user_id: 'u1', token: 'secret-token', total: 10 }]);
    const out: any = await svc.exportPatientData('u1');
    for (const c of EXTRA) {
      expect(queried).toContain(c);
      expect(out.data.collections[c]).toHaveLength(1);
      expect(out.data.collections[c][0]).not.toHaveProperty('token');
    }
    expect(out.data.account).not.toHaveProperty('password_hash');
  });

  it('every collection the erasure walks is also exported (one list, no drift)', async () => {
    const src = require('fs').readFileSync(require.resolve('./pdpl.service'), 'utf8') as string;
    const exportBody = src.slice(src.indexOf('async exportPatientData'), src.indexOf('async erasePatientData'));
    const eraseBody = src.slice(src.indexOf('async erasePatientData'));
    expect(exportBody).toContain('...this.OWNED, ...PdplService.OWNED_EXTRA');
    expect(eraseBody).toContain('...this.OWNED, ...PdplService.OWNED_EXTRA');
  });
});
