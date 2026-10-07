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
    const events: any = { emit: jest.fn() };
    const dispatchSvc: any = {};
    const engine: any = {};
    const coupons: any = {};
    const loyaltyRedeem: any = {};
    const refundExec: any = {};
    const cancelPolicy: any = {};
    const abusePrevention: any = {};
    const rankingEvents: any = {};
    const service = new OrdersService(
      orderModel,
      {} as any,
      delModel,
      {} as any,
      events,
      dispatchSvc,
      engine,
      conn,
      coupons,
      loyaltyRedeem,
      refundExec,
      cancelPolicy,
      abusePrevention,
      rankingEvents,
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
