// @ts-nocheck
// app/emergency/sos-active.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, StatusBar, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';
import MapView, { Marker, PROVIDER_DEFAULT } from '../../src/components/MapPrimitives';
import * as Location from 'expo-location';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';

export default function SosActiveScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  const [eta, setEta] = useState<number | null>(null);
  const [dispatchStatus, setDispatchStatus] = useState('جاري تحديد مركبة الطوارئ...');
  const [paramedic, setParamedic] = useState<any>(null);
  const [vehicleLabel, setVehicleLabel] = useState<string>('');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    // E2: real patient GPS for the SOS map (was a fake animated graphic)
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({});
        setCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      } catch { /* permission denied or unavailable — map simply stays hidden */ }
    })();
  }, []);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        // M1-31: real backend contract — patient's own active SOS (was non-existent /sos/status)
        const res = await apiFetch('/emergency/my/active');
        const data = Array.isArray(res) ? res[0] : res?.data || res;
        if (data) {
          setEta(data.eta_minutes || data.eta || null);
          setDispatchStatus(data.status_text || 'تم تحديد المسار والتحرك فورا');
          if (data.paramedic_name) setParamedic({ name: data.paramedic_name });
          if (data.id) setSosId(data.id);
          // S1: patient-safe only — unit label (plate). Provider/hospital ownership is internal, never shown.
          const veh = data.unit_label || '';
          setVehicleLabel(veh ? `سيارة الإسعاف ${veh}` : (data.assigned ? 'تم تخصيص سيارة إسعاف' : ''));
        }
      } catch (e) {
        console.log('Error fetching SOS status', e);
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const [sosId, setSosId] = useState<string | null>(null);

  const handleCancelSOS = () => {
    showLocalizedAlert(
      'تأكيد إلغاء الاستغاثة',
      'هل أنت متأكد من إلغاء نداء الطوارئ؟ سيتم إعلام سيارة الإسعاف بالتوقف.',
      [
        { text: 'تراجع', style: 'cancel' },
        {
          text: 'نعم، إلغاء النداء',
          style: 'destructive',
          onPress: async () => {
            if (!sosId) {
              showLocalizedAlert('تعذر الإلغاء', 'لم يتم تحميل بيانات النداء بعد. حاول مجددًا بعد لحظات.');
              return;
            }
            try {
              await apiFetch(`/emergency/${sosId}/cancel`, { method: 'POST' });
              showLocalizedAlert('تم الإلغاء', 'تم إلغاء نداء الاستغاثة وإشعار فرق الطوارئ.', [
                { text: 'حسناً', onPress: () => router.push('/(tabs)/index' as any) }
              ]);
            } catch (e: any) {
              showLocalizedAlert('تعذر الإلغاء', e?.message || 'حدث خطأ أثناء إلغاء النداء.');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={[st.container, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[st.hdr, { paddingTop: insets.top + 8, backgroundColor: '#F0695C' } ]}>
        <View style={{ width: 40 }}/>
        <AppText variant="h4" color="#fff">طوارئ نشطة SOS</AppText>
        <IconButton icon="close" bg="rgba(255,255,255,0.25)" color="#fff" onPress={handleCancelSOS} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 120 }}>
        {/* Real map showing the patient's actual GPS position shared with dispatch */}
        <Card style={st.mapCard}>
          <AppText variant="caption" color={colors.textTertiary} align="center">
            موقعك الحالي الذي شاركته مع فرق الطوارئ
          </AppText>

          {coords ? (
            <MapView
              provider={PROVIDER_DEFAULT}
              style={{ width: '100%', height: 220, borderRadius: 12, marginTop: 8 }}
              initialRegion={{ latitude: coords.latitude, longitude: coords.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
              region={{ latitude: coords.latitude, longitude: coords.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
            >
              <Marker coordinate={coords} title="موقعك" pinColor="#F0695C" />
            </MapView>
          ) : (
            <View style={[st.mapGraphic, { justifyContent: 'center', alignItems: 'center' }]}>
              <Icon name="locationFilled" size={28} color="#F0695C" />
              <AppText variant="caption" color={colors.textTertiary} style={{ marginTop: 6 }}>
                جاري تحديد موقعك... (اسمح بالوصول للموقع لعرض الخريطة)
              </AppText>
            </View>
          )}

          <Badge label="يتم تحديث حالة النداء تلقائياً كل 10 ثوانٍ" color={colors.success} style={{ alignSelf: 'center', marginTop: 12 }}/>
        </Card>

        {/* ETA & Status Card */}
        <Card style={[st.statusCard, { borderRightColor: '#F0695C', borderRightWidth: 5 } ]}>
          <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ alignItems: 'flex-end' }}>
              <AppText variant="h3" color="#F0695C">{eta ?? '-'} دقائق</AppText>
              <AppText variant="caption" color={colors.textTertiary}>الوقت المقدر للوصول (ETA)</AppText>
            </View>
            <View style={{ alignItems: 'flex-end', flex: 1, marginRight: 16 }}>
              <AppText variant="h6">{dispatchStatus}</AppText>
              <AppText variant="caption" color={colors.textSecondary}>{vehicleLabel || 'جاري تخصيص المركبة والمستشفى...'}</AppText>
            </View>
          </View>
        </Card>

        {/* Driver Detail Card */}
        <Card style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }}>
          <View style={st.avatarLarge}>
            <Icon name="doctor" size={32} color={colors.primary} />
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end', gap: 2 }}>
            <AppText variant="h6">المسعف: {paramedic?.name || 'فريق الطوارئ'}</AppText>
            <AppText variant="caption" color={colors.textTertiary}>{paramedic?.team_name || 'الفريق الإسعافي المُخصَّص لحالتك'}</AppText>
          </View>
          <IconButton icon="call" bg={colors.primarySurface} color={colors.primary} onPress={() => {
            // Real call only — dial the assigned unit's actual phone if the dispatch provided it.
            const phone = paramedic?.phone || paramedic?.unit_phone;
            if (phone) {
              Linking.openURL(`tel:${phone}`);
            } else {
              showLocalizedAlert('اتصال بالمسعف', 'لم يُسند رقم اتصال للفريق بعد — سيظهر هنا فور إسناد الوحدة.');
            }
          }} />
        </Card>

        {/* Info advice card */}
        <Card style={{ backgroundColor: colors.warningSurface, borderColor: colors.warning + '30' }}>
          <View style={{ flexDirection: 'row-reverse', gap: 8, alignItems: 'center' }}>
            <Icon name="warning" size={20} color={colors.warning} />
            <AppText variant="labelMD" color={colors.warning}>تعليمات هامة لحين وصول المساعدة</AppText>
          </View>
          <AppText variant="bodyXS" color={colors.textSecondary} style={{ textAlign: 'right', marginTop: 6, lineHeight: 18 }}>
            • يرجى إبقاء الباب الرئيسي مفتوحاً لسهولة دخول فريق الطوارئ.
            \n• جهّز جواز السفر الصحي الخاص بك (متاح في مركز التقارير) لتقديمه للمسعفين.
            \n• ابقَ هادئاً، المسعفون مدربون للتعامل مع حالتك الطبية بأقصى درجات المهنية.
          </AppText>
        </Card>
      </ScrollView>

      {/* Footer buttons */}
      <View style={[st.footer, { paddingBottom: insets.bottom + 8, backgroundColor: colors.surface, borderTopColor: colors.borderLight } ]}>
        <View style={{ flexDirection: 'row-reverse', gap: 10 }}>
          <Button label="اتصال بغرفة العمليات " variant="primary" size="lg" style={{ flex: 1.2 }} onPress={() => showLocalizedAlert('اتصال الطوارئ', 'جاري الاتصال بالهلال الأحمر والعمليات الصحية...')} />
          <Button label="إلغاء الطلب" variant="outline" size="lg" style={{ flex: 0.8 }} onPress={handleCancelSOS} />
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  hdr: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16 },
  mapCard: { padding: 12 },
  mapGraphic: { height: 200, backgroundColor: '#E2E8F0', borderRadius: 16, position: 'relative', overflow: 'hidden' },
  mapRoadHoriz: { position: 'absolute', top: 90, left: 0, right: 0, height: 20, backgroundColor: '#CBD5E1' },
  mapRoadVert: { position: 'absolute', left: 100, top: 0, bottom: 0, width: 20, backgroundColor: '#CBD5E1' },
  userMarker: { position: 'absolute', top: 80, left: 90, zIndex: 10 },
  pulseRing: { position: 'absolute', top: -10, left: -10, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(239,68,68,0.25)', borderWidth: 1.5, borderColor: '#F0695C' },
  ambulanceMarker: { position: 'absolute', zIndex: 10 },
  statusCard: { padding: 16 },
  avatarLarge: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 }
});
