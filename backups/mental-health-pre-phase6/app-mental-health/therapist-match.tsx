// @ts-nocheck
// AI therapist matching
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, StatusBar, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon, IconName } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton, SectionHeader } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';
import { pickLocalized } from '../../src/utils/localize';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';

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
      const list = Array.isArray(res) ? res : [];
      // E2: keep only mental-health specialists — showing any doctor as a "therapist match" was misleading
      const psychOnly = list.filter((d) => {
        const s = `${d.specialty_ar || ''} ${d.specialty || ''}`.toLowerCase();
        return s.includes('نفس') || s.includes('psych');
      });
      // E2: no fabricated stats — every figure below comes from the backend or stays hidden
      const mapped = psychOnly.map((d) => ({
        id: d.id,
        name: pickLocalized(d.name_ar, d.name),
        spec: pickLocalized(d.specialty_ar, d.specialty) || '',
        rating: d.rating ?? null,
        reviews: d.reviews_count ?? null,
        exp: d.experience_years ?? d.years_of_experience ?? null,
        price: d.consultation_fee ?? null,
        langs: Array.isArray(d.languages) ? d.languages.map((l: string) => (l === 'ar' ? 'العربية' : 'English')) : [],
      }));
      setTherapists(mapped);
      setStep(1);
    } catch (e: any) {
      showLocalizedAlert('تعذر البحث', e?.message || 'تحقق من اتصالك وحاول مرة أخرى.');
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
            {therapists.length > 0 ? (
              <Card style={{ backgroundColor: colors.successSurface }}>
                <View style={{ flexDirection: 'row-reverse', gap: 10, alignItems: 'center' }}>
                  <Icon name="check_circle" size={24} color={colors.success} />
                  <AppText variant="h5" color={colors.success}>وجدنا {therapists.length} معالجين متاحين</AppText>
                </View>
              </Card>
            ) : (
              <Card style={{ alignItems: 'center', gap: 8 }}>
                <Icon name="doctor" size={32} color={colors.textTertiary} />
                <AppText variant="h5" align="center">لا يوجد معالجون نفسيون متاحون حالياً</AppText>
                <AppText variant="bodySM" color={colors.textSecondary} align="center">يمكنك تصفح كل الأطباء أو التواصل مع الدعم</AppText>
                <Button label="تصفح الأطباء" variant="outline" size="sm" full={false} onPress={() => router.push('/(tabs)/consultations')} />
              </Card>
            )}

            {therapists.map(t => (
              <Card key={t.id} onPress={() => router.push({ pathname: '/consultations/doctor/[id]', params: { id: t.id } })}>
                <View style={{ flexDirection: 'row-reverse', gap: 12 }}>
                  <View style={[st.ava, { backgroundColor: colors.primarySurface } ]}>
                    <Icon name="doctor" size={32} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, alignItems: 'flex-end', gap: 4 }}>
                    <AppText variant="h5">{t.name}</AppText>
                    {!!t.spec && <AppText variant="bodySM" color={colors.textSecondary}>{t.spec}</AppText>}
                    {(t.rating != null || t.reviews != null || t.exp != null) && (
                      <View style={{ flexDirection: 'row-reverse', gap: 4, alignItems: 'center' }}>
                        {t.rating != null && (
                          <>
                            <Icon name="star" size={12} color={colors.gold} />
                            <AppText variant="labelSM" color={colors.gold}>{t.rating}</AppText>
                          </>
                        )}
                        {t.reviews != null && <AppText variant="caption" color={colors.textTertiary}>({t.reviews})</AppText>}
                        {t.exp != null && <AppText variant="caption" color={colors.textTertiary}>· {t.exp} سنة خبرة</AppText>}
                      </View>
                    )}
                    {t.langs.length > 0 && (
                      <View style={{ flexDirection: 'row-reverse', gap: 6 }}>
                        {t.langs.map((l, i) => <Badge key={i} label={l} color={colors.primary} />)}
                      </View>
                    )}
                  </View>
                </View>
                <View style={{ flexDirection: 'row-reverse', justifyContent: t.price != null ? 'space-between' : 'flex-start', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.borderLight }}>
                  <Button label="احجز الآن" variant="primary" size="sm" full={false} onPress={() => router.push({ pathname: '/consultations/booking-confirm', params: { doctorId: t.id } })} />
                  {t.price != null && <AppText variant="h5" color={colors.primary}>{t.price} ر.س</AppText>}
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
  ava: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
