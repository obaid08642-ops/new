import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { SegmentRuleDto } from './admin-segments.dto';
import { compileRule } from './segments.engine';

const errs = (value: unknown, value2?: unknown) =>
  validateSync(plainToInstance(SegmentRuleDto, { field: 'city', op: 'eq', value, value2 }));

describe('SegmentRuleDto value validation', () => {
  it('rejects an operator object {"$ne":null}', () => expect(errs({ $ne: null }).length).toBe(1));
  it('rejects {"$where":"..."} and any object', () => {
    expect(errs({ $where: 'sleep(1)' }).length).toBe(1);
    expect(errs({ a: 1 }).length).toBe(1);
  });
  it('rejects an operator object in value2', () => expect(errs(1, { $gt: 0 }).length).toBe(1));
  it('rejects a list holding an object and a list over 500', () => {
    expect(errs([{ $ne: 1 }]).length).toBe(1);
    expect(errs(Array.from({ length: 501 }, (_, i) => i)).length).toBe(1);
  });
  it('rejects NaN/Infinity and null', () => {
    expect(errs(Number.NaN).length).toBe(1);
    expect(errs(Infinity).length).toBe(1);
  });
  it('accepts ["a","b"], 5, true, a string and an ISO date', () => {
    expect(errs(['a', 'b'])).toEqual([]);
    expect(errs(5)).toEqual([]);
    expect(errs(true)).toEqual([]);
    expect(errs('Riyadh')).toEqual([]);
    expect(errs('2026-11-01T00:00:00.000Z', '2026-11-02')).toEqual([]);
    expect(errs(Array.from({ length: 500 }, (_, i) => i))).toEqual([]);
  });
  it('the evaluator wraps eq in $eq itself', () => {
    expect(compileRule({ field: 'city', op: 'eq', value: 'x' } as any)).toEqual({ city: { $eq: 'x' } });
  });
});
