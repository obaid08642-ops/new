// R3 review (ee5b1f7): the price-override CSV quoted cells but did not neutralise
// formula prefixes. A pharmacy-entered reason such as =HYPERLINK(...) runs as a
// formula when an admin opens the export in Excel (CSV injection).
import { AdminPharmacyController } from './pharmacy.controllers';

describe('admin price-override CSV export (R3)', () => {
  const rows = [
    { changed_at: new Date('2026-10-01T10:00:00Z'), pharmacy_account_id: 'ph-1', order_id: 'o-1', offer_id: 'of-1', sku: 'S1', catalog_price: 10, override_price: 9, reason: '=HYPERLINK("http://evil.test","x")', changed_by: 'ph-1' },
    { changed_at: new Date('2026-10-01T11:00:00Z'), pharmacy_account_id: 'ph-2', order_id: 'o-2', offer_id: 'of-2', sku: 'S2', catalog_price: 10, override_price: 11, reason: '+cmd|calc', changed_by: '@ph-2' },
  ];
  const col = { find: () => ({ sort: () => ({ limit: () => ({ toArray: async () => rows }) }) }) };
  const allocs = { orders: { db: { collection: () => col } } };
  const ctrl = new AdminPharmacyController({} as never, allocs as never, {} as never);

  it('no cell starts with a formula character', async () => {
    let body = '';
    const res = { setHeader: jest.fn(), send: (b: string) => { body = b; } };
    await ctrl.priceOverridesCsv({}, res);
    const cells = body.replace(/^﻿/, '').split('\r\n').slice(1).flatMap((l) => l.split('","').map((c) => c.replace(/^"|"$/g, '')));
    for (const c of cells) expect(c).not.toMatch(/^[=+\-@\t\r]/);
    expect(body).toContain(`"'=HYPERLINK(""http://evil.test"",""x"")"`);
  });
});
