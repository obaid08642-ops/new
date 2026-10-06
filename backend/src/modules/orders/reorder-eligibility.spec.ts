import { NotFoundException } from '@nestjs/common';
import { ReorderEligibilityService } from './reorder-eligibility.service';
import {
  classifyRxLine,
  isPrescriptionValidAt,
  prescriptionCovers,
  resolvePrescriptionExpiry,
} from './prescription-validity';

describe('prescription-validity (P22.1 pure helpers)', () => {
  const day = 24 * 3600 * 1000;
  const base = new Date('2026-09-01T00:00:00Z');

  it('derives expiry from verified_at + validity window', () => {
    const exp = resolvePrescriptionExpiry({ verified_at: base }, 90);
    expect(exp?.toISOString()).toBe(
      new Date(base.getTime() + 90 * day).toISOString(),
    );
  });

  it('prefers an explicit valid_until override', () => {
    const exp = resolvePrescriptionExpiry(
      { verified_at: base, valid_until: '2026-12-31T00:00:00Z' },
      90,
    );
    expect(exp?.toISOString()).toBe('2026-12-31T00:00:00.000Z');
  });

  it('returns null when no date anchor exists', () => {
    expect(resolvePrescriptionExpiry({})).toBeNull();
    expect(isPrescriptionValidAt({})).toBe(false);
  });

  it('is invalid exactly at expiry (no refill past expiry, boundary-safe)', () => {
    const rx = { verified_at: base };
    const expiry = resolvePrescriptionExpiry(rx, 90) as Date;
    expect(
      isPrescriptionValidAt(rx, new Date(expiry.getTime() - 1), 90),
    ).toBe(true);
    expect(isPrescriptionValidAt(rx, expiry, 90)).toBe(false);
  });

  it('covers by medicine id or by active ingredient', () => {
    const rx = {
      items: [{ medicine_id: 'med-a' }, { active_ingredient: 'metformin' }],
    };
    expect(prescriptionCovers(rx, 'med-a')).toBe(true);
    expect(prescriptionCovers(rx, 'other', 'METFORMIN')).toBe(true);
    expect(prescriptionCovers(rx, 'other', 'aspirin')).toBe(false);
    expect(prescriptionCovers({ items: [] }, 'med-a')).toBe(false);
  });

  it('classifies non-Rx lines as not_required without a prescription', () => {
    expect(
      classifyRxLine({ requiresPrescription: false, covering: null }),
    ).toEqual({ status: 'not_required', validUntil: null });
    expect(
      classifyRxLine({ requiresPrescription: true, covering: null }),
    ).toMatchObject({ status: 'missing' });
  });
});

describe('ReorderEligibilityService (P22.1 order-again gaps)', () => {
  const patient = { id: 'patient-1' };

  const otc = {
    id: 'med-otc',
    name_ar: 'بنادول',
    requires_prescription: false,
    aggregate_stock: 50,
    availability_status: 'in_stock',
  };
  const rxMed = {
    id: 'med-rx',
    name_ar: 'دواء مزمن',
    name_en: 'Chronic Rx',
    active_ingredient: 'atorvastatin',
    requires_prescription: true,
    aggregate_stock: 30,
    availability_status: 'in_stock',
  };
  const oosMed = {
    id: 'med-oos',
    name_ar: 'ناقص',
    requires_prescription: false,
    aggregate_stock: 0,
    availability_status: 'out_of_stock',
  };

  function setup(opts: {
    legacyOrder?: Record<string, unknown> | null;
    governedOrder?: Record<string, unknown> | null;
    meds?: Array<Record<string, unknown>>;
    prescriptions?: Array<Record<string, unknown>>;
  }) {
    const orderModel = {
      findOne: jest.fn().mockImplementation(async (filter: { id?: { $eq?: string }; patient_id?: { $eq?: string } }) => {
        const o = opts.legacyOrder;
        if (o && filter?.id?.['$eq'] === o['id']) {
          if (filter?.patient_id?.['$eq'] && filter.patient_id['$eq'] !== o['patient_id'])
            return null;
          return o;
        }
        return null;
      }),
    };
    const medModel = {
      find: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(opts.meds ?? [otc, rxMed, oosMed]),
      }),
    };
    const collections: Record<string, Record<string, jest.Mock>> = {
      pharmacy_orders: {
        findOne: jest.fn().mockImplementation(async (filter: { id?: { $eq?: string } }) => {
          const g = opts.governedOrder;
          if (g && filter?.id?.['$eq'] === g['id']) return g;
          return null;
        }),
      },
      prescriptions: {
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue(opts.prescriptions ?? []),
        }),
      },
    };
    const conn = {
      collection: jest.fn((name: string) => collections[name]),
    };
    const service = new ReorderEligibilityService(
      orderModel as never,
      medModel as never,
      conn as never,
    );
    return { service, orderModel, medModel, conn, collections };
  }

  it('marks a plain OTC in-stock legacy order eligible', async () => {
    const { service } = setup({
      legacyOrder: {
        id: 'ord-1',
        patient_id: 'patient-1',
        items: [{ medicine_id: 'med-otc', name_ar: 'بنادول', qty: 2 }],
      },
    });
    const out = await service.forOrder('ord-1', 'patient-1');
    expect(out.eligible).toBe(true);
    expect(out.blocked_count).toBe(0);
    expect(out.items[0]).toMatchObject({
      requires_prescription: false,
      rx_status: 'not_required',
      in_stock: true,
    });
  });

  it('flags an out-of-stock line on a governed order', async () => {
    const { service } = setup({
      legacyOrder: null,
      governedOrder: {
        id: 'gov-1',
        patient_account_id: 'patient-1',
        items: [
          { id: 'a', raw_name: 'بنادول', matched_sku: 'med-otc', qty: 1 },
          { id: 'b', raw_name: 'ناقص', matched_sku: 'med-oos', qty: 1 },
        ],
      },
    });
    const out = await service.forOrder('gov-1', 'patient-1');
    expect(out.eligible).toBe(false);
    expect(out.items.find((i) => i.key === 'a')?.in_stock).toBe(true);
    const bad = out.items.find((i) => i.key === 'b');
    expect(bad?.in_stock).toBe(false);
    expect(bad?.note).toMatch('out of stock');
  });

  it('accepts an Rx line covered by a valid prescription', async () => {
    const { service } = setup({
      governedOrder: {
        id: 'gov-rx',
        patient_account_id: 'patient-1',
        items: [{ id: 'a', raw_name: 'Chronic Rx', matched_sku: 'med-rx', qty: 1 }],
      },
      prescriptions: [
        {
          id: 'rx-1',
          patient_id: 'patient-1',
          items: [{ medicine_id: 'med-rx' }],
          verified_at: new Date(Date.now() - 10 * 24 * 3600 * 1000),
        },
      ],
    });
    const out = await service.forOrder('gov-rx', 'patient-1');
    expect(out.eligible).toBe(true);
    expect(out.items[0].rx_status).toBe('valid');
    expect(out.items[0].rx_valid_until).toBeInstanceOf(Date);
  });

  it('blocks an Rx line whose prescription expired', async () => {
    const { service } = setup({
      governedOrder: {
        id: 'gov-rx2',
        patient_account_id: 'patient-1',
        items: [{ id: 'a', raw_name: 'Chronic Rx', matched_sku: 'med-rx', qty: 1 }],
      },
      prescriptions: [
        {
          id: 'rx-old',
          patient_id: 'patient-1',
          items: [{ active_ingredient: 'atorvastatin' }],
          verified_at: new Date(Date.now() - 200 * 24 * 3600 * 1000),
        },
      ],
    });
    const out = await service.forOrder('gov-rx2', 'patient-1');
    expect(out.eligible).toBe(false);
    expect(out.items[0].rx_status).toBe('expired');
    expect(out.items[0].note).toMatch('renewal');
  });

  it('blocks an Rx line with no covering prescription at all', async () => {
    const { service } = setup({
      governedOrder: {
        id: 'gov-rx3',
        patient_account_id: 'patient-1',
        items: [{ id: 'a', raw_name: 'Chronic Rx', matched_sku: 'med-rx', qty: 1 }],
      },
      prescriptions: [],
    });
    const out = await service.forOrder('gov-rx3', 'patient-1');
    expect(out.eligible).toBe(false);
    expect(out.items[0].rx_status).toBe('missing');
  });

  it('404s on an unknown order id', async () => {
    const { service } = setup({ legacyOrder: null });
    await expect(service.forOrder('nope', 'patient-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('does not leak another patient order (ownership)', async () => {
    const { service } = setup({
      legacyOrder: {
        id: 'ord-x',
        patient_id: 'patient-2',
        items: [{ medicine_id: 'med-otc', qty: 1 }],
      },
    });
    await expect(service.forOrder('ord-x', 'patient-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('governed reorder end-to-end attaches eligibility (Rx gap flagged, draft kept)', async () => {
    const { OrdersService } = await import('./orders.service');
    const governedOrder = {
      id: 'gov-order-9',
      patient_account_id: 'patient-1',
      status: 'confirmed',
      items: [
        { id: 'item-a', raw_name: 'بنادول', matched_sku: 'med-otc', qty: 2 },
        { id: 'item-b', raw_name: 'Chronic Rx', matched_sku: 'med-rx', qty: 1 },
      ],
      delivery_address: { city: 'Riyadh' },
      fulfillment: 'delivery',
      payment_mode: 'cash',
    };
    const inserted: Array<Record<string, unknown>> = [];
    const orderModel = { findOne: jest.fn().mockResolvedValue(null) };
    const medModel = {
      find: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([otc, rxMed]),
      }),
    };
    const collections: Record<string, Record<string, jest.Mock>> = {
      pharmacy_orders: {
        findOne: jest.fn().mockImplementation(async (filter: { id?: string | { $eq?: string }; refill_idempotency_key?: { $eq?: string } }) => {
          // OrdersService.reorder uses plain equality; the new service uses $eq.
          const id = typeof filter?.id === 'string' ? filter.id : filter?.id?.['$eq'];
          if (id === governedOrder.id) return governedOrder;
          return null;
        }),
        insertOne: jest.fn().mockImplementation(async (doc: Record<string, unknown>) => {
          inserted.push(doc);
          return { acknowledged: true };
        }),
      },
      prescriptions: {
        find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }),
      },
    };
    const conn = { collection: jest.fn((n: string) => collections[n]) };
    const eligibility = new ReorderEligibilityService(
      orderModel as never,
      medModel as never,
      conn as never,
    );
    const svc = new OrdersService(
      orderModel as never,
      medModel as never,
      {} as never,
      {} as never,
      { emit: jest.fn() } as never,
      {} as never,
      {} as never,
      conn as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      undefined,
      eligibility as never,
    );
    const draft = (await svc.reorder('gov-order-9', patient)) as unknown as Record<
      string,
      unknown
    >;
    expect(draft['status']).toBe('draft');
    expect(inserted).toHaveLength(1);
    const elig = draft['reorder_eligibility'] as {
      eligible: boolean;
      blocked_count: number;
      items: Array<{ rx_status: string }>;
    };
    expect(elig.eligible).toBe(false);
    expect(elig.blocked_count).toBe(1);
    expect(elig.items.find((i) => i.rx_status === 'missing')).toBeTruthy();
  });
});
