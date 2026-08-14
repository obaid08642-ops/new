// @ts-nocheck
// Exercise plan — home/gym workout via AI
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon, IconName } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton, SegmentedControl, SectionHeader } from '../../src/components/ui';

const EXERCISES = [
  { day: 'السبت', muscle: 'صدر + ترايسبس', exercises: ['بنش بريس × 4', 'ضغط مائل × 3', 'تفتيح × 3', 'تراي كيبل × 3'], duration: 50 },
  { day: 'الأحد', muscle: 'ظهر + باي', exercises: ['سحب علوي × 4', 'تجديف × 3', 'سحب أرضي × 3', 'باي كيرل × 3'], duration: 50 },
  { day: 'الإثنين', muscle: 'راحة / كارديو خفيف', exercises: ['مشي 30 دقيقة', 'تمدد 15 دقيقة'], duration: 45 },
  { day: 'الثلاثاء', muscle: 'أكتاف + بطن', exercises: ['ضغط أمامي × 4', 'رفع جانبي × 3', 'رفع أمامي × 3', 'بلانك × 3'], duration: 45 },
  { day: 'الأربعاء', muscle: 'أرجل', exercises: ['سكوات × 4', 'لانجز × 3', 'ضغط أرجل × 3', 'بطة × 3'], duration: 55 },
];

export default function ExercisePlanScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [location, setLocation] = useState('gym');

  return (
    <View style={[st.c, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[st.hdr, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.borderLight } ]}>
        <View style={{ width: 40 }}/>
        <AppText variant="h4">خطة التمارين</AppText>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }}>
        <SegmentedControl value={location} onChange={setLocation} options={[
          { key: 'gym', label: 'الجيم', icon: 'run' },
          { key: 'home', label: 'البيت', icon: 'home' },
          { key: 'outdoor', label: 'خارجي', icon: 'walk' },
        ]} />

        <Card style={{ backgroundColor: colors.primarySurface }}>
          <View style={{ flexDirection: 'row-reverse', gap: 10, alignItems: 'center' }}>
            <Icon name="robot" size={24} color={colors.primary} />
            <AppText variant="h6" color={colors.primary}>خطة مخصصة بالـ AI بناءً على أهدافك</AppText>
          </View>
        </Card>

        {EXERCISES.map((day, i) => (
          <Card key={i}>
            <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 10 }}>
              <View style={{ alignItems: 'flex-end' }}>
                <AppText variant="h5">{day.day}</AppText>
                <AppText variant="bodySM" color={colors.textTertiary}>{day.muscle}</AppText>
              </View>
              <Badge label={`${day.duration} دقيقة`} color={colors.secondary} icon="clock" />
            </View>
            {day.exercises.map((ex, j) => (
              <View key={j} style={{ flexDirection: 'row-reverse', gap: 8, paddingVertical: 5, alignItems: 'center' }}>
                <Icon name="check_circle" size={14} color={colors.success} />
                <AppText variant="bodySM" color={colors.textSecondary}>{ex}</AppText>
              </View>
            ))}
          </Card>
        ))}

        <Button label="تعديل الخطة بالـ AI" variant="outline" icon="robot" onPress={() => router.push('/nutrition/ai-plan-builder')} />
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
});
