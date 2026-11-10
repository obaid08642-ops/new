import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateOrderingBookingDto } from './ordering.dto';
import { OrderingService } from './ordering.service';

// The web and the app send `family_member_id` on the booking too when it is for another family member (decision 1). The global ValidationPipe rejects unknown fields,
// so the DTO has to declare it; the quote already fixed the person, so the booking may only name that same person.
const body = (over: Record<string, unknown> = {}) => ({
  quote_id: 'q-1', payment_method: 'cash', selections: { facility: { provider_id: 'prov-1', slot_id: '2026-12-01T10:00' } }, ...over,
});
const check = async (b: Record<string, unknown>) => validate(plainToInstance(CreateOrderingBookingDto, b), { whitelist: true, forbidNonWhitelisted: true });

describe('POST /ordering/bookings: family_member_id on the booking', () => {
  it('is accepted by the validation (before: 400 "property family_member_id should not exist")', async () => {
    expect(await check(body({ family_member_id: 'member-1' }))).toEqual([]);
    expect(await check(body())).toEqual([]);                                   // the patient\'s own booking never sends it
  });
  it('must be a string of the id shape', async () => {
    expect((await check(body({ family_member_id: 12 }))).length).toBeGreaterThan(0);
    expect((await check(body({ family_member_id: { $ne: null } }))).length).toBeGreaterThan(0);
    expect((await check(body({ family_member_id: 'x'.repeat(200) }))).length).toBeGreaterThan(0);
  });

  function service(quote: any, members: any[] = [{ id: 'member-1', owner_id: 'pat' }]) {
    const svc: any = Object.create(OrderingService.prototype);
    svc.conn = {
      collection: (name: string) => ({
        findOne: async (f: any) => {
          if (name === 'family_members') return members.find((m) => m.id === f.id.$eq && m.owner_id === 'pat') ?? null;
          return quote;
        },
      }),
    };
    return svc;
  }
  const quote = (over: Record<string, unknown> = {}) => ({ id: 'q-1', patient_id: 'pat', service_kind: 'lab', expires_at: new Date(Date.now() + 3600_000), groups: [], family_member_id: null, ...over });
  const patient = { id: 'pat', role: 'patient' };
  const run = (svc: any, b: Record<string, unknown>) => svc.book(patient, plainToInstance(CreateOrderingBookingDto, b)).then(() => null, (e: any) => e);

  it('a booking that names another member than its quote is refused before anything is written', async () => {
    const e = await run(service(quote({ family_member_id: null })), body({ family_member_id: 'member-1' }));
    expect(e).toBeInstanceOf(BadRequestException);
    expect(e.message).toBe('family_member_mismatch');
    const e2 = await run(service(quote({ family_member_id: 'member-2' }), [{ id: 'member-1', owner_id: 'pat' }, { id: 'member-2', owner_id: 'pat' }]), body({ family_member_id: 'member-1' }));
    expect(e2.message).toBe('family_member_mismatch');
  });
  it('someone else\'s member is a 404, never booked', async () => {
    const e = await run(service(quote({ family_member_id: 'stranger-1' }), []), body({ family_member_id: 'stranger-1' }));
    expect(e).toBeInstanceOf(NotFoundException);
  });
  it('the same member as the quote passes this check (the booking goes on to its own rules)', async () => {
    const e = await run(service(quote({ family_member_id: 'member-1' })), body({ family_member_id: 'member-1' }));
    expect(e?.message).not.toBe('family_member_mismatch');
    const own = await run(service(quote()), body());
    expect(own?.message).not.toBe('family_member_mismatch');
  });
});
