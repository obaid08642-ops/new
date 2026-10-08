import { MysteryShopperService } from './mystery-shopper.p22.service';
import { computeScorecard } from '../provider/services/provider-scorecard.math';

type Doc = Record<string, unknown>;

function makeConn() {
  const store: Record<string, Doc[]> = {
    mystery_shop_assignments: [],
    mystery_shop_findings: [],
    provider_complaints: [],
    provider_quality_alerts: [],
  };
  const matches = (doc: Doc, filter: Record<string, unknown>): boolean => {
    for (const [k, cond] of Object.entries(filter)) {
      const c = cond as Doc;
      if (c !== null && typeof c === 'object' && !Array.isArray(c) && !(c instanceof Date) && '$eq' in c) {
        if (doc[k] !== c['$eq']) return false;
      } else if (doc[k] !== (cond as unknown)) return false;
    }
    return true;
  };
  const conn = {
    collection: (name: string) => ({
      findOne: async (f: Record<string, unknown>): Promise<Doc | null> =>
        (store[name] || []).find((d) => matches(d, f)) ?? null,
      insertOne: async (d: Doc): Promise<{ insertedId: unknown }> => {
        (store[name] = store[name] || []).push(d);
        return { insertedId: d['id'] };
      },
      updateOne: async (f: Record<string, unknown>, u: Record<string, unknown>): Promise<{ modifiedCount: number }> => {
        const d = (store[name] || []).find((x) => matches(x, f));
        if (!d) return { modifiedCount: 0 };
        Object.assign(d, (u['$set'] as Doc) || {});
        return { modifiedCount: 1 };
      },
      find: (f: Record<string, unknown>) => ({
        toArray: async (): Promise<Doc[]> => (store[name] || []).filter((d) => matches(d, f)),
        limit: (n: number) => ({
          toArray: async (): Promise<Doc[]> => (store[name] || []).filter((d) => matches(d, f)).slice(0, n),
        }),
      }),
      countDocuments: async (f: Record<string, unknown>): Promise<number> =>
        (store[name] || []).filter((d) => matches(d, f)).length,
    }),
  };
  return { store, conn };
}

const svcOf = (conn: unknown): MysteryShopperService =>
  new MysteryShopperService(conn as unknown as import('mongoose').Connection);

const ALL_PASS = Object.fromEntries(MysteryShopperService.CHECKS.map((c) => [c, 'pass']));

const setupAssignment = async (svc: MysteryShopperService, key: string, provider = 'p-1') => {
  const a = (await svc.createAssignment({
    providerAccountId: provider,
    dueAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    idempotencyKey: key,
  })) as unknown as Record<string, unknown>;
  return String(a['id']);
};

describe('P22.12/Phase 1.1 mystery-shopper assignments', () => {
  it('create is idempotent on idempotencyKey and defaults to the 8 standard checks', async () => {
    const { store, conn } = makeConn();
    const svc = svcOf(conn);
    const a = await svc.createAssignment({ providerAccountId: 'p-1', dueAt: new Date(Date.now() + 86400000).toISOString(), idempotencyKey: 'idem-msa-1' });
    const b = await svc.createAssignment({ providerAccountId: 'p-1', dueAt: new Date(Date.now() + 86400000).toISOString(), idempotencyKey: 'idem-msa-1' });
    expect(a['id']).toBe(b['id']);
    expect(store['mystery_shop_assignments'].length).toBe(1);
    expect(a['checklist']).toEqual([...MysteryShopperService.CHECKS]);
  });

  it('rejects unknown checklist checks and invalid due dates', async () => {
    const { conn } = makeConn();
    const svc = svcOf(conn);
    await expect(
      svc.createAssignment({ providerAccountId: 'p-1', checklist: ['bogus_check'], dueAt: new Date(Date.now() + 86400000).toISOString(), idempotencyKey: 'idem-msa-2' }),
    ).rejects.toThrow('unknown_check');
    await expect(
      svc.createAssignment({ providerAccountId: 'p-1', dueAt: 'not-a-date', idempotencyKey: 'idem-msa-3' }),
    ).rejects.toThrow('invalid_due_at');
  });
});

describe('P22.12/Phase 1.1 mystery-shopper findings + threshold alerts', () => {
  it('all-pass findings score 100 with no alert', async () => {
    const { store, conn } = makeConn();
    const svc = svcOf(conn);
    const assignmentId = await setupAssignment(svc, 'idem-msa-10');
    const out = (await svc.submitFindings({
      assignmentId,
      checks: { ...ALL_PASS },
      photoMediaIds: ['media-1', 'media-2'],
      notes: 'spotless visit',
      idempotencyKey: 'idem-msf-10',
    })) as unknown as Record<string, unknown>;
    expect(out['score']).toBe(100);
    expect(out['alert']).toBeNull();
    expect(store['provider_complaints'].length).toBe(0);
    expect(store['provider_quality_alerts'].length).toBe(0);
  });

  it('critical fail caps at 59 and raises complaint + admin alert', async () => {
    const { store, conn } = makeConn();
    const svc = svcOf(conn);
    const assignmentId = await setupAssignment(svc, 'idem-msa-11');
    const out = (await svc.submitFindings({
      assignmentId,
      checks: { ...ALL_PASS, price_match: 'fail' },
      photoMediaIds: ['media-9'],
      notes: 'charged more than quoted',
      idempotencyKey: 'idem-msf-11',
    })) as unknown as Record<string, unknown>;
    // 7 passes = 87.5, capped to 59 by the critical fail
    expect(out['score']).toBe(59);
    expect(out['critical_fail']).toBe(true);
    expect(out['alert']).not.toBeNull();
    expect(store['provider_complaints'].length).toBe(1);
    expect(store['provider_complaints'][0]['reporter_user_id']).toBe('mystery-shopper');
    expect(store['provider_complaints'][0]['category']).toBe('service');
    expect(store['provider_quality_alerts'].length).toBe(1);
  });

  it('score below 60 alerts; 62.5 (5/8, no critical fail) does not', async () => {
    const { store, conn } = makeConn();
    const svc = svcOf(conn);
    const low = await setupAssignment(svc, 'idem-msa-12');
    const lowOut = (await svc.submitFindings({
      assignmentId: low,
      // fail 4 non-critical checks → 50
      checks: { ...ALL_PASS, booking_no_support: 'fail', accept_within_sla: 'fail', support_reachable: 'fail', receipt_issued: 'fail' },
      idempotencyKey: 'idem-msf-12',
    })) as unknown as Record<string, unknown>;
    expect(lowOut['score']).toBe(50);
    expect(lowOut['alert']).not.toBeNull();

    const ok = await setupAssignment(svc, 'idem-msa-13');
    const okOut = (await svc.submitFindings({
      assignmentId: ok,
      // fail 3 non-critical checks → 62.5, criticals pass → no cap, no alert
      checks: { ...ALL_PASS, booking_no_support: 'fail', support_reachable: 'fail', receipt_issued: 'fail' },
      idempotencyKey: 'idem-msf-13',
    })) as unknown as Record<string, unknown>;
    expect(okOut['score']).toBe(62.5);
    expect(okOut['alert']).toBeNull();
    expect(store['provider_quality_alerts'].length).toBe(1);
  });

  it('duplicate findings submit is idempotent (no second alert)', async () => {
    const { store, conn } = makeConn();
    const svc = svcOf(conn);
    const assignmentId = await setupAssignment(svc, 'idem-msa-14');
    const dto = { assignmentId, checks: { ...ALL_PASS, hygiene_professionalism: 'fail' }, idempotencyKey: 'idem-msf-14' };
    const a = await svc.submitFindings(dto);
    const b = await svc.submitFindings(dto);
    expect((a as Doc)['id']).toBe((b as Doc)['id']);
    expect(store['mystery_shop_findings'].length).toBe(1);
    expect(store['provider_quality_alerts'].length).toBe(1);
  });

  it('rejects unknown checks, invalid values, and missing checklist items', async () => {
    const { conn } = makeConn();
    const svc = svcOf(conn);
    const assignmentId = await setupAssignment(svc, 'idem-msa-15');
    await expect(
      svc.submitFindings({ assignmentId, checks: { ...ALL_PASS, bogus: 'pass' }, idempotencyKey: 'idem-msf-15a' }),
    ).rejects.toThrow('unknown_check');
    await expect(
      svc.submitFindings({ assignmentId, checks: { ...ALL_PASS, price_match: 'maybe' }, idempotencyKey: 'idem-msf-15b' }),
    ).rejects.toThrow('invalid_check_value');
    const { price_match: _drop, ...partial } = ALL_PASS;
    void _drop;
    await expect(
      svc.submitFindings({ assignmentId, checks: partial, idempotencyKey: 'idem-msf-15c' }),
    ).rejects.toThrow('missing_or_invalid_check');
    await expect(
      svc.submitFindings({ assignmentId: 'nope', checks: { ...ALL_PASS }, idempotencyKey: 'idem-msf-15d' }),
    ).rejects.toThrow('assignment_not_found');
  });
});

describe('P22.12/Phase 1.1 mystery-shopper scorecard component', () => {
  it('listResults aggregates the mystery_shopper component (avgScore + visits)', async () => {
    const { conn } = makeConn();
    const svc = svcOf(conn);
    const a1 = await setupAssignment(svc, 'idem-msa-20');
    await svc.submitFindings({ assignmentId: a1, checks: { ...ALL_PASS }, idempotencyKey: 'idem-msf-20' });
    const a2 = await setupAssignment(svc, 'idem-msa-21');
    await svc.submitFindings({
      assignmentId: a2,
      checks: { ...ALL_PASS, booking_no_support: 'fail', support_reachable: 'fail', receipt_issued: 'fail', accept_within_sla: 'fail' },
      idempotencyKey: 'idem-msf-21',
    });
    const { results, component } = await svc.listResults('p-1');
    expect(results.length).toBe(2);
    expect(component.visits).toBe(2);
    expect(component.avgScore).toBe(75);
    const single = await svc.getMysteryShopperComponent('p-1');
    expect(single).toEqual(component);
    expect((await svc.getMysteryShopperComponent('p-unknown')).avgScore).toBeNull();
  });

  it('scorecard blends the component: sub-60 penalizes + breaches; absent is neutral', () => {
    const healthy = {
      totalRequests: 10,
      accepted: 9,
      rejected: 1,
      cancelled: 1,
      completed: 8,
      acceptResponseSeconds: [60],
      avgRating: 4.5,
      ratingsCount: 6,
      complaintsOpen: 0,
      complaintsTotal: 0,
    };
    const plain = computeScorecard({ ...healthy }, 85);
    expect(plain.breached).toBe(false);
    expect(plain.mysteryShopper).toEqual({ avgScore: null, visits: 0 });

    const bad = computeScorecard({ ...healthy, mysteryShopper: { avgScore: 40, visits: 2 } }, 85);
    expect(bad.mysteryShopper).toEqual({ avgScore: 40, visits: 2 });
    expect(bad.breachReasons).toContain('mystery_shopper_below_60');
    expect(bad.breached).toBe(true);
    expect(bad.reliabilityBlended).toBe(plain.reliabilityBlended - 15);
  });
});
