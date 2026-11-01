import { BadRequestException, ConflictException } from '@nestjs/common';
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { Types } from 'mongoose';
import { AdminExtendedOperationsController } from './admin-extended-operations.controller';
import { IssueWarehouseQuotationDto } from './admin-extended-operations.dto';

const id = new Types.ObjectId().toString();
const build = (doc: any) => {
  const model: any = {
    findOneAndUpdate: jest.fn(async (f: any, u: any) => (doc && f.status === doc.status ? { ...doc, ...u.$set } : null)),
    findById: jest.fn(() => ({ select: () => ({ lean: () => ({ exec: async () => doc }) }) })),
  };
  return { ctrl: new (AdminExtendedOperationsController as any)(model), model };
};
const body = { pricingItems: [{ unitPrice: 5 }], totalPrice: 5, reason: 'warehouse price list' };

describe('issue-quote', () => {
  it('prices a request that waits for review and records who and why', async () => {
    const { ctrl, model } = build({ status: 'PENDING_ADMIN_REVIEW' });
    await expect(ctrl.issueWarehouseQuotation(id, body, { id: 'a1' })).resolves.toMatchObject({ success: true });
    const set = model.findOneAndUpdate.mock.calls[0][1].$set;
    expect(set).toMatchObject({ status: 'QUOTATION_ISSUED', quote_issued_by: 'a1', quote_reason: 'warehouse price list' });
    expect(model.findOneAndUpdate.mock.calls[0][0]).toMatchObject({ status: 'PENDING_ADMIN_REVIEW' });
  });
  it('refuses to re-price a request that is already quoted or completed', async () => {
    for (const status of ['QUOTATION_ISSUED', 'COMPLETED']) {
      const { ctrl } = build({ status });
      await expect(ctrl.issueWarehouseQuotation(id, body, { id: 'a1' })).rejects.toThrow(ConflictException);
    }
  });
  it('unknown or malformed id is a 400', async () => {
    await expect(build(null).ctrl.issueWarehouseQuotation(id, body, { id: 'a1' })).rejects.toThrow(BadRequestException);
    await expect(build(null).ctrl.issueWarehouseQuotation('x', body, { id: 'a1' })).rejects.toThrow(BadRequestException);
  });
});

describe('issue-quote input', () => {
  it('refuses an empty list and a line that is not an object, before any write', async () => {
    const { ctrl, model } = build({ status: 'PENDING_ADMIN_REVIEW' });
    await expect(ctrl.issueWarehouseQuotation(id, { ...body, pricingItems: [] }, { id: 'a1' })).rejects.toThrow('pricing_items_must_be_priced_lines');
    await expect(ctrl.issueWarehouseQuotation(id, { ...body, pricingItems: ['x'] }, { id: 'a1' })).rejects.toThrow('pricing_items_must_be_priced_lines');
    expect(model.findOneAndUpdate).not.toHaveBeenCalled();
  });
});

describe('IssueWarehouseQuotationDto', () => {
  const errs = (o: any) => validateSync(plainToInstance(IssueWarehouseQuotationDto, o));
  it('accepts a priced list', () => expect(errs(body)).toEqual([]));
  it('rejects a list over 200 lines and a negative or non-finite total', () => {
    expect(errs({ ...body, pricingItems: Array.from({ length: 201 }, () => ({})) }).length).toBe(1);
    expect(errs({ ...body, totalPrice: -1 }).length).toBe(1);
    expect(errs({ ...body, totalPrice: Infinity }).length).toBe(1);
  });
});
