import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { BookingOpsService } from './booking-ops.module';

function chain(value: any) {
  return { lean: jest.fn().mockResolvedValue(value) };
}

describe('BookingOpsService access contract', () => {
  function make() {
    const orders: any = { findOne: jest.fn(), updateOne: jest.fn() };
    const labs: any = { findOne: jest.fn(), updateOne: jest.fn() };
    const rads: any = { findOne: jest.fn(), updateOne: jest.fn() };
    const home: any = { findOne: jest.fn(), updateOne: jest.fn() };
    const appts: any = { findOne: jest.fn(), updateOne: jest.fn() };
    const providers: any = {};
    const attachments: any = { find: jest.fn(), findOne: jest.fn(), create: jest.fn() };
    return { service: new BookingOpsService(orders, labs, rads, home, appts, providers, attachments), orders, labs, rads, home, appts, attachments };
  }

  it('rejects a patient from reading a foreign lab invoice', async () => {
    const { service, labs } = make();
    labs.findOne.mockReturnValue(chain(null));
    await expect(service.invoice({ id: 'patient-2', role: 'patient' }, 'lab', 'lab-1')).rejects.toBeInstanceOf(NotFoundException);
    expect(labs.findOne).toHaveBeenCalledWith({ id: 'lab-1', patient_id: 'patient-2' }, { _id: 0, __v: 0 });
  });

  it('rejects a non-provider from marking payment', async () => {
    const { service } = make();
    await expect(service.markPayment({ id: 'patient-1', role: 'patient' }, 'lab', 'lab-1', { status: 'paid' }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a provider from marking an unassigned radiology booking', async () => {
    const { service, rads } = make();
    rads.findOne.mockReturnValue(chain(null));
    await expect(service.markPayment({ id: 'provider-2', role: 'radiology' }, 'radiology', 'rad-1', { status: 'paid' }))
      .rejects.toBeInstanceOf(NotFoundException);
    expect(rads.updateOne).not.toHaveBeenCalled();
  });

  it('allows the patient owner to list attachments without exposing base64', async () => {
    const { service, labs, attachments } = make();
    labs.findOne.mockReturnValue(chain({ id: 'lab-1', patient_id: 'patient-1' }));
    attachments.find.mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([{ id: 'a-1' }]) }) });
    await expect(service.listAttachments({ id: 'patient-1', role: 'patient' }, 'lab', 'lab-1')).resolves.toEqual([{ id: 'a-1' }]);
    expect(attachments.find).toHaveBeenCalledWith({ booking_kind: 'lab', booking_id: 'lab-1' }, { base64: 0, _id: 0, __v: 0 });
  });
});

/** VAT model A (owner, 2026-11-01): the derived invoice adds no VAT to the service price. */
describe('BookingOpsService.invoice: platform VAT', () => {
  function make(booking: any, config: Record<string, any> = {}) {
    const col = (n: string) => (n === 'finance_config' ? { findOne: jest.fn(async (q: any) => config[q?.key] ?? null) } : {});
    const labs: any = { findOne: jest.fn().mockReturnValue(chain(booking)), updateOne: jest.fn() };
    const appts: any = { findOne: jest.fn(), db: { collection: col } };
    const none: any = { findOne: jest.fn(), updateOne: jest.fn() };
    return new BookingOpsService(none, labs, none, none, appts, {} as any, {} as any);
  }
  const registered = { invoice: { seller_name: 'منصة نبض الطبية', vat_number: '300000000000003' }, commissions: { tax: { vat_percent: 15 } } };
  const lab = { id: 'l1', patient_id: 'p1', subtotal: 200, delivery_fee: 0 };
  const patient = { id: 'p1', role: 'patient' };

  it('a service price with no delivery fee: tax 0 (registered), total = price, nothing added on top', async () => {
    const inv: any = await make(lab, registered).invoice(patient, 'lab', 'l1');
    expect(inv.breakdown).toMatchObject({ subtotal: 200, tax: 0, total: 200 });
  });
  it('the VAT inside the delivery fee is the only platform VAT', async () => {
    const inv: any = await make({ ...lab, delivery_fee: 15 }, registered).invoice(patient, 'lab', 'l1');
    expect(inv.breakdown).toMatchObject({ subtotal: 200, tax: 1.96, delivery_fee: 15, total: 200 });
  });
  it('no VAT number: tax is null, the total is the same', async () => {
    const inv: any = await make({ ...lab, delivery_fee: 15 }).invoice(patient, 'lab', 'l1');
    expect(inv.breakdown).toMatchObject({ tax: null, total: 200 });
  });
  it('the booking\'s own total wins and is never raised by tax', async () => {
    const inv: any = await make({ ...lab, total: 215, delivery_fee: 15 }, registered).invoice(patient, 'lab', 'l1');
    expect(inv.breakdown.total).toBe(215);
  });
});
