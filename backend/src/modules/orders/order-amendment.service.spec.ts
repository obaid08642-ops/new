import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrderAmendmentService } from './order-amendment.service';
import { DispatchService } from './dispatch.service';
import { OrderState } from '../../common/enums';

const HOUR = 3600 * 1000;

function orderDoc(over: Record<string, unknown> = {}): Record<string, unknown> {
  const doc: Record<string, unknown> = {
    id: 'ord-1',
    patient_id: 'patient-1',
    patient_name: 'P',
    patient_phone: '05xxxxxxxx',
    items: [{ medicine_id: 'med-a', name_ar: 'أ', qty: 2, price: 10 }],
    subtotal: 20,
    delivery_fee: 15,
    total: 35,
    state: OrderState.CREATED,
    state_history: [],
    delivery_mode: 'DELIVERY',
    delivery_address: { lat: 24.7, lng: 46.7 },
    payment_method: 'cash',
    payment_status: 'pending',
    createdAt: new Date(),
    ...over,
  };
  doc['save'] = jest.fn().mockResolvedValue(true);
  doc['toObject'] = jest.fn().mockImplementation(function (this: Record<string, unknown>) {
    const { save: _s, toObject: _t, ...rest } = this;
    return { ...rest };
  });
  return doc;
}

describe('OrdersService.cancel — P22.5 configurable patient window', () => {
  function setup(opts: {
    createdAt?: Date;
    role?: string;
    windowMinutes?: number | null;
    state?: string;
  } = {}) {
    const order = orderDoc({ createdAt: opts.createdAt ?? new Date(), state: opts.state ?? OrderState.CREATED });
    const orderModel = { findOne: jest.fn().mockResolvedValue(order) };
    const collections = {
      finance_config: {
        findOne: jest.fn().mockResolvedValue(
          opts.windowMinutes === null ? null : { key: 'cancel_policy', cancel_window_minutes: opts.windowMinutes ?? 30 },
        ),
      },
      moyasar_payments: { findOne: jest.fn().mockResolvedValue(null) },
      wallet_transactions: { find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }) },
    };
    const conn = { collection: jest.fn((n: string) => (collections as Record<string, unknown>)[n]) };
    const engine = {
      apply: jest.fn(async ({ mutate }: { mutate: () => Promise<unknown> }) => mutate()),
    };
    const cancelPolicy = {
      forOrder: jest.fn().mockResolvedValue({ allowed: true, refundable_percent: 100, fee_sar: 0, restore_stock: false }),
    };
    const svc = new OrdersService(
      orderModel as never,
      {} as never,
      {} as never,
      {} as never,
      { emit: jest.fn() } as never,
      {} as never,
      engine as never,
      conn as never,
      { release: jest.fn() } as never,
      { refundRedemption: jest.fn() } as never,
      { execute: jest.fn() } as never,
      cancelPolicy as never,
    );
    return { svc, order, orderModel, engine, cancelPolicy };
  }

  it('lets a patient cancel inside the window', async () => {
    const { svc, engine } = setup({ createdAt: new Date(Date.now() - 10 * 60 * 1000) });
    await svc.cancel('ord-1', { id: 'patient-1', role: 'patient' }, 'changed mind');
    expect(engine.apply).toHaveBeenCalledTimes(1);
  });

  it('blocks a patient cancel after the window (configurable)', async () => {
    const { svc, engine } = setup({ createdAt: new Date(Date.now() - 2 * HOUR) });
    await expect(
      svc.cancel('ord-1', { id: 'patient-1', role: 'patient' }, 'late'),
    ).rejects.toMatchObject({ response: { message: expect.stringContaining('cancel_window_expired') } });
    expect(engine.apply).not.toHaveBeenCalled();
  });

  it('honours a custom window from finance_config', async () => {
    const { svc, engine } = setup({
      createdAt: new Date(Date.now() - 90 * 60 * 1000),
      windowMinutes: 120,
    });
    await svc.cancel('ord-1', { id: 'patient-1', role: 'patient' }, 'ok');
    expect(engine.apply).toHaveBeenCalledTimes(1);
  });

  it('falls back to 30 minutes when unconfigured', async () => {
    const { svc, engine } = setup({
      createdAt: new Date(Date.now() - 40 * 60 * 1000),
      windowMinutes: null,
    });
    await expect(
      svc.cancel('ord-1', { id: 'patient-1', role: 'patient' }, 'late'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(engine.apply).not.toHaveBeenCalled();
  });

  it('never gates admins (support path stays open)', async () => {
    const { svc, engine } = setup({ createdAt: new Date(Date.now() - 5 * HOUR) });
    await svc.cancel('ord-1', { id: 'admin-1', role: 'admin' }, 'support cancel');
    expect(engine.apply).toHaveBeenCalledTimes(1);
  });
});

describe('OrderAmendmentService (P22.5 edit / partial refund / split)', () => {
  const medA = { id: 'med-a', name_ar: 'أ', name_en: 'A', price: 10, image: 'i' };
  const medB = { id: 'med-b', name_ar: 'ب', name_en: 'B', price: 5, image: 'j' };
  const medRx = { id: 'med-rx', name_ar: 'ر', price: 7, requires_prescription: true };

  function setup(orderOver: Record<string, unknown> = {}, meds: Array<Record<string, unknown>> = [medA, medB, medRx]) {
    const order = orderDoc(orderOver);
    const orderModel = {
      findOne: jest.fn().mockImplementation(async (f: { id?: { $eq?: string }; patient_id?: { $eq?: string } }) => {
        if (f?.id?.['$eq'] !== order.id) return null;
        if (f?.patient_id?.['$eq'] && f.patient_id['$eq'] !== order.patient_id) return null;
        return order;
      }),
      create: jest.fn().mockImplementation(async (d: Record<string, unknown>) => ({ ...d })),
      updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 }),
    };
    const medModel = {
      find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(meds) }),
    };
    const conn = { collection: jest.fn(() => ({ findOne: jest.fn().mockResolvedValue(null) })) };
    const events = { emit: jest.fn() };
    const dispatch = {
      getInventoryFor: jest.fn(),
      dispatchSplit: jest.fn(),
      tryDeductStock: jest.fn(),
      restoreStock: jest.fn(),
    };
    const refundExec = { execute: jest.fn().mockResolvedValue({ ok: true }) };
    const coupons = { release: jest.fn().mockResolvedValue(null) };
    const loyalty = { refundRedemption: jest.fn().mockResolvedValue(null) };
    const svc = new OrderAmendmentService(
      orderModel as never,
      medModel as never,
      conn as never,
      events as never,
      dispatch as never,
      refundExec as never,
      coupons as never,
      loyalty as never,
    );
    return { svc, order, orderModel, medModel, dispatch, refundExec, coupons, loyalty, events };
  }

  it('edits items before accept, recomputes totals, releases prior discounts', async () => {
    const { svc, order, coupons, loyalty, events } = setup({
      coupon_code: 'SAVE10',
      loyalty_points_used: 20,
    });
    const out = (await svc.editItems(
      'ord-1',
      { id: 'patient-1', role: 'patient' },
      [{ medicine_id: 'med-b', qty: 3 }],
    )) as unknown as Record<string, unknown>;
    expect(out['subtotal']).toBe(15);
    expect(out['total']).toBe(30);
    expect(order['coupon_code']).toBeUndefined();
    expect(coupons.release).toHaveBeenCalledWith('ord-1');
    expect(loyalty.refundRedemption).toHaveBeenCalledWith('patient-1', 'ord-1');
    expect(order['save']).toHaveBeenCalledTimes(1);
    expect(events.emit).toHaveBeenCalledWith('order.edited', expect.objectContaining({ order_id: 'ord-1' }));
  });

  it('refuses edits after accept, when paid, or with unknown/Rx-gated items', async () => {
    const accepted = setup({ state: OrderState.ACCEPTED });
    await expect(
      accepted.svc.editItems('ord-1', { id: 'patient-1', role: 'patient' }, [{ medicine_id: 'med-a', qty: 1 }]),
    ).rejects.toMatchObject({ response: { message: expect.stringContaining('order_not_editable') } });

    const paid = setup({ payment_status: 'paid' });
    await expect(
      paid.svc.editItems('ord-1', { id: 'patient-1', role: 'patient' }, [{ medicine_id: 'med-a', qty: 1 }]),
    ).rejects.toMatchObject({ response: { message: 'edit_not_allowed_paid' } });

    const { svc } = setup();
    await expect(
      svc.editItems('ord-1', { id: 'patient-1', role: 'patient' }, [{ medicine_id: 'nope', qty: 1 }]),
    ).rejects.toMatchObject({ response: { message: expect.stringContaining('unknown_medicines') } });
    await expect(
      svc.editItems('ord-1', { id: 'patient-1', role: 'patient' }, [{ medicine_id: 'med-rx', qty: 1 }]),
    ).rejects.toMatchObject({ response: { message: 'prescription_required' } });

    await expect(
      svc.editItems('ord-1', { id: 'patient-2', role: 'patient' }, [{ medicine_id: 'med-a', qty: 1 }]),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('still refuses governed-flow rows (canonical guard intact)', async () => {
    const { svc, orderModel } = setup({ basket_review_status: 'submitted_for_patient_approval' });
    await expect(
      svc.editItems('ord-1', { id: 'patient-1', role: 'patient' }, [{ medicine_id: 'med-a', qty: 1 }]),
    ).rejects.toMatchObject({ response: { message: 'canonical_pharmacy_flow_required' } });
    expect(orderModel.create).not.toHaveBeenCalled();
  });

  it('executes a bounded partial refund through the existing pipeline', async () => {
    const { svc, refundExec, orderModel } = setup({
      state: OrderState.ACCEPTED,
      pharmacy_id: 'ph-1',
    });
    const out = await svc.refundPartial('ord-1', { id: 'ph-1', role: 'pharmacy' }, 5, 'item removed');
    expect(out).toMatchObject({ ok: true, amount: 5 });
    expect(out.refund_id).toBe('partial_ord-1_5');
    expect(refundExec.execute).toHaveBeenCalledWith(
      expect.objectContaining({ booking_id: 'ord-1', amount: 5 }),
    );
    expect(orderModel.updateOne).toHaveBeenCalledWith(
      { id: { $eq: 'ord-1' } },
      expect.objectContaining({ $set: expect.objectContaining({ refund_status: 'PARTIALLY_REFUNDED' }) }),
    );
  });

  it('refuses over-total and post-delivery partial refunds', async () => {
    const { svc, refundExec } = setup();
    await expect(
      svc.refundPartial('ord-1', { id: 'admin-1', role: 'admin' }, 999, 'x'),
    ).rejects.toMatchObject({ response: { message: 'refund_exceeds_total' } });
    const delivered = setup({ state: OrderState.DELIVERED });
    await expect(
      delivered.svc.refundPartial('ord-1', { id: 'admin-1', role: 'admin' }, 5, 'x'),
    ).rejects.toMatchObject({ response: { message: 'use_returns_flow' } });
    expect(refundExec.execute).not.toHaveBeenCalled();
  });

  it('splits the shortfall to a second pharmacy with atomic allocation', async () => {
    const { svc, order, orderModel, dispatch, events } = setup({
      pharmacy_id: 'ph-a',
      state: OrderState.PHARMACY_RECEIVED,
      items: [
        { medicine_id: 'med-a', name_ar: 'أ', qty: 2, price: 10 },
        { medicine_id: 'med-b', name_ar: 'ب', qty: 1, price: 5 },
      ],
      subtotal: 25,
      total: 40,
    });
    dispatch.getInventoryFor.mockResolvedValue({ 'med-a': 10, 'med-b': 0 });
    dispatch.dispatchSplit.mockResolvedValue({
      ok: true,
      selected_pharmacy_id: 'ph-b',
      fulfilled_items: [{ medicine_id: 'med-b', qty: 1 }],
      missing_items: [],
    });
    dispatch.tryDeductStock.mockResolvedValue(true);

    const out = (await svc.splitOrder('ord-1', { id: 'ph-a', role: 'pharmacy' })) as unknown as Record<string, unknown>;
    expect(dispatch.dispatchSplit).toHaveBeenCalledWith(
      { lat: 24.7, lng: 46.7 },
      [{ medicine_id: 'med-b', qty: 1 }],
      ['ph-a'],
    );
    expect(dispatch.tryDeductStock).toHaveBeenCalledWith('ph-b', 'med-b', 1);
    expect(orderModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ pharmacy_id: 'ph-b', parent_order_id: 'ord-1', is_split: true }),
    );
    expect(out['is_split']).toBe(true);
    expect((out['sub_order_ids'] as string[])).toHaveLength(1);
    expect((out['items'] as Array<Record<string, unknown>>).map((i) => i['medicine_id'])).toEqual(['med-a']);
    expect(out['total']).toBe(35);
    expect(events.emit).toHaveBeenCalledWith('order.split', expect.objectContaining({ pharmacy_id: 'ph-b' }));
    expect(order['save']).toHaveBeenCalledTimes(1);
  });

  it('reports nothing_to_split when the primary covers everything', async () => {
    const { svc, dispatch, orderModel } = setup({ pharmacy_id: 'ph-a' });
    dispatch.getInventoryFor.mockResolvedValue({ 'med-a': 10 });
    await expect(
      svc.splitOrder('ord-1', { id: 'ph-a', role: 'pharmacy' }),
    ).rejects.toMatchObject({ response: { message: 'nothing_to_split' } });
    expect(orderModel.create).not.toHaveBeenCalled();
  });

  it('fails loudly (409) on a lost stock race and restores partial takes', async () => {
    const { svc, orderModel, dispatch } = setup({
      pharmacy_id: 'ph-a',
      items: [
        { medicine_id: 'med-a', name_ar: 'أ', qty: 1, price: 10 },
        { medicine_id: 'med-b', name_ar: 'ب', qty: 1, price: 5 },
      ],
    });
    dispatch.getInventoryFor.mockResolvedValue({ 'med-a': 0, 'med-b': 0 });
    dispatch.dispatchSplit.mockResolvedValue({
      ok: true,
      selected_pharmacy_id: 'ph-b',
      fulfilled_items: [
        { medicine_id: 'med-a', qty: 1 },
        { medicine_id: 'med-b', qty: 1 },
      ],
      missing_items: [],
    });
    dispatch.tryDeductStock
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    await expect(
      svc.splitOrder('ord-1', { id: 'ph-a', role: 'pharmacy' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(dispatch.restoreStock).toHaveBeenCalledWith('ph-b', [{ medicine_id: 'med-a', qty: 1 }]);
    expect(orderModel.create).not.toHaveBeenCalled();
  });
});

describe('DispatchService.tryDeductStock — atomic guard (P22.5 concurrency)', () => {
  it('lets exactly one of two concurrent allocators win the last unit', async () => {
    let stock = 5;
    const invModel = {
      // Serial CAS double: mirrors MongoDB atomicity for the guard shape test.
      updateOne: jest.fn().mockImplementation(async (filter, update) => {
        const need = Number(filter?.['stock_qty']?.['$gte'] ?? 0);
        const dec = -Number(update?.['$inc']?.['stock_qty'] ?? 0);
        if (stock >= need && dec > 0) {
          stock -= dec;
          return { matchedCount: 1 };
        }
        return { matchedCount: 0 };
      }),
    };
    const svc = new DispatchService({} as never, invModel as never, {} as never);
    const [a, b] = await Promise.all([
      svc.tryDeductStock('ph-1', 'med-x', 5),
      svc.tryDeductStock('ph-1', 'med-x', 5),
    ]);
    expect([a, b].filter(Boolean)).toHaveLength(1);
    expect(invModel.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ stock_qty: { $gte: 5 } }),
      expect.objectContaining({ $inc: expect.objectContaining({ stock_qty: -5 }) }),
    );
  });

  it('rejects invalid allocation inputs without touching the store', async () => {
    const invModel = { updateOne: jest.fn() };
    const svc = new DispatchService({} as never, invModel as never, {} as never);
    await expect(svc.tryDeductStock('', 'med-x', 1)).resolves.toBe(false);
    await expect(svc.tryDeductStock('ph-1', 'med-x', 0)).resolves.toBe(false);
    expect(invModel.updateOne).not.toHaveBeenCalled();
  });
});
