import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import client from '../api/client';
import { useTheme, useLang } from '../context';

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
  const { theme } = useTheme();
  const { lang } = useLang();
  const AR = lang === 'ar';
  const [state, setState] = useState<'checking' | 'ok' | 'maintenance' | 'update'>('checking');
  // the admin's text in both languages; the language is picked when drawing (the saved language loads after the first check)
  const [texts, setTexts] = useState<{ ar?: string; en?: string }>({});

  const check = async () => {
    setState('checking');
    try {
      const res: any = await client.get('/config');
      const config = res?.data || res;
      const app = pickAppConfig(config, 'provider');
      if (app.maintenance) {
        setTexts({ ar: app.message_ar, en: app.message_en });
        setState('maintenance');
        return;
      }
      if (isVersionBlocked(APP_VERSION, app.min_version)) {
        setTexts({ ar: app.message_ar, en: app.message_en });
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
      <View style={[styles.center, { paddingTop: insets.top, backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }
  return (
    <View style={[styles.center, { paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: theme.bg }]}>
      <Text style={[styles.title, { color: theme.text }]}>
        {state === 'maintenance' ? (AR ? 'صيانة مجدولة' : 'Scheduled maintenance') : (AR ? 'تحديث مطلوب' : 'Update required')}
      </Text>
      <Text style={[styles.body, { color: theme.textSub }]}>
        {(AR ? texts.ar : texts.en) || (state === 'maintenance'
          ? (AR ? 'تطبيق المزود في صيانة مجدولة. حاول لاحقاً.' : 'The provider app is under scheduled maintenance. Try again later.')
          : (AR ? 'يتوفر إصدار جديد إلزامي. حدّث التطبيق للمتابعة.' : 'A new version is required. Update the app to continue.'))}
      </Text>
      <TouchableOpacity style={[styles.retry, { backgroundColor: theme.primary }]} onPress={() => void check()}>
        <Text style={[styles.retryText, { color: theme.textInv }]}>{AR ? 'إعادة المحاولة' : 'Try again'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  body: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  retry: { borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  retryText: { fontSize: 15, fontWeight: '700' },
});
