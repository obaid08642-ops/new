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
