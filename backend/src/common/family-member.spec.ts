import { BadRequestException, NotFoundException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { resolveFamilyMemberId } from './family-member';
import { BookDto as LabBookDto } from '../modules/labs/labs.dto';
import { BookDto as RadiologyBookDto } from '../modules/radiology/radiology.dto';
import { BookDto as HomeCareBookDto } from '../modules/compat/compat.dto';
import { CreateAppointmentDto } from '../modules/care/appointments.dto';
import { CreateDto as PharmacyCreateDto } from '../modules/pharmacy/pharmacy.controllers.dto';
import { LabBookingSchema } from '../schemas/lab.schema';
import { RadiologyBookingSchema } from '../schemas/radiology.schema';
import { HomeCareBookingSchema } from '../schemas/home-care.schema';
import { AppointmentSchema } from '../schemas/appointment.schema';
import { PharmacyOrderSchema } from '../modules/pharmacy/schemas/pharmacy.schema';

function fakeDb(members: any[]) {
  const findOne = jest.fn(async (filter: any) => {
    const owners = filter.$or.map((c: any) => Object.values(c)[0]);
    return members.find((m) => m.id === filter.id.$eq && [m.owner_id, m.user_id, m.patient_id].some((v) => owners.includes(v))) ?? null;
  });
  return { db: { collection: jest.fn(() => ({ findOne })) }, findOne };
}

describe('resolveFamilyMemberId (owner decision 1)', () => {
  const members = [{ id: 'fm-1', owner_id: 'u1' }, { id: 'fm-2', owner_id: 'u2' }, { id: 'fm-3', patient_id: 'u1' }];

  it('nothing given, or the caller\'s own id: the default, the booking is for the patient (no lookup)', async () => {
    const { db, findOne } = fakeDb(members);
    expect(await resolveFamilyMemberId(db, 'u1', undefined)).toBeUndefined();
    expect(await resolveFamilyMemberId(db, 'u1', null)).toBeUndefined();
    expect(await resolveFamilyMemberId(db, 'u1', '')).toBeUndefined();
    expect(await resolveFamilyMemberId(db, 'u1', 'u1')).toBeUndefined();
    expect(findOne).not.toHaveBeenCalled();
  });

  it('a member of the caller is accepted (owner or linked patient), and the lookup is a literal match on the family_members collection', async () => {
    const { db, findOne } = fakeDb(members);
    expect(await resolveFamilyMemberId(db, 'u1', 'fm-1')).toBe('fm-1');
    expect(await resolveFamilyMemberId(db, 'u1', 'fm-3')).toBe('fm-3');
    expect(db.collection).toHaveBeenCalledWith('family_members');
    expect(findOne.mock.calls[0][0].id).toEqual({ $eq: 'fm-1' });
  });

  it('another user\'s member is answered as not found, never as forbidden', async () => {
    const { db } = fakeDb(members);
    await expect(resolveFamilyMemberId(db, 'u1', 'fm-2')).rejects.toBeInstanceOf(NotFoundException);
    await expect(resolveFamilyMemberId(db, 'u1', 'nobody')).rejects.toThrow('family_member_not_found');
  });

  it('a non-string or oversized id is a 400 and never reaches the database (no operator objects)', async () => {
    const { db, findOne } = fakeDb(members);
    await expect(resolveFamilyMemberId(db, 'u1', { $ne: null })).rejects.toBeInstanceOf(BadRequestException);
    await expect(resolveFamilyMemberId(db, 'u1', 42)).rejects.toBeInstanceOf(BadRequestException);
    await expect(resolveFamilyMemberId(db, 'u1', 'x'.repeat(129))).rejects.toBeInstanceOf(BadRequestException);
    expect(findOne).not.toHaveBeenCalled();
  });
});

describe('family_member_id on the create DTOs and the stored documents', () => {
  const dtos: Array<[string, any, Record<string, unknown>]> = [
    ['lab booking', LabBookDto, { items: [], scheduled_at: '2030-01-01T10:00:00Z' }],
    ['radiology booking', RadiologyBookDto, {}],
    ['home-care booking', HomeCareBookDto, {}],
    ['consultation', CreateAppointmentDto, { doctor_id: 'd', service_type: 'clinic', slot_start: '2030-01-01T10:00:00Z' }],
    ['pharmacy order', PharmacyCreateDto, {}],
  ];

  it.each(dtos)('%s: optional string, bounded', async (_n, cls, base) => {
    const keep = async (v: unknown) => (await validate(plainToInstance(cls, { ...base, family_member_id: v }, {}) as object, { whitelist: true, forbidNonWhitelisted: false }))
      .filter((e) => e.property === 'family_member_id');
    expect(await keep('fm-1')).toHaveLength(0);
    expect(await keep(undefined)).toHaveLength(0);
    expect(await keep(5)).not.toHaveLength(0);
    expect(await keep('x'.repeat(129))).not.toHaveLength(0);
  });

  it.each([['lab', LabBookingSchema], ['radiology', RadiologyBookingSchema], ['home care', HomeCareBookingSchema], ['appointment', AppointmentSchema], ['pharmacy order', PharmacyOrderSchema]])
  ('%s: the document has the field, so reads return it', (_n, schema: any) => {
    expect(schema.path('family_member_id')).toBeDefined();
    expect(schema.path('family_member_id').options.required).toBe(false);
  });
});
