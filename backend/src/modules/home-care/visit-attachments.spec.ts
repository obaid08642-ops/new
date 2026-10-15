import { ForbiddenException } from '@nestjs/common';
import { HomeCareCompatController } from './home-care-compat.module';

/** N1: the nurse attaches result files to the visit report; only her own files, shared with that booking's patient. */
describe('HomeCareCompatController visit-report attachments (N1)', () => {
  const nurse = { id: 'nurse-1', role: 'nurse', provider_type: 'nursing' };
  function make(ownedIds: string[]) {
    const booking: any = { id: 'visit-1', patient_id: 'patient-1', provider_id: 'nurse-1', state: 'CARE_IN_PROGRESS', state_history: [], save: jest.fn(), markModified: jest.fn() };
    const bookings: any = { findOne: jest.fn(async () => booking) };
    const files = ownedIds.map((id) => ({ id, mime: 'application/pdf', original_name: `${id}.pdf` }));
    const col: any = {
      find: jest.fn(() => ({ toArray: async () => files })),
      updateMany: jest.fn(async () => ({})),
    };
    const conn: any = { collection: jest.fn(() => col) };
    const controller: any = new HomeCareCompatController(bookings, {} as any, {} as any, {} as any, undefined, conn);
    return { controller, booking, col };
  }

  it('stores the attachments on the visit and shares the files with the patient only', async () => {
    const { controller, booking, col } = make(['f1', 'f2']);
    await controller.visitReport(nurse, 'visit-1', { complete: true, signature: 'data:image/png;base64,AAAA', attachments: [{ storage_id: 'f1', name: 'CBC' }, { storage_id: 'f2' }] });
    expect(col.find.mock.calls[0][0]).toEqual(expect.objectContaining({ owner_account_id: { $eq: 'nurse-1' } }));
    expect(col.updateMany).toHaveBeenCalledWith(expect.objectContaining({ owner_account_id: { $eq: 'nurse-1' } }), { $addToSet: { shared_with: 'patient-1' } });
    expect(booking.attachments.map((a: any) => [a.storage_id, a.name])).toEqual([['f1', 'CBC'], ['f2', 'f2.pdf']]);
    expect(booking.state).toBe('COMPLETED');
    expect(booking.save).toHaveBeenCalled();
  });

  it("refuses a file the nurse did not upload and changes nothing", async () => {
    const { controller, booking, col } = make(['f1']);
    await expect(controller.visitReport(nurse, 'visit-1', { complete: true, signature: 'data:image/png;base64,AAAA', attachments: [{ storage_id: 'f1' }, { storage_id: 'someone-else' }] }))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(col.updateMany).not.toHaveBeenCalled();
    expect(booking.save).not.toHaveBeenCalled();
  });

  it('a patient cannot attach files to the visit', async () => {
    const { controller, col } = make(['f1']);
    await expect(controller.visitReport({ id: 'patient-1', role: 'patient' }, 'visit-1', { attachments: [{ storage_id: 'f1' }] }))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(col.updateMany).not.toHaveBeenCalled();
  });

  it('keeps the patient signature sent with the report', async () => {
    const { controller, booking } = make([]);
    await controller.visitReport(nurse, 'visit-1', { complete: true, signature: 'data:image/png;base64,AAAA' });
    expect(booking.patient_signature_base64).toBe('data:image/png;base64,AAAA');
  });
});

describe('completing a visit needs the patient signature on both end-of-visit paths (provider-journeys#13)', () => {
  it('visit-report with complete:true and no signature is refused, and a visit cannot complete straight from ARRIVED', async () => {
    const { HomeCareCompatController } = require('./home-care-compat.module');
    const booking: any = { id: 'visit-2', patient_id: 'patient-1', provider_id: 'nurse-1', state: 'CARE_IN_PROGRESS', state_history: [], save: jest.fn(), markModified: jest.fn() };
    const c: any = Object.create(HomeCareCompatController.prototype);
    c.getBookingForAccess = jest.fn(async () => booking);
    c.isAdmin = () => false;
    c.isNursingProvider = () => true;
    const nurse = { id: 'nurse-1', role: 'nurse' };
    await expect(c.visitReport(nurse, 'visit-2', { complete: true })).rejects.toThrow('patient_signature_required');
    booking.state = 'ARRIVED';
    await expect(c.visitReport(nurse, 'visit-2', { complete: true, signature: 'data:image/png;base64,AAAA' })).rejects.toThrow('invalid_transition');
    expect(booking.save).not.toHaveBeenCalled();
  });

  it('/nursing/visits/:id/complete without a signature is refused', async () => {
    const { NursingController } = require('./home-care.controller');
    const visit: any = { id: 'visit-3', state: 'CARE_IN_PROGRESS', timers: {}, state_history: [], markModified: jest.fn(), save: jest.fn() };
    const c: any = Object.create(NursingController.prototype);
    c.findVisit = jest.fn(async () => visit);
    c.assertProviderMutation = jest.fn();
    c.events = { emit: jest.fn() };
    await expect(c.completeVisit('visit-3', { clinical_notes: 'x' }, { id: 'nurse-1' })).rejects.toThrow('patient_signature_required');
    expect(visit.save).not.toHaveBeenCalled();
  });
});
