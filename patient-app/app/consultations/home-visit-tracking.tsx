// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { resolveColor, darkColors, lightColors } from '../../src/theme/colors';
import { apiFetch } from '../../src/utils/api';
import { LocalizedText } from '../../src/components/LocalizedText';

export default function HomeVisitTrackingScreen() {
  const { appointmentId } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { isDark, lang } = useApp() as any;
  const colors = isDark ? darkColors : lightColors;
  const isRTL = lang === 'ar' || lang === 'ur';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (appointmentId) {
      apiFetch(`/care/appointments/${appointmentId}`)
        .then((res: any) => { setData(res?.data || res); setLoading(false); })
        .catch(() => { setData(null); setLoading(false); });
    } else {
      setData(null); setLoading(false);
    }
  }, [appointmentId]);


  if (!loading && !data) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg, padding: 20 }}>
        <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', fontSize: 50, color: colors.t3 }}>error_outline</LocalizedText>
        <LocalizedText style={{ fontFamily: 'Cairo-Bold', fontSize: 16, color: colors.n, marginTop: 10, textAlign: 'center' }}>البيانات غير متوفرة أو فشل الاتصال</LocalizedText>
        <TouchableOpacity style={{ marginTop: 20, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#F0695C', borderRadius: 10 }} onPress={() => router.back()}>
          <LocalizedText style={{ fontFamily: 'Cairo-Bold', color: '#fff' }}>رجوع</LocalizedText>
        </TouchableOpacity>
      </View>
    );
  }
  if (loading) return <View style={[styles.container, { backgroundColor: colors.bg, justifyContent: 'center' } ]}><ActivityIndicator color={resolveColor('var(--p)')} /></View>;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg } ]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: colors.bd } ]}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, justifyContent: 'center' }}>
          <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: colors.n, fontSize: 24 }}>arrow_forward</LocalizedText>
        </TouchableOpacity>
        <LocalizedText style={{ fontSize: 16, fontWeight: '800', color: colors.n }}>تتبع الزيارة المنزلية</LocalizedText>
        <View style={{ width: 40 }}/>
      </View>

      <View style={{ padding: 16 }}>
        <View    style={styles.mapBox}>
          <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', fontSize: 70, color: resolveColor('var(--p)'), opacity: 0.3 }}>map</LocalizedText>
          <View style={styles.pinDot} />
          <View style={{ position: 'absolute', bottom: '25%', right: '35%' }}>
            <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: resolveColor('var(--p)'), fontSize: 30 }}>home</LocalizedText>
          </View>
        </View>

        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 12, marginTop: 14 }}>
          <View style={[styles.duoIcon, { backgroundColor: resolveColor('var(--ps)') } ]}>
            <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: resolveColor('var(--p)'), fontSize: 26 }}>medical_services</LocalizedText>
          </View>
          <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
            <LocalizedText style={{ fontSize: 13, fontWeight: '700', color: colors.n }}>{data?.doctor_name}</LocalizedText>
            <LocalizedText style={{ fontSize: 10, color: colors.t3 }}>طبيب زيارات منزلية</LocalizedText>
          </View>
          {data?.wait_time != null && (
            <View style={[styles.timeBox, { backgroundColor: resolveColor('var(--ps)') } ]}>
              <LocalizedText style={{ fontSize: 16, fontWeight: '900', color: resolveColor('var(--p)') }}>{data.wait_time}</LocalizedText>
              <LocalizedText style={{ fontSize: 8, color: resolveColor('var(--pt)') }}>دقيقة</LocalizedText>
            </View>
          )}
        </View>

        <View style={{ marginTop: 24 }}>
          {[
            { label: 'تم تأكيد الطلب', active: true, icon: 'check' },
            { label: 'الطبيب في الطريق', active: data?.status === 'الطبيب في الطريق' || data?.status === 'وصل لموقعك', icon: 'check' },
            { label: 'وصل لموقعك', active: data?.status === 'وصل لموقعك', icon: 'home' }
          ].map((s, i) => (
            <View key={i} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 14, paddingBottom: i < 2 ? 18 : 0, position: 'relative' }}>
              {i < 2 && (
                <View style={[styles.trackLine, { backgroundColor: s.active ? resolveColor('var(--p)') : colors.bd, right: isRTL ? 15 : undefined, left: isRTL ? undefined : 15 }]} />
              )}
              <View style={[styles.stepIcon, { backgroundColor: s.active ? resolveColor('var(--p)') : colors.bd } ]}>
                <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: '#fff', fontSize: 17 }}>{s.icon}</LocalizedText>
              </View>
              <View style={{ flex: 1, paddingTop: 5, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <LocalizedText style={{ fontSize: 12, fontWeight: '700', color: s.active ? colors.n : colors.t3 }}>{s.label}</LocalizedText>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.callBtn, { backgroundColor: colors.n, marginTop: 24 }]}
          onPress={() => {
            const doctorId = data?.doctor_id;
            if (doctorId) {
              router.push({ pathname: '/consultations/chat-with-doctor', params: { doctorId } });
            }
          }}
        >
          <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', fontSize: 19, color: '#fff', marginRight: 8 }}>chat</LocalizedText>
          <LocalizedText style={{ fontSize: 13, fontWeight: '800', color: '#fff' }}>مراسلة الطبيب</LocalizedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  mapBox: { height: 240, borderRadius: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  pinDot: { position: 'absolute', top: '30%', left: '30%', width: 16, height: 16, borderRadius: 8, backgroundColor: resolveColor('var(--cr)'), borderWidth: 3, borderColor: '#fff' },
  duoIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  timeBox: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12 },
  trackLine: { position: 'absolute', top: 34, bottom: 0, width: 2, zIndex: 0 },
  stepIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  callBtn: { width: '100%', padding: 15, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }
});
