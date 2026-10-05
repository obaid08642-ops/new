// a006d5a: hasDirectRelationship ran 5 booking models x 2 directions = 10
// count queries on every call, even when the first model already proved the
// relationship. It now asks each model once (both directions in one query)
// and stops at the first model that has a booking between the two users.
import mongoose, { Connection, Schema } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ChatService } from './chat.service';

jest.setTimeout(60_000);

const BOOKING_MODELS = ['Appointment', 'LabBooking', 'RadiologyBooking', 'HomeCareBooking', 'Order'];
const loose = () => new Schema({}, { strict: false });

describe('hasDirectRelationship stops at the first match (a006d5a)', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let service: ChatService;
  const queries: string[] = [];

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'chatrel' }).asPromise();
    const threads = conn.model('ChatThread', loose());
    conn.model('FamilyGroup', loose());
    for (const m of BOOKING_MODELS) conn.model(m, loose());
    service = new ChatService(threads as never, {} as never, {} as never, {} as never);
    await conn.model('Appointment').collection.insertOne({ patient_id: 'pat-1', doctor_user_id: 'doc-1' });
    await conn.model('Order').collection.insertOne({ patient_id: 'pat-2', pharmacy_account_id: 'ph-1' });
    mongoose.set('debug', (collection: string, method: string) => {
      if (method !== 'createIndex') queries.push(`${collection}.${method}`);
    });
  });
  afterAll(async () => { mongoose.set('debug', false); await conn.close(); await mongo.stop(); });
  beforeEach(() => { queries.length = 0; });

  const bookingQueries = () => queries.filter((q) => !q.startsWith('familygroups.'));

  it('a booking in the first model answers with one booking query', async () => {
    await expect(service.hasDirectRelationship('doc-1', 'pat-1')).resolves.toBe(true);
    expect(bookingQueries()).toHaveLength(1);
  });

  it('a booking in the last model takes one query per model', async () => {
    await expect(service.hasDirectRelationship('pat-2', 'ph-1')).resolves.toBe(true);
    expect(bookingQueries()).toHaveLength(BOOKING_MODELS.length);
  });

  it('no relationship takes one query per model and answers false', async () => {
    await expect(service.hasDirectRelationship('pat-1', 'ph-1')).resolves.toBe(false);
    expect(bookingQueries()).toHaveLength(BOOKING_MODELS.length);
  });
});
