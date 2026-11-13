import { ForbiddenException } from '@nestjs/common';
import { MoyasarController, MoyasarService } from './moyasar.module';

// Rows with no owner (legacy) must not be open to every signed-in user: the ownership checks used to run only when the owner field was set.
describe('legacy Moyasar routes: a row with no owner is nobody\'s to read or pay', () => {
  const svcWith = (payments: any[]) => {
    const svc: any = Object.create(MoyasarService.prototype);
    svc.getPaymentsByBooking = jest.fn(async () => payments);
    return svc as MoyasarService;
  };

  it('GET payments/booking/:id refuses a non-admin when any payment has no patient_id or another patient', async () => {
    for (const rows of [[{ id: 'a' }], [{ id: 'a', patient_id: 'p-other' }], [{ id: 'a', patient_id: 'p1' }, { id: 'b' }]]) {
      await expect(new MoyasarController(svcWith(rows)).getByBooking({ id: 'p1', role: 'patient' }, 'bk1')).rejects.toBeInstanceOf(ForbiddenException);
    }
  });
  it('GET payments/booking/:id still serves the owner, an empty list, and an admin', async () => {
    const own = [{ id: 'a', patient_id: 'p1' }];
    expect(await new MoyasarController(svcWith(own)).getByBooking({ id: 'p1', role: 'patient' }, 'bk1')).toEqual(own);
    expect(await new MoyasarController(svcWith([])).getByBooking({ id: 'p1', role: 'patient' }, 'bk1')).toEqual([]);
    expect(await new MoyasarController(svcWith([{ id: 'a' }])).getByBooking({ id: 'adm', role: 'admin' }, 'bk1')).toEqual([{ id: 'a' }]);
  });

  it('createPayment refuses a booking that has no owner, and another patient\'s booking', async () => {
    for (const owner of [null, 'p-other']) {
      const svc: any = Object.create(MoyasarService.prototype);
      svc.resolveBookingAmount = jest.fn(async () => ({ amount: 100, patient_id: owner }));
      await expect(svc.createPayment({ bookingId: 'b1', bookingKind: 'lab', patientId: 'p1', amount: 1 })).rejects.toBeInstanceOf(ForbiddenException);
    }
  });
});
