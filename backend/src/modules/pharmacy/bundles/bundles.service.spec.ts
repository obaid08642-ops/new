import { NotFoundException } from '@nestjs/common';
import {
  alternativesByIngredient,
  applyNoRxCrossSell,
  coPurchasePairs,
  interactionWarnings,
  partnersOf,
} from './bundle-rules';
import { BundlesService } from './bundles.service';

describe('bundle-rules (P22.3 pharmacist-safe pure rules)', () => {
  it('counts co-purchase pairs once per basket with a support floor', () => {
    const pairs = coPurchasePairs(
      [['a', 'b'], ['a', 'b'], ['a', 'c'], ['a', 'a', 'b']],
      2,
    );
    expect(pairs).toEqual([{ a: 'a', b: 'b', support: 3 }]);
  });

  it('returns top partners of one medicine', () => {
    const pairs = coPurchasePairs(
      [['a', 'b'], ['a', 'b'], ['a', 'c'], ['a', 'c'], ['a', 'd'], ['a', 'd']],
      2,
    );
    expect(partnersOf(pairs, 'a', 2)).toHaveLength(2);
    expect(partnersOf(pairs, 'zzz')).toEqual([]);
  });

  it('NEVER cross-sells prescription items (rule 1)', () => {
    const rx = {
      medicine_id: 'rx-1',
      active_ingredient: 'x',
      requires_prescription: true,
      interactions: [],
    };
    const otc = {
      medicine_id: 'otc-1',
      active_ingredient: 'y',
      requires_prescription: false,
      interactions: [],
    };
    const pick = applyNoRxCrossSell([rx, otc]);
    expect(pick.items.map((i) => i.medicine_id)).toEqual(['otc-1']);
    expect(pick.excludedRx).toEqual(['rx-1']);
  });

  it('warns on forward interactions with current medicines (rule 2)', () => {
    const suggested = [
      {
        medicine_id: 's-1',
        active_ingredient: 'ibuprofen',
        requires_prescription: false,
        interactions: ['warfarin'],
      },
    ];
    const warnings = interactionWarnings(suggested, ['Warfarin']);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({
      suggested_id: 's-1',
      interacts_with: 'warfarin',
    });
  });

  it('warns on reverse interactions (patient med lists the suggestion)', () => {
    const suggested = [
      {
        medicine_id: 's-2',
        active_ingredient: 'potassium',
        requires_prescription: false,
        interactions: [],
      },
    ];
    const patientMeds = [
      {
        medicine_id: 'p-1',
        active_ingredient: 'lisinopril',
        requires_prescription: true,
        interactions: ['potassium'],
      },
    ];
    const warnings = interactionWarnings(suggested, ['lisinopril'], patientMeds);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].suggested_id).toBe('s-2');
  });

  it('does not warn when the suggestion IS the same ingredient', () => {
    const suggested = [
      {
        medicine_id: 's-3',
        active_ingredient: 'metformin',
        requires_prescription: false,
        interactions: ['metformin'],
      },
    ];
    expect(interactionWarnings(suggested, ['metformin'])).toEqual([]);
  });

  it('finds same-ingredient alternatives excluding self (Rx kept, flagged downstream)', () => {
    const catalog = [
      { medicine_id: 'a', active_ingredient: 'Metformin', requires_prescription: false, interactions: [] },
      { medicine_id: 'b', active_ingredient: 'metformin', requires_prescription: true, interactions: [] },
      { medicine_id: 'c', active_ingredient: 'aspirin', requires_prescription: false, interactions: [] },
    ];
    const alts = alternativesByIngredient(catalog, 'metformin', 'a');
    expect(alts.map((m) => m.medicine_id)).toEqual(['b']);
    expect(alternativesByIngredient(catalog, null, 'a')).toEqual([]);
  });
});

describe('BundlesService (P22.3 co-purchase + alternatives)', () => {
  const medA = {
    id: 'med-a', name_ar: 'أ', price: 10,
    active_ingredient: 'paracetamol', requires_prescription: false, interactions: [],
  };
  const medB = {
    id: 'med-b', name_ar: 'ب', price: 20,
    active_ingredient: 'ibuprofen', requires_prescription: false, interactions: ['warfarin'],
  };
  const medC = {
    id: 'med-c', name_ar: 'ج', price: 30,
    active_ingredient: 'amox', requires_prescription: true, interactions: [],
  };
  const medD = {
    id: 'med-d', name_ar: 'د', price: 12,
    active_ingredient: 'paracetamol', requires_prescription: false, interactions: [],
  };
  const medE = {
    id: 'med-e', name_ar: 'هـ', price: 15,
    active_ingredient: 'paracetamol', requires_prescription: true, interactions: [],
    availability_status: 'in_stock',
  };
  const medF = {
    id: 'med-f', name_ar: 'و', price: 9,
    active_ingredient: 'paracetamol', requires_prescription: false, interactions: [],
    availability_status: 'discontinued',
  };

  function setup(opts: {
    prescriptions?: Array<Record<string, unknown>>;
    orders?: Array<Record<string, unknown>>;
    governed?: Array<Record<string, unknown>>;
  } = {}) {
    const meds = [medA, medB, medC, medD, medE, medF];
    const match = (doc: Record<string, unknown>, filter: Record<string, unknown>): boolean =>
      Object.entries(filter || {}).every(([k, cond]) => {
        const v = doc[k];
        if (cond !== null && typeof cond === 'object' && !Array.isArray(cond)) {
          const c = cond as Record<string, unknown>;
          if ('$eq' in c) return v === c['$eq'];
          if ('$in' in c) {
            if (Array.isArray(v)) return v.some((x) => (c['$in'] as unknown[]).includes(x));
            return (c['$in'] as unknown[]).includes(v);
          }
          if ('$nin' in c) return !(c['$nin'] as unknown[]).includes(v);
          return false;
        }
        return v === cond;
      });
    const coll = (docs: Array<Record<string, unknown>>) => ({
      findOne: jest.fn().mockImplementation(async (f: Record<string, unknown>) => {
        const hit = docs.find((d) => match(d, f));
        return hit ? { ...hit } : null;
      }),
      find: jest.fn().mockImplementation(async (f: Record<string, unknown>) => ({
        toArray: jest
          .fn()
          .mockResolvedValue(docs.filter((d) => match(d, f)).map((d) => ({ ...d }))),
      })),
    });
    const collections: Record<string, ReturnType<typeof coll>> = {
      medicines: coll(meds),
      orders: coll(
        opts.orders ?? [
          { state: 'DELIVERED', items: [{ medicine_id: 'med-a' }, { medicine_id: 'med-b' }] },
          { state: 'DELIVERED', items: [{ medicine_id: 'med-a' }, { medicine_id: 'med-b' }] },
          { state: 'DELIVERED', items: [{ medicine_id: 'med-a' }, { medicine_id: 'med-c' }] },
          { state: 'DELIVERED', items: [{ medicine_id: 'med-a' }, { medicine_id: 'med-c' }] },
        ],
      ),
      pharmacy_orders: coll(opts.governed ?? []),
      prescriptions: coll(
        opts.prescriptions ?? [
          { patient_id: 'patient-1', items: [{ active_ingredient: 'warfarin' }] },
        ],
      ),
    };
    const conn = { collection: jest.fn((n: string) => collections[n]) };
    return new BundlesService(conn as never);
  }

  it('builds bundles from history, excludes Rx, attaches warnings', async () => {
    const svc = setup();
    const out = await svc.frequentlyBoughtTogether('med-a', 'patient-1');
    expect(out.anchor_id).toBe('med-a');
    // med-b suggested (support 2); med-c is Rx → transparency list only.
    expect(out.suggestions.map((s) => s.medicine_id)).toEqual(['med-b']);
    expect(out.suggestions[0]).toMatchObject({ support: 2, requires_prescription: false });
    expect(out.excluded_rx_ids).toEqual(['med-c']);
    expect(out.interaction_warnings).toHaveLength(1);
    expect(out.interaction_warnings[0]).toMatchObject({
      suggested_id: 'med-b',
      interacts_with: 'warfarin',
    });
  });

  it('omits warnings for anonymous callers but still excludes Rx', async () => {
    const svc = setup();
    const out = await svc.frequentlyBoughtTogether('med-a');
    expect(out.suggestions.map((s) => s.medicine_id)).toEqual(['med-b']);
    expect(out.interaction_warnings).toEqual([]);
    expect(out.excluded_rx_ids).toEqual(['med-c']);
  });

  it('returns empty suggestions when history is thin', async () => {
    const svc = setup({ orders: [], governed: [] });
    const out = await svc.frequentlyBoughtTogether('med-a', 'patient-1');
    expect(out.suggestions).toEqual([]);
    expect(out.excluded_rx_ids).toEqual([]);
  });

  it('lists same-ingredient alternatives, drops discontinued, flags Rx', async () => {
    const svc = setup();
    const out = await svc.alternatives('med-a', 'patient-1');
    const ids = out.suggestions.map((s) => s.medicine_id).sort();
    expect(ids).toEqual(['med-d', 'med-e']);
    expect(out.suggestions.find((s) => s.medicine_id === 'med-e')?.requires_prescription).toBe(
      true,
    );
    expect(out.excluded_rx_ids).toEqual([]);
  });

  it('404s on an unknown anchor', async () => {
    const svc = setup();
    await expect(svc.frequentlyBoughtTogether('nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(svc.alternatives('nope')).rejects.toBeInstanceOf(NotFoundException);
  });
});
