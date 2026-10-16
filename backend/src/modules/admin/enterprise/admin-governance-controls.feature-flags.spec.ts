/** needs-review admin-system item 10: the flags tab lists and writes only the flags a server check reads. */
import { BadRequestException } from '@nestjs/common';
import { AdminGovernanceControlsController } from './admin-governance-controls.controller';
import { EFFECTIVE_FLAG_KEYS } from '../../feature-flags/effective-flags';

function setup(legacyRows: Array<Record<string, unknown>> = [], canonicalRows: Array<Record<string, unknown>> = []) {
  const writes: Array<{ col: string; key: unknown; set: Record<string, unknown> }> = [];
  const col = (name: string) => ({
    find: () => ({ project: () => ({ toArray: async () => (name === 'featureflags' ? legacyRows : canonicalRows) }) }),
    findOne: async () => null,
    updateOne: async (q: { key: unknown }, u: { $set: Record<string, unknown> }) => { writes.push({ col: name, key: q.key, set: u.$set }); return {}; },
  });
  const conn: any = { collection: col };
  const audit: any = { write: jest.fn() };
  return { ctrl: new AdminGovernanceControlsController(conn, audit), writes, audit };
}

describe('feature flags tab: only switches with a real effect', () => {
  it('lists exactly the flags a server check reads, with the state those checks see', async () => {
    const { ctrl } = setup(
      [{ key: 'nudges_enabled', enabled: false }, { key: 'ai_mode', enabled: true }, { key: 'telehealth', enabled: true }],
      [{ key: 'nudges_enabled', enabled: true }, { key: 'loyalty_rewards', enabled: true }],
    );
    const out = await ctrl.featureFlags();
    expect(out.data.map((f: { key: string }) => f.key)).toEqual([...EFFECTIVE_FLAG_KEYS]);
    expect(out.data.every((f: { effect: string }) => f.effect.length > 0)).toBe(true);
    // The check reads `featureflags`: nudges are OFF there, whatever the other store says.
    expect(out.data.find((f: { key: string }) => f.key === 'nudges_enabled')).toMatchObject({ enabled: false, stored: true });
    // Absent row: ON (fail-open), as the check reads it.
    expect(out.data.find((f: { key: string }) => f.key === 'live_map_enabled')).toMatchObject({ enabled: true, stored: false });
  });

  it('refuses a key no check reads, and writes nothing', async () => {
    const { ctrl, writes } = setup();
    await expect(ctrl.saveFeatureFlag({ key: 'telehealth', enabled: false, reason: 'turn telehealth off' }, { id: 'a1' })).rejects.toThrow(new BadRequestException('feature_flag_has_no_effect'));
    expect(writes).toEqual([]);
  });

  it('writes a real flag to both stores (the checks read featureflags), audited, rollout optional', async () => {
    const { ctrl, writes, audit } = setup();
    const doc = await ctrl.saveFeatureFlag({ key: 'search_suggestions_enabled', enabled: false, reason: 'suggester overload' }, { id: 'a1' });
    expect(doc).toMatchObject({ key: 'search_suggestions_enabled', enabled: false, rollout_percentage: 100 });
    expect(writes.map((w) => w.col).sort()).toEqual(['feature_flags', 'featureflags']);
    expect(audit.write).toHaveBeenCalledWith(expect.objectContaining({ action: 'feature_flag_update', target_id: 'search_suggestions_enabled', reason: 'suggester overload' }));
  });
});
