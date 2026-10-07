import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RefillSubscriptionService } from './refill-subscription.service';

function chain<T>(value: T): any {
  return { lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(value) }) };
}

/** findById double that supports BOTH `await findById()` and `findById().lean().exec()`. */
function dual<T>(value: T): any {
  const p: any = Promise.resolve(value);
  p.lean = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(value) });
  return p;
}

function listQuery<T>(value: T): any {
  const c = chain(value);
  return { sort: jest.fn().mockReturnValue(c), limit: jest.fn().mockReturnValue(c) };
}

const validItem = {
  key: 'med-a',
  medicine_id: 'med-a',
  name: 'Med A',
  qty: 1,
  requires_prescription: false,
  rx_status: 'valid',
  rx_valid_until: null,
  in_stock: true,
  note: null,
};

const expiredItem = {
  ...validItem,
  key: 'med-rx',
  medicine_id: 'med-rx',
  requires_prescription: true,
  rx_status: 'expired',
  note: 'prescription expired — renewal required before reorder',
};

function setup(opts: {
  legacy?: Record<string, unknown> | null;
  governed?: Record<string, unknown> | null;
  eligibilityItems?: Array<Record<string, unknown>>;
  subDoc?: any;
  subList?: any[];
} = {}) {
  const legacy = 'legacy' in opts ? opts.legacy : { id: 'ord-1', patient_id: 'patient-1' };
  // NOTE: this service awaits `.lean()` directly (no `.exec()`), unlike ReviewService.
  const orders = { findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(legacy) }) };
  const governedFindOne = jest.fn().mockResolvedValue(opts.governed ?? null);
  const conn = { collection: jest.fn(() => ({ findOne: governedFindOne })) };
  const reorderEligibility = {
    forOrder: jest.fn().mockResolvedValue({ order_id: 'ord-1', eligible: true, blocked_count: 0, items: opts.eligibilityItems ?? [validItem] }),
  };
  const ordersService = { reorder: jest.fn().mockResolvedValue({ id: 'ord-new', items: [{ medicine_id: 'med-a' }] }) };

  const saved: any[] = [];
  const SubModel: any = jest.fn().mockImplementation((data: any) => {
    const inst = { ...data, _id: 'sub-1', save: jest.fn().mockResolvedValue(true) };
    saved.push(inst);
    return inst;
  });
  SubModel.find = jest.fn().mockReturnValue(listQuery(opts.subList ?? []));
  SubModel.findOne = jest.fn().mockReturnValue(chain(opts.subDoc ?? null));
  SubModel.findById = jest.fn().mockImplementation(() => dual(opts.subDoc ?? null));
  SubModel.findOneAndUpdate = jest.fn().mockResolvedValue(opts.subDoc ?? null);
  SubModel.findByIdAndUpdate = jest.fn().mockResolvedValue(opts.subDoc ?? null);

  const svc = new RefillSubscriptionService(SubModel as never, orders as never, conn as never, reorderEligibility as never, ordersService as never);
  return { svc, orders, conn, governedFindOne, reorderEligibility, ordersService, SubModel, saved };
}

const baseDto = {
  source_order_id: 'ord-1',
  items: [{ medicine_id: 'med-a', name: 'Med A', qty: 1, requires_prescription: false }],
  frequency: 'monthly' as const,
  interval_days: 30,
};

describe('RefillSubscriptionService.create (P22)', () => {
  it('creates a subscription when eligibility passes', async () => {
    const { svc, saved, SubModel } = setup();
    const sub = await svc.create('patient-1', baseDto);
    expect(sub).toMatchObject({ patient_id: 'patient-1', source_order_id: 'ord-1', status: 'active' });
    expect(saved).toHaveLength(1);
    expect(SubModel).toHaveBeenCalledWith(expect.objectContaining({ frequency: 'monthly', interval_days: 30 }));
  });

  it('falls back to the governed pharmacy_orders row when legacy is missing', async () => {
    const { svc, saved } = setup({ legacy: null, governed: { id: 'ord-1', patient_account_id: 'patient-1' } });
    const sub = await svc.create('patient-1', baseDto);
    expect(sub).toMatchObject({ status: 'active' });
    expect(saved).toHaveLength(1);
  });

  it('404s when the source order belongs to nobody', async () => {
    const { svc } = setup({ legacy: null, governed: null });
    await expect(svc.create('patient-1', baseDto)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('blocks creation when an Rx item is expired', async () => {
    const { svc, saved } = setup({ eligibilityItems: [expiredItem] });
    await expect(svc.create('patient-1', baseDto)).rejects.toBeInstanceOf(BadRequestException);
    expect(saved).toHaveLength(0);
  });
});

describe('RefillSubscriptionService.listMine / getById / pause / resume / cancel (P22)', () => {
  it('lists a patient subscriptions, optionally filtered by status', async () => {
    const rows = [{ _id: 'sub-1' }, { _id: 'sub-2' }];
    const { svc, SubModel } = setup({ subList: rows });
    await expect(svc.listMine('patient-1')).resolves.toEqual(rows);
    expect(SubModel.find).toHaveBeenCalledWith({ patient_id: 'patient-1' });
    await svc.listMine('patient-1', 'paused');
    expect(SubModel.find).toHaveBeenCalledWith({ patient_id: 'patient-1', status: 'paused' });
  });

  it('getById 404s on foreign or missing subscriptions', async () => {
    const { svc } = setup({ subDoc: null });
    await expect(svc.getById('sub-9', 'patient-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('pauses, resumes and cancels through findOneAndUpdate', async () => {
    const subDoc = { _id: 'sub-1', status: 'active' };
    const { svc, SubModel } = setup({ subDoc });
    await svc.pause('sub-1', 'patient-1');
    expect(SubModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'sub-1', patient_id: 'patient-1' },
      { status: 'paused' },
      { new: true },
    );
    await svc.resume('sub-1', 'patient-1');
    expect(SubModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'sub-1', patient_id: 'patient-1' },
      expect.objectContaining({ status: 'active' }),
      { new: true },
    );
    await svc.cancel('sub-1', 'patient-1', 'too much stock');
    expect(SubModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'sub-1', patient_id: 'patient-1' },
      expect.objectContaining({ status: 'cancelled', cancellation_reason: 'too much stock' }),
      { new: true },
    );
  });

  it('pause 404s when nothing matches', async () => {
    const { svc } = setup({ subDoc: null });
    await expect(svc.pause('sub-9', 'patient-1')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('RefillSubscriptionService.checkEligibility (P22)', () => {
  it('reports the blocked path with counts', async () => {
    const subDoc = { _id: 'sub-1', source_order_id: 'ord-1', patient_id: 'patient-1', next_refill_at: new Date() };
    const { svc } = setup({ subDoc, eligibilityItems: [validItem, expiredItem] });
    const out = await svc.checkEligibility('sub-1');
    expect(out).toMatchObject({ subscription_id: 'sub-1', eligible: false, blocked_count: 1 });
    expect(out.items).toHaveLength(2);
  });

  it('reports eligible when nothing is blocked', async () => {
    const subDoc = { _id: 'sub-1', source_order_id: 'ord-1', patient_id: 'patient-1', next_refill_at: new Date() };
    const { svc } = setup({ subDoc, eligibilityItems: [validItem] });
    const out = await svc.checkEligibility('sub-1');
    expect(out).toMatchObject({ eligible: true, blocked_count: 0 });
  });

  it('404s on unknown subscription', async () => {
    const { svc } = setup({ subDoc: null });
    await expect(svc.checkEligibility('sub-9')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('RefillSubscriptionService.processRefill (P22)', () => {
  it('creates the reorder and advances the subscription on success', async () => {
    const subDoc = { _id: 'sub-1', status: 'active', source_order_id: 'ord-1', patient_id: 'patient-1', interval_days: 30 };
    const { svc, ordersService, SubModel } = setup({ subDoc, eligibilityItems: [validItem] });
    const out = await svc.processRefill('sub-1');
    expect(out).toMatchObject({ order_id: 'ord-new' });
    expect(ordersService.reorder).toHaveBeenCalledWith('ord-1', { id: 'patient-1' });
    expect(SubModel.findByIdAndUpdate).toHaveBeenCalledWith('sub-1', expect.objectContaining({ $inc: { refill_count: 1 } }));
  });

  it('expires the subscription and blocks when the Rx expired', async () => {
    const subDoc = { _id: 'sub-1', status: 'active', source_order_id: 'ord-1', patient_id: 'patient-1', interval_days: 30 };
    const { svc, ordersService, SubModel } = setup({ subDoc, eligibilityItems: [expiredItem] });
    await expect(svc.processRefill('sub-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(SubModel.findByIdAndUpdate).toHaveBeenCalledWith('sub-1', { status: 'expired' });
    expect(ordersService.reorder).not.toHaveBeenCalled();
  });

  it('refuses to process a non-active subscription', async () => {
    const subDoc = { _id: 'sub-1', status: 'paused', source_order_id: 'ord-1', patient_id: 'patient-1', interval_days: 30 };
    const { svc, ordersService } = setup({ subDoc, eligibilityItems: [validItem] });
    await expect(svc.processRefill('sub-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(ordersService.reorder).not.toHaveBeenCalled();
  });

  it('processDueRefills no-ops when nothing is due', async () => {
    const { svc } = setup({ subList: [] });
    await expect(svc.processDueRefills()).resolves.toBeUndefined();
  });
});
