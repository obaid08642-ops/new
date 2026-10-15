import { BadRequestException } from '@nestjs/common';
import { MedicinesService } from './medicines.service';

// needs-review admin-catalogue#18/#20: the prescription and controlled flags need a typed reason, and every
// flag or availability change leaves a per-item row (who, when, old -> new, reason) in the history the quick
// edit reads (GET admin/catalog/:id/price-history).
describe('MedicinesService per-item history for flags and availability', () => {
  const rows: any[] = [];
  const users = [{ id: 'adm-1', full_name: 'Catalogue Admin' }];
  const make = (med: any) => {
    const model: any = {
      findOne: jest.fn().mockResolvedValue(med),
      updateOne: jest.fn().mockResolvedValue({}),
    };
    const conn: any = {
      collection: jest.fn((name: string) => ({
        insertOne: jest.fn(async (doc: any) => { rows.push(doc); return {}; }),
        findOne: jest.fn(async () => null),
        find: jest.fn((q: any) => {
          const pick = name === 'users' ? users.filter((u) => q.id.$in.includes(u.id)) : rows.filter((r) => r.medicine_id === q.medicine_id);
          const cursor: any = { sort: () => cursor, skip: () => cursor, limit: () => cursor, toArray: async () => pick };
          return cursor;
        }),
        countDocuments: jest.fn(async (q: any) => rows.filter((r) => r.medicine_id === q.medicine_id).length),
      })),
    };
    const service = new MedicinesService(model as any, { emit: jest.fn() } as any, {} as any, conn as any, {} as any);
    (service as any).invalidateCache = jest.fn(async () => undefined);
    (service as any).audit = jest.fn();
    return { service, model };
  };
  const draft = () => ({ id: 'med-1', name_ar: 'دواء', price: 50, requires_prescription: false, medical_review_status: 'pending' });

  beforeEach(() => { rows.length = 0; jest.clearAllMocks(); });

  it('rejects a controlled-flag change without a reason', async () => {
    const { service } = make(draft());
    await expect(service.adminUpdateCatalog('med-1', { controlled: true }, 'adm-1')).rejects.toThrow(BadRequestException);
    expect(rows).toHaveLength(0);
  });

  it('rejects a prescription-flag change without a reason', async () => {
    const { service } = make(draft());
    await expect(service.adminUpdateCatalog('med-1', { requires_prescription: true, reason: 'x' }, 'adm-1')).rejects.toThrow('flag_change_reason_required');
  });

  it('saves controlled and writes a history row with old/new, who and the reason', async () => {
    const { service, model } = make(draft());
    await service.adminUpdateCatalog('med-1', { controlled: true, reason: 'SFDA narcotic schedule' }, 'adm-1');
    expect(model.updateOne.mock.calls[0][1].$set).toEqual(expect.objectContaining({ controlled: true }));
    expect(rows).toEqual([expect.objectContaining({
      medicine_id: 'med-1', field: 'controlled', before: null, after: true, reason: 'SFDA narcotic schedule', changed_by: 'adm-1',
    })]);
  });

  it('re-sending an unchanged false flag neither needs a reason nor writes a row', async () => {
    const { service } = make({ ...draft(), requires_prescription: undefined });
    await service.adminUpdateCatalog('med-1', { requires_prescription: false, name_ar: 'دواء 2' }, 'adm-1');
    expect(rows.filter((r) => r.field === 'requires_prescription')).toHaveLength(0);
  });

  it('an availability change writes a row with the typed reason', async () => {
    const { service } = make({ ...draft(), availability_status: 'none' });
    await service.setAvailability('med-1', 'adm-1', 'discontinued', 'manufacturer stopped production');
    expect(rows).toEqual([expect.objectContaining({
      field: 'availability_status', before: 'none', after: 'discontinued', reason: 'manufacturer stopped production', changed_by: 'adm-1',
    })]);
  });

  it('setting the same availability writes no row', async () => {
    const { service } = make({ ...draft(), availability_status: 'discontinued' });
    await service.setAvailability('med-1', 'adm-1', 'discontinued', 'same');
    expect(rows).toHaveLength(0);
  });

  it('the history read names who made each change', async () => {
    const { service } = make(draft());
    await service.adminUpdateCatalog('med-1', { controlled: true, reason: 'SFDA narcotic schedule' }, 'adm-1');
    const h = await service.getPriceHistory('med-1', 1, 5);
    expect(h.data[0]).toEqual(expect.objectContaining({ field: 'controlled', changed_by_name: 'Catalogue Admin' }));
  });
});
