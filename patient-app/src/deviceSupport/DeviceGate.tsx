/**
 * P15.10 — the minimum-OS gate (patient-app).
 *
 * Mounted above the app navigator: a device below the Expo SDK 57 floor gets a
 * clear, bilingual explanation and a route to the website instead of an
 * install that launches into a broken screen.
 *
 * F4 cold-start rule: while the OS version is still resolving, the gate
 * renders a NEUTRAL loading state — never a false rejection. (Resolving is
 * async via expo-device; answering "unsupported" for the unresolved state
 * would flash the rejection on every launch.)
 *
 * The verdict itself is the pure `gateStatus(os, version)` so the whole gate
 * is unit-testable without a device.
 */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { WEBSITE_URL, meetsMinimumOs, minimumOsLabel, unsupportedDeviceCopy } from './minOs';

export type GateStatus = 'loading' | 'supported' | 'unsupported';

/**
 * The verdict, with the loading state made explicit. `version == null` means
 * "still resolving" — loading, not rejection. Web has no floor.
 */
export function gateStatus(os: string, version: string | number | null | undefined): GateStatus {
  if (version == null) return 'loading';
  if (os === 'web') return 'supported';
  return meetsMinimumOs(os, version) ? 'supported' : 'unsupported';
}

export interface DeviceGateProps {
  children: React.ReactNode;
  /** Override for tests; defaults to the running platform. */
  os?: string;
  version?: string | number;
  /** Skip the async OS-version read (used by tests and by web, which has no floor). */
  staticVersion?: string | number;
  /** Screen language. Defaults to the app default. */
  lang?: 'ar' | 'en';
}

/**
 * Read the OS version. `Platform.Version` is a string on Android and a number on iOS,
 * which is why it is normalised through `parseOsVersion` at verdict time.
 */
function usePlatformVersion(fallback: string | number | undefined): string | number | undefined {
  const [version, setVersion] = useState<string | number | undefined>(fallback);
  useEffect(() => {
    if (fallback !== undefined) return;
    if (Platform.OS === 'web') {
      // No minimum-OS floor applies to the web build.
      setVersion('999');
      return;
    }
    let cancelled = false;
    // expo-device is already a dependency; Platform.Version is the fallback if it fails.
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Device = require('expo-device');
        const v = Device?.platformVersion;
        if (!cancelled && v != null) setVersion(String(v));
      } catch {
        if (!cancelled) setVersion(Platform.Version as string | number);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fallback]);
  return version;
}

export function DeviceGate({ children, os, version, staticVersion, lang = 'ar' }: DeviceGateProps) {
  const platform = os ?? Platform.OS;
  const detected = usePlatformVersion(staticVersion ?? version);
  const status = gateStatus(platform, detected ?? null);
  if (status === 'loading') return <CheckingDevice />;
  if (status === 'supported') return <>{children}</>;
  return <UnsupportedDevice os={platform} lang={lang} />;
}

/** Neutral loading state: no verdict while the version is still resolving. */
export function CheckingDevice() {
  return (
    <View style={styles.checking} testID="device-gate-loading">
      <ActivityIndicator size="large" testID="device-gate-spinner" />
    </View>
  );
}

/** The message itself, exported so it can be asserted directly. */
export function UnsupportedDevice({ os, lang = 'ar' }: { os: string; lang?: 'ar' | 'en' }) {
  const copy = unsupportedDeviceCopy(os, lang);
  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} testID="unsupported-device">
        <Text style={styles.icon}>📱</Text>
        <Text style={styles.title} testID="unsupported-device-title">{copy.title}</Text>
        <Text style={styles.body}>{copy.body}</Text>
        <Text style={styles.floor} testID="unsupported-device-floor">
          {lang === 'ar' ? 'الحد الأدنى:' : 'Minimum required:'} {minimumOsLabel(os, lang)}
        </Text>
        <Text
          accessibilityRole="link"
          testID="unsupported-device-website"
          style={styles.link}
          onPress={() => {
            // A device with no browser must not crash the gate.
            Linking.openURL(WEBSITE_URL).catch(() => {});
          }}
        >
          {copy.action}
        </Text>
        <Text style={styles.sub}>{copy.sub}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  checking: { flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  root: { flex: 1, backgroundColor: '#FFFFFF', paddingTop: 32, paddingBottom: 32 },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 12 },
  icon: { fontSize: 52 },
  title: { fontSize: 21, fontWeight: '800', color: '#101828', textAlign: 'center' },
  body: { fontSize: 15, color: '#475467', textAlign: 'center', lineHeight: 23 },
  floor: { fontSize: 13, color: '#667085', textAlign: 'center' },
  link: { marginTop: 12, backgroundColor: '#0E7C7B', color: '#FFFFFF', fontSize: 15, fontWeight: '700', paddingHorizontal: 26, paddingVertical: 13, borderRadius: 12, overflow: 'hidden' },
  sub: { fontSize: 12, color: '#98A2B3', textAlign: 'center' },
});
