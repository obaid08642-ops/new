import { OrderSchema, ORDER_HALALA_FIELDS } from './order.schema';
import { TARGETS } from '../modules/finance-integrity/halala-backfill';

describe('orders: R11 P1 integer shadows', () => {
  it('every named money field exists on the order and has a Number `<field>_halalas` shadow', () => {
    for (const f of ORDER_HALALA_FIELDS) {
      expect([f, OrderSchema.path(f)?.instance]).toEqual([f, 'Number']);
      expect([`${f}_halalas`, OrderSchema.path(`${f}_halalas`)?.instance]).toEqual([`${f}_halalas`, 'Number']);
    }
  });

  it('the shadows are optional and have no default (a row that has none yet is filled by the backfill, never invented)', () => {
    for (const f of ORDER_HALALA_FIELDS) {
      const path: any = OrderSchema.path(`${f}_halalas`);
      expect(path.isRequired).toBeFalsy();
      expect(path.options.default).toBeUndefined();
    }
  });

  it('the plugin is installed: saving and updating go through the shadow hooks', () => {
    const hooks = (OrderSchema as any).s.hooks;
    expect(hooks.hasHooks('save')).toBe(true);
    for (const op of ['updateOne', 'updateMany', 'findOneAndUpdate']) expect([op, hooks.hasHooks(op)]).toEqual([op, true]);
  });

  it('the backfill covers the orders collection with exactly the same fields', () => {
    const t = TARGETS.find((x) => x.collection === 'orders');
    expect(t).toBeDefined();
    expect(t!.fields).toEqual(ORDER_HALALA_FIELDS);
    expect(t!.ledger).toBeFalsy();
    expect(t!.signed).toBeFalsy();
  });

  it('the items and the other collections are untouched: item prices have no shadow', () => {
    expect(OrderSchema.path('items')).toBeDefined();
    expect(OrderSchema.path('items_halalas')).toBeUndefined();
  });
});
