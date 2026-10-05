// R11 §5 lead 8 (corrected after the independent check): max_redeem_percent
// had only @Min(0). PRODUCT.md caps loyalty points at 10% of the order, so the
// admin setting is bounded at 10 on every write path (DTO, service, the compat
// PUT /loyalty/config) and clamped when it is read for a redemption.
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BadRequestException } from '@nestjs/common';
import { LoyaltyConfigDto } from './loyalty.dto';
import { LoyaltyRedeemService } from '../finance-engine/finance-engine.module';

describe('loyalty redemption cap is 10% (R11 §5 lead 8)', () => {
  const errorsFor = async (v: number) => validate(plainToInstance(LoyaltyConfigDto, { max_redeem_percent: v }));
  it('the DTO accepts 0 to 10 and refuses more', async () => {
    for (const v of [0, 5, 10]) expect(await errorsFor(v)).toHaveLength(0);
    for (const v of [11, 100, 150]) expect((await errorsFor(v)).map((e) => e.property)).toContain('max_redeem_percent');
  });

  it('a stored value above 10 is clamped when quoting a redemption', async () => {
    const conn: any = { collection: (name: string) => ({ findOne: async () => (name === 'loyalty_config' || name === 'finance_config' ? { key: 'global', value: { max_redeem_percent: 100, point_value_sar: 1 } } : { points: 1000 }) }) };
    const svc: any = Object.create(LoyaltyRedeemService.prototype);
    svc.conn = conn;
    const q = await svc.quote('p1', 200);
    expect(q.max_redeem_percent).toBe(10);
    expect(q.max_points_for_order).toBe(20);
  });

  it('the compat admin PUT refuses more than 10', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('../compat/admin-spa.module');
    const C = Object.values(mod).find((c: any) => typeof c === 'function' && c.prototype?.putConfig && /loyalty/.test(String(Reflect.getMetadata('path', c)))) as any;
    const ctrl = Object.create(C.prototype);
    ctrl.conn = { collection: () => ({ updateOne: jest.fn() }) };
    await expect(ctrl.putConfig({ id: 'adm' }, { max_redeem_percent: 50 })).rejects.toBeInstanceOf(BadRequestException);
  });
});
