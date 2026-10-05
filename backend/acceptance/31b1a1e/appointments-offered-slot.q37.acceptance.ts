// ACCEPTANCE — 31b1a1e / Q37 / Q36 / Q41 (REVIEW_REAUDIT Round 12 Phase A #8). Written
// by the reviewer before the fix; the implementing agent makes it pass and may not
// edit it. ONE shared availability function (owner decision) used by the slot list,
// the doctor-list "next available" preview and booking (create / reschedule): the
// 5-minute buffer and other patients' holds apply everywhere, so every listed slot
// can be booked and nothing outside the list can.
// Independent check (WP-G N2/N3): create() and reschedule() only ran the
// conflict query, so a direct API call could book outside the doctor's hours,
// on an approved-leave day, inside the lead time, or with another duration
// than the list used. Booking now accepts only a slot the one availability
// rule lists as available for that duration and that patient.
import { BadRequestException, ConflictException } from '@nestjs/common';
import { AppointmentsService } from '../../src/modules/care/appointments.service';

const dayAt = (daysOut: number, hh: number, mm: number) => {
  const d = new Date(Date.now() + daysOut * 86400000);
  d.setUTCHours(hh, mm, 0, 0);
  return d;
};

describe('booking accepts only slots the availability rule offers', () => {
  const doctor: any = { id: 'doc-1', user_id: 'doc-user-1', account_id: 'doc-acc-1', type: 'doctor', status: 'active', consultation_modes: ['clinic'], price_clinic: 200 };
  let slots: any;
  let apptModel: any;
  let service: AppointmentsService;
  const at = dayAt(3, 10, 0);

  beforeEach(() => {
    slots = { slotsForDate: jest.fn(async () => ({ slots: [{ start: dayAt(3, 9, 30).toISOString(), available: true }] })) };
    apptModel = { findOne: jest.fn().mockResolvedValue(null), create: jest.fn() };
    const providerModel = { findOne: jest.fn().mockResolvedValue(doctor) };
    const connection: any = { model: jest.fn().mockReturnValue({ findOne: jest.fn().mockResolvedValue(null) }), db: { collection: jest.fn() } };
    service = new AppointmentsService(apptModel, providerModel as never, connection, { emit: jest.fn() } as never,
      { apply: jest.fn(async (o: any) => o.mutate()), announceCreated: jest.fn() } as never, { createRequest: jest.fn() } as never, slots);
  });

  it('refuses a slot the rule does not offer (outside hours, leave, lead time)', async () => {
    await expect(service.create({ id: 'pat-1', role: 'patient' }, { doctor_id: 'doc-1', service_type: 'clinic', slot_start: at.toISOString() } as never))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(apptModel.create).not.toHaveBeenCalled();
    expect(slots.slotsForDate).toHaveBeenCalledWith(doctor, at.toISOString().slice(0, 10), 'clinic', 30, ['pat-1']);
  });

  it('refuses an offered slot the rule marks unavailable', async () => {
    slots.slotsForDate.mockResolvedValue({ slots: [{ start: at.toISOString(), available: false }] });
    await expect(service.create({ id: 'pat-1', role: 'patient' }, { doctor_id: 'doc-1', service_type: 'clinic', slot_start: at.toISOString() } as never))
      .rejects.toBeInstanceOf(ConflictException);
  });

  it('reschedule uses the same rule for the new slot', async () => {
    apptModel.findOne.mockResolvedValue({ id: 'a1', doctor_id: 'doc-1', patient_id: 'pat-1', status: 'CONFIRMED', service_type: 'clinic', duration_minutes: 45 });
    await expect(service.reschedule('a1', { id: 'pat-1', role: 'patient' }, { slot_start: at.toISOString() })).rejects.toBeInstanceOf(BadRequestException);
    expect(slots.slotsForDate).toHaveBeenCalledWith(doctor, at.toISOString().slice(0, 10), 'clinic', 45, ['pat-1']);
  });
});
