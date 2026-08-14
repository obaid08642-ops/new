// @ts-nocheck
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';

const CANCEL_REASONS = [
  'ارتباط طارئ',
  'تحسّنت صحتي',
  'أريد تغيير الطبيب',
  'الوقت لا يناسبني',
  'مشكلة في الدفع',
  'سبب آخر',
];
const NEW_DAYS = ['الأحد 16', 'الاثنين 17', 'الثلاثاء 18', 'الأربعاء 19', 'الخميس 20'];
const NEW_TIMES = ['9:00 ص', '9:30 ص', '10:00 ص', '11:00 ص', '2:00 م', '3:00 م', '4:00 م'];

export default function CancelRescheduleScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  
  
  const [mode, setMode] = useState<'choose' | 'cancel' | 'reschedule'>('choose');
  const [selectedReason, setSelectedReason] = useState('');
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedTime, setSelectedTime] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = () => {
    setIsLoading(true);
    setTimeout(() => { setIsLoading(false); router.replace('/consultations/appointments'); }, 1500);
  };

  if (mode === 'choose') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background } ]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: isDark ? colors.surface : colors.white } ]}>
          <AppText variant="bodySM">الموعد</AppText>
          <TouchableOpacity onPress={() => router.back()}>
            <Icon name="back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.chooseContent}>
          <View style={[styles.apptSummary, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
            <Icon name="doctor" size={20} color={colors.primary} />
            <View style={{ alignItems: 'flex-end', flex: 1 }}>
              <AppText variant="bodySM">د. أحمد محمد السيد</AppText>
              <AppText variant="bodySM">غداً — 10:00 ص</AppText>
            </View>
          </View>
          <View style={[styles.policyCard, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
            <AppText variant="bodySM">سياسة الإلغاء </AppText>
            {[
              { range: 'قبل 24 ساعة', refund: 'استرداد 100%', color: '#5BA84F' },
              { range: 'قبل 12-24 ساعة', refund: 'استرداد 50%', color: '#F0A526' },
              { range: 'أقل من 12 ساعة', refund: 'لا يوجد استرداد', color: '#F0695C' },
            ].map((p, i) => (
              <View key={i} style={[styles.policyRow, { borderBottomColor: colors.border } ]}>
                <AppText variant="bodySM">{p.refund}</AppText>
                <AppText variant="bodySM">{p.range}</AppText>
              </View>
            ))}
          </View>
          <TouchableOpacity onPress={() => setMode('reschedule')} style={styles.rescheduleBtn}>
            <View  style={styles.actionBtnInner}>
              <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6}}><Icon name="calendar" size={16} color={colors.primary} /><AppText variant="bodySM">إعادة الجدولة (موصى به)</AppText></View>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode('cancel')} style={[styles.cancelBtn, { borderColor: colors.error } ]}>
            <AppText variant="bodySM">إلغاء الموعد</AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (mode === 'cancel') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background } ]}>
        <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: isDark ? colors.surface : colors.white } ]}>
          <AppText variant="bodySM">سبب الإلغاء</AppText>
          <TouchableOpacity onPress={() => setMode('choose')}>
            <Icon name="back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 } ]}>
          {CANCEL_REASONS.map((r) => (
            <TouchableOpacity key={r} onPress={() => setSelectedReason(r)}
              style={[styles.reasonItem, { backgroundColor: isDark ? colors.surface : colors.white, borderColor: selectedReason === r ? colors.error : colors.border } ]}>
              <View style={[styles.radioOuter, { borderColor: selectedReason === r ? colors.error : colors.border } ]}>
                {selectedReason === r && <View style={[styles.radioDot, { backgroundColor: colors.error }]} />}
              </View>
              <AppText variant="bodySM">{r}</AppText>
            </TouchableOpacity>
          ))}
          <View style={[styles.refundNote, { backgroundColor: '#FEF3C7' } ]}>
            <AppText variant="bodySM">
              ️ سيتم استرداد 100% من قيمة الحجز (350 ريال) لأن الإلغاء قبل 24 ساعة
            </AppText>
          </View>
        </ScrollView>
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 } ]}>
          <TouchableOpacity
            onPress={handleAction}
            disabled={!selectedReason || isLoading}
            style={[styles.confirmCancelBtn, { opacity: !selectedReason ? 0.5 : 1, backgroundColor: colors.error } ]}>
            <AppText variant="bodySM">{isLoading ? 'جاري الإلغاء...' : 'تأكيد الإلغاء'}</AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Reschedule mode
  return (
    <View style={[styles.container, { backgroundColor: colors.background } ]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: isDark ? colors.surface : colors.white } ]}>
        <AppText variant="bodySM">اختر موعداً جديداً</AppText>
        <TouchableOpacity onPress={() => setMode('choose')}>
          <Icon name="back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 } ]}>
        <AppText variant="bodySM">اليوم</AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {NEW_DAYS.map((d, i) => (
            <TouchableOpacity key={i} onPress={() => setSelectedDay(i)}
              style={[styles.dayChip, selectedDay === i && { backgroundColor: colors.primary } ]}>
              <AppText variant="bodySM">{d}</AppText>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <AppText variant="bodySM">الوقت</AppText>
        <View style={styles.timesGrid}>
          {NEW_TIMES.map((t) => (
            <TouchableOpacity key={t} onPress={() => setSelectedTime(t)}
              style={[styles.timeChip, selectedTime === t && { backgroundColor: colors.primary } ]}>
              <AppText variant="bodySM">{t}</AppText>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 } ]}>
        <TouchableOpacity
          onPress={handleAction}
          disabled={!selectedTime || isLoading}
          style={[{ opacity: !selectedTime ? 0.5 : 1 } ]}>
          <View  style={styles.rescheduleConfirmBtn}>
            <AppText variant="bodySM">{isLoading ? 'جاري التأجيل...' : 'تأكيد الموعد الجديد '}</AppText>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 14 },
  title: { fontSize: 18, fontWeight: '800' },
  chooseContent: { flex: 1, padding: 16, gap: 12 },
  content: { padding: 16, gap: 12 },
  apptSummary: { borderRadius: 18, padding: 16, flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  docName: { fontSize: 15, fontWeight: '800' },
  apptTime: { fontSize: 13, fontWeight: '400', marginTop: 2 },
  policyCard: { borderRadius: 18, padding: 16 },
  policyTitle: { fontSize: 14, fontWeight: '800', textAlign: 'right', marginBottom: 10 },
  policyRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1 },
  policyRange: { fontSize: 13, fontWeight: '400' },
  policyRefund: { fontSize: 13, fontWeight: '800' },
  rescheduleBtn: { borderRadius: 16, overflow: 'hidden' },
  actionBtnInner: { height: 54, justifyContent: 'center', alignItems: 'center' },
  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  cancelBtn: { height: 50, borderRadius: 16, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '700' },
  reasonItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1.5, padding: 14 },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  radioDot: { width: 11, height: 11, borderRadius: 5.5 },
  reasonText: { flex: 1, fontSize: 14, fontWeight: '700', textAlign: 'right' },
  refundNote: { borderRadius: 14, padding: 12 },
  refundNoteText: { color: '#92400E', fontSize: 13, fontWeight: '400', textAlign: 'right', lineHeight: 20 },
  bottomBar: { paddingHorizontal: 16, paddingTop: 12 },
  confirmCancelBtn: { height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  confirmCancelText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  sectionLabel: { fontSize: 15, fontWeight: '800', textAlign: 'right', marginBottom: 10 },
  dayChip: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: 'rgba(0,0,0,0.06)' },
  dayText: { fontSize: 13, fontWeight: '700' },
  timesGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  timeChip: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: 'rgba(0,0,0,0.06)' },
  timeText: { fontSize: 13, fontWeight: '700' },
  rescheduleConfirmBtn: { height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
});
