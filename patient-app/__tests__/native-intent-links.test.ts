// 99376ac review (7E.D2): Expo Router's redirectSystemPath must return a path
// string, and `path` may be a full URL. It returned { path } and glued
// https://nabd.plus in front of whatever arrived.
import { Linking } from 'react-native';
jest.mock('expo-router', () => ({ Redirect: () => null }));

import { redirectSystemPath } from '../app/+native-intent';

const mockOpenURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);

describe('incoming links (native intent)', () => {
  beforeEach(() => mockOpenURL.mockClear());

  it.each([
    ['/ar/p/panadol-500', '/p/panadol-500'],
    ['https://nabd.plus/en/doctor/dr-ali?ref=wa', '/doctor/dr-ali?ref=wa'],
    ['nabdplus://medicine/abc', '/medicine/abc'],
    ['/family/join', '/family/join'],
  ])('%s stays in the app at %s', async (path, expected) => {
    await expect(redirectSystemPath({ path, initial: true })).resolves.toBe(expected);
    expect(mockOpenURL).not.toHaveBeenCalled();
  });

  it('a web-only page opens in the browser and the app lands on home', async () => {
    await expect(redirectSystemPath({ path: 'https://nabd.plus/ar/careers', initial: false })).resolves.toBe('/');
    expect(mockOpenURL).toHaveBeenCalledWith('https://nabd.plus/ar/careers');
  });
});
