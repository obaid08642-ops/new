import { blendReliability, computeScorecard, median } from './provider-scorecard.math';
import { ProviderScorecardService } from './provider-scorecard.service';

type Doc = Record<string, unknown>;

function makeConn() {
  const store: Record<string, Doc[]> = {
    provider_requests: [],
    provider_assignment_attempts: [],
    ratings: [],
    provider_complaints: [],
    complaint_resolutions: [],
    provider_scorecards: [],
    provider_scores: [],
    provider_quality_alerts: [],
  };
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
        (store[name] || []).find((d) => matches(d, f)) ?? null,
      insertOne: async (d: Doc): Promise<{ insertedId: unknown }> => {
        (store[name] = store[name] || []).push(d);
        return { insertedId: d['id'] };
      },
      updateOne: async (
        f: Record<string, unknown>,
        u: Record<string, unknown>,
        opts?: Record<string, unknown>,
      ): Promise<{ modifiedCount: number; upsertedCount: number }> => {
        const d = (store[name] || []).find((x) => matches(x, f));
        if (!d) {
          if (opts?.['upsert']) {
            (store[name] = store[name] || []).push({ ...(u['$set'] as Doc) });
            return { modifiedCount: 0, upsertedCount: 1 };
          }
          return { modifiedCount: 0, upsertedCount: 0 };
        }
        Object.assign(d, (u['$set'] as Doc) || {});
        return { modifiedCount: 1, upsertedCount: 0 };
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

const svcOf = (conn: unknown): ProviderScorecardService =>
  new ProviderScorecardService(conn as unknown as import('mongoose').Connection);

describe('P22.12 scorecard math (pure)', () => {
  it('median handles odd/even/empty', () => {
    expect(median([])).toBeNull();
    expect(median([30])).toBe(30);
    expect(median([10, 20, 90])).toBe(20);
    expect(median([10, 20, 30, 40])).toBe(25);
  });

  it('blendReliability rewards ratings, penalizes complaints + cancel rate', () => {
    const base = 70;
    const good = blendReliability(base, { avgRating: 5, complaintsOpen: 0, cancelled: 0, totalRequests: 10 });
    expect(good).toBeGreaterThan(base);
    const bad = blendReliability(base, { avgRating: 2, complaintsOpen: 3, cancelled: 4, totalRequests: 10 });
    expect(bad).toBeLessThan(50);
  });

  it('computeScorecard breaches on reliability/complaints/cancel/rating gates', () => {
    const card = computeScorecard(
      {
        totalRequests: 10,
        accepted: 2,
        rejected: 8,
        cancelled: 4,
        completed: 1,
        acceptResponseSeconds: [60],
        avgRating: 2.5,
        ratingsCount: 6,
        complaintsOpen: 3,
        complaintsTotal: 4,
      },
      20,
    );
    expect(card.breached).toBe(true);
    expect(card.breachReasons).toContain('reliability_below_50');
    expect(card.breachReasons).toContain('complaints_open_3_plus');
    expect(card.breachReasons).toContain('cancel_rate_30pct_plus');
    expect(card.breachReasons).toContain('rating_below_3_5');
    expect(card.tier).toBe('probation');
  });
});

describe('P22.12 ProviderScorecardService from real data (mocked store)', () => {
  const seedProvider = (store: Record<string, Doc[]>) => {
    // 10 requests: 7 accepted, 2 rejected, 3 cancelled, 4 completed
    const statuses = ['accepted', 'accepted', 'accepted', 'accepted', 'accepted', 'accepted', 'accepted', 'rejected', 'rejected', 'cancelled'];
    statuses.forEach((status, i) => {
      store['provider_requests'].push({ id: `r${i}`, provider_account_id: 'p-1', status });
    });
    store['provider_requests'].push(
      { id: 'r10', provider_account_id: 'p-1', status: 'cancelled' },
      { id: 'r11', provider_account_id: 'p-1', status: 'cancelled' },
    );
    // attempts: 3 accepted with 60/120/180s response
    const secs = [60, 120, 180];
    secs.forEach((s, i) => {
      const sent = new Date('2026-09-01T10:00:00Z');
      store['provider_assignment_attempts'].push({
        id: `a${i}`,
        provider_account_id: 'p-1',
        status: 'accepted',
        sent_at: sent,
        responded_at: new Date(sent.getTime() + s * 1000),
      });
    });
    // ratings: 4,5,5
    [4, 5, 5].forEach((score, i) => {
      store['ratings'].push({ id: `rt${i}`, provider_id: 'p-1', score, status: 'published' });
    });
    // 1 open + 1 resolved complaint
    store['provider_complaints'].push(
      { id: 'c1', provider_account_id: 'p-1', status: 'open' },
      { id: 'c2', provider_account_id: 'p-1', status: 'resolved' },
    );
  };

  it('scorecard numbers match the DB', async () => {
    const { store, conn } = makeConn();
    seedProvider(store);
    const svc = svcOf(conn);
    const card = await svc.compute('p-1');
    // DB: total 12, accepted 7, rejected 2, cancelled 3 → acceptance 7/9, cancel 3/12
    expect(card.acceptanceRate).toBe(0.8);
    expect(card.cancellationRate).toBe(0.3);
    expect(card.timeToAcceptMedianSeconds).toBe(120);
    expect(card.avgRating).toBe(4.7);
    expect(card.ratingsCount).toBe(3);
    expect(card.complaintsOpen).toBe(1);
    expect(card.complaintsTotal).toBe(2);
  });

  it('recompute feeds ranking snapshot + raises admin alert on breach', async () => {
    const { store, conn } = makeConn();
    seedProvider(store);
    const svc = svcOf(conn);
    const out = (await svc.recompute('p-1')) as unknown as Record<string, unknown>;
    const snap = store['provider_scores'][0];
    // ranking feed: matching reads reliability_score + acceptance_rate
    expect(snap['reliability_score']).toBe(out['reliabilityBlended']);
    expect(snap['acceptance_rate']).toBe(out['acceptanceRate']);
    expect(snap['quality_tier']).toBe(out['tier']);
    // cancel rate 0.3 ≥ threshold → breach → alert row for admin
    expect(out['breached']).toBe(true);
    expect(store['provider_quality_alerts'].length).toBe(1);
    expect(store['provider_scorecards'].length).toBe(1);
    const alerts = await svc.getAlerts('p-1');
    expect(alerts.length).toBe(1);
  });

  it('healthy providers get no alert', async () => {
    const { store, conn } = makeConn();
    ['accepted', 'accepted', 'accepted'].forEach((status, i) => {
      store['provider_requests'].push({ id: `h${i}`, provider_account_id: 'p-9', status });
    });
    [5, 5, 5, 5, 5].forEach((score, i) => {
      store['ratings'].push({ id: `hr${i}`, provider_id: 'p-9', score, status: 'published' });
    });
    const svc = svcOf(conn);
    const out = (await svc.recompute('p-9')) as unknown as Record<string, unknown>;
    expect(out['breached']).toBe(false);
    expect(store['provider_quality_alerts'].length).toBe(0);
  });

  it('complaint intake is idempotent and flows into the scorecard', async () => {
    const { conn } = makeConn();
    const svc = svcOf(conn);
    const dto = {
      providerAccountId: 'p-2',
      reporterUserId: 'u-1',
      category: 'service' as const,
      details: 'late arrival, no notice given',
      idempotencyKey: 'idem-pc-1',
    };
    const a = await svc.recordComplaint(dto);
    const b = await svc.recordComplaint(dto);
    expect(a['id']).toBe(b['id']);
    const card = await svc.compute('p-2');
    expect(card.complaintsOpen).toBe(1);
    expect(card.complaintsTotal).toBe(1);
  });
});
