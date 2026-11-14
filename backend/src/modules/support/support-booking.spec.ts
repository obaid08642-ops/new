import { SupportService } from './support.service';

// PT-15: a ticket may name the booking it is about, and it must be the patient's own.
describe('support ticket about a booking', () => {
  function make(rows: Record<string, any>) {
    const created: any[] = [];
    const conn: any = { collection: (n: string) => ({ findOne: jest.fn(async () => rows[n] ?? null) }) };
    const req: any = { create: jest.fn(async (d: any) => { created.push(d); return { toObject: () => d }; }) };
    const svc = Object.create(SupportService.prototype) as any;
    Object.assign(svc, { conn, req });
    return { svc: svc as SupportService, created };
  }
  const me = { id: 'p1', role: 'patient', full_name: 'A' };
  const body = { subject: 'charged twice', message: 'I was charged twice for this lab visit' };

  it('keeps the kind and id of the patient\'s own booking', async () => {
    const { svc, created } = make({ labbookings: { patient_id: 'p1' } });
    await svc.create(me, { ...body, category: 'payment', booking_kind: 'lab', booking_id: 'l1' });
    expect(created[0]).toMatchObject({ category: 'PAYMENT', booking_kind: 'lab', booking_id: 'l1' });
  });

  it('maps the appointment alias to consultation', async () => {
    const { svc, created } = make({ appointments: { patient_id: 'p1' } });
    await svc.create(me, { ...body, booking_kind: 'appointment', booking_id: 'a1' });
    expect(created[0]).toMatchObject({ booking_kind: 'consultation', booking_id: 'a1' });
  });

  it('someone else\'s booking is not found', async () => {
    const { svc } = make({ labbookings: { patient_id: 'other' } });
    await expect(svc.create(me, { ...body, booking_kind: 'lab', booking_id: 'l1' })).rejects.toThrow('booking_not_found');
  });

  it('a kind without an id (or an object id) is refused', async () => {
    const { svc } = make({});
    await expect(svc.create(me, { ...body, booking_kind: 'lab' })).rejects.toThrow('required_together');
    await expect(svc.create(me, { ...body, booking_kind: 'lab', booking_id: { $ne: null } })).rejects.toThrow('required_together');
  });

  it('a ticket with no booking is unchanged', async () => {
    const { svc, created } = make({});
    await svc.create(me, body);
    expect(created[0].booking_id).toBeUndefined();
  });
});
