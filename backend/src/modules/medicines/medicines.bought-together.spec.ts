import { MedicinesService } from './medicines.service';
import { NOT_PROMOTABLE_FILTER } from './promotion-rules';

const warfarin = { id: 'm-warf', active_ingredient: 'warfarin', name_en: 'Warfarin', requires_prescription: true };
const paracetamol = { id: 'm-para', active_ingredient: 'paracetamol', name_en: 'Paracetamol 500', requires_prescription: false, controlled: false };

function build(opts: { source: any; pairs?: { _id: string; orders: number }[]; candidates?: any[] }) {
  const findFilter = jest.fn((..._args: any[]) => ({ limit: async () => opts.candidates ?? [] }));
  const aggregate = jest.fn((..._args: any[]) => ({ toArray: async () => opts.pairs ?? [] }));
  const conn: any = { collection: () => ({ aggregate }) };
  const model: any = { find: findFilter };
  const svc: any = Object.assign(Object.create(MedicinesService.prototype), {
    conn, model, getPublicById: jest.fn(async () => opts.source),
  });
  return { svc: svc as MedicinesService, findFilter, aggregate };
}

describe('MedicinesService promotion (22.3)', () => {
  it('a prescription item suggests nothing, and reads no orders', async () => {
    const { svc, aggregate } = build({ source: warfarin, pairs: [{ _id: 'm-para', orders: 3 }] });
    expect(await svc.frequentlyBoughtTogether('m-warf')).toEqual([]);
    expect(aggregate).not.toHaveBeenCalled();
  });

  it('suggests the items most often bought with this one, counted per order, never prescription items', async () => {
    const { svc, findFilter } = build({
      source: paracetamol,
      pairs: [{ _id: 'm-warf', orders: 9 }, { _id: 'm-para2', orders: 4 }],
      candidates: [{ id: 'm-para2', name_en: 'Vitamin C' }],
    });
    const out = await svc.frequentlyBoughtTogether('m-para');
    expect(findFilter.mock.calls[0][0]).toEqual(expect.objectContaining(NOT_PROMOTABLE_FILTER));
    expect(out.map((r) => r.med.id)).toEqual(['m-para2']);
  });

  it('attaches the interaction warnings against the item being viewed', async () => {
    const aspirin = { id: 'm-asp', active_ingredient: 'aspirin', name_en: 'Aspirin', requires_prescription: false };
    const { svc } = build({ source: { ...paracetamol, active_ingredient: 'warfarin' }, pairs: [{ _id: 'm-asp', orders: 2 }], candidates: [aspirin] });
    const out = await svc.frequentlyBoughtTogether('m-para');
    expect(out[0].warnings.map((w) => w.code)).toEqual(['bleeding_risk']);
  });

  it('shows only pairings seen in at least 3 orders, most frequent first, sorted before the limit', async () => {
    const { svc, aggregate } = build({ source: paracetamol, pairs: [], candidates: [] });
    await svc.frequentlyBoughtTogether('m-para');
    const pipeline = (aggregate.mock.calls[0] as any[])[0] as Array<Record<string, any>>;
    expect(pipeline).toContainEqual({ $match: { orders: { $gte: 3 } } });
    const sortAt = pipeline.findIndex((st) => '$sort' in st);
    const limitAt = pipeline.findIndex((st) => '$limit' in st);
    expect(sortAt).toBeGreaterThanOrEqual(0);
    expect(sortAt).toBeLessThan(limitAt);
  });

  it('alternatives also exclude prescription and controlled items', async () => {
    const findFilter = jest.fn((..._args: any[]) => ({ limit: async () => [] }));
    const svc: any = Object.assign(Object.create(MedicinesService.prototype), {
      model: { find: findFilter }, getPublicById: jest.fn(async () => paracetamol),
    });
    await svc.alternatives('m-para');
    expect(findFilter.mock.calls[0][0]).toEqual(expect.objectContaining(NOT_PROMOTABLE_FILTER));
  });
});
