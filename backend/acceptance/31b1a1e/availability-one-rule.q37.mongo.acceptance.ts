// ACCEPTANCE — 31b1a1e / Q37 / Q36 / Q41 (REVIEW_REAUDIT Round 12 Phase A #8). Written
// by the reviewer before the fix; the implementing agent makes it pass and may not
// edit it. ONE shared availability function (owner decision) used by the slot list,
// the doctor-list "next available" preview and booking (create / reschedule): the
// 5-minute buffer and other patients' holds apply everywhere, so every listed slot
// can be booked and nothing outside the list can.
// Q37 / Q36 / Q41 (owner decision: ONE shared availability function).
// The slot list counted RESCHEDULED appointments (create() does not) and
// ignored other patients' active holds; the doctor-list "next available"
// preview was a second engine with no buffer and no holds, so cards could
// advertise slots create() refuses. All paths now use modules/care/availability.ts.
import mongoose, { Connection, Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { SlotService } from '../../src/modules/care/slot.service';
import { CareService } from '../../src/modules/care/care.service';
import { conflictingAppointmentFilter } from '../../src/modules/care/availability';
import { AppointmentSchema } from '../../src/schemas/appointment.schema';
import { LeaveRequestSchema } from '../../src/schemas/leave-request.schema';
import { ProviderProfileSchema } from '../../src/schemas/provider-profile.schema';

jest.setTimeout(60_000);

const DAY = 24 * 3600_000;
const tomorrow = new Date(Date.now() + 2 * DAY).toISOString().slice(0, 10);
const at = (hm: string) => new Date(`${tomorrow}T${hm}:00.000Z`);
const dow = new Date(`${tomorrow}T00:00:00Z`).getUTCDay();

describe('one availability rule for list, preview and booking (Q37/Q36/Q41)', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let appts: Model<any>;
  let providers: Model<any>;
  let slots: SlotService;
  let care: CareService;
  const pub = { type: 'doctor', status: 'active', public_eligibility: true, medical_review_status: 'approved', consultation_modes: ['clinic'] };

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'onerule' }).asPromise();
    appts = conn.model('Appointment', AppointmentSchema);
    const leaves = conn.model('LeaveRequest', LeaveRequestSchema);
    providers = conn.model('ProviderProfile', ProviderProfileSchema);
    slots = new SlotService(appts as never, leaves as never);
    care = new CareService(providers as never, {} as never, {} as never, slots);
    const book = (doctor: string, s: string, e: string, status: string) => ({ id: `${doctor}-${s}`, doctor_id: doctor, patient_id: 'p-x', slot_start: at(s), slot_end: at(e), duration_minutes: 30, status });
    await appts.collection.insertMany([
      book('doc-1', '10:30', '11:00', 'CONFIRMED'),
      book('doc-1', '13:00', '13:30', 'RESCHEDULED'),
      book('doc-2', '11:00', '11:30', 'CONFIRMED'),
    ]);
    const hold = (doctor: string, s: string, e: string) => ({ id: `h-${doctor}-${s}`, provider_id: doctor, patient_id: 'p-other', booking_kind: 'consultation', slot_start: at(s), slot_end: at(e), status: 'held', expires_at: new Date(Date.now() + 3600_000) });
    await conn.collection('slotlocks').insertMany([hold('doc-1', '15:00', '15:30'), hold('doc-2', '10:00', '10:30')]);
    await providers.collection.insertMany([
      { id: 'doc-1', name_ar: 'د1', ...pub, working_hours: [{ day: 'all', open: '09:00', close: '17:00' }] },
      { id: 'doc-2', name_ar: 'د2', ...pub, working_hours: [{ day: dow, open: '10:00', close: '11:00' }] },
    ]);
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });

  const listed = async (id: string) => {
    const doc = await providers.findOne({ id }).lean();
    const r: any = await slots.slotsForDate(doc as never, tomorrow, 'clinic');
    return new Map<string, boolean>(r.slots.map((s: any) => [s.label, s.available]));
  };

  it('the slot list applies the buffer, frees RESCHEDULED slots and honours other patients\' holds', async () => {
    const m = await listed('doc-1');
    expect(m.get('10:00')).toBe(false); // 10:00-10:30 + 5 min buffer meets the 10:30 booking
    expect(m.get('11:00')).toBe(true);
    expect(m.get('13:00')).toBe(true); // RESCHEDULED moved away
    expect(m.get('15:00')).toBe(false); // held by another patient
    expect(m.get('14:30')).toBe(true); // holds have no buffer (same as create)
  });

  it('the patient who holds a slot still sees it available', async () => {
    const r: any = await care.doctorSlots('doc-1', tomorrow, 'clinic', ['p-other']);
    expect(r.slots.find((x: any) => x.label === '15:00').available).toBe(true);
  });

  it('every listed slot agrees with create()\'s conflict query', async () => {
    for (const [label, available] of await listed('doc-1')) {
      const conflict = await appts.findOne(conflictingAppointmentFilter('doc-1', at(label), 30)).lean();
      const held = await conn.collection('slotlocks').findOne({ provider_id: 'doc-1', status: 'held', expires_at: { $gt: new Date() }, slot_start: { $lt: new Date(at(label).getTime() + 30 * 60_000) }, slot_end: { $gt: at(label) } });
      expect([label, available]).toEqual([label, !conflict && !held]);
    }
  });

  it('the doctor list preview uses the same rule (no buffer-less or hold-blind first slot)', async () => {
    const res: any = await care.listDoctors({ limit: 20 });
    const card = (res.data || res.items || res).find((d: any) => d.id === 'doc-2');
    // Tomorrow: 10:00 is held, 10:30 meets the 11:00 booking with the buffer -> next is a week later.
    expect(card.next_available_at).toBe(new Date(at('10:00').getTime() + 7 * DAY).toISOString());
  });
});
