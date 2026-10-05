import { isKilled, normalizeFlagRow, type KillSwitchSource } from './killswitches.helper';

const source = (opts: {
  flags?: Record<string, boolean>;
  throwOn?: string[];
  killSwitches?: Array<{ key: string; value: boolean }>;
}): KillSwitchSource => ({
  getFlag: async (key: string) => {
    if (opts.throwOn?.includes(key)) throw new Error('flag store down');
    const v = opts.flags?.[key];
    return v === undefined ? null : v;
  },
  getSystemConfig: async (key: string) => (key === 'kill_switches' ? { value: opts.killSwitches ?? [] } : null),
});

describe('killswitches.helper (14.18)', () => {
  it('normalizes the existing flag row shapes', () => {
    expect(normalizeFlagRow({ key: 'x', enabled: false })).toBe(false);
    expect(normalizeFlagRow({ flagName: 'x', isEnabled: true })).toBe(true);
    expect(normalizeFlagRow({ key: 'x', value: false })).toBe(false);
    expect(normalizeFlagRow({ key: 'x' })).toBeNull();
    expect(normalizeFlagRow(null)).toBeNull();
  });

  it('is killed only when the flag is explicitly disabled', async () => {
    await expect(isKilled('ai', source({ flags: { ai_gateway_enabled: false } }))).resolves.toBe(true);
    await expect(isKilled('ai', source({ flags: { ai_gateway_enabled: true } }))).resolves.toBe(false);
    await expect(isKilled('ai', source({}))).resolves.toBe(false);
  });

  it('falls back to the kill_switches system_config list', async () => {
    await expect(isKilled('ai', source({ killSwitches: [{ key: 'ai_gateway_enabled', value: false }] }))).resolves.toBe(true);
  });

  it('a store outage resolves to the caller default', async () => {
    const down = source({ throwOn: ['ai_gateway_enabled'] });
    await expect(isKilled('ai', {})).resolves.toBe(false);
    await expect(isKilled('ai', down)).resolves.toBe(false);
    await expect(isKilled('ai', down, { default: true })).resolves.toBe(true);
  });
});
