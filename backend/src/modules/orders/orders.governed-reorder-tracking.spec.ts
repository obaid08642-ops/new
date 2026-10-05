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
    const created: Array<{ user: { id: string }; body: Record<string, any> }> = [];
    const pharmacyOrders = {
      create: jest.fn(async (user: { id: string }, body: Record<string, any>) => {
        created.push({ user, body });
        return { id: 'new-draft-1', patient_account_id: user.id, status: 'draft', items: body.items };
      }),
    };
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
      pharmacyOrders as any,
    );
    return { service, orderModel, delModel, conn, collections, inserted, created, pharmacyOrders };
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
    const governedWithPrices = {
      ...governedOrder,
      prescription_id: 'rx-old',
      items: [
        { ...governedOrder.items[0], matched_sku: 'sku-panadol', unit_price: 12.5 },
        governedOrder.items[1],
      ],
    };

    it('creates the draft through PharmacyOrderService.create (the one create path)', async () => {
      const { service, inserted, created, pharmacyOrders } = setup({ governedOrder: governedWithPrices });

      const draft: any = await service.reorder('gov-order-1', patient);

      // No hand-built second copy of the create path.
      expect(inserted).toHaveLength(0);
      expect(pharmacyOrders.create).toHaveBeenCalledTimes(1);
      expect(created[0].user).toBe(patient);
      const body = created[0].body;
      expect(body.items.map((i: any) => i.raw_name)).toEqual(['Panadol Extra', 'Augmentin 1g']);
      expect(body.items.map((i: any) => i.qty)).toEqual([2, 1]);
      expect(body.items[0].matched_sku).toBe('sku-panadol');
      // Stale prices and the old prescription are not carried into the new draft.
      expect(body.items.some((i: any) => 'unit_price' in i)).toBe(false);
      expect(body).not.toHaveProperty('prescription_id');
      expect(body.delivery_address).toEqual({ city: 'Riyadh' });
      expect(body.fulfillment).toBe('delivery');
      expect(body.payment_mode).toBe('cash');
      expect(draft.id).toBe('new-draft-1');
      expect(draft.status).toBe('draft');
    });

    it("404s when another patient reorders someone else's governed order", async () => {
      const { service, pharmacyOrders } = setup({ governedOrder });
      await expect(service.reorder('gov-order-1', { id: 'patient-2', role: 'patient' }))
        .rejects.toBeInstanceOf(NotFoundException);
      expect(pharmacyOrders.create).not.toHaveBeenCalled();
    });

    it('404s on an unknown id', async () => {
      const { service, conn } = setup({});
      await expect(service.reorder('nope', patient)).rejects.toBeInstanceOf(NotFoundException);
      expect(conn.collection).toHaveBeenCalledWith('pharmacy_orders');
    });

    it('reorder-partial on a pharmacy_orders id drafts the custom item list through the create path', async () => {
      const { service, inserted, created } = setup({ governedOrder });
      await service.reorderPartial('gov-order-1', patient, {
        items: [{ raw_name: 'Vitamin D', qty: 3, price: 40 }],
      } as any);

      expect(inserted).toHaveLength(0);
      expect(created).toHaveLength(1);
      expect(created[0].body.items).toHaveLength(1);
      expect(created[0].body.items[0].raw_name).toBe('Vitamin D');
      expect(created[0].body.items[0].qty).toBe(3);
      expect('unit_price' in created[0].body.items[0]).toBe(false);
    });

    it("reorder-partial 404s when another patient targets someone else's governed order", async () => {
      const { service, pharmacyOrders } = setup({ governedOrder });
      await expect(service.reorderPartial('gov-order-1', { id: 'patient-2', role: 'patient' }, { items: [{ raw_name: 'X', qty: 1 }] } as any))
        .rejects.toBeInstanceOf(NotFoundException);
      expect(pharmacyOrders.create).not.toHaveBeenCalled();
    });

    it('reorder-partial 404s on an unknown id', async () => {
      const { service } = setup({});
      await expect(service.reorderPartial('nope', patient, { items: [{ raw_name: 'X', qty: 1 }] } as any))
        .rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
