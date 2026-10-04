import {
  getAppMaintenance,
  isAppInMaintenance,
  isKilled,
  normalizeFlagRow,
  withFlagDefault,
  type KillSwitchSource,
} from './killswitches.helper';

/** Mocked flag source — mirrors the EXISTING readers, never the real DB. */
const mockSource = (opts: {
  flags?: Record<string, boolean>;
  throwOn?: string[];
  killSwitches?: Array<{ key: string; value: boolean }>;
  apps?: Record<string, any>;
}): KillSwitchSource => ({
  isEnabled: async (key: string) => {
    if (opts.throwOn?.includes(key)) throw new Error('flag store down');
    const v = opts.flags?.[key];
    return v === undefined ? null : v;
  },
  getSystemConfig: async (key: string) => {
    if (key === 'kill_switches') return { value: opts.killSwitches ?? [] };
    if (key === 'app_versions') return { value: { apps: opts.apps ?? {} } };
    return null;
  },
});

describe('killswitches.helper (14.18)', () => {
  describe('withFlagDefault', () => {
    it('applies the default only for null/undefined', () => {
      expect(withFlagDefault<boolean>(null, true)).toBe(true);
      expect(withFlagDefault<boolean>(undefined, false)).toBe(false);
      expect(withFlagDefault<boolean>(false, true)).toBe(false);
    });
  });

  describe('normalizeFlagRow', () => {
    it('handles both existing feature_flags shapes + kill_switches entries', () => {
      expect(normalizeFlagRow({ key: 'x', enabled: false })).toBe(false);
      expect(normalizeFlagRow({ flagName: 'x', isEnabled: true })).toBe(true);
      expect(normalizeFlagRow({ key: 'x', value: false })).toBe(false);
      expect(normalizeFlagRow({ key: 'x' })).toBeNull();
      expect(normalizeFlagRow(null)).toBeNull();
    });
  });

  describe('isKilled', () => {
    it('returns true when the existing flag is explicitly disabled', async () => {
      const src = mockSource({ flags: { ai_symptom_checker: false } });
      await expect(isKilled('ai', src)).resolves.toBe(true);
    });

    it('returns false when the existing flag is enabled', async () => {
      const src = mockSource({ flags: { nudges_enabled: true } });
      await expect(isKilled('nudges', src)).resolves.toBe(false);
    });

    it('falls back to the kill_switches system_config list', async () => {
      const src = mockSource({
        killSwitches: [{ key: 'live_map_enabled', value: false }],
      });
      await expect(isKilled('liveMap', src)).resolves.toBe(true);
    });

    it('fails open to default when the store is absent or errors', async () => {
      await expect(isKilled('ai', {})).resolves.toBe(false);
      const down = mockSource({ throwOn: ['ai_symptom_checker'] });
      await expect(isKilled('ai', down)).resolves.toBe(false);
      await expect(
        isKilled('ai', down, { default: true }),
      ).resolves.toBe(true);
    });
  });

  describe('per-app maintenance banner hook', () => {
    it('reports maintenance with messages from app_versions', async () => {
      const src = mockSource({
        apps: {
          patient: {
            maintenance: true,
            message_ar: 'صيانة',
            message_en: 'Maintenance',
          },
        },
      });
      await expect(isAppInMaintenance('patient', src)).resolves.toBe(true);
      await expect(getAppMaintenance('patient', src)).resolves.toEqual({
        maintenance: true,
        message_ar: 'صيانة',
        message_en: 'Maintenance',
      });
    });

    it('fails open (no banner) when config is absent', async () => {
      await expect(isAppInMaintenance('web', {})).resolves.toBe(false);
    });
  });
});
