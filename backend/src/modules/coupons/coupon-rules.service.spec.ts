import { BadRequestException } from '@nestjs/common';
import { CouponRulesService } from './coupon-rules.service';

function memCollection(seed: Array<Record<string, unknown>> = []) {
  const docs: Array<Record<string, unknown>> = [...seed];
  const match = (doc: Record<string, unknown>, filter: Record<string, unknown>): boolean =>
    Object.entries(filter || {}).every(([k, cond]) => {
      const v = doc[k];
      if (cond !== null && typeof cond === 'object' && !(cond instanceof Date) && !Array.isArray(cond)) {
        const c = cond as Record<string, unknown>;
        if ('$eq' in c) return v === c['$eq'];
        if ('$in' in c) return (c['$in'] as unknown[]).includes(v);
        if ('$gte' in c) return new Date(String(v)).getTime() >= new Date(String(c['$gte'])).getTime();
        return false;
      }
      return v === cond;
    });
  return {
    docs,
    find: jest.fn().mockImplementation(async (filter: Record<string, unknown>) => ({
      toArray: jest.fn().mockResolvedValue(docs.filter((d) => match(d, filter))),
    })),
    countDocuments: jest.fn().mockImplementation(async (filter: Record<string, unknown>) => {
      if (!filter || Object.keys(filter).length === 0) return docs.length;
      return docs.filter((d) => match(d, filter)).length;
    }),
  };
}

describe('CouponRulesService (P22.15 stacking engine)', () => {
  const save10 = { code: 'SAVE10', stackable: false };
  const stack5 = { code: 'STACK5', stackable: true };
  const stack2 = { code: 'STACK2', stackable: true };

  function setup(opts: {
    coupons?: Array<Record<string, unknown>>;
    failures?: number;
    validate?: (code: string) => { valid: boolean; discount: number; reason?: string };
  } = {}) {
    const failures = Array.from({ length: opts.failures ?? 0 }, () => ({
      user_id: 'u-1',
      at: new Date(),
    }));
    const collections: Record<string, ReturnType<typeof memCollection>> = {
      coupons: memCollection(opts.coupons ?? [save10, stack5, stack2]),
      coupon_failures: memCollection(failures),
    };
    const conn = { collection: jest.fn((n: string) => collections[n]) };
    const single = {
      validate: jest.fn().mockImplementation(async (_uid: string, code: string) => {
        if (opts.validate) return opts.validate(code);
        const table: Record<string, number> = { SAVE10: 10, STACK5: 5, STACK2: 2 };
        return { valid: true, discount: table[code] ?? 0 };
      }),
      apply: jest.fn().mockResolvedValue({ ok: true }),
      release: jest.fn().mockResolvedValue(null),
    };
    const service = new CouponRulesService(conn as never, single as never);
    return { service, single, collections };
  }

  it('evaluates a single non-stackable code', async () => {
    const { service, single } = setup();
    const out = await service.evaluateStack('u-1', { codes: ['save10'], order_total: 100 });
    expect(out).toMatchObject({ valid: true, total_discount: 10 });
    expect(out.codes).toEqual([{ code: 'SAVE10', discount: 10, stackable: false }]);
    expect(single.validate).toHaveBeenCalledWith('u-1', 'SAVE10', expect.objectContaining({ order_total: 100 }));
  });

  it('stacks stackable codes and caps at the order total', async () => {
    const { service } = setup();
    const out = await service.evaluateStack('u-1', {
      codes: ['STACK5', 'STACK2'],
      order_total: 6,
    });
    expect(out.valid).toBe(true);
    expect(out.total_discount).toBe(6);
  });

  it('refuses to combine a non-stackable code (stacking limit)', async () => {
    const { service, single } = setup();
    const out = await service.evaluateStack('u-1', {
      codes: ['SAVE10', 'STACK5'],
      order_total: 100,
    });
    expect(out).toMatchObject({ valid: false, codes: [] });
    expect(String(out.reason)).toMatch('stacking_not_allowed');
    expect(single.apply).not.toHaveBeenCalled();
  });

  it('fails closed when any single-code leg is invalid', async () => {
    const { service } = setup({
      validate: (code) =>
        code === 'STACK5'
          ? { valid: false, discount: 0, reason: 'already_used' }
          : { valid: true, discount: 5 },
    });
    const out = await service.evaluateStack('u-1', {
      codes: ['STACK5', 'STACK2'],
      order_total: 100,
    });
    expect(out.valid).toBe(false);
    expect(String(out.reason)).toMatch('already_used');
  });

  it('rejects unknown codes and oversized stacks', async () => {
    const { service } = setup();
    const unknown = await service.evaluateStack('u-1', { codes: ['NOPE'], order_total: 50 });
    expect(unknown).toMatchObject({ valid: false, codes: [] });
    expect(String(unknown.reason)).toMatch('unknown_codes');
    const big = await service.evaluateStack('u-1', {
      codes: ['A', 'B', 'C', 'D'],
      order_total: 50,
    });
    expect(String(big.reason)).toMatch('too_many_codes');
  });

  it('blocks evaluation under abuse pressure (mirrors FraudService threshold)', async () => {
    const { service, single } = setup({ failures: 10 });
    const out = await service.evaluateStack('u-1', { codes: ['SAVE10'], order_total: 100 });
    expect(out).toMatchObject({ valid: false, reason: 'coupon_abuse_suspected' });
    expect(single.validate).not.toHaveBeenCalled();
  });

  it('applies a valid stack and compensates on partial failure', async () => {
    const { service, single } = setup();
    single.apply
      .mockResolvedValueOnce({ ok: true })
      .mockRejectedValueOnce(new BadRequestException('coupon_invalid: max_uses_reached'));
    await expect(
      service.applyStack('u-1', { codes: ['STACK5', 'STACK2'], order_total: 100, order_id: 'ord-9' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    // One usage was applied then compensated exactly once.
    expect(single.apply).toHaveBeenCalledTimes(2);
    expect(single.release).toHaveBeenCalledTimes(1);
    expect(single.release).toHaveBeenCalledWith('ord-9');
  });

  it('applies a valid stack end to end', async () => {
    const { service, single } = setup();
    const out = await service.applyStack('u-1', {
      codes: ['STACK5', 'STACK2'],
      order_total: 100,
      order_id: 'ord-1',
    });
    expect(out).toMatchObject({ order_id: 'ord-1', total_discount: 7 });
    expect(single.apply).toHaveBeenCalledTimes(2);
  });
});
