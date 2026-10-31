// @ts-nocheck
// R6-5: enforce min_version + maintenance from the admin-managed /config.
// Fail-open: without a reachable config the app works as before.
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiFetch } from '../utils/api';
import { i18nManager } from '../i18n/LanguageManager';
import { isVersionBlocked, pickAppConfig } from '../utils/version';
import { tokens } from '../../../packages/design-tokens/dist/ts/tokens';
const T = tokens('light').color;

const APP_VERSION: string = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../../app.json')?.expo?.version || '1.0.0';
  } catch {
    return '1.0.0';
  }
})();

// the admin writes this message in Arabic only: it is shown to Arabic readers, everyone else gets the translated default
const adminMessage = (ar?: string) => (i18nManager.currentLanguage === 'ar' ? ar : undefined);

export default function AppGate({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<'checking' | 'ok' | 'maintenance' | 'update'>('checking');
  const [message, setMessage] = useState('');

  const check = async () => {
    setState('checking');
    try {
      const config: any = await apiFetch('/config');
      const app = pickAppConfig(config, 'patient');
      if (app.maintenance) {
        setMessage(adminMessage(app.message_ar) || i18nManager.t('gate.maintenanceBody'));
        setState('maintenance');
        return;
      }
      if (isVersionBlocked(APP_VERSION, app.min_version)) {
        setMessage(adminMessage(app.message_ar) || i18nManager.t('gate.updateBody'));
        setState('update');
        return;
      }
    } catch {
      // fail-open: offline or unreachable config never blocks care flows.
    }
    setState('ok');
  };

  useEffect(() => { void check(); }, []);

  if (state === 'ok') return <>{children}</>;
  if (state === 'checking') {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={T.action.primary.bg} />
      </View>
    );
  }
  return (
    <View style={[styles.center, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Text style={styles.title}>{i18nManager.t(state === 'maintenance' ? 'gate.maintenanceTitle' : 'gate.updateTitle')}</Text>
      <Text style={styles.body}>{message}</Text>
      <TouchableOpacity style={styles.retry} onPress={() => void check()}>
        <Text style={styles.retryText}>{i18nManager.t('gate.retry')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: T.bg.canvas, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 20, fontWeight: '800', color: T.text.primary, textAlign: 'center' },
  body: { fontSize: 14, color: T.text.secondary, textAlign: 'center', lineHeight: 22 },
  retry: { backgroundColor: T.action.primary.bg, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  retryText: { color: T.action.primary.fg, fontSize: 15, fontWeight: '700' },
});
