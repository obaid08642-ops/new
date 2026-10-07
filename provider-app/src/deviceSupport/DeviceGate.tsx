/**
 * P15.10 — the minimum-OS gate.
 *
 * Mounted above the app navigator: a device below the Expo SDK 57 floor gets a clear,
 * bilingual explanation and a route to the website instead of an install that launches
 * into a broken screen.
 *
 * The check is pure (`meetsMinimumOs`) so the whole gate is unit-testable without a
 * device — `__tests__/deviceSupport.test.tsx` drives it with injected props.
 */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaInsetsContext, type EdgeInsets } from 'react-native-safe-area-context';
import { WEBSITE_URL, meetsMinimumOs, minimumOsLabel, unsupportedDeviceCopy } from './minOs';

export interface DeviceGateProps {
  children: React.ReactNode;
  /** Override for tests; defaults to the running platform. */
  os?: string;
  version?: string | number;
  /** Skip the async OS-version read (used by tests and by web, which has no floor). */
  staticVersion?: string | number;
}

/**
 * Read the OS version. `Platform.Version` is a string on Android and a number on iOS,
 * which is why it is normalised through `parseOsVersion`.
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

export function DeviceGate({ children, os, version, staticVersion }: DeviceGateProps) {
  const platform = os ?? Platform.OS;
  const detected = usePlatformVersion(staticVersion ?? version);
  if (detected === undefined) {
    // F1: the OS version is still resolving (first render, before the async
    // expo-device read lands). Never show the unsupported screen here: on every
    // launch `meetsMinimumOs(platform, undefined)` is false, so the first
    // render would otherwise flash "device too old" — including on web, where
    // the effect later reports '999'.
    return (
      <View style={styles.loading} testID="device-gate-loading">
        <ActivityIndicator size="large" color="#0E7C7B" />
      </View>
    );
  }
  // No minimum-OS floor applies to the web build (see `usePlatformVersion`
  // above, which reports '999' there): the gate must never lock web out.
  if (platform === 'web') return <>{children}</>;
  const supported = meetsMinimumOs(platform, detected);
  if (supported) return <>{children}</>;
  return <UnsupportedDevice os={platform} lang="ar" />;
}

/** The message itself, exported so it can be asserted directly. */
export function UnsupportedDevice({ os, lang = 'ar' }: { os: string; lang?: 'ar' | 'en' }) {
  const copy = unsupportedDeviceCopy(os, lang);
  const insets: EdgeInsets = React.useContext(SafeAreaInsetsContext) ?? { top: 0, right: 0, bottom: 0, left: 0 };
  return (
    <View style={[styles.root, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 }]}>
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
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  /** Neutral placeholder while the OS version is still resolving (F1). */
  loading: { flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 12 },
  icon: { fontSize: 52 },
  title: { fontSize: 21, fontWeight: '800', color: '#101828', textAlign: 'center' },
  body: { fontSize: 15, color: '#475467', textAlign: 'center', lineHeight: 23 },
  floor: { fontSize: 13, color: '#667085', textAlign: 'center' },
  link: { marginTop: 12, backgroundColor: '#0E7C7B', color: '#FFFFFF', fontSize: 15, fontWeight: '700', paddingHorizontal: 26, paddingVertical: 13, borderRadius: 12, overflow: 'hidden' },
  sub: { fontSize: 12, color: '#98A2B3', textAlign: 'center' },
});