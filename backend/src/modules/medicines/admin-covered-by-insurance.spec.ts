import { BadRequestException } from '@nestjs/common';
import { MedicinesService } from './medicines.service';

// #456 / #1601: the admin catalogue writes Medicine.covered_by_insurance (insurance company ids); the product page's
// "covered by <company>" row reads it. Only an admin edit sets it, and every id must be an active company.
describe('admin catalogue: covered_by_insurance', () => {
  const COMPANIES = [{ id: 'bupa', active: true }, { id: 'tawuniya', is_active: true }, { id: 'old', active: false }];
  const make = (stored: Record<string, unknown> = { id: 'm1', name_ar: 'دواء', price: 10 }) => {
    const svc: any = Object.create(MedicinesService.prototype);
    svc.getById = jest.fn(async () => ({ ...stored }));
    svc.model = { updateOne: jest.fn(async () => ({})), create: jest.fn(async () => ({})) };
    svc.conn = { collection: (name: string) => ({
      insertOne: jest.fn(async () => ({})),
      findOne: jest.fn(async () => null),
      find: jest.fn((q: any) => ({ toArray: async () => (name === 'insurance_companies' ? COMPANIES.filter((c) => q.id.$in.includes(c.id) && c.active !== false && (c as any).is_active !== false) : []) })),
    }) };
    svc.events = { emit: jest.fn() };
    svc.refreshPublicProjection = jest.fn(async () => undefined);
    svc.audit = jest.fn();
    svc.invalidateCache = jest.fn(async () => undefined);
    svc.canApproveCatalog = jest.fn(async () => true);
    return svc;
  };

  it('an edit saves the unique, validated company ids', async () => {
    const svc = make();
    await svc.adminUpdateCatalog('m1', { covered_by_insurance: ['bupa', 'tawuniya', 'bupa'], reason: 'insurer list' }, 'adm');
    expect(svc.model.updateOne.mock.calls[0][1].$set.covered_by_insurance).toEqual(['bupa', 'tawuniya']);
  });

  it('an empty list clears the coverage', async () => {
    const svc = make();
    await svc.adminUpdateCatalog('m1', { covered_by_insurance: [], reason: 'insurer list' }, 'adm');
    expect(svc.model.updateOne.mock.calls[0][1].$set.covered_by_insurance).toEqual([]);
  });

  it('an unknown or inactive company is refused and nothing is saved', async () => {
    const svc = make();
    await expect(svc.adminUpdateCatalog('m1', { covered_by_insurance: ['bupa', 'nope'] }, 'adm')).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.adminUpdateCatalog('m1', { covered_by_insurance: ['old'] }, 'adm')).rejects.toThrow('insurance_company_not_found');
    expect(svc.model.updateOne).not.toHaveBeenCalled();
  });

  it('create keeps the validated ids too', async () => {
    const svc = make();
    await svc.adminCreateCatalog({ name_ar: 'دواء جديد', covered_by_insurance: ['tawuniya'] }, 'adm');
    expect(svc.model.create.mock.calls[0][0].covered_by_insurance).toEqual(['tawuniya']);
  });

  it('a pharmacy suggestion path never takes the field (it is not in the editable list)', () => {
    expect((MedicinesService as any).EDITABLE_FIELDS).not.toContain('covered_by_insurance');
    expect((MedicinesService as any).ADMIN_ONLY_FIELDS).toContain('covered_by_insurance');
  });
});
