// @ts-nocheck
// app/emergency/sos-active.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';

export default function SosActiveScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  const [eta, setEta] = useState<number | null>(null);
  const [dispatchStatus, setDispatchStatus] = useState('لم يتم استلام حالة طوارئ نشطة بعد.');
  const [emergency, setEmergency] = useState<any>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await apiFetch('/emergency/my-active');
        const data = res?.data || res;
        if (data) {
          setEmergency(data);
          setEta(Number.isFinite(Number(data.eta_minutes ?? data.eta)) ? Number(data.eta_minutes ?? data.eta) : null);
          setDispatchStatus(data.status_text || data.state || 'تم إنشاء طلب الاستغاثة.');
        } else {
          setEmergency(null);
          setEta(null);
          setDispatchStatus('لا توجد استغاثة نشطة مرتبطة بحسابك.');
        }
      } catch {
        setEmergency(null);
        setEta(null);
        setDispatchStatus('تعذر تحميل حالة الاستغاثة.');
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={[st.container, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[st.hdr, { paddingTop: insets.top + 8, backgroundColor: '#F0695C' } ]}>
        <View style={{ width: 40 }}/>
        <AppText variant="h4" color="#fff">طوارئ نشطة SOS</AppText>
        <IconButton icon="back" bg="rgba(255,255,255,0.25)" color="#fff" onPress={() => router.back()} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 120 }}>
        {/* Live dispatch data — a map is shown only when an actual map provider is configured. */}
        <Card style={st.mapCard}>
          <AppText variant="caption" color={colors.textTertiary} align="center">
            حالة موقع الاستغاثة
          </AppText>
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 28, gap: 10 }}>
            <Icon name="locationFilled" size={32} color={emergency?.location ? '#F0695C' : colors.textTertiary} />
            <AppText variant="bodySM" align="center">{emergency?.location?.address || (emergency?.location ? 'تم استلام موقع الاستغاثة.' : 'لم يُشارك موقع مؤكد لهذه الاستغاثة بعد.')}</AppText>
            <Badge label={emergency?.location ? 'موقع مستلم من الطلب' : 'الموقع غير متاح'} color={emergency?.location ? colors.success : colors.warning} />
          </View>
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
              <AppText variant="caption" color={colors.textSecondary}>{emergency?.assigned_ambulance_id ? `مركبة مخصصة: ${emergency.assigned_ambulance_id}` : emergency?.assigned_hospital_id ? `جهة مخصصة: ${emergency.assigned_hospital_id}` : 'لم يتم تعيين مركبة أو جهة بعد.'}</AppText>
            </View>
          </View>
        </Card>

        {/* Driver Detail Card */}
        <Card style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }}>
          <View style={st.avatarLarge}>
            <Icon name="doctor" size={32} color={colors.primary} />
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end', gap: 2 }}>
            <AppText variant="h6">تفاصيل فريق الطوارئ</AppText>
            <AppText variant="caption" color={colors.textTertiary}>{emergency?.assigned_ambulance_id ? 'تم تعيين مركبة؛ ستظهر تفاصيل الطاقم عند مشاركتها من غرفة العمليات.' : 'لم تتم مشاركة تفاصيل الطاقم بعد.'}</AppText>
          </View>
          {emergency?.paramedic_phone ? <IconButton icon="call" bg={colors.primarySurface} color={colors.primary} onPress={() => Linking.openURL(`tel:${emergency.paramedic_phone}`)} /> : null}
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
          <Button label="العودة للرئيسية" variant="primary" size="lg" style={{ flex: 1 }} onPress={() => router.push('/(tabs)/index' as any)} />
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  hdr: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16 },
  mapCard: { padding: 12 },
  statusCard: { padding: 16 },
  avatarLarge: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 }
});
