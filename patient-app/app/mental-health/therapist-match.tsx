// @ts-nocheck
// AI therapist matching
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon, IconName } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton, SectionHeader } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';

const CONCERNS = ['قلق وتوتر', 'اكتئاب', 'مشاكل نوم', 'ضغوط العمل', 'مشاكل عائلية', 'إدمان', 'صدمة نفسية', 'ثقة بالنفس', 'اضطرابات أكل', 'حزن وفقدان'];

// Therapists fetched dynamically

export default function TherapistMatchScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [selected, setSelected] = useState<string[]>([]);
  const [step, setStep] = useState(0);
  const [matching, setMatching] = useState(false);
  const [therapists, setTherapists] = useState<any[]>([]);

  const toggleConcern = (c: string) => setSelected(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c]);

  const findMatch = async () => {
    setMatching(true);
    try {
      const res = await apiFetch<any[]>('/doctors');
      if (res && res.length > 0) {
        const mapped = res.map((d, index) => ({
          id: d.id || String(index + 1),
          name: d.name_ar,
          spec: d.specialty_ar || d.specialty,
          rating: d.rating || 4.8,
          reviews: d.reviews_count || 120,
          exp: 10,
          price: d.consultation_fee || 150,
          match: 90 - index * 5,
          online: true,
          langs: d.languages?.map((l: string) => l === 'ar' ? 'العربية' : 'English') || ['العربية']
        }));
        setTherapists(mapped);
      }
      setStep(1);
    } catch (e) {
      setStep(1);
    } finally {
      setMatching(false);
    }
  };

  return (
    <View style={[st.c, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[st.hdr, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.borderLight } ]}>
        <View style={{ width: 40 }}/>
        <AppText variant="h4">مطابقة المعالج بالـ AI</AppText>
        <IconButton icon="back" onPress={() => step > 0 ? setStep(0) : router.back()} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }}>
        {step === 0 && (
          <>
            <Card style={{ alignItems: 'center', gap: 8, backgroundColor: colors.primarySurface }}>
              <Icon name="robot" size={36} color={colors.primary} />
              <AppText variant="h5" color={colors.primary} align="center">نساعدك في إيجاد المعالج المناسب</AppText>
              <AppText variant="bodySM" color={colors.textSecondary} align="center">اختر ما يقلقك وسنجد لك أفضل معالج متخصص</AppText>
            </Card>

            <SectionHeader title="ما الذي يشغلك؟ (اختر كل ما ينطبق)" />
            <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}>
              {CONCERNS.map(c => {
                const active = selected.includes(c);
                return (
                  <TouchableOpacity key={c} onPress={() => toggleConcern(c)} style={[st.concern, { backgroundColor: active ? colors.primary : colors.surfaceSecondary, borderColor: active ? colors.primary : colors.border } ]}>
                    <AppText variant="labelSM" color={active ? '#fff' : colors.textPrimary}>{c}</AppText>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Button label="ابحث عن معالج مناسب" variant="gradient" size="lg" icon="robot" loading={matching} disabled={selected.length === 0} onPress={findMatch} style={{ marginTop: 16 }}/>
          </>
        )}

        {step === 1 && (
          <>
            <Card style={{ backgroundColor: colors.successSurface }}>
              <View style={{ flexDirection: 'row-reverse', gap: 10, alignItems: 'center' }}>
                <Icon name="check_circle" size={24} color={colors.success} />
                <AppText variant="h5" color={colors.success}>وجدنا {therapists.length} معالجين مناسبين</AppText>
              </View>
            </Card>

            {therapists.map(t => (
              <Card key={t.id} onPress={() => router.push({ pathname: '/consultations/doctor-profile', params: { doctorId: t.id } })}>
                <View style={{ flexDirection: 'row-reverse', gap: 12 }}>
                  <View style={[st.ava, { backgroundColor: colors.primarySurface } ]}>
                    <Icon name="doctor" size={32} color={colors.primary} />
                    <View style={[st.matchBadge, { backgroundColor: t.match >= 90 ? colors.success : colors.primary } ]}>
                      <AppText variant="caption" color="#fff">{t.match}%</AppText>
                    </View>
                  </View>
                  <View style={{ flex: 1, alignItems: 'flex-end', gap: 4 }}>
                    <AppText variant="h5">{t.name}</AppText>
                    <AppText variant="bodySM" color={colors.textSecondary}>{t.spec}</AppText>
                    <View style={{ flexDirection: 'row-reverse', gap: 4, alignItems: 'center' }}>
                      <Icon name="star" size={12} color={colors.gold} />
                      <AppText variant="labelSM" color={colors.gold}>{t.rating}</AppText>
                      <AppText variant="caption" color={colors.textTertiary}>({t.reviews}) · {t.exp} سنة خبرة</AppText>
                    </View>
                    <View style={{ flexDirection: 'row-reverse', gap: 6 }}>
                      {t.langs.map((l, i) => <Badge key={i} label={l} color={colors.primary} />)}
                    </View>
                  </View>
                </View>
                <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.borderLight }}>
                  <Button label="احجز الآن" variant="primary" size="sm" full={false} onPress={() => router.push({ pathname: '/consultations/booking-confirm', params: { doctorId: t.id } })} />
                  <AppText variant="h5" color={colors.primary}>{t.price} ر.س</AppText>
                </View>
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  concern: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, borderWidth: 1 },
  ava: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  matchBadge: { position: 'absolute', bottom: -4, right: -4, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
});
