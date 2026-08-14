// @ts-nocheck
// Body target — BMI + body fat + goal setting — Connected to GET/POST /nutrition/profile
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, StatusBar, Alert } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton, Input, SegmentedControl, SectionHeader } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';

export default function BodyTargetScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [weight, setWeight] = useState('80');
  const [height, setHeight] = useState('175');
  const [gender, setGender] = useState('male');
  const [targetWeight, setTargetWeight] = useState('72');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const bmi = weight && height ? (parseFloat(weight) / ((parseFloat(height) / 100) ** 2)).toFixed(1) : '0';
  const bmiNum = parseFloat(bmi);
  const bmiStatus = bmiNum < 18.5 ? 'نحيف' : bmiNum < 25 ? 'طبيعي' : bmiNum < 30 ? 'زيادة وزن' : 'سمنة';
  const bmiColor = bmiNum < 18.5 ? '#F0A526' : bmiNum < 25 ? '#16A34A' : bmiNum < 30 ? '#F0A526' : '#F0695C';

  useEffect(() => {
    apiFetch('/nutrition/profile')
      .then((p: any) => {
        if (p.weight_kg) setWeight(String(p.weight_kg));
        if (p.height_cm) setHeight(String(p.height_cm));
        if (p.target_weight_kg) setTargetWeight(String(p.target_weight_kg));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiFetch('/nutrition/profile', {
        method: 'POST',
        body: JSON.stringify({
          weight_kg: parseFloat(weight),
          height_cm: parseFloat(height),
          target_weight_kg: parseFloat(targetWeight),
          bmi: parseFloat(bmi),
        }),
      });
      Alert.alert('تم الحفظ', 'تم تحديث بياناتك الجسمانية بنجاح');
    } catch {
      Alert.alert('خطأ', 'تعذر حفظ البيانات');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[st.c, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[st.hdr, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.borderLight } ]}>
        <View style={{ width: 40 }}/>
        <AppText variant="h4">هدف الجسم</AppText>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }}>
        <SegmentedControl value={gender} onChange={setGender} options={[{ key: 'male', label: 'ذكر' }, { key: 'female', label: 'أنثى' }]} />

        <View style={{ flexDirection: 'row-reverse', gap: 10 }}>
          <Input value={weight} onChangeText={setWeight} placeholder="الوزن (كغ)" keyboardType="numeric" icon="weight" style={{ flex: 1 }}/>
          <Input value={height} onChangeText={setHeight} placeholder="الطول (سم)" keyboardType="numeric" icon="trending_up" style={{ flex: 1 }}/>
        </View>

        {/* BMI Result */}
        <Card style={{ alignItems: 'center', gap: 10 }}>
          <AppText variant="caption" color={colors.textTertiary}>مؤشر كتلة الجسم BMI</AppText>
          <View style={[st.bmiCircle, { borderColor: bmiColor } ]}>
            <AppText variant="displayMD" color={bmiColor}>{loading ? '...' : bmi}</AppText>
          </View>
          <Badge label={loading ? 'جاري التحميل' : bmiStatus} color={bmiColor} />
          <View style={st.bmiBar}>
            {[{ l: 'نحيف', c: '#F0A526' }, { l: 'طبيعي', c: '#16A34A' }, { l: 'زيادة', c: '#F0A526' }, { l: 'سمنة', c: '#F0695C' }].map((s, i) => (
              <View key={i} style={{ backgroundColor: s.c, flex: 1, height: 8, borderRadius: 4 }}/>
            ))}
          </View>
        </Card>

        {/* Target */}
        <Card>
          <SectionHeader title="الوزن المستهدف" />
          <Input value={targetWeight} onChangeText={setTargetWeight} placeholder="الوزن المستهدف (كغ)" keyboardType="numeric" icon="success" />
          {weight && targetWeight && (
            <View style={{ flexDirection: 'row-reverse', gap: 8, marginTop: 10, alignItems: 'center' }}>
              <Icon name={parseFloat(targetWeight) < parseFloat(weight) ? 'trendingDown' : 'trendingUp'} size={18} color={colors.primary} />
              <AppText variant="bodySM" color={colors.textSecondary}>
                تحتاج {parseFloat(targetWeight) < parseFloat(weight) ? 'خسارة' : 'اكتساب'} {Math.abs(parseFloat(weight) - parseFloat(targetWeight)).toFixed(1)} كغ
              </AppText>
            </View>
          )}
        </Card>

        <Button label={saving ? 'جاري الحفظ...' : 'حفظ بياناتي'} variant="gradient" size="lg" icon="success" onPress={handleSave} />
        <Button label="إنشاء خطة غذائية" variant="outline" icon="robot" onPress={() => router.push('/nutrition/ai-plan-builder')} />
        <Button label="عرض هيكل الجسم" variant="outline" icon="user" onPress={() => router.push('/nutrition/body-composition')} />
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  bmiCircle: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  bmiBar: { flexDirection: 'row', gap: 3, width: '100%', marginTop: 8 },
});
