import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PharmacyRefillService, REFILL_ERROR } from './pharmacy-refill.service';
import { catalogueFlags } from './rx-rules';

jest.mock('./rx-rules', () => ({ catalogueFlags: jest.fn() }));

const flags = catalogueFlags as jest.MockedFunction<typeof catalogueFlags>;
const NOW = new Date('2026-10-18T10:00:00Z');
const FUTURE = new Date('2026-12-01T00:00:00Z');
const PAST = new Date('2026-09-01T00:00:00Z');
const user = { id: 'pat-1', role: 'patient' };

function build(opts: { order?: any; rx?: any; taken?: number; draftStatus?: string } = {}) {
  const order = opts.order === undefined
    ? { id: 'ord-1', patient_account_id: 'pat-1', items: [{ raw_name: 'Amlodipine', medicine_id: 'med-1', qty: 2, matched_sku: 'SKU-1', dosage: '5mg' }], prescription_id: 'rx-1', fulfillment: 'delivery', payment_mode: 'cash', payment_method: 'cash', delivery_address_id: 'addr-1' }
    : opts.order;
  const pharmacy = { findOne: jest.fn().mockImplementation(async (filter: any) => (filter.patient_account_id ? order : { status: opts.draftStatus ?? 'draft' })) };
  const prescriptions = {
    findOne: jest.fn().mockResolvedValue(opts.rx === undefined ? { id: 'rx-1', valid_until: FUTURE, refills_remaining: 2 } : opts.rx),
    updateOne: jest.fn().mockResolvedValue({ modifiedCount: opts.taken ?? 1 }),
  };
  const conn: any = {
    collection: (name: string) => (name === 'pharmacy_orders' ? pharmacy : prescriptions),
  };
  const orders = {
    create: jest.fn().mockResolvedValue({ id: 'draft-1' }),
    submit: jest.fn().mockResolvedValue({ id: 'draft-1', status: 'broadcast' }),
    cancel: jest.fn().mockResolvedValue({}),
  };
  return { service: new PharmacyRefillService(conn, orders as any), orders, prescriptions, pharmacy };
}

describe('PharmacyRefillService (22.1)', () => {
  beforeEach(() => {
    flags.mockReset();
    flags.mockResolvedValue([{ medicine_id: 'med-1', requires_prescription: true, controlled: false } as any]);
  });

  it('refuses a non-patient', async () => {
    const { service } = build();
    await expect(service.refill({ id: 'x', role: 'pharmacist' }, 'ord-1', NOW)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('404 when the order is not this patient\'s', async () => {
    const { service } = build({ order: null });
    await expect(service.refill(user, 'ord-1', NOW)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('409 when a prescription line has no prescription on the order', async () => {
    const { service, orders } = build({ order: { id: 'ord-1', patient_account_id: 'pat-1', items: [{ medicine_id: 'med-1' }] } });
    await expect(service.refill(user, 'ord-1', NOW)).rejects.toThrow(REFILL_ERROR.prescriptionRequired);
    expect(orders.create).not.toHaveBeenCalled();
  });

  it('409 when the prescription has no validity date or refill count', async () => {
    const { service, orders } = build({ rx: { id: 'rx-1', refills_remaining: 2 } });
    await expect(service.refill(user, 'ord-1', NOW)).rejects.toThrow(REFILL_ERROR.validityUnknown);
    expect(orders.create).not.toHaveBeenCalled();
  });

  it('409 when the prescription has expired', async () => {
    const { service, orders, prescriptions } = build({ rx: { id: 'rx-1', valid_until: PAST, refills_remaining: 2 } });
    await expect(service.refill(user, 'ord-1', NOW)).rejects.toThrow(REFILL_ERROR.expired);
    expect(prescriptions.updateOne).not.toHaveBeenCalled();
    expect(orders.create).not.toHaveBeenCalled();
  });

  it('409 when no refills are left', async () => {
    const { service, orders } = build({ rx: { id: 'rx-1', valid_until: FUTURE, refills_remaining: 0 } });
    await expect(service.refill(user, 'ord-1', NOW)).rejects.toThrow(REFILL_ERROR.refillsExhausted);
    expect(orders.create).not.toHaveBeenCalled();
  });

  it('409 when a concurrent refill took the last one', async () => {
    const { service, orders } = build({ taken: 0 });
    await expect(service.refill(user, 'ord-1', NOW)).rejects.toThrow(REFILL_ERROR.refillsExhausted);
    expect(orders.submit).not.toHaveBeenCalled();
  });

  it('creates and submits an ordinary order, and takes one refill', async () => {
    const { service, orders, prescriptions } = build();
    const out = await service.refill(user, 'ord-1', NOW);
    expect(out).toEqual({ id: 'draft-1', status: 'broadcast' });
    expect(prescriptions.updateOne).toHaveBeenCalledWith(
      { id: 'rx-1', patient_id: 'pat-1', refills_remaining: { $gte: 1 }, valid_until: { $gt: NOW } },
      { $inc: { refills_remaining: -1 } },
    );
    const body = orders.create.mock.calls[0][1];
    expect(body.prescription_id).toBe('rx-1');
    expect(body.items[0]).toEqual({ raw_name: 'Amlodipine', name_ar: undefined, name_en: undefined, generic_name: undefined, medicine_id: 'med-1', dosage: '5mg', form: undefined, frequency: undefined, duration: undefined, qty: 2, sku: 'SKU-1', notes: undefined });
    expect(body.items[0]).not.toHaveProperty('price');
    expect(body.items[0]).not.toHaveProperty('id');
    expect(orders.submit).toHaveBeenCalledWith(user, 'draft-1');
    expect(orders.cancel).not.toHaveBeenCalled();
  });

  it('skips the prescription check for non-prescription lines', async () => {
    flags.mockResolvedValue([{ medicine_id: 'med-1', requires_prescription: false, controlled: false } as any]);
    const { service, orders, prescriptions } = build({ order: { id: 'ord-1', patient_account_id: 'pat-1', items: [{ medicine_id: 'med-1', qty: 1 }] } });
    await service.refill(user, 'ord-1', NOW);
    expect(prescriptions.updateOne).not.toHaveBeenCalled();
    expect(orders.submit).toHaveBeenCalled();
  });

  it('cancels the draft and gives the refill back when submit fails before the order goes out', async () => {
    const { service, orders, prescriptions } = build();
    orders.submit.mockRejectedValue(new ConflictException('pharmacy_broadcast_disabled'));
    await expect(service.refill(user, 'ord-1', NOW)).rejects.toThrow('pharmacy_broadcast_disabled');
    expect(orders.cancel).toHaveBeenCalledWith(user, 'draft-1', 'refill_not_submitted');
    expect(prescriptions.updateOne).toHaveBeenLastCalledWith({ id: 'rx-1' }, { $inc: { refills_remaining: 1 } });
  });

  it('keeps the refill used when the order already went out, even if submit then failed', async () => {
    const { service, orders, prescriptions } = build({ draftStatus: 'ready_for_split' });
    orders.submit.mockRejectedValue(new Error('detail failed after broadcast'));
    await expect(service.refill(user, 'ord-1', NOW)).rejects.toThrow('detail failed after broadcast');
    expect(orders.cancel).not.toHaveBeenCalled();
    expect(prescriptions.updateOne).not.toHaveBeenCalledWith({ id: 'rx-1' }, { $inc: { refills_remaining: 1 } });
  });

  it('still surfaces the submit error when the give-back itself fails', async () => {
    const { service, orders, prescriptions } = build();
    orders.submit.mockRejectedValue(new ConflictException('pharmacy_broadcast_disabled'));
    prescriptions.updateOne.mockImplementation(async (_f: any, u: any) => (u.$inc.refills_remaining === 1 ? Promise.reject(new Error('db down')) : { modifiedCount: 1 }));
    await expect(service.refill(user, 'ord-1', NOW)).rejects.toThrow('pharmacy_broadcast_disabled');
  });

  it('takes the refill only after the draft exists, and cancels the draft when the take loses the race', async () => {
    const { service, orders, prescriptions } = build({ taken: 0, rx: { id: 'rx-1', valid_until: FUTURE, refills_remaining: 2 } });
    prescriptions.findOne.mockResolvedValueOnce({ id: 'rx-1', valid_until: FUTURE, refills_remaining: 2 }).mockResolvedValueOnce({ id: 'rx-1', valid_until: FUTURE, refills_remaining: 0 });
    await expect(service.refill(user, 'ord-1', NOW)).rejects.toThrow(REFILL_ERROR.refillsExhausted);
    expect(orders.create).toHaveBeenCalled();
    expect(orders.cancel).toHaveBeenCalledWith(user, 'draft-1', 'refill_not_submitted');
    expect(orders.submit).not.toHaveBeenCalled();
  });
});
