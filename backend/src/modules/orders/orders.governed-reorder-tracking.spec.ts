import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';

/**
 * Q30 + Q16: governed `pharmacy_orders` must be resolvable through the
 * legacy /orders surface (tracking + reorder), with unknown ids staying 404.
 */
describe('OrdersService governed pharmacy_orders (Q30 tracking / Q16 reorder)', () => {
  const patient = { id: 'patient-1', role: 'patient' };

  function setup(opts: {
    legacyOrder?: any;
    governedOrder?: any;
    delivery?: any;
    allocation?: any;
    profile?: any;
  }) {
    const inserted: any[] = [];
    const orderModel: any = {
      findOne: jest.fn().mockImplementation(async (filter: any) => {
        if (opts.legacyOrder && filter?.id === opts.legacyOrder.id) {
          if (filter?.patient_id && filter.patient_id !== opts.legacyOrder.patient_id) return null;
          return opts.legacyOrder;
        }
        return null;
      }),
    };
    const delModel: any = {
      findOne: jest.fn().mockResolvedValue(opts.delivery || null),
    };
    const collections: Record<string, any> = {
      pharmacy_orders: {
        findOne: jest.fn().mockImplementation(async (filter: any) => {
          if (opts.governedOrder && filter?.id === opts.governedOrder.id) {
            if (filter?.patient_account_id && filter.patient_account_id !== opts.governedOrder.patient_account_id) return null;
            return opts.governedOrder;
          }
          return null;
        }),
        insertOne: jest.fn().mockImplementation(async (doc: any) => {
          inserted.push(doc);
          return { acknowledged: true, insertedId: doc.id };
        }),
      },
      pharmacy_allocations: {
        findOne: jest.fn().mockResolvedValue(opts.allocation || null),
      },
      provider_profiles: {
        findOne: jest.fn().mockResolvedValue(opts.profile || null),
      },
    };
    const conn: any = { collection: jest.fn((name: string) => collections[name] || { findOne: jest.fn().mockResolvedValue(null) }) };
    const service = new OrdersService(
      orderModel,
      {} as any,
      delModel,
      {} as any,
      { emit: jest.fn() } as any,
      {} as any,
      {} as any,
      conn,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
    return { service, orderModel, delModel, conn, collections, inserted };
  }

  const governedOrder = {
    id: 'gov-order-1',
    patient_account_id: 'patient-1',
    status: 'confirmed',
    items: [
      { id: 'item-a', raw_name: 'Panadol Extra', name_ar: 'بنادول', qty: 2, match_status: 'matched', intake_source: 'manual' },
      { id: 'item-b', raw_name: 'Augmentin 1g', qty: 1, match_status: 'manual', intake_source: 'manual' },
    ],
    delivery_address: { city: 'Riyadh' },
    fulfillment: 'delivery',
    payment_mode: 'cash',
    totals: { subtotal: 40, delivery_fee: 15, total: 55, currency: 'SAR' },
    timeline: [{ ts: new Date(), event: 'created' }],
    updatedAt: new Date(),
  };

  describe('getTracking (Q30)', () => {
    it('resolves a pharmacy_orders id with the same shape as legacy tracking', async () => {
      const legacyOrder = {
        id: 'legacy-1', patient_id: 'patient-1', state: 'DELIVERED', updatedAt: new Date(),
        delivery_mode: 'DELIVERY', total: 100, delivery_id: 'del-1',
      };
      const { service } = setup({
        legacyOrder,
        governedOrder,
        delivery: { state: 'DELIVERED', eta_minutes: 5, driver_id: 'd-1', current_location: null },
      });

      const legacyView: any = await service.getTracking('legacy-1', patient);
      const governedView: any = await service.getTracking('gov-order-1', patient);

      expect(Object.keys(governedView).sort()).toEqual(Object.keys(legacyView).sort());
      expect(governedView.order_id).toBe('gov-order-1');
      expect(governedView.state).toBe('confirmed');
      expect(governedView.total).toBe(55);
      expect(governedView.delivery_mode).toBe('DELIVERY');
    });

    it('returns the governed order timeline in time order, without actor ids or meta', async () => {
      const t0 = new Date('2026-10-01T08:00:00.000Z');
      const t1 = new Date('2026-10-01T08:05:00.000Z');
      const t2 = new Date('2026-10-01T09:00:00.000Z');
      const { service } = setup({
        governedOrder: {
          ...governedOrder,
          status: 'waiting_copay',
          timeline: [
            { ts: t2, event: 'pharmacy_insurance_decision_recorded', by: 'pharmacy-9', meta: { allocation_id: 'a-1' } },
            { ts: t0, event: 'created' },
            { ts: t1, event: 'broadcast_started', meta: { radius: 3 } },
          ],
        },
      });

      const view: any = await service.getTracking('gov-order-1', patient);

      expect(view.state).toBe('waiting_copay');
      expect(view.timeline).toEqual([
        { state: 'created', at: t0.toISOString() },
        { state: 'broadcast_started', at: t1.toISOString() },
        { state: 'pharmacy_insurance_decision_recorded', at: t2.toISOString() },
      ]);
    });

    it('returns the legacy order state_history as the same timeline shape', async () => {
      const t0 = new Date('2026-09-01T10:00:00.000Z');
      const t1 = new Date('2026-09-01T10:30:00.000Z');
      const { service } = setup({
        legacyOrder: {
          id: 'legacy-2', patient_id: 'patient-1', state: 'ACCEPTED', updatedAt: t1, total: 10,
          state_history: [
            { from: '', to: 'CREATED', by_user_id: 'patient-1', at: t0 },
            { from: 'CREATED', to: 'ACCEPTED', by_user_id: 'ph-1', reason: 'bid_accepted', at: t1 },
          ],
        },
      });

      const view: any = await service.getTracking('legacy-2', patient);

      expect(view.timeline).toEqual([
        { state: 'CREATED', at: t0.toISOString() },
        { state: 'ACCEPTED', at: t1.toISOString() },
      ]);
    });

    it('returns an empty timeline when the order has no history', async () => {
      const { service } = setup({ governedOrder: { ...governedOrder, timeline: undefined } });
      const view: any = await service.getTracking('gov-order-1', patient);
      expect(view.timeline).toEqual([]);
    });

    it('404s on an unknown id', async () => {
      const { service } = setup({});
      await expect(service.getTracking('nope', patient)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('does not reveal a governed order to an unrelated patient', async () => {
      const { service } = setup({ governedOrder });
      await expect(service.getTracking('gov-order-1', { id: 'patient-2', role: 'patient' }))
        .rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('reorder (Q16)', () => {
    it('creates a draft from a pharmacy_orders id carrying the same items', async () => {
      const { service, inserted } = setup({ governedOrder });

      const draft: any = await service.reorder('gov-order-1', patient);

      expect(inserted).toHaveLength(1);
      expect(draft.status).toBe('draft');
      expect(draft.patient_account_id).toBe('patient-1');
      expect(draft.items).toHaveLength(2);
      expect(draft.items.map((i: any) => i.raw_name)).toEqual(['Panadol Extra', 'Augmentin 1g']);
      expect(draft.items.map((i: any) => i.qty)).toEqual([2, 1]);
      // Fresh item ids — the draft is a new document, not a copy of the source.
      expect(draft.items.map((i: any) => i.id)).not.toEqual(['item-a', 'item-b']);
      expect(draft.id).not.toBe('gov-order-1');
      expect(draft.totals).toEqual({ subtotal: 0, delivery_fee: 0, total: 0, currency: 'SAR' });
      expect(draft.timeline).toEqual([{ ts: expect.any(Date), event: 'created' }]);
    });

    it('404s on an unknown id', async () => {
      const { service, conn } = setup({});
      await expect(service.reorder('nope', patient)).rejects.toBeInstanceOf(NotFoundException);
      expect(conn.collection).toHaveBeenCalledWith('pharmacy_orders');
    });

    it('reorder-partial on a pharmacy_orders id drafts the custom item list', async () => {
      const { service, inserted } = setup({ governedOrder });
      const draft: any = await service.reorderPartial('gov-order-1', patient, {
        items: [{ raw_name: 'Vitamin D', qty: 3 }],
      } as any);

      expect(inserted).toHaveLength(1);
      expect(draft.status).toBe('draft');
      expect(draft.items).toHaveLength(1);
      expect(draft.items[0].raw_name).toBe('Vitamin D');
      expect(draft.items[0].qty).toBe(3);
    });

    it('reorder-partial 404s on an unknown id', async () => {
      const { service } = setup({});
      await expect(service.reorderPartial('nope', patient, { items: [{ raw_name: 'X', qty: 1 }] } as any))
        .rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
