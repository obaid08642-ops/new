/**
 * P15.10 — the minimum-OS gate and the old-device message.
 *
 * The floors are iOS 16.4 / Android 7.0, which is what Expo SDK 57 (RN 0.86) compiles
 * against — see `node_modules/expo/Expo.podspec` and
 * `node_modules/react-native/gradle/libs.versions.toml`.
 */
import React from 'react';
import { Linking, Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';

import {
  MIN_OS,
  SUPPORTED_PLATFORMS,
  WEBSITE_URL,
  compareOsVersions,
  meetsMinimumOs,
  minimumOsLabel,
  parseOsVersion,
  unsupportedDeviceCopy,
} from '../minOs';
import { DeviceGate, UnsupportedDevice } from '../DeviceGate';

describe('P15.10 minimum OS', () => {
  it('documents iOS 16.4 and Android 7, and only those platforms', () => {
    expect(MIN_OS).toEqual({ ios: 16.4, android: 7 });
    expect([...SUPPORTED_PLATFORMS].sort()).toEqual(['android', 'ios']);
  });

  it('parses the version shapes React Native actually reports', () => {
    // Platform.Version is a string on Android, a number on iOS.
    expect(parseOsVersion('16.4')).toEqual([16, 4]);
    expect(parseOsVersion('16.4.1')).toEqual([16, 4]);
    expect(parseOsVersion('7')).toEqual([7, 0]);
    expect(parseOsVersion(' 10 ')).toEqual([10, 0]);
    expect(parseOsVersion(16.4)).toEqual([16, 4]);
    expect(parseOsVersion(17)).toEqual([17, 0]);
    expect(parseOsVersion('nonsense')).toBeNull();
    expect(parseOsVersion(undefined)).toBeNull();
  });

  it('orders versions including the minor component', () => {
    expect(compareOsVersions([16, 4], [16, 4])).toBe(0);
    expect(compareOsVersions([16, 5], [16, 4])).toBeGreaterThan(0);
    expect(compareOsVersions([16, 3], [16, 4])).toBeLessThan(0);
    expect(compareOsVersions([17, 0], [16, 4])).toBeGreaterThan(0);
  });

  it('accepts devices at or above the floor', () => {
    expect(meetsMinimumOs('ios', '16.4')).toBe(true);
    expect(meetsMinimumOs('ios', '16.5')).toBe(true);
    expect(meetsMinimumOs('ios', '17.0')).toBe(true);
    expect(meetsMinimumOs('ios', 18)).toBe(true);
    expect(meetsMinimumOs('android', '7')).toBe(true);
    expect(meetsMinimumOs('android', '13')).toBe(true);
  });

  it('rejects devices below the floor', () => {
    expect(meetsMinimumOs('ios', '16.3')).toBe(false);
    expect(meetsMinimumOs('ios', '16.0')).toBe(false);
    expect(meetsMinimumOs('ios', '15.7')).toBe(false);
    expect(meetsMinimumOs('android', '6.0')).toBe(false);
    expect(meetsMinimumOs('android', '5.1.1')).toBe(false);
  });

  it('fails safe: an unknown platform or unreadable version shows the gate', () => {
    // Better to explain the requirement than to launch into a broken app.
    expect(meetsMinimumOs('web', '999')).toBe(false);
    expect(meetsMinimumOs('windows', '11')).toBe(false);
    expect(meetsMinimumOs('ios', '')).toBe(false);
    expect(meetsMinimumOs('android', null)).toBe(false);
    expect(meetsMinimumOs('ios', {})).toBe(false);
  });

  it('names the floor in both languages', () => {
    expect(minimumOsLabel('ios', 'en')).toBe('iOS 16.4 or newer');
    expect(minimumOsLabel('ios', 'ar')).toBe('iOS 16.4 أو أحدث');
    expect(minimumOsLabel('android', 'en')).toBe('Android 7 or newer');
    expect(minimumOsLabel('android', 'ar')).toBe('Android 7 أو أحدث');
  });

  it('produces localized copy with an action and a destination', () => {
    const ar = unsupportedDeviceCopy('android', 'ar');
    const en = unsupportedDeviceCopy('android', 'en');
    expect(ar.title).not.toBe(en.title);
    expect(ar.action).toBe('متابعة عبر الموقع');
    expect(en.action).toBe('Continue on the website');
    expect(ar.body).toContain('Android 7');
    expect(en.body).toContain('Android 7');
  });
});

describe('P15.10 the gate', () => {
  it('renders the children untouched on a supported device', async () => {
    const r = await render(
      <DeviceGate os="ios" staticVersion="16.4">
        <Text>app content</Text>
      </DeviceGate>,
    );
    expect(r.getByText('app content')).toBeTruthy();
    expect(r.queryByTestId('unsupported-device')).toBeNull();
  });

  it('shows the message and hides the app on a device below the floor', async () => {
    const r = await render(
      <DeviceGate os="ios" staticVersion="16.3">
        <Text>app content</Text>
      </DeviceGate>,
    );
    expect(r.queryByText('app content')).toBeNull();
    expect(r.getByTestId('unsupported-device')).toBeTruthy();
    expect(r.getByTestId('unsupported-device-floor')).toHaveTextContent(/iOS 16\.4/);
  });

  it('points an old Android device at the website, in Arabic', async () => {
    const r = await render(
      <DeviceGate os="android" staticVersion="6.0">
        <Text>app content</Text>
      </DeviceGate>,
    );
    expect(r.getByTestId('unsupported-device-floor')).toHaveTextContent(/Android 7/);
    expect(r.getByTestId('unsupported-device-title')).toHaveTextContent(/هذا الجهاز قديم جداً/);
    expect(r.getByTestId('unsupported-device-website')).toHaveTextContent(/متابعة عبر الموقع/);
  });

  it('the website action opens the web app in English, and a failure there does not crash', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    const r = await render(<UnsupportedDevice os="android" lang="en" />);
    expect(r.getByTestId('unsupported-device-title')).toHaveTextContent(/This device is too old/);
    expect(r.getByTestId('unsupported-device-website')).toHaveTextContent(/Continue on the website/);
    fireEvent.press(r.getByTestId('unsupported-device-website'));
    expect(openURL).toHaveBeenCalledWith(WEBSITE_URL);

    openURL.mockRejectedValueOnce(new Error('no browser'));
    expect(() => fireEvent.press(r.getByTestId('unsupported-device-website'))).not.toThrow();
    openURL.mockRestore();
  });
});