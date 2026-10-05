// 705f22c: the batched dispatch lookup built its account -> profile map with
// Map.set over every returned profile, so when an account has more than one
// provider_profiles row the LAST one won. The sequential code it replaced
// used findOne (the first row). Real MongoDB: the first profile's rating is
// the one that scores the unit.
import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EmergencyService } from './emergency.service';
import { EmergencyRequestRepository } from './repositories/emergencyrequest.repository';
import { EmergencyRequest, EmergencyRequestSchema } from '../../schemas/emergency.schema';
import { AmbulanceVehicle, AmbulanceVehicleSchema } from '../../schemas/ambulance-vehicle.schema';

jest.setTimeout(60_000);

describe('auto-dispatch scores a unit with the first profile of its account (real MongoDB)', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let svc: EmergencyService;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'dispatch' }).asPromise();
    const requests = conn.model(EmergencyRequest.name, EmergencyRequestSchema);
    const vehicles = conn.model(AmbulanceVehicle.name, AmbulanceVehicleSchema);
    // Schema-class models vs the *Document generics the service declares: same collections.
    svc = new EmergencyService(new EmergencyRequestRepository(requests as never), vehicles as never, conn, new EventEmitter2());

    // Non-critical, no coordinates: score = 10 (type base) + min(10, rating * 2) - workload.
    await vehicles.collection.insertMany([
      { id: 'v1', provider_account_id: 'acc-1', plate_number: 'A-1', vehicle_type: 'BLS', status: 'approved', is_available: true },
      { id: 'v2', provider_account_id: 'acc-2', plate_number: 'B-2', vehicle_type: 'BLS', status: 'approved', is_available: true },
    ]);
    // acc-1 has two profile rows: the first (rating 0) is the account's profile;
    // a later duplicate carries rating 5. acc-2 has one profile with rating 2.5.
    await conn.db!.collection('provider_profiles').insertMany([
      { id: 'p1', account_id: 'acc-1', rating_avg: 0, type: 'ambulance' },
      { id: 'p2', account_id: 'acc-2', rating_avg: 2.5, type: 'ambulance' },
      { id: 'p1-dup', account_id: 'acc-1', rating_avg: 5, type: 'ambulance' },
    ]);
    await requests.collection.insertOne({
      id: 'sos-1', patient_id: 'patient-1', severity: 'moderate', state: 'ADMIN_NOTIFIED', state_history: [],
    });
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });

  it('dispatches v2 (rating 2.5 -> 15) over v1 (first profile rating 0 -> 10)', async () => {
    const out = await svc.autoDispatch('sos-1');
    expect(out).toMatchObject({ ok: true, vehicle_id: 'v2', score: 15 });
    const sos = await conn.db!.collection('emergency_requests').findOne({ id: 'sos-1' });
    expect(sos?.assigned_ambulance_id).toBe('v2');
  });
});
