import { EmergencyService } from './emergency.service';

/**
 * Perf Rank 1: dispatch loop used to issue 2 queries per candidate
 * (profiles.findOne + countDocuments, sequential, unbounded by fleet size).
 * Now: 1 × $in profiles query + 1 × grouped workload aggregation,
 * joined in memory. Dispatch policy/scoring is untouched.
 *
 * This spec proves, on shared fixtures:
 *  1. same-decision: the batched service picks the exact vehicle id that the
 *     ORIGINAL sequential algorithm picks (replicated verbatim below);
 *  2. fewer queries: profiles.find ×1, model.aggregate ×1,
 *     profiles.findOne ×0, model.countDocuments ×0.
 */
describe('EmergencyService.autoDispatch batched lookup', () => {
  const W = {
    typeCriticalIcu: 40,
    typeCriticalAls: 25,
    typeMatchBase: 10,
    etaMax: 35,
    sameCity: 8,
    ratingMax: 10,
    workloadPenalty: 8,
    hospitalBonus: Number(process.env.AMBULANCE_HOSPITAL_PRIORITY_BONUS || 0),
  };

  const patient = { lat: 24.7136, lng: 46.6753, address: 'Riyadh, Olaya district' };

  const vehicles = [
    { id: 'v1', provider_account_id: 'a1', vehicle_type: 'ICU', plate_number: 'ICU-1', last_location: { lat: 24.72, lng: 46.68 } },
    { id: 'v2', provider_account_id: 'a2', vehicle_type: 'ALS', plate_number: 'ALS-1', last_location: { lat: 24.7137, lng: 46.6754 } },
    { id: 'v3', provider_account_id: 'a3', vehicle_type: 'BLS', plate_number: 'BLS-1', last_location: { lat: 25.2, lng: 47.1 } }, // no profile
    { id: 'v4', provider_account_id: 'a4', vehicle_type: 'ICU', plate_number: 'ICU-2', base_city: 'Riyadh' },
    { id: 'v5', provider_account_id: 'a1', vehicle_type: 'ALS', plate_number: 'ALS-2', last_location: { lat: 24.7136, lng: 46.6753 } }, // shares account a1
  ];
  const profDocs = [
    { account_id: 'a1', rating_avg: 4.5, type: 'individual' },
    { account_id: 'a2', rating_avg: 5.0, type: 'individual' },
    { account_id: 'a4', rating_avg: 4.0, type: 'hospital' },
  ];
  const profById = new Map(profDocs.map((p) => [p.account_id, p]));
  const workloads: Record<string, number> = { v1: 2, v2: 0, v3: 0, v4: 5, v5: 1 };

  function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
    const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  /** Verbatim copy of the ORIGINAL sequential scoring (per-vehicle findOne + count). */
  function oldSequentialPick(cands: any[]): { id: string; score: number } {
    const critical = true;
    let best: { v: any; score: number } | null = null;
    for (const v of cands) {
      let score = 0;
      const vt = v.vehicle_type || (v.has_icu ? 'ICU' : 'BLS');
      if (critical) score += vt === 'ICU' ? W.typeCriticalIcu : vt === 'ALS' ? W.typeCriticalAls : 0;
      else score += W.typeMatchBase;
      const ll = v.last_location;
      if (ll?.lat && ll?.lng && patient.lat && patient.lng) {
        const km = haversineKm(ll.lat, ll.lng, patient.lat, patient.lng);
        const eta = (km / 40) * 60;
        score += Math.max(0, W.etaMax - Math.min(W.etaMax, eta));
      } else if (v.base_city && patient.address && String(patient.address).includes(v.base_city)) {
        score += W.sameCity;
      }
      const prof: any = profById.get(v.provider_account_id); // ← old findOne result
      score += Math.min(W.ratingMax, (prof?.rating_avg || 0) * 2);
      if (W.hospitalBonus && (prof?.type === 'hospital' || prof?.type === 'clinic')) {
        score += W.hospitalBonus;
      }
      const active = workloads[v.id] ?? 0; // ← old countDocuments result
      score -= active * W.workloadPenalty;
      if (!best || score > best.score) best = { v, score };
    }
    return { id: best!.v.id, score: best!.score };
  }

  const emergencyDoc = {
    id: 'e1', state: 'TRIGGERED', severity: 'critical',
    location: patient, assigned_ambulance_id: null,
    toObject() { const { toObject, ...rest }: any = this; return { ...rest }; },
  };

  function makeService() {
    const profilesFind = jest.fn(async () => [...profDocs]);
    const profilesFindOne = jest.fn(async (q: any) => profDocs.find((p) => p.account_id === q.account_id) || null);
    const profilesColl: any = {
      find: jest.fn((_q: any) => ({ toArray: profilesFind })),
      findOne: profilesFindOne,
    };
    const notifColl: any = { insertOne: jest.fn(async () => ({})) };
    const conn: any = { db: { collection: jest.fn((n: string) => (n === 'provider_profiles' ? profilesColl : notifColl)) } };
    const model: any = {
      findOne: jest.fn(async () => emergencyDoc),
      countDocuments: jest.fn(async () => 0),
      aggregate: jest.fn(async () => Object.entries(workloads).filter(([, n]) => n > 0).map(([_id, n]) => ({ _id, n }))),
      updateOne: jest.fn(async () => ({ modifiedCount: 1 })),
    };
    const vehiclesModel: any = { find: jest.fn(() => ({ lean: async () => [...vehicles] })) };
    const events: any = { emit: jest.fn() };
    const svc = new EmergencyService(model, vehiclesModel, conn, events);
    return { svc, model, profilesColl, profilesFind, profilesFindOne };
  }

  it('picks the same vehicle as the old sequential algorithm', async () => {
    const { svc } = makeService();
    const expected = oldSequentialPick(vehicles);
    const out: any = await svc.autoDispatch('e1');
    expect(out.ok).toBe(true);
    expect(out.vehicle_id).toBe(expected.id);
    expect(out.score).toBeCloseTo(expected.score, 10);
  });

  it('issues 2 batched queries instead of 2N per-vehicle queries (N=5: 10 → 2)', async () => {
    const { svc, model, profilesColl, profilesFind, profilesFindOne } = makeService();
    await svc.autoDispatch('e1');
    // batched path: exactly one $in profiles query + one grouped aggregation
    expect(profilesColl.find).toHaveBeenCalledTimes(1);
    expect(profilesFind).toHaveBeenCalledTimes(1);
    expect(profilesColl.find).toHaveBeenCalledWith(
      { account_id: { $in: expect.arrayContaining(['a1', 'a2', 'a3', 'a4']) } },
      expect.anything(),
    );
    expect(model.aggregate).toHaveBeenCalledTimes(1);
    expect(model.aggregate).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ $match: expect.anything() }), expect.objectContaining({ $group: expect.anything() })]));
    // old per-vehicle path: dead — zero calls
    expect(profilesFindOne).not.toHaveBeenCalled();
    expect(model.countDocuments).not.toHaveBeenCalled();
  });
});
