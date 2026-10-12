import { WearablesController } from './wearables-compat.controller';

// OC-C C-16 (667): wearable registration stays behind the wearables_enabled switch.
function controllerFor(switches: any[] | null) {
  const conn: any = {
    collection: jest.fn((name: string) => {
      if (name === 'system_configs') {
        return { findOne: jest.fn().mockResolvedValue(switches ? { key: 'kill_switches', value: switches } : null) };
      }
      return { updateOne: jest.fn().mockResolvedValue({}), find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }) };
    }),
  };
  return new WearablesController(conn);
}

describe('OC C-16 wearables gate', () => {
  it('registers while the switch is absent or on', async () => {
    for (const switches of [null, [{ key: 'wearables_enabled', value: true }]]) {
      const out: any = await controllerFor(switches).register({ id: 'pat-1' }, { kind: 'watch' } as any);
      expect(out?.data?.kind).toBe('watch');
    }
  });

  it('refuses registration while wearables_enabled is off', async () => {
    await expect(controllerFor([{ key: 'wearables_enabled', value: false }]).register({ id: 'pat-1' }, { kind: 'watch' } as any)).rejects.toThrow('wearable_provider_not_enabled');
  });
});
