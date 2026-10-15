import { MedicinesService } from './medicines.service';

/**
 * Admin journey 2 + F8 (owner decision 2026-10-05, pending revision b): an approver's edit is published directly and
 * keeps the item public; an editor without catalog.approve leaves a pending revision and the approved version stays live.
 */
describe('MedicinesService.adminUpdateCatalog: which edits need a fresh medical review', () => {
  const approved = { id: 'm1', name_ar: 'دواء', price: 10, public_eligibility: true, indexing_eligibility: true, medical_review_status: 'approved', verified: true };
  const ADMIN = { id: 'adm', role: 'admin' };
  const EDITOR = { id: 'ed', role: 'support_agent', permissions: ['catalog.update'] };
  const make = () => {
    const svc: any = Object.create(MedicinesService.prototype);
    svc.getById = jest.fn(async () => ({ ...approved }));
    svc.model = { updateOne: jest.fn(async () => ({})) };
    svc.conn = { collection: (name: string) => ({
      insertOne: jest.fn(async () => ({})),
      findOne: jest.fn(async (q: any) => (name === 'users' ? [ADMIN, EDITOR].find((u) => u.id === q?.id?.$eq) ?? null : null)),
    }) };
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
    const r = await svc.adminUpdateCatalog('m1', { controlled: true, online_exclusive: true, reason: 'narcotic schedule' }, 'adm');
    expect(r.requires_reapproval).toBe(false);
    expect(setOf(svc)).toEqual(expect.objectContaining({ controlled: true, online_exclusive: true }));
  });

  it('an approver publishes a medical-content change directly; the item stays public', async () => {
    for (const patch of [{ warnings_ar: ['تحذير'] }, { requires_prescription: false }]) {
      const svc = make();
      const r = await svc.adminUpdateCatalog('m1', patch, 'adm');
      expect(r.requires_reapproval).toBe(false);
      expect(setOf(svc)).toEqual(expect.objectContaining(patch));
      expect(setOf(svc).public_eligibility).toBeUndefined();
    }
  });

  it('an editor without catalog.approve leaves a pending revision; the live item is not touched', async () => {
    const svc = make();
    const r = await svc.adminUpdateCatalog('m1', { warnings_ar: ['تحذير'] }, 'ed');
    expect(r).toEqual(expect.objectContaining({ requires_reapproval: true, pending_revision: true }));
    expect(setOf(svc)).toEqual({ pending_revision: expect.objectContaining({ changes: { warnings_ar: ['تحذير'] }, submitted_by: 'ed' }), updatedAt: expect.any(Date) });
    expect(svc.refreshPublicProjection).not.toHaveBeenCalled();
  });
});
