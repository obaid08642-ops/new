import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ownAppointmentId, ownedVisit } from './appointment-link';

jest.setTimeout(120_000);
let mongod: MongoMemoryServer;
beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'link' });
  await mongoose.connection.db!.collection('appointments').insertMany([
    { id: 'a1', patient_id: 'p1', doctor_user_id: 'doc-1' },
    { id: 'a2', patient_id: 'p2', doctor_user_id: 'doc-1' },
    { id: 'a3', patient_id: 'p1', doctor_user_id: 'doc-2' },
  ] as any);
});
afterAll(async () => { await mongoose.disconnect(); await mongod.stop(); });

describe('ownAppointmentId: the visit a certificate or report is written for', () => {
  const c = () => mongoose.connection;
  it('is the first candidate that is this doctor\'s appointment of this patient', async () => {
    expect(await ownAppointmentId(c(), 'doc-1', 'p1', ['request-uuid', 'a1'])).toBe('a1');
    expect(await ownAppointmentId(c(), 'doc-1', 'p1', ['a1', 'a3'])).toBe('a1');
  });
  it('never stores a provider-request id, another doctor\'s visit or another patient\'s visit', async () => {
    expect(await ownAppointmentId(c(), 'doc-1', 'p1', ['request-uuid'])).toBeNull();
    expect(await ownAppointmentId(c(), 'doc-1', 'p1', ['a3'])).toBeNull();     // doc-2's visit
    expect(await ownAppointmentId(c(), 'doc-1', 'p1', ['a2'])).toBeNull();     // p2's visit
  });
  it('ignores "new", empty and non-string candidates, and operators', async () => {
    expect(await ownAppointmentId(c(), 'doc-1', 'p1', ['new', '', undefined, null, { $ne: 'x' }, 7])).toBeNull();
    expect(await ownAppointmentId(c(), '', 'p1', ['a1'])).toBeNull();
  });
});

describe('ownedVisit: a normal appointment of this doctor, with its patient', () => {
  const c = () => mongoose.connection;
  it('answers the patient of the doctor\'s own appointment', async () => {
    expect(await ownedVisit(c(), 'doc-1', 'a2')).toEqual({ id: 'a2', patient_id: 'p2', patient_name: null });
  });
  it('never another doctor\'s visit, an unknown id, "new", or an operator', async () => {
    expect(await ownedVisit(c(), 'doc-1', 'a3')).toBeNull();
    expect(await ownedVisit(c(), 'doc-1', 'nope')).toBeNull();
    expect(await ownedVisit(c(), 'doc-1', 'new')).toBeNull();
    expect(await ownedVisit(c(), 'doc-1', { $ne: 'x' })).toBeNull();
    expect(await ownedVisit(c(), '', 'a1')).toBeNull();
  });
});
