import {
  DEFAULT_SWITCHES,
  parseDeviceSwitches,
  persistToggle,
  serverToSwitches,
  switchToServerPatch,
  type ServerSwitchKey,
} from '../notification-settings';

// Q38: the owner-decided table (HANDOFF §5 / backend UsersService NOTIFICATION_FLAT_MAP).
const EXPECTED: Record<ServerSwitchKey, [string, string]> = {
  general: ['channels', 'push'],
  appointments: ['categories', 'appointments'],
  orders: ['categories', 'orders'],
  medications: ['categories', 'health'],
  doctorMessages: ['categories', 'chat'],
  offers: ['categories', 'marketing'],
};

describe('notification settings mapping (Q38)', () => {
  it.each(Object.entries(EXPECTED))('%s is sent as the nested server key', (flat, [group, key]) => {
    expect(switchToServerPatch(flat as ServerSwitchKey, false)).toEqual({ [group]: { [key]: false } });
  });

  it.each(Object.entries(EXPECTED))('%s is read back from the nested GET', (flat, [group, key]) => {
    const all = {
      channels: { push: true, email: true, sms: true },
      categories: { appointments: true, orders: true, health: true, chat: true, account: true, marketing: true },
    } as Record<string, Record<string, boolean>>;
    all[group][key] = false;
    const read = serverToSwitches(all);
    expect(read[flat as ServerSwitchKey]).toBe(false);
    for (const other of Object.keys(EXPECTED) as ServerSwitchKey[]) if (other !== flat) expect(read[other]).toBe(true);
  });

  it('medications round-trips through categories.health, not categories.orders', () => {
    const patch = switchToServerPatch('medications', false);
    expect(patch).toEqual({ categories: { health: false } });
    const read = serverToSwitches({ channels: { push: true }, categories: { orders: true, health: false } });
    expect(read.medications).toBe(false);
    expect(read.orders).toBe(true);
  });

  it('reads an enveloped payload and ignores flat or unknown keys', () => {
    expect(serverToSwitches({ data: { channels: { push: false }, categories: { marketing: false } } })).toEqual({ general: false, offers: false });
    expect(serverToSwitches({ general: false, offers: false, sound: false })).toEqual({});
    expect(serverToSwitches(null)).toEqual({});
  });

  it('parses only device-local switches from storage', () => {
    expect(parseDeviceSwitches(JSON.stringify({ sound: false, vibration: true, general: false }))).toEqual({ sound: false, vibration: true });
    expect(parseDeviceSwitches('not json')).toEqual({});
    expect(parseDeviceSwitches(null)).toEqual({});
  });
});

describe('persistToggle (Q38)', () => {
  it('sends the nested patch and keeps the new value on success', async () => {
    const sendPatch = jest.fn().mockResolvedValue({});
    const saveDevice = jest.fn().mockResolvedValue(undefined);
    const result = await persistToggle(DEFAULT_SWITCHES, 'offers', { sendPatch, saveDevice });
    expect(sendPatch).toHaveBeenCalledWith({ categories: { marketing: false } });
    expect(saveDevice).not.toHaveBeenCalled();
    expect(result).toEqual({ settings: { ...DEFAULT_SWITCHES, offers: false }, failed: false });
  });

  it('reverts the switch and reports failure when the PATCH fails', async () => {
    const sendPatch = jest.fn().mockRejectedValue(new Error('notification_setting_not_allowed'));
    const result = await persistToggle(DEFAULT_SWITCHES, 'general', { sendPatch, saveDevice: jest.fn() });
    expect(result.failed).toBe(true);
    expect(result.settings).toBe(DEFAULT_SWITCHES);
    expect(result.settings.general).toBe(true);
  });

  it('keeps sound/vibration on the device and never sends them to the server', async () => {
    const sendPatch = jest.fn();
    const saveDevice = jest.fn().mockResolvedValue(undefined);
    const result = await persistToggle(DEFAULT_SWITCHES, 'vibration', { sendPatch, saveDevice });
    expect(sendPatch).not.toHaveBeenCalled();
    expect(saveDevice).toHaveBeenCalledWith({ sound: true, vibration: false });
    expect(result.settings.vibration).toBe(false);
  });

  it('never turns the locked emergency switch off', async () => {
    const sendPatch = jest.fn();
    const result = await persistToggle(DEFAULT_SWITCHES, 'emergency', { sendPatch, saveDevice: jest.fn() });
    expect(sendPatch).not.toHaveBeenCalled();
    expect(result.settings.emergency).toBe(true);
  });
});
