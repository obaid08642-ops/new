// @ts-nocheck
// app/emergency/tracking.tsx — live ambulance tracking backed by GET /emergency/tracking
// Shows ONLY real data: claimed unit id, driver-pushed GPS, server-computed ETA.
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Linking } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Button } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';
import { dateLocale } from '@/utils/dates';

const STEP_ICONS = { received: 'check_circle', assigned: 'emergency', en_route: 'location', arrived: 'hospital' };

export default function AmbulanceTrackingScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useApp();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();

    const fetchTracking = async () => {
      try {
        const res = await apiFetch('/emergency/tracking');
        setData(res && typeof res === 'object' ? res : { active: false });
      } catch {
        setData((prev) => prev ?? { active: false, error: true });
      } finally {
        setLoading(false);
      }
    };

    fetchTracking();
    const interval = setInterval(fetchTracking, 10000);
    return () => clearInterval(interval);
  }, []);

  // Honest empty state — no active SOS for this patient
  if (!loading && (!data || data.active === false)) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <Icon name="emergency" size={48} color={colors.textTertiary} />
        <AppText variant="h5" align="center" style={{ marginTop: 16 }}>
          {data?.error ? 'تعذر تحميل التتبع' : 'لا يوجد طلب إسعاف نشط'}
        </AppText>
        <AppText variant="caption" color={colors.textTertiary} align="center" style={{ marginTop: 8 }}>
          {data?.error ? 'تحقق من الاتصال وحاول مجدداً' : 'عند إرسال طلب طوارئ ستتمكن من تتبع سيارة الإسعاف هنا لحظة بلحظة'}
        </AppText>
        <View style={{ marginTop: 24, flexDirection: 'row', gap: 12 }}>
          <Button title="رجوع" variant="outline" onPress={() => router.back()} />
          {!data?.error && <Button title="طلب إسعاف" onPress={() => router.push('/emergency/sos' as never)} />}
        </View>
      </View>
    );
  }

  const steps = Array.isArray(data?.steps) ? data.steps : [];
  const unit = data?.unit_location;

  return (
    <View style={styles.container}>
      <View style={StyleSheet.absoluteFillObject} />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.hBtn}>
          <Icon name="back" size={22} color="#fff" />
        </TouchableOpacity>
        <AppText variant="bodySM">تتبع سيارة الإسعاف</AppText>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.etaSection}>
        <Animated.View style={[styles.etaCircle, { transform: [{ scale: pulseAnim }] }]}>
          <AppText variant="bodySM">{data?.eta_minutes != null ? data.eta_minutes : '—'}</AppText>
          <AppText variant="bodySM">دقيقة</AppText>
        </Animated.View>
        <AppText variant="bodySM">{data?.eta_minutes != null ? 'وقت الوصول المتوقع' : 'جاري تخصيص أقرب سيارة إسعاف'}</AppText>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
          <Icon name="emergency" size={16} color={colors.primary} />
          <AppText variant="bodySM">{data?.unit_label ? `الوحدة: ${data.unit_label}` : 'جاري التخصيص'}</AppText>
        </View>
      </View>

      {/* Live status only — a visual route map requires an explicit authorized route contract. */}
      <View style={styles.trackingStatus}>
        <View style={StyleSheet.absoluteFillObject} />
        <Icon name="emergency" size={20} color={colors.primary} />
        {unit ? (
          <>
            <AppText variant="bodySM">المركبة تنقل موقعها المباشر الآن</AppText>
            <AppText variant="bodySM">
              {data?.distance_km != null ? `${data.distance_km} كم عنك` : ''}
              {unit.updated_at ? ` · آخر تحديث ${new Date(unit.updated_at).toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' })}` : ''}
            </AppText>
          </>
        ) : (
          <AppText variant="bodySM">
            {data?.unit_label ? 'بانتظار بدء المركبة إرسال موقعها المباشر…' : 'سيظهر موقع المركبة فور تخصيصها للمهمة'}
          </AppText>
        )}
      </View>

      {/* Steps — derived from the real emergency state on the server */}
      <View style={[styles.stepsCard, { paddingBottom: insets.bottom + 12 }]}>
        {steps.map((step: any, i: number) => (
          <View key={step.key || i} style={styles.stepRow}>
            {i < steps.length - 1 && (
              <View style={[styles.stepLine, { backgroundColor: step.done ? '#F0695C' : 'rgba(255,255,255,0.2)' }]} />
            )}
            <View style={[styles.stepIcon, {
              backgroundColor: step.done ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)',
              borderWidth: step.current ? 2 : 0, borderColor: '#fff',
            }]}>
              <Icon name={STEP_ICONS[step.key] || 'check_circle'} size={20} color="#fff" />
            </View>
            <AppText variant="bodySM">{step.title_ar}</AppText>
          </View>
        ))}
        <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL('tel:997')}>
          <Icon name="call" size={18} color="#F0695C" />
          <AppText variant="bodySM">اتصل بالإسعاف (٩٩٧)</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 10 },
  hBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  etaSection: { alignItems: 'center', gap: 8, paddingVertical: 16 },
  etaCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 3, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  trackingStatus: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, marginHorizontal: 16, borderRadius: 20, overflow: 'hidden' },
  stepsCard: { backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 20, paddingTop: 16, gap: 0 },
  stepRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, paddingVertical: 10, position: 'relative' },
  stepLine: { position: 'absolute', right: 22, top: 42, width: 2, height: '60%' },
  stepIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  callBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, backgroundColor: 'transparent', borderRadius: 14, height: 48, justifyContent: 'center', marginTop: 8 },
});
