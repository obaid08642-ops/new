/**
 * Phase 22.13 / P22.1.2: beta-channel promotion rules + production gates.
 * ReleaseService is unit-tested with an in-memory version store; no
 * external store API is ever called (provider uploads are BLOCKED/infra-owned).
 */
import { ReleaseService, CRASH_FREE_MIN, ANR_MAX } from './release.service';

function buildSvc() {
  const store = new Map<string, any>();
  const versionModel: any = {
    findById: jest.fn(async (id: string) => store.get(id) || null),
  };
  const seed = (doc: any) => {
    const d: any = { ...doc, promotion_history: doc.promotion_history || [] };
    d.save = jest.fn(async () => d);
    store.set(doc._id, d);
    return d;
  };
  const svc = new ReleaseService(versionModel, {} as any, {} as any, {} as any, {} as any);
  return { svc, seed };
}

const base = (over: any = {}) => ({
  _id: 'v1',
  version: '2.4.0',
  app: 'patient-app',
  channel: 'internal',
  status: 'draft',
  ...over,
});

describe('ReleaseService beta channels (P22.1.2)', () => {
  it('exposes the Phase 22.13 gate thresholds', () => {
    expect(CRASH_FREE_MIN).toBe(99.5);
    expect(ANR_MAX).toBe(0.47);
  });

  it('promotes internal → beta for iOS with TestFlight fields, queued pending_sync', async () => {
    const { svc, seed } = buildSvc();
    seed(base());
    const out = await svc.promoteToBeta('v1', {
      platform: 'ios',
      testflight_build_number: '240',
      testflight_group: 'external',
      promoted_by: 'admin1',
    });
    expect(out.channel).toBe('beta');
    expect(out.beta_track).toMatchObject({
      platform: 'ios',
      testflight_build_number: '240',
      testflight_group: 'external',
    });
    expect(out.sync_status).toBe('pending_sync');
    expect(out.beta_promoted_at).toBeInstanceOf(Date);
    expect(out.promotion_history).toHaveLength(1);
    expect(out.promotion_history[0]).toMatchObject({ from: 'internal', to: 'beta', by: 'admin1' });
  });

  it('promotes internal → beta for Android closed track with rollout fraction', async () => {
    const { svc, seed } = buildSvc();
    seed(base());
    const out = await svc.promoteToBeta('v1', { platform: 'android', play_track: 'closed', play_rollout_fraction: 0.1 });
    expect(out.channel).toBe('beta');
    expect(out.beta_track).toMatchObject({ platform: 'android', play_track: 'closed', play_rollout_fraction: 0.1 });
    expect(out.sync_status).toBe('pending_sync');
  });

  it('rejects beta promotion from a non-internal channel', async () => {
    const { svc, seed } = buildSvc();
    seed(base({ channel: 'beta' }));
    await expect(svc.promoteToBeta('v1', { platform: 'ios', testflight_build_number: '1' }))
      .rejects.toThrow('only_internal_can_promote_to_beta');
  });

  it('rejects iOS beta promotion without a TestFlight build number', async () => {
    const { svc, seed } = buildSvc();
    seed(base());
    await expect(svc.promoteToBeta('v1', { platform: 'ios' }))
      .rejects.toThrow('testflight_build_number_required');
  });

  it('rejects Android beta promotion with bad track or fraction', async () => {
    const { svc, seed } = buildSvc();
    seed(base());
    await expect(svc.promoteToBeta('v1', { platform: 'android', play_track: 'production' as any }))
      .rejects.toThrow('play_track_must_be_internal_or_closed');
    await expect(svc.promoteToBeta('v1', { platform: 'android', play_track: 'closed', play_rollout_fraction: 1.5 }))
      .rejects.toThrow('play_rollout_fraction_must_be_between_0_and_1');
    await expect(svc.promoteToBeta('v1', { platform: 'android', play_track: 'closed', play_rollout_fraction: 0 }))
      .rejects.toThrow('play_rollout_fraction_must_be_between_0_and_1');
  });

  it('rejects production promotion when channel is not beta', async () => {
    const { svc, seed } = buildSvc();
    seed(base({ crash_free_rate: 99.9, anr_rate: 0.1 }));
    await expect(svc.promoteToProduction('v1', {})).rejects.toThrow('only_beta_can_promote_to_production');
  });

  it('rejects production promotion when health was never recorded', async () => {
    const { svc, seed } = buildSvc();
    seed(base({ channel: 'beta' }));
    await expect(svc.promoteToProduction('v1', {})).rejects.toThrow('health_metrics_required');
  });

  it('enforces crash-free ≥ 99.5 (99.49 fails, 99.5 passes)', async () => {
    const { svc, seed } = buildSvc();
    seed(base({ channel: 'beta', crash_free_rate: 99.49, anr_rate: 0.1 }));
    await expect(svc.promoteToProduction('v1', {})).rejects.toThrow(/below_threshold_99\.5/);
    const { svc: s2, seed: seed2 } = buildSvc();
    seed2(base({ channel: 'beta', crash_free_rate: 99.5, anr_rate: 0.1 }));
    const out = await s2.promoteToProduction('v1', {});
    expect(out.channel).toBe('production');
    expect(out.sync_status).toBe('pending_sync');
  });

  it('enforces ANR ≤ 0.47 (0.48 fails, 0.47 passes)', async () => {
    const { svc, seed } = buildSvc();
    seed(base({ channel: 'beta', crash_free_rate: 99.9, anr_rate: 0.48 }));
    await expect(svc.promoteToProduction('v1', {})).rejects.toThrow(/above_threshold_0\.47/);
    const { svc: s2, seed: seed2 } = buildSvc();
    seed2(base({ channel: 'beta', crash_free_rate: 99.9, anr_rate: 0.47 }));
    const out = await s2.promoteToProduction('v1', {});
    expect(out.channel).toBe('production');
  });

  it('records inline metrics on promote-to-production, then gates on them', async () => {
    const { svc, seed } = buildSvc();
    seed(base({ channel: 'beta' }));
    const out = await svc.promoteToProduction('v1', { crash_free_rate: 99.8, anr_rate: 0.2, promoted_by: 'admin1' });
    expect(out.channel).toBe('production');
    expect(out.crash_free_rate).toBe(99.8);
    expect(out.anr_rate).toBe(0.2);
    expect(out.production_promoted_at).toBeInstanceOf(Date);
    expect(out.promotion_history[0]).toMatchObject({ from: 'beta', to: 'production' });
  });

  it('recordVersionHealth rejects out-of-range values', async () => {
    const { svc, seed } = buildSvc();
    seed(base());
    await expect(svc.recordVersionHealth('v1', 150, 0.1)).rejects.toThrow('crash_free_rate_must_be_between_0_and_100');
    await expect(svc.recordVersionHealth('v1', 99.9, -1)).rejects.toThrow('anr_rate_must_be_between_0_and_100');
    const out = await svc.recordVersionHealth('v1', 99.9, 0.1);
    expect(out.crash_free_rate).toBe(99.9);
  });
});
