// Independent check (Q37): duration_minutes came from the client unbounded and
// create() booked it as sent. -30 put a booking after closing time with its end
// before its start; 600 blocked a whole day for one consultation. Every
// appointment is the length the list offers, and an opening that is not on a
// quarter hour no longer lists starts that create() refuses.
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateAppointmentDto } from '../appointments.dto';
import { AppointmentsService } from '../appointments.service';
import { APPOINTMENT_MINUTES, candidateSlots } from '../availability';

const base = { doctor_id: 'doc-1', service_type: 'clinic', slot_start: '2030-01-02T10:00:00.000Z' };
const errorsFor = async (body: object) =>
  (await validate(plainToInstance(CreateAppointmentDto, body))).map((e) => e.property);

describe('appointment length is not the client\'s to choose', () => {
  it.each([-30, 0, 45, 600, 30.5])('the DTO refuses duration_minutes=%p', async (d) => {
    expect(await errorsFor({ ...base, duration_minutes: d })).toContain('duration_minutes');
  });

  it('the DTO accepts the offered length or none', async () => {
    expect(await errorsFor({ ...base, duration_minutes: APPOINTMENT_MINUTES })).toEqual([]);
    expect(await errorsFor(base)).toEqual([]);
  });

  it('create() checks and books APPOINTMENT_MINUTES even if a caller passes another length', async () => {
    const at = new Date(Date.now() + 3 * 86400000);
    at.setUTCHours(10, 0, 0, 0);
    const doctor = { id: 'doc-1', type: 'doctor', status: 'active', consultation_modes: ['clinic'] };
    const slots = { slotsForDate: jest.fn(async () => ({ slots: [] })) };
    const service = new AppointmentsService({ findOne: jest.fn().mockResolvedValue(null), create: jest.fn() } as never,
      { findOne: jest.fn().mockResolvedValue(doctor) } as never,
      { model: jest.fn().mockReturnValue({ findOne: jest.fn().mockResolvedValue(null) }), db: { collection: jest.fn() } } as never,
      { emit: jest.fn() } as never, { apply: jest.fn(), announceCreated: jest.fn() } as never, { createRequest: jest.fn() } as never, slots as never);
    await expect(service.create({ id: 'pat-1', role: 'patient' }, { ...base, slot_start: at.toISOString(), duration_minutes: 600 } as never)).rejects.toThrow();
    expect(slots.slotsForDate).toHaveBeenCalledWith(doctor, at.toISOString().slice(0, 10), 'clinic', APPOINTMENT_MINUTES, ['pat-1']);
    expect(slots.slotsForDate).not.toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.anything(), 600, expect.anything());
  });
});

describe('the start grid sits on the 15-minute boundary booking requires', () => {
  const day = new Date('2030-01-02T00:00:00Z');
  it('an opening at 09:10 lists 09:15 and 09:45, never 09:10 / 09:40', () => {
    const labels = candidateSlots(day, [{ open: '09:10', close: '10:30' }], 30, 0).map((s) => s.label);
    expect(labels).toEqual(['09:15', '09:45']);
  });
  it('every listed start is on a quarter hour', () => {
    for (const open of ['08:05', '08:20', '08:44', '08:59']) {
      for (const s of candidateSlots(day, [{ open, close: '12:00' }], 30, 0)) {
        expect(new Date(s.start).getUTCMinutes() % 15).toBe(0);
      }
    }
  });
  it('an overnight window is still recognised after rounding', () => {
    const labels = candidateSlots(day, [{ open: '23:50', close: '01:00' }], 30, 0).map((s) => s.label);
    expect(labels).toEqual(['00:00', '00:30']);
  });
});
