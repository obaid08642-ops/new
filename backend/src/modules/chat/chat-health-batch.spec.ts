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
      // One query per model; the filter is { $or: [forward, reverse] }.
      exists: jest.fn((filter: any) => {
        opts.calls?.push(name);
        if ((opts.failingModels || []).includes(name)) return Promise.reject(new Error('db down'));
        const [fwd, rev] = (opts.counts?.[name] as [number, number] | undefined) || [0, 0];
        const hasBothDirections = Array.isArray(filter?.$or) && filter.$or.length === 2
          && JSON.stringify(filter.$or[0].$and[0]).includes('userA') && JSON.stringify(filter.$or[1].$and[0]).includes('userB');
        const n = hasBothDirections ? fwd + rev : 0;
        const v = n > 0 ? { _id: `${name}-1` } : null;
        if (opts.deferred) return new Promise((res) => gates.push(() => res(v)));
        return Promise.resolve(v);
      }),
    };
  });
  service.logger = { warn: jest.fn() };
  return {
    service,
    flush: () => gates.splice(0).forEach((res) => res()),
  };
}

describe('hasDirectRelationship early exit', () => {
  it('asks one model at a time and stops at the first match (a006d5a)', async () => {
    const calls: string[] = [];
    const { service } = chatServiceFor({ counts: { LabBooking: [1, 0], Order: [1, 0] }, calls });
    await expect(service.hasDirectRelationship('userA', 'userB')).resolves.toBe(true);
    expect(calls).toEqual(['Appointment', 'LabBooking']);

    const none: string[] = [];
    const miss = chatServiceFor({ calls: none });
    await expect(miss.service.hasDirectRelationship('userA', 'userB')).resolves.toBe(false);
    expect(none).toEqual(['Appointment', 'LabBooking', 'RadiologyBooking', 'HomeCareBooking', 'Order']);
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

function healthServiceFor(rows: Array<Record<string, unknown>>) {
  const vitals = { aggregate: jest.fn().mockResolvedValue(rows) };
  const service = new HealthService(vitals as never, {} as never, {} as never, {} as never, {} as never, undefined);
  return { service, vitals };
}

describe('latestVitals single aggregate (a006d5a)', () => {
  const bp = { type: 'bp', value: '120/80', measured_at: new Date('2026-09-01') };
  const glucose = { type: 'glucose', value: '102', measured_at: new Date('2026-09-02') };

  it('issues one aggregate: patient match, newest first, first per type, no _id/__v', async () => {
    const { service, vitals } = healthServiceFor([glucose, bp]);
    const out = await service.latestVitals({ id: 'patient-9' });
    expect(vitals.aggregate).toHaveBeenCalledTimes(1);
    const [pipeline] = vitals.aggregate.mock.calls[0];
    expect(pipeline[0]).toEqual({ $match: { patient_id: 'patient-9', type: { $in: expect.any(Array) }, deleted_at: null } });
    expect(pipeline[1]).toEqual({ $sort: { measured_at: -1 } });
    expect(pipeline[2]).toEqual({ $group: { _id: '$type', doc: { $first: '$$ROOT' } } });
    expect(pipeline[4]).toEqual({ $project: { _id: 0, __v: 0 } });
    expect(Object.keys(out)).toEqual(['bp', 'glucose']);
    expect(out.bp).toBe(bp);
  });

  it('omits types without a reading', async () => {
    const { service } = healthServiceFor([{ type: 'heart_rate', value: '72' }]);
    await expect(service.latestVitals({ id: 'p' })).resolves.toEqual({ heart_rate: { type: 'heart_rate', value: '72' } });
  });
});
