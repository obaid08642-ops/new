// @ts-nocheck
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon, IconName } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton, Input, SectionHeader } from '../../src/components/ui';

export default function FollowUpScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const params = useLocalSearchParams();
  const consultationId = params.id || 'current';
  
  const [newUpdate, setNewUpdate] = useState('');
  const [consultation, setConsultation] = useState<any>(null);
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    fetchConsultationDetails();
  }, [consultationId]);

  const fetchConsultationDetails = async () => {
    try {
      // In production, you would use apiFetch(`/consultations/${consultationId}`)
      // For now, we set empty state if API not ready
      setConsultation(null);
      setUpdates([]);
    } catch (err) {
      console.log('Error fetching consultation', err);
    } finally {
      setLoading(false);
    }
  };

  const sendUpdate = async () => {
    if (!newUpdate.trim()) return;
    try {
      // apiFetch(`/consultations/${consultationId}/messages`, { method: 'POST', body: { text: newUpdate } })
      setUpdates(p => [...p, { id: String(Date.now()), date: 'الآن', text: newUpdate, type: 'me' }]);
      setNewUpdate('');
    } catch (e) {
      console.log('Error sending update', e);
    }
  };

  return (
    <View style={[st.c, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[st.hdr, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.borderLight } ]}>
        <View style={{ width: 40 }}/>
        <AppText variant="h4">متابعة الاستشارة</AppText>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 120 }}>
        {loading ? (
           <AppText>جاري التحميل...</AppText>
        ) : !consultation ? (
           <AppText>لا توجد بيانات متاحة للاستشارة.</AppText>
        ) : (
          <>
            {/* Consultation summary */}
            <Card style={{ flexDirection: 'row-reverse', gap: 12, alignItems: 'center' }}>
              <View style={[st.docAva, { backgroundColor: colors.primarySurface } ]}>
                <Icon name="doctor" size={28} color={colors.primary} />
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end', gap: 3 }}>
                <AppText variant="h5">{consultation.doctor}</AppText>
                <AppText variant="caption" color={colors.textTertiary}>{consultation.spec} · {consultation.date}</AppText>
                <Badge label="متابعة نشطة" color={colors.success} icon="check_circle" />
              </View>
            </Card>

            {/* Diagnosis */}
            <Card>
              <SectionHeader title="التشخيص" />
              <AppText variant="bodySM" color={colors.textSecondary}>{consultation.diagnosis}</AppText>
            </Card>

            {/* Prescriptions */}
            <Card>
              <SectionHeader title="الأدوية الموصوفة" />
              {consultation.prescriptions?.map((p: any, i: number) => (
                <View key={i} style={{ flexDirection: 'row-reverse', gap: 6, paddingVertical: 4, alignItems: 'center' }}>
                  <Icon name="medication" size={14} color={colors.primary} />
                  <AppText variant="bodySM" color={colors.textSecondary}>{p}</AppText>
                </View>
              ))}
              <Button label="عرض الوصفة الكاملة" variant="ghost" icon="prescriptions" size="sm" onPress={() => router.push('/consultations/prescription-from-doctor')} style={{ marginTop: 8 }} />
            </Card>

            {/* Follow-up date */}
            <Card style={{ backgroundColor: colors.warningSurface, flexDirection: 'row-reverse', gap: 12, alignItems: 'center' }}>
              <Icon name="calendar" size={24} color={colors.warning} />
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <AppText variant="h6" color={colors.warning}>موعد المتابعة القادم</AppText>
                <AppText variant="bodySM" color={colors.textSecondary}>{consultation.followUpDate}</AppText>
              </View>
              <Button label="تأكيد" variant="primary" size="sm" full={false} onPress={() => router.push({ pathname: '/consultations/book/[id]', params: { id: '1' } })} />
            </Card>
          </>
        )}

        {/* Updates timeline */}
        <SectionHeader title="تحديثات الحالة" />
        {updates.length === 0 && !loading && (
          <AppText variant="bodySM" color={colors.textTertiary} style={{ textAlign: 'center', marginVertical: 10 }}>لا توجد رسائل سابقة</AppText>
        )}
        {updates.map((u, i) => (
          <View key={u.id} style={{ flexDirection: 'row-reverse', gap: 10 }}>
            <View style={{ alignItems: 'center', gap: 2 }}>
              <View style={[st.dot, { backgroundColor: u.type === 'doctor' ? colors.primary : colors.secondary }]} />
              {i < updates.length - 1 && <View style={[st.line, { backgroundColor: colors.borderLight }]} />}
            </View>
            <Card style={{ flex: 1, marginBottom: 4 }}>
              <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 4 }}>
                <Badge label={u.type === 'doctor' ? 'الطبيب' : 'أنت'} color={u.type === 'doctor' ? colors.primary : colors.secondary} />
                <AppText variant="caption" color={colors.textTertiary}>{u.date}</AppText>
              </View>
              <AppText variant="bodySM" color={colors.textSecondary}>{u.text}</AppText>
            </Card>
          </View>
        ))}

        {/* Add update */}
        <Card>
          <AppText variant="h6" style={{ marginBottom: 8 }}>إضافة تحديث للطبيب</AppText>
          <Input value={newUpdate} onChangeText={setNewUpdate} placeholder="كيف حالتك اليوم؟ أي تحسن أو أعراض جديدة؟" icon="edit" multiline />
          <Button label="إرسال تحديث" variant="primary" icon="send" size="sm" onPress={sendUpdate} style={{ marginTop: 8 }}/>
        </Card>

        {/* Actions */}
        <View style={{ gap: 10 }}>
          <Button label="محادثة الطبيب" variant="outline" icon="chat" onPress={() => router.push('/consultations/chat-with-doctor')} />
          <Button label="حجز موعد متابعة" variant="gradient" icon="calendarCheck" onPress={() => router.push({ pathname: '/consultations/book/[id]', params: { id: '1' } })} />
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  docAva: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6 },
  line: { width: 2, flex: 1, minHeight: 30 },
});
