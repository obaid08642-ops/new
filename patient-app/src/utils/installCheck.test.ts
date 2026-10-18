/** 21.1 - a reinstall is a new guest: the Keychain session of a previous install is removed on the first launch. */
jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (k: string) => (store.has(k) ? store.get(k)! : null)),
      setItem: jest.fn(async (k: string, v: string) => { store.set(k, v); }),
      removeItem: jest.fn(async (k: string) => { store.delete(k); }),
      __store: store,
    },
  };
});
jest.mock('./security', () => ({ secureDelete: jest.fn(async () => undefined) }));
jest.mock('./deviceId', () => ({ getDeviceId: jest.fn(async () => 'new-device-id') }));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureDelete } from './security';
import { getDeviceId } from './deviceId';
import { ensureInstallChecked, resetInstallCheckForTests } from './installCheck';

const store = (AsyncStorage as unknown as { __store: Map<string, string> }).__store;

describe('ensureInstallChecked', () => {
  beforeEach(() => { jest.clearAllMocks(); store.clear(); resetInstallCheckForTests(); });

  it('a fresh install (no device id) removes the session a previous install left in the Keychain, then makes the new id', async () => {
    await ensureInstallChecked();
    const removed = (secureDelete as jest.Mock).mock.calls.map((c) => c[0]);
    expect(removed).toEqual(expect.arrayContaining(['nabdah_auth_token', 'nabdah_refresh_token', 'userToken']));
    expect(getDeviceId).toHaveBeenCalledTimes(1);
  });

  it('a reopen (the device id is there) removes nothing: the same guest and session are kept', async () => {
    store.set('@nabdah_device_id', 'existing-device-id');
    await ensureInstallChecked();
    expect(secureDelete).not.toHaveBeenCalled();
    expect(getDeviceId).not.toHaveBeenCalled();
  });

  it('is checked once per launch even when many requests ask at the same time', async () => {
    await Promise.all(Array.from({ length: 8 }, () => ensureInstallChecked()));
    await ensureInstallChecked();
    expect((secureDelete as jest.Mock).mock.calls.length).toBe(4);       // the four session keys, once
    expect(getDeviceId).toHaveBeenCalledTimes(1);
  });

  it('when AsyncStorage cannot be read nobody is signed out', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('storage unavailable'));
    await ensureInstallChecked();
    expect(secureDelete).not.toHaveBeenCalled();
  });

  it('a Keychain delete that fails does not make the launch fail', async () => {
    (secureDelete as jest.Mock).mockRejectedValue(new Error('keychain locked'));
    await expect(ensureInstallChecked()).resolves.toBeUndefined();
    expect(getDeviceId).toHaveBeenCalledTimes(1);
  });
});
