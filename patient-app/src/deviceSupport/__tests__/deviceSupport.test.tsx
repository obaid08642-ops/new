/**
 * 15.10 — the minimum-OS gate: iOS 16.4+ / Android 7+, a clear "use the
 * website" message below the floor, and NO false rejection while the version
 * is still resolving (neutral loading state, not the rejection screen).
 */
const deviceMock: { platformVersion?: string } = {};

jest.mock('expo-device', () => deviceMock);

jest.mock('react-native-localize', () => ({
  getLocales: () => [{ languageCode: 'ar', languageTag: 'ar-SA', isRTL: true, regionCode: 'SA' }],
  findBestAvailableLanguage: () => undefined,
  getNumberFormatSettings: () => ({ decimalSeparator: '.', groupingSeparator: ',' }),
}));

import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import {
  MIN_OS,
  WEBSITE_URL,
  compareOsVersions,
  meetsMinimumOs,
  minimumOsLabel,
  minimumOsPair,
  parseOsVersion,
  unsupportedDeviceCopy,
} from '../minOs';
import { CheckingDevice, DeviceGate, UnsupportedDevice, gateStatus } from '../DeviceGate';

// React 19 refuses to drive updates through act() unless this flag is set.
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  deviceMock.platformVersion = undefined;
});

describe('15.10 · the floors are iOS 16.4 and Android 7', () => {
  it('pins the documented Expo SDK 57 floors', () => {
    expect(MIN_OS.ios).toBe(16.4);
    expect(MIN_OS.android).toBe(7);
    expect(minimumOsPair('ios')).toEqual([16, 4]);
    expect(minimumOsPair('android')).toEqual([7, 0]);
  });

  it('admits the floor and above, rejects below', () => {
    expect(meetsMinimumOs('ios', '16.4')).toBe(true);
    expect(meetsMinimumOs('ios', '17.0')).toBe(true);
    expect(meetsMinimumOs('ios', '16.4.1')).toBe(true);
    expect(meetsMinimumOs('ios', 16.4)).toBe(true);
    expect(meetsMinimumOs('ios', '16.3')).toBe(false);
    expect(meetsMinimumOs('ios', '15.0')).toBe(false);
    expect(meetsMinimumOs('android', '7')).toBe(true);
    expect(meetsMinimumOs('android', '7.0')).toBe(true);
    expect(meetsMinimumOs('android', '14')).toBe(true);
    expect(meetsMinimumOs('android', '6')).toBe(false);
    expect(meetsMinimumOs('android', '6.0.1')).toBe(false);
  });

  it('fails safe: junk versions and unknown platforms show the message', () => {
    expect(meetsMinimumOs('ios', undefined)).toBe(false);
    expect(meetsMinimumOs('ios', '')).toBe(false);
    expect(meetsMinimumOs('ios', 'banana')).toBe(false);
    expect(meetsMinimumOs('android', null)).toBe(false);
    expect(meetsMinimumOs('windows', '11')).toBe(false);
    expect(meetsMinimumOs('macos', '15')).toBe(false);
    expect(compareOsVersions([16, 4], [16, 4])).toBe(0);
    expect(parseOsVersion(' 16.4 ')).toEqual([16, 4]);
    expect(parseOsVersion('abc')).toBeNull();
  });

  it('names the floor in both locales', () => {
    expect(minimumOsLabel('ios', 'ar')).toContain('16.4');
    expect(minimumOsLabel('android', 'ar')).toContain('7');
    expect(minimumOsLabel('ios', 'en')).toContain('16.4');
    expect(minimumOsLabel('android', 'en')).toContain('7');
  });

  it('points at the website, in both locales, naming the patient app', () => {
    for (const lang of ['ar', 'en'] as const) {
      const copy = unsupportedDeviceCopy('ios', lang);
      expect(copy.title.length).toBeGreaterThan(0);
      expect(copy.body).toContain(minimumOsLabel('ios', lang));
      expect(copy.action.length).toBeGreaterThan(0);
      expect(WEBSITE_URL).toBe('https://nabd.plus');
    }
    expect(unsupportedDeviceCopy('ios', 'ar').body).toContain('نبض بلس');
  });
});

describe('15.10 · the verdict never falsely rejects while resolving', () => {
  it('unresolved version is loading, not rejection', () => {
    expect(gateStatus('ios', null)).toBe('loading');
    expect(gateStatus('ios', undefined)).toBe('loading');
    expect(gateStatus('android', undefined)).toBe('loading');
  });

  it('web has no floor', () => {
    expect(gateStatus('web', '1')).toBe('supported');
  });

  it('resolved versions get a real verdict', () => {
    expect(gateStatus('ios', '15.0')).toBe('unsupported');
    expect(gateStatus('ios', '17.2')).toBe('supported');
    expect(gateStatus('android', '6.0')).toBe('unsupported');
    expect(gateStatus('android', '13')).toBe('supported');
  });
});

describe('15.10 · the gate renders the right screen', () => {
  it('shows a neutral loading state while the version resolves, never a rejection', async () => {
    deviceMock.platformVersion = undefined; // async read resolves to nothing
    const view = await render(
      <DeviceGate os="ios">
        <Text testID="app-content">app</Text>
      </DeviceGate>,
    );
    expect(view.getByTestId('device-gate-loading')).toBeTruthy();
    expect(view.getByTestId('device-gate-spinner')).toBeTruthy();
    expect(view.queryByTestId('unsupported-device')).toBeNull();
    expect(view.queryByTestId('app-content')).toBeNull();
  });

  it('shows the website message on an old device', async () => {
    const view = await render(
      <DeviceGate os="ios" staticVersion="15.7" lang="ar">
        <Text testID="app-content">app</Text>
      </DeviceGate>,
    );
    expect(view.getByTestId('unsupported-device')).toBeTruthy();
    expect(view.getByTestId('unsupported-device-title')).toBeTruthy();
    expect(view.getByTestId('unsupported-device-floor')).toBeTruthy();
    expect(view.getByTestId('unsupported-device-website')).toBeTruthy();
    expect(view.queryByTestId('app-content')).toBeNull();
  });

  it('renders the English copy when asked', async () => {
    const view = await render(<UnsupportedDevice os="android" lang="en" />);
    expect(view.getByTestId('unsupported-device-title').props.children).toContain('too old');
  });

  it('lets a supported device straight through', async () => {
    const view = await render(
      <DeviceGate os="android" staticVersion="14" lang="ar">
        <Text testID="app-content">app</Text>
      </DeviceGate>,
    );
    expect(view.getByTestId('app-content')).toBeTruthy();
    expect(view.queryByTestId('unsupported-device')).toBeNull();
    expect(view.queryByTestId('device-gate-loading')).toBeNull();
  });

  it('the loading state carries no verdict copy', async () => {
    const view = await render(<CheckingDevice />);
    expect(view.getByTestId('device-gate-loading')).toBeTruthy();
    expect(view.queryByTestId('unsupported-device-title')).toBeNull();
  });
});
