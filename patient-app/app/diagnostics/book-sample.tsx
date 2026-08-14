// @ts-nocheck
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton, SegmentedControl, SectionHeader } from '../../src/components/ui';
import { useDiagnosticsCart } from '../../src/context/DiagnosticsCartContext';

export default function BookSampleScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const { items } = useDiagnosticsCart();
  const [location, setLocation] = useState('home');
  const [selectedDate, setSelectedDate] = useState('today');
  const [selectedTime, setSelectedTime] = useState('10:00');

  return (
    <View style={[st.c, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[st.hdr, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.borderLight } ]}>
        <View style={{ width: 40 }}/>
        <AppText variant="h4">حجز سحب عينة</AppText>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 120 }}>
        <SectionHeader title="مكان سحب العينة" />
        <SegmentedControl value={location} onChange={setLocation} options={[
          { key: 'home', label: 'في البيت', icon: 'home' },
          { key: 'lab', label: 'في المختبر', icon: 'hospital' },
        ]} />

        {location === 'home' && (
          <Card style={{ backgroundColor: colors.infoSurface }}>
            <View style={{ flexDirection: 'row-reverse', gap: 10, alignItems: 'flex-start' }}>
              <Icon name="info" size={18} color={colors.info} />
              <AppText variant="bodySM" color={colors.textSecondary} style={{ flex: 1 }}>سيصلك فني مختبر معتمد لسحب العينة في المنزل. رسوم الزيارة المنزلية: 50 ر.س</AppText>
            </View>
          </Card>
        )}

        {location === 'home' && (
          <TouchableOpacity
            onPress={() => router.push('/shared/location-picker')}
            style={[{
              flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
              padding: 14, borderRadius: 16, borderWidth: 1,
              backgroundColor: colors.surface, borderColor: colors.border,
            }]}
            activeOpacity={0.85}
          >
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }}>
              <Icon name="location" size={22} color={colors.primary} />
              <View style={{ alignItems: 'flex-end' }}>
                <AppText variant="labelMD">عنوان السحب المنزلي</AppText>
                <AppText variant="caption" color={colors.textTertiary}>اضغط لتحديد أو تغيير موقعك</AppText>
              </View>
            </View>
            <Icon name="chevronLeft" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}

        {location === 'lab' && (
          <Card>
            <View style={{ flexDirection: 'row-reverse', gap: 12, alignItems: 'center' }}>
              <View style={[st.labIcon, { backgroundColor: '#7A6BEA18' } ]}>
                <Icon name="hospital" size={24} color="#7A6BEA" />
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <AppText variant="h6">مختبرات البرج</AppText>
                <AppText variant="caption" color={colors.textTertiary}>طريق الملك فهد — 2.3 كم</AppText>
              </View>
              <Icon name="chevronLeft" size={18} color={colors.textTertiary} />
            </View>
          </Card>
        )}

        <SectionHeader title="اختر التاريخ" />
        <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
          {[{ key: 'today', label: 'اليوم' }, { key: 'tomorrow', label: 'غداً' }, { key: 'after', label: 'بعد غد' }].map(d => (
            <Card key={d.key} onPress={() => setSelectedDate(d.key)} style={[st.dateCard, selectedDate === d.key && { borderColor: colors.primary, borderWidth: 2 } ]}>
              <AppText variant="labelMD" color={selectedDate === d.key ? colors.primary : colors.textSecondary} align="center">{d.label}</AppText>
            </Card>
          ))}
        </View>

        <SectionHeader title="اختر الوقت" />
        <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}>
          {['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'].map(t => (
            <Card key={t} onPress={() => setSelectedTime(t)} style={[st.timeCard, selectedTime === t && { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.primarySurface } ]}>
              <AppText variant="labelSM" color={selectedTime === t ? colors.primary : colors.textSecondary} align="center">{t}</AppText>
            </Card>
          ))}
        </View>

        <Card>
          <SectionHeader title="التحاليل المطلوبة" />
          {items.length > 0 ? items.map((item, i) => (
            <View key={i} style={{ flexDirection: 'row-reverse', gap: 6, paddingVertical: 4, alignItems: 'center' }}>
              <Icon name="check_circle" size={16} color={colors.success} />
              <AppText variant="bodySM">{item.name}</AppText>
            </View>
          )) : (
            <AppText variant="bodySM" color={colors.textSecondary}>لا يوجد تحاليل</AppText>
          )}
        </Card>

        {location === 'home' && (
          <Card>
            <SectionHeader title="تعليمات قبل السحب" />
            <AppText variant="bodySM" color={colors.textSecondary}>• يجب الصيام 8-12 ساعة للتحاليل الصيامية</AppText>
            <AppText variant="bodySM" color={colors.textSecondary}>• اشرب ماء فقط</AppText>
            <AppText variant="bodySM" color={colors.textSecondary}>• تجنب التمارين الشاقة قبل السحب</AppText>
          </Card>
        )}
      </ScrollView>

      <View style={[st.bottom, { paddingBottom: insets.bottom + 8, backgroundColor: colors.surface, borderTopColor: colors.borderLight } ]}>
        <Button label={`تأكيد الحجز — ${location === 'home' ? selectedTime : selectedTime}`} variant="gradient" size="lg" icon="calendarCheck" onPress={() => router.push('/payments/processing')} />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  labIcon: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  dateCard: { flex: 1, paddingVertical: 12, borderWidth: 1, borderColor: 'transparent' },
  timeCard: { width: '23%', paddingVertical: 10, borderWidth: 1, borderColor: 'transparent' },
  bottom: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
});
