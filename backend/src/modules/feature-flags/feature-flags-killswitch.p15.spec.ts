/**
 * F9 (15.12) — kill-switch flag contract (mocked repository, no mongod here).
 *
 * The inversion: FeatureFlagsService.isEnabled returned FALSE when the flag
 * row was absent, so isKilled() could not tell "explicitly disabled" from
 * "never seeded" and every switch read as killed. The fix returns NULL when
 * absent (fail-open upstream), seeds the six flags as enabled:true without
 * ever overwriting an admin's choice, and boots the seed on module init.
 *
 * Reverting isEnabled to `false`-on-absent makes the "absent" tests red;
 * making ensureSeeded overwrite (update existing rows) makes the
 * never-overwrite test red.
 */
import { isKilled } from '../../common/killswitches/killswitches.helper';
import { FeatureFlagsService, KILL_SWITCH_FLAG_KEYS } from './feature-flags.service';

function repoWith(rows: Record<string, boolean>, opts: { fail?: boolean } = {}) {
  const store = new Map<string, boolean>(Object.entries(rows));
  return {
    store,
    findOne: jest.fn((q: any) => ({
      exec: async () => {
        if (opts.fail) throw new Error('flag store down');
        const key = q?.key?.$eq ?? q?.key;
        if (!store.has(key)) return null;
        return { key, enabled: store.get(key) };
      },
    })),
    create: jest.fn(async (doc: any) => {
      store.set(doc.key, !!doc.enabled);
      return doc;
    }),
  };
}

describe('F9 kill-switch flag contract (mocked)', () => {
  it('exposes the six kill-switch keys', () => {
    expect(KILL_SWITCH_FLAG_KEYS.sort()).toEqual(
      [
        'ai_symptom_checker',
        'recommendations_enabled',
        'nudges_enabled',
        'live_map_enabled',
        'analytics_ingestion_enabled',
        'search_suggestions_enabled',
      ].sort(),
    );
  });

  it('isEnabled: absent row reads as null (fail-open), not false', async () => {
    const repo = repoWith({});
    const svc = new FeatureFlagsService(repo as any);
    await expect(svc.isEnabled('ai_symptom_checker')).resolves.toBeNull();
    const repo2 = repoWith({ ai_symptom_checker: false });
    const svc2 = new FeatureFlagsService(repo2 as any);
    await expect(svc2.isEnabled('ai_symptom_checker')).resolves.toBe(false);
    const repo3 = repoWith({ ai_symptom_checker: true });
    const svc3 = new FeatureFlagsService(repo3 as any);
    await expect(svc3.isEnabled('ai_symptom_checker')).resolves.toBe(true);
  });

  it('isKilled through the real service: absent => not killed, disabled => killed', async () => {
    const absent = new FeatureFlagsService(repoWith({}) as any);
    await expect(isKilled('ai', absent)).resolves.toBe(false);
    const disabled = new FeatureFlagsService(repoWith({ ai_symptom_checker: false }) as any);
    await expect(isKilled('ai', disabled)).resolves.toBe(true);
    const enabled = new FeatureFlagsService(repoWith({ ai_symptom_checker: true }) as any);
    await expect(isKilled('ai', enabled)).resolves.toBe(false);
  });

  it('ensureSeeded creates only missing flags as enabled:true', async () => {
    const repo = repoWith({ nudges_enabled: false }); // admin explicitly disabled
    const svc = new FeatureFlagsService(repo as any);
    const seeded = await svc.ensureSeeded();
    expect(seeded.sort()).toEqual(
      KILL_SWITCH_FLAG_KEYS.filter((k) => k !== 'nudges_enabled').sort(),
    );
    for (const [key, value] of repo.store) {
      if (key === 'nudges_enabled') expect(value).toBe(false); // never overwritten
      else expect(value).toBe(true);
    }
    const again = await svc.ensureSeeded();
    expect(again).toEqual([]);
    expect(repo.create).toHaveBeenCalledTimes(KILL_SWITCH_FLAG_KEYS.length - 1);
  });

  it('onModuleInit never takes boot down when the store is unavailable', async () => {
    const svc = new FeatureFlagsService(repoWith({}, { fail: true }) as any);
    await expect(svc.onModuleInit()).resolves.toBeUndefined();
  });
});
