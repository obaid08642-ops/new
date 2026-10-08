import { MedicinesService } from './medicines.service';

/** Admin journey 2: a price correction keeps an approved medicine public; a medical-content change sends it back to review. */
describe('MedicinesService.adminUpdateCatalog: which edits need a fresh medical review', () => {
  const approved = { id: 'm1', name_ar: 'دواء', price: 10, public_eligibility: true, indexing_eligibility: true, medical_review_status: 'approved', verified: true };
  const make = () => {
    const svc: any = Object.create(MedicinesService.prototype);
    svc.getById = jest.fn(async () => ({ ...approved }));
    svc.model = { updateOne: jest.fn(async () => ({})) };
    svc.conn = { collection: () => ({ insertOne: jest.fn(async () => ({})) }) };
    svc.events = { emit: jest.fn() };
    svc.refreshPublicProjection = jest.fn(async () => undefined);
    svc.audit = jest.fn();
    svc.invalidateCache = jest.fn(async () => undefined);
    return svc;
  };
  const setOf = (svc: any) => svc.model.updateOne.mock.calls[0][1].$set;

  it('a price correction keeps the item public (no review reset) and refreshes the public copy', async () => {
    const svc = make();
    const r = await svc.adminUpdateCatalog('m1', { price: 12, reason: 'supplier price list' }, 'adm');
    expect(r.requires_reapproval).toBe(false);
    expect(setOf(svc)).toEqual(expect.objectContaining({ price: 12 }));
    expect(setOf(svc).public_eligibility).toBeUndefined();
    expect(svc.refreshPublicProjection).toHaveBeenCalledWith(expect.anything(), 'adm', 'medicine_admin_edit');
  });

  it('marking an item controlled or online-only does not unpublish it', async () => {
    const svc = make();
    const r = await svc.adminUpdateCatalog('m1', { controlled: true, online_exclusive: true }, 'adm');
    expect(r.requires_reapproval).toBe(false);
    expect(setOf(svc)).toEqual(expect.objectContaining({ controlled: true, online_exclusive: true }));
  });

  it('a medical-content change (warnings, prescription flag) takes it down for review', async () => {
    for (const patch of [{ warnings_ar: ['تحذير'] }, { requires_prescription: false }]) {
      const svc = make();
      const r = await svc.adminUpdateCatalog('m1', patch, 'adm');
      expect(r.requires_reapproval).toBe(true);
      expect(setOf(svc)).toEqual(expect.objectContaining({ public_eligibility: false, medical_review_status: 'pending' }));
    }
  });
});
