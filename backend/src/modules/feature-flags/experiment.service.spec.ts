import { hashToBucket, pickVariant, evaluateGuardrails, reportResult } from './experiment-bucketing';
import { ExperimentService } from './experiment.service';

type Doc = Record<string, unknown>;

function makeConn() {
  const store: Record<string, Doc[]> = { experiments: [], experiment_assignments: [], experiment_conversions: [] };
  const matches = (doc: Doc, filter: Record<string, unknown>): boolean => {
    for (const [k, cond] of Object.entries(filter)) {
      const c = cond as Doc;
      if (c !== null && typeof c === 'object' && '$eq' in c) {
        if (doc[k] !== c['$eq']) return false;
      } else if (doc[k] !== (cond as unknown)) return false;
    }
    return true;
  };
  const conn = {
    collection: (name: string) => ({
      findOne: async (f: Record<string, unknown>): Promise<Doc | null> =>
        store[name].find((d) => matches(d, f)) ?? null,
      insertOne: async (d: Doc): Promise<{ insertedId: unknown }> => {
        store[name].push(d);
        return { insertedId: d['id'] };
      },
      find: (f: Record<string, unknown>) => ({
        toArray: async (): Promise<Doc[]> => store[name].filter((d) => matches(d, f)),
      }),
      findOneAndUpdate: async (
        f: Record<string, unknown>,
        u: Record<string, unknown>,
      ): Promise<{ value: Doc } | null> => {
        const d = store[name].find((x) => matches(x, f));
        if (!d) return null;
        Object.assign(d, (u['$set'] as Doc) || {});
        return { value: d };
      },
    }),
  };
  return { store, conn };
}

const baseDto = (key: string, idem: string) => ({
  key,
  hypothesis: 'B converts better than A',
  variants: [
    { name: 'A', weight: 50 },
    { name: 'B', weight: 50 },
  ],
  rolloutPercentage: 100,
  salt: 's1',
  guardrails: [{ metric: 'cancel_rate', threshold: 5, direction: 'max' as const }],
  idempotencyKey: idem,
});

describe('P22.10 experiment bucketing (pure)', () => {
  it('hashToBucket is deterministic and bounded', () => {
    expect(hashToBucket('exp:s1:u1')).toBe(hashToBucket('exp:s1:u1'));
    expect(hashToBucket('exp:s1:u1')).toBeGreaterThanOrEqual(0);
    expect(hashToBucket('exp:s1:u1')).toBeLessThan(100);
  });

  it('traffic split approximates weights', () => {
    const counts: Record<string, number> = { A: 0, B: 0 };
    for (let i = 0; i < 400; i++) {
      const r = pickVariant('exp1', 's1', `user-${i}`, [
        { name: 'A', weight: 50 },
        { name: 'B', weight: 50 },
      ], 100);
      counts[r.variant] += 1;
    }
    expect(counts['A']).toBeGreaterThan(140);
    expect(counts['A']).toBeLessThan(260);
    expect(counts['B']).toBeGreaterThan(140);
    expect(counts['B']).toBeLessThan(260);
  });

  it('rollout gate parks unexposed subjects in off', () => {
    const r = pickVariant('exp1', 's1', 'anyone', [{ name: 'A', weight: 100 }], 0);
    expect(r).toEqual({ variant: 'off', bucket: r.bucket, exposed: false });
  });

  it('evaluateGuardrails flags max breaches only', () => {
    const out = evaluateGuardrails(
      [{ metric: 'cancel_rate', threshold: 5, direction: 'max' }],
      [{ metric: 'cancel_rate', value: 8 }],
    );
    expect(out[0].breached).toBe(true);
    const ok = evaluateGuardrails(
      [{ metric: 'cancel_rate', threshold: 5, direction: 'max' }],
      [{ metric: 'cancel_rate', value: 2 }],
    );
    expect(ok[0].breached).toBe(false);
  });

  it('reportResult picks the higher-rate variant', () => {
    const out = reportResult(
      [
        { subjectId: 'a1', variant: 'A' },
        { subjectId: 'a2', variant: 'A' },
        { subjectId: 'b1', variant: 'B' },
        { subjectId: 'b2', variant: 'B' },
      ],
      [{ subjectId: 'a1' }, { subjectId: 'b1' }, { subjectId: 'b2' }],
    );
    expect(out.winner).toBe('B');
  });
});

describe('P22.10 ExperimentService (mocked collections)', () => {
  it('rejects bad definitions', async () => {
    const { conn } = makeConn();
    const svc = new ExperimentService(conn as unknown as import('mongoose').Connection);
    await svc.create(baseDto('e-dup', 'idem-dup-1') as never);
    await expect(svc.create(baseDto('e-dup', 'idem-dup-2') as never)).rejects.toThrow('experiment_key_exists');
    await expect(
      svc.create({ ...baseDto('e-bad2', 'idem-bad-2'), variants: [{ name: 'A', weight: 100 }] } as never),
    ).rejects.toThrow();
    await expect(
      svc.create({ ...baseDto('e-bad3', 'idem-bad-3'), variants: [{ name: 'A', weight: 60 }, { name: 'B', weight: 60 }] } as never),
    ).rejects.toThrow();
  });

  it('sticky bucketing: same subject keeps its variant', async () => {
    const { conn } = makeConn();
    const svc = new ExperimentService(conn as unknown as import('mongoose').Connection);
    await svc.create(baseDto('e-sticky', 'idem-sticky-create') as never);
    const first = await svc.assign('e-sticky', { subjectId: 'u-7', idempotencyKey: 'idem-asg-0001' });
    const second = await svc.assign('e-sticky', { subjectId: 'u-7', idempotencyKey: 'idem-asg-0002' });
    expect(first.variant).not.toBe('off');
    expect(second.variant).toBe(first.variant);
    expect(second.sticky).toBe(true);
  });

  it('create is idempotent on idempotencyKey', async () => {
    const { store, conn } = makeConn();
    const svc = new ExperimentService(conn as unknown as import('mongoose').Connection);
    const a = await svc.create(baseDto('e-idem', 'idem-same-key') as never);
    const b = await svc.create({ ...baseDto('e-idem-other', 'idem-same-key'), key: 'e-idem-other' } as never);
    expect(a.id).toBe(b.id);
    expect(store['experiments'].length).toBe(1);
  });

  it('reported result: test experiment winner matches conversions', async () => {
    const { conn } = makeConn();
    const svc = new ExperimentService(conn as unknown as import('mongoose').Connection);
    await svc.create(baseDto('e-report', 'idem-report-create') as never);
    const assignedB: string[] = [];
    const assignedA: string[] = [];
    for (let i = 0; i < 60; i++) {
      const r = await svc.assign('e-report', { subjectId: `rep-u-${i}`, idempotencyKey: `idem-rep-${i}` });
      if (r.variant === 'B') assignedB.push(`rep-u-${i}`);
      else if (r.variant === 'A') assignedA.push(`rep-u-${i}`);
    }
    expect(assignedB.length).toBeGreaterThan(0);
    expect(assignedA.length).toBeGreaterThan(0);
    for (let i = 0; i < assignedB.length; i++) {
      await svc.convert('e-report', { subjectId: assignedB[i], idempotencyKey: `idem-cnv-b-${i}` });
    }
    if (assignedA.length > 0) {
      await svc.convert('e-report', { subjectId: assignedA[0], idempotencyKey: 'idem-cnv-a-0' });
    }
    const report = await svc.report('e-report', { cancel_rate: 2 });
    expect(report.winner).toBe('B');
    const bRow = report.variants.find((v) => v.variant === 'B');
    expect(bRow?.rate).toBe(100);
    expect(report.guardrails[0].breached).toBe(false);
    const breached = await svc.report('e-report', { cancel_rate: 9 });
    expect(breached.guardrails[0].breached).toBe(true);
  });

  it('stopped experiments park everyone in off', async () => {
    const { conn } = makeConn();
    const svc = new ExperimentService(conn as unknown as import('mongoose').Connection);
    await svc.create(baseDto('e-stop', 'idem-stop-create') as never);
    await svc.stop('e-stop');
    const r = await svc.assign('e-stop', { subjectId: 'u-1', idempotencyKey: 'idem-stop-asg' });
    expect(r.variant).toBe('off');
    expect(r.exposed).toBe(false);
  });
});
