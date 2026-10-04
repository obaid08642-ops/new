import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import client from '../api/client';

const { isVersionBlocked, pickAppConfig } = require('../utils/version-check');

const APP_VERSION: string = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../../app.json')?.expo?.version || '1.0.0';
  } catch {
    return '1.0.0';
  }
})();

/** R6-5: enforce min_version + maintenance from the admin-managed /config. Fail-open. */
export function AppGate({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<'checking' | 'ok' | 'maintenance' | 'update'>('checking');
  const [message, setMessage] = useState('');

  const check = async () => {
    setState('checking');
    try {
      const res: any = await client.get('/config');
      const config = res?.data || res;
      const app = pickAppConfig(config, 'provider');
      if (app.maintenance) {
        setMessage(app.message_ar || 'تطبيق المزود في صيانة مجدولة. حاول لاحقاً.');
        setState('maintenance');
        return;
      }
      if (isVersionBlocked(APP_VERSION, app.min_version)) {
        setMessage(app.message_ar || 'يتوفر إصدار جديد إلزامي. حدّث التطبيق للمتابعة.');
        setState('update');
        return;
      }
    } catch {
      // fail-open
    }
    setState('ok');
  };

  useEffect(() => { void check(); }, []);

  if (state === 'ok') return <>{children}</>;
  if (state === 'checking') {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#0E7C7B" />
      </View>
    );
  }
  return (
    <View style={[styles.center, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Text style={styles.title}>{state === 'maintenance' ? 'صيانة مجدولة' : 'تحديث مطلوب'}</Text>
      <Text style={styles.body}>{message}</Text>
      <TouchableOpacity style={styles.retry} onPress={() => void check()}>
        <Text style={styles.retryText}>إعادة المحاولة</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 20, fontWeight: '800', color: '#101828', textAlign: 'center' },
  body: { fontSize: 14, color: '#475467', textAlign: 'center', lineHeight: 22 },
  retry: { backgroundColor: '#0E7C7B', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  retryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
