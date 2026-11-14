import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DoctorReferralsController } from './doctor-referrals.controller';
import { IssueReferralsDto } from './doctor-referrals.dto';

// PT-05: the referral routes take the apps' uuid ids (and still the Mongo ObjectIds of older callers) and resolve them to the _id the referral rows key by.
const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const oid = (c: string) => new Types.ObjectId(c.repeat(24).slice(0, 24));

function build(opts: { apptDoctor?: string; apptPatient?: string } = {}) {
  const users = [
    { _id: oid('a'), id: U(1) },   // the doctor
    { _id: oid('b'), id: U(2) },   // the patient
    { _id: oid('c'), id: U(3) },   // another doctor
  ];
  const appt = { _id: oid('d'), id: U(10), patient_id: opts.apptPatient ?? U(2), doctor_id: opts.apptDoctor ?? 'prof-1' };
  const profile = { id: 'prof-1', user_id: U(1), account_id: U(1) };
  const coll = (name: string) => ({
    findOne: jest.fn(async (f: any) => {
      if (name === 'users') return users.find((u) => (f._id ? String(u._id) === String(f._id) : u.id === f.id)) ?? null;
      if (name === 'appointments') return (f._id ? String(appt._id) === String(f._id) : appt.id === f.id) ? appt : null;
      if (name === 'provider_profiles') return f.id === profile.id ? profile : null;
      return null;
    }),
  });
  const conn: any = { db: { collection: jest.fn(coll) } };
  const created: any[] = [];
  const referralModel: any = {
    create: jest.fn(async (d: any) => { created.push(d); return { _id: oid('e') }; }),
    findOneAndUpdate: jest.fn(async (_f: any) => ({})),
    find: jest.fn(() => ({ sort: () => ({ limit: () => ({ lean: async () => [] }) }) })),
  };
  const doctorProfileModel: any = { findOne: jest.fn(async () => null) };
  const ctrl = new DoctorReferralsController(referralModel, doctorProfileModel, conn);
  return { ctrl, referralModel, created, users, appt };
}
const payload = (over: Record<string, unknown> = {}) => ({ appointmentId: U(10), patientId: U(2), doctorId: U(1), labTests: ['lab-1'], radScans: [], ...over }) as any;
const doctorReq = (id = U(1), role = 'doctor') => ({ user: { id, role } });

describe('doctor referrals take the apps\' uuid ids (PT-05)', () => {
  it('a doctor issues a referral from their own visit with uuid ids: the row keys the Mongo _ids', async () => {
    const { ctrl, created, users, appt } = build();
    const r = await ctrl.issueReferralsAndPrescription(doctorReq(), payload());
    expect(r.success).toBe(true);
    expect(created[0].appointment_id).toBe(appt._id);
    expect(created[0].patient_id).toBe(users[1]._id);
    expect(created[0].doctor_id).toBe(users[0]._id);
    expect(created[0].requested_lab_tests).toEqual(['lab-1']);
  });

  it('Mongo ObjectIds from older callers still work', async () => {
    const { ctrl, created, appt } = build();
    await ctrl.issueReferralsAndPrescription(doctorReq(), payload({ appointmentId: String(oid('d')), patientId: String(oid('b')), doctorId: String(oid('a')) }));
    expect(created[0].appointment_id).toBe(appt._id);
  });

  it('the patient must be the visit\'s patient', async () => {
    const { ctrl, referralModel } = build({ apptPatient: U(99) });
    await expect(ctrl.issueReferralsAndPrescription(doctorReq(), payload())).rejects.toBeInstanceOf(BadRequestException);
    expect(referralModel.create).not.toHaveBeenCalled();
  });

  it('another doctor cannot issue a referral for this doctor\'s visit (nor name this doctor)', async () => {
    const { ctrl, referralModel } = build();
    await expect(ctrl.issueReferralsAndPrescription(doctorReq(U(3)), payload({ doctorId: U(3) }))).rejects.toBeInstanceOf(ForbiddenException);
    await expect(ctrl.issueReferralsAndPrescription(doctorReq(U(3)), payload())).rejects.toBeInstanceOf(ForbiddenException);
    expect(referralModel.create).not.toHaveBeenCalled();
  });

  it('an admin may, and an unknown appointment is a 404', async () => {
    const { ctrl, created } = build();
    await ctrl.issueReferralsAndPrescription(doctorReq(U(77), 'admin'), payload());
    expect(created).toHaveLength(1);
    await expect(ctrl.issueReferralsAndPrescription(doctorReq(), payload({ appointmentId: U(404) }))).rejects.toBeInstanceOf(NotFoundException);
  });

  it('the diagnostic callback and the doctor\'s list accept the uuid too', async () => {
    const { ctrl, referralModel, appt } = build();
    await ctrl.diagnosticCallback(U(10), { fileUrls: ['https://x/y.pdf'] });
    expect(referralModel.findOneAndUpdate.mock.calls[0][0]).toEqual({ appointment_id: appt._id });
    await expect(ctrl.diagnosticCallback('not-an-id', { fileUrls: [] })).rejects.toBeInstanceOf(BadRequestException);
    await expect(ctrl.myReferrals(doctorReq(), U(1))).resolves.toEqual([]);
    expect(referralModel.find).toHaveBeenCalled();
  });

  it('the DTO accepts uuid and ObjectId ids and rejects anything else', async () => {
    const ok = async (v: unknown) => (await validate(plainToInstance(IssueReferralsDto, { appointmentId: v, patientId: v, doctorId: v }))).length === 0;
    expect(await ok(U(1))).toBe(true);
    expect(await ok(String(oid('a')))).toBe(true);
    expect(await ok('abc')).toBe(false);
    expect(await ok({ $ne: 1 })).toBe(false);
  });
});
