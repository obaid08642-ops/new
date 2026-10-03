import { ChatService } from './chat.service';
import { HealthService } from '../health/health.service';

const tick = () => new Promise<void>((r) => setImmediate(r));

function chatServiceFor(opts: {
  family?: boolean;
  counts?: Record<string, [number, number]>;
  missingModels?: string[];
  failingModels?: string[];
  deferred?: boolean;
  calls?: string[];
}) {
  const service: any = Object.create(ChatService.prototype);
  service.threads = { findOne: jest.fn(), create: jest.fn(), updateOne: jest.fn() };
  service.checkIfFamily = jest.fn().mockResolvedValue(!!opts.family);
  const gates: Array<() => void> = [];
  service.getModel = jest.fn((name: string) => {
    if ((opts.missingModels || []).includes(name)) throw new Error(`not registered: ${name}`);
    return {
      countDocuments: jest.fn((filter: any) => {
        // Forward filter puts userA in the patient $or ($and[0]); reverse puts userB there.
        const patientClause = JSON.stringify(filter?.$and?.[0] ?? filter);
        const isFwd = patientClause.includes('userA');
        opts.calls?.push(`${name}:${isFwd ? 'fwd' : 'rev'}`);
        if ((opts.failingModels || []).includes(name)) return Promise.reject(new Error('db down'));
        const [fwd, rev] = (opts.counts?.[name] as [number, number] | undefined) || [0, 0];
        // Direction proxy: the forward filter embeds userA in the patient $or.
        const n = isFwd ? fwd : rev;
        if (opts.deferred) return new Promise<number>((res) => gates.push(() => res(n)));
        return Promise.resolve(n);
      }),
    };
  });
  service.logger = { warn: jest.fn() };
  return {
    service,
    flush: () => gates.splice(0).forEach((res) => res()),
  };
}

describe('hasDirectRelationship batching (perf rank 8)', () => {
  it('fans out all 5 models x 2 directions without awaiting any result first', async () => {
    const calls: string[] = [];
    const { service, flush } = chatServiceFor({ deferred: true, calls });
    const pending = service.hasDirectRelationship('userA', 'userB');
    await tick();
    // Sequential version would have issued exactly 1 count here; batched issues all 10.
    expect(service.getModel).toHaveBeenCalledTimes(5);
    expect(calls).toHaveLength(10);
    expect(new Set(calls).size).toBe(10);
    flush();
    await expect(pending).resolves.toBe(false);
  });

  it('preserves exact return values: forward hit, reverse-only hit, miss', async () => {
    const fwd = chatServiceFor({ counts: { RadiologyBooking: [1, 0] } });
    await expect(fwd.service.hasDirectRelationship('userA', 'userB')).resolves.toBe(true);

    const rev = chatServiceFor({ counts: { Order: [0, 2] } });
    await expect(rev.service.hasDirectRelationship('userA', 'userB')).resolves.toBe(true);

    const miss = chatServiceFor({});
    await expect(miss.service.hasDirectRelationship('userA', 'userB')).resolves.toBe(false);
  });

  it('keeps family fast-path and skips missing/failing models like before', async () => {
    const fam = chatServiceFor({ family: true });
    await expect(fam.service.hasDirectRelationship('a', 'b')).resolves.toBe(true);
    expect(fam.service.getModel).not.toHaveBeenCalled();

    const skip = chatServiceFor({
      missingModels: ['Appointment', 'LabBooking', 'RadiologyBooking', 'HomeCareBooking'],
      failingModels: ['Order'],
    });
    await expect(skip.service.hasDirectRelationship('userA', 'userB')).resolves.toBe(false);
  });
});

function healthServiceFor(rows: Record<string, any>, opts: { deferred?: boolean } = {}) {
  const gates: Array<() => void> = [];
  const findOneCalls: any[] = [];
  const vitals: any = {
    findOne: jest.fn((filter: any, proj: any) => {
      findOneCalls.push({ filter, proj });
      const row = rows[filter.type] ?? null;
      if (opts.deferred) {
        const p = new Promise((res) => gates.push(() => res(row)));
        return { sort: jest.fn().mockReturnValue(p) };
      }
      return { sort: jest.fn().mockResolvedValue(row) };
    }),
  };
  const service = new HealthService(vitals, {} as any, {} as any, {} as any, {} as any, undefined);
  return { service, vitals, findOneCalls, flush: () => gates.splice(0).forEach((fn) => fn()) };
}

describe('latestVitals batching (perf rank 8)', () => {
  const bp = { type: 'bp', value: '120/80', measured_at: new Date('2026-09-01') };
  const glucose = { type: 'glucose', value: '102', measured_at: new Date('2026-09-02') };

  it('issues all per-type lookups in one round, not sequentially', async () => {
    const { service, vitals, flush } = healthServiceFor({ bp, glucose }, { deferred: true });
    const pending = service.latestVitals({ id: 'patient-1' });
    await tick();
    // Sequential version would have issued 1 findOne here; batched issues all 6.
    expect(vitals.findOne).toHaveBeenCalledTimes(6);
    flush();
    const out = await pending;
    expect(Object.keys(out).sort()).toEqual(['bp', 'glucose']);
    expect(out.bp).toBe(bp);
    expect(out.glucose).toBe(glucose);
  });

  it('preserves filter, projection, sort and omission of missing types', async () => {
    const { service, vitals, findOneCalls } = healthServiceFor({ heart_rate: { type: 'heart_rate', value: '72' } });
    const out = await service.latestVitals({ id: 'patient-9' });
    expect(Object.keys(out)).toEqual(['heart_rate']);
    expect(vitals.findOne).toHaveBeenCalledTimes(6);
    for (const { filter, proj } of findOneCalls) {
      expect(filter).toEqual({ patient_id: 'patient-9', type: expect.any(String), deleted_at: null });
      expect(proj).toEqual({ _id: 0, __v: 0 });
    }
    const sorts = vitals.findOne.mock.results.map((r: any) => r.value.sort);
    expect(sorts).toHaveLength(6);
    for (const sort of sorts) expect(sort).toHaveBeenCalledWith({ measured_at: -1 });
  });
});
