/**
 * A3 acceptance — pure analytics math cross-checked by hand.
 */
import { zScoreAnomalies, buildCohorts, funnelPct, DailyPoint } from '../src/modules/admin-enterprise/analytics-suite.service';

describe('A3 · anomaly detection (z-score vs trailing 14d)', () => {
  it('flags a 5× cancellation spike', () => {
    const series: DailyPoint[] = Array.from({ length: 20 }, (_, i) => ({
      date: `2026-01-${String(i + 1).padStart(2, '0')}`,
      value: i < 19 ? 10 : 50, // last day spikes to 50 vs mean≈10
    }));
    const anomalies = zScoreAnomalies(series, { threshold: 3 });
    expect(anomalies.length).toBeGreaterThanOrEqual(1);
    expect(anomalies[anomalies.length - 1].date).toBe('2026-01-20');
    expect(anomalies[anomalies.length - 1].direction).toBe('spike');
  });

  it('ignores stable series', () => {
    const series = Array.from({ length: 30 }, (_, i) => ({ date: `d${i}`, value: 10 + (i % 2) }));
    expect(zScoreAnomalies(series)).toHaveLength(0);
  });

  it('requires a minimum baseline', () => {
    expect(zScoreAnomalies([{ date: 'a', value: 1 }, { date: 'b', value: 999 }])).toHaveLength(0);
  });
});

describe('A3 · weekly cohorts D1/D7/D30', () => {
  it('computes retention percentages against hand calculation', () => {
    // Monday of the week containing 2026-03-02
    const mon = new Date('2026-03-02T00:00:00Z');
    // 4 signups on Monday
    const signups = ['u1', 'u2', 'u3', 'u4'].map((id) => ({ userId: id, at: new Date(mon) }));
    const activity = new Map<string, Set<string>>();
    activity.set('u1', new Set(['2026-03-03']));                    // D1 ✓
    activity.set('u2', new Set(['2026-03-08']));                    // within D7 ✓
    activity.set('u3', new Set(['2026-04-01']));                    // within D30 ✓
    // u4 never returns
    const cohorts = buildCohorts(signups, activity);
    expect(cohorts).toHaveLength(1);
    expect(cohorts[0].size).toBe(4);
    expect(cohorts[0].d1).toBe(25);   // 1/4
    expect(cohorts[0].d7).toBe(50);   // u1+u2
    expect(cohorts[0].d30).toBe(75);  // u1+u2+u3
  });
});

describe('A3 · funnel conversion math', () => {
  it('null when base is zero, rounded otherwise', () => {
    expect(funnelPct(5, 0)).toBeNull();
    expect(funnelPct(1, 3)).toBe(33.3);
    expect(funnelPct(250, 1000)).toBe(25);
  });
});
