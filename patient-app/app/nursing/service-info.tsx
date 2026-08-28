// @ts-nocheck
// Nursing service PROFILE — hero image + full description + preparations +
// price/duration, and a prominent "احجز الآن" that continues to nurse selection.
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions, Image, I18nManager } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { apiFetch } from '../../src/utils/api';
import { pickDbField, pickLocalized } from '../../src/utils/localize';
import { LocalizedText } from '../../src/components/LocalizedText';

const { width } = Dimensions.get('window');

export default function NursingServiceInfo() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useApp();
  const insets = useSafeAreaInsets();
  const { serviceId, flow, gender, availability, nationality, search } = params;

  const [svc, setSvc] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/home-care/services/${serviceId}`)
      .then((res: any) => setSvc(res?.data || res))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [serviceId]);

  if (loading) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color="#23B5CE" /></View>;
  }
  if (!svc) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <LocalizedText style={{ fontFamily: 'Cairo-Bold', fontSize: 16, color: colors.textSecondary }}>تعذر تحميل تفاصيل الخدمة</LocalizedText>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <LocalizedText style={{ fontFamily: 'Cairo-Bold', color: '#23B5CE' }}>رجوع</LocalizedText>
        </TouchableOpacity>
      </View>
    );
  }

  const title = pickDbField(svc, 'name') || svc.name_ar || svc.name_en;
  const desc = pickDbField(svc, 'description');
  const prep = pickLocalized(
    Array.isArray(svc.preparation_ar) ? svc.preparation_ar.filter(Boolean) : [],
    Array.isArray(svc.preparation_en) ? svc.preparation_en.filter(Boolean) : [],
  ) || [];
  const img = svc.image_url || svc.image || null;

  const goBook = () => router.push({
    pathname: '/nursing/service-details',
    params: { serviceId, title, flow: flow || 'cash', gender: gender || 'any', availability: availability || 'any', nationality: nationality || 'any', search: search || '' },
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {/* Hero image */}
        <View>
          {img ? (
            <Image source={{ uri: img }} style={{ width, height: width * 0.62, backgroundColor: '#fff' }} resizeMode="cover" />
          ) : (
            <View style={{ width, height: width * 0.62, backgroundColor: '#E8F8FA', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="mother-nurse" size={90} color="#23B5CE" />
            </View>
          )}
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { top: insets.top + 8 }]}>
            <Icon name={I18nManager.isRTL ? 'arrow-right' : 'arrow-left'} size={24} color="#141A2A" />
          </TouchableOpacity>
        </View>

        <View style={{ padding: 20 }}>
          <LocalizedText style={[styles.title, { color: colors.textPrimary }]}>{title}</LocalizedText>

          {/* Facts row */}
          <View style={styles.factsRow}>
            {svc.price != null && (
              <View style={[styles.factChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Icon name="cash-multiple" size={18} color="#10B981" />
                <LocalizedText style={styles.factText}>{svc.price} ر.س</LocalizedText>
              </View>
            )}
            {svc.duration_value ? (
              <View style={[styles.factChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Icon name="clock-outline" size={18} color="#23B5CE" />
                <LocalizedText style={styles.factText}>{svc.duration_value} {svc.duration === 'hour' ? 'ساعة' : svc.duration || ''}</LocalizedText>
              </View>
            ) : null}
            {svc.insurance_availability ? (
              <View style={[styles.factChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Icon name="shield-check" size={18} color="#2563EB" />
                <LocalizedText style={styles.factText}>يقبل التأمين</LocalizedText>
              </View>
            ) : null}
          </View>

          {/* Description — same data shown on the card, in full */}
          {desc ? (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <LocalizedText style={[styles.cardTitle, { color: colors.textPrimary }]}>وصف الخدمة</LocalizedText>
              <LocalizedText style={[styles.cardBody, { color: colors.textSecondary }]}>{desc}</LocalizedText>
            </View>
          ) : null}

          {/* Preparations */}
          {prep.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 14 }]}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 10 }}>
                <View style={styles.prepIconWrap}><Icon name="alert-circle-outline" size={20} color="#FF9800" /></View>
                <LocalizedText style={[styles.cardTitle, { color: colors.textPrimary, marginBottom: 0 }]}>التحضيرات والاحتياطات</LocalizedText>
              </View>
              {prep.map((p: string, i: number) => (
                <View key={i} style={{ flexDirection: 'row-reverse', marginBottom: 6 }}>
                  <LocalizedText style={{ color: '#23B5CE', marginHorizontal: 6 }}>•</LocalizedText>
                  <LocalizedText style={[styles.cardBody, { color: colors.textSecondary, flex: 1 }]}>{p}</LocalizedText>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: insets.bottom + 16 }]}>
        <View style={{ alignItems: 'flex-end' }}>
          <LocalizedText style={{ fontFamily: 'Cairo-Regular', fontSize: 12, color: colors.textSecondary }}>سعر الخدمة</LocalizedText>
          <LocalizedText style={{ fontFamily: 'Cairo-Black', fontSize: 22, color: '#23B5CE' }}>{svc.price} <LocalizedText style={{ fontSize: 13 }}>ر.س</LocalizedText></LocalizedText>
        </View>
        <TouchableOpacity style={styles.bookBtn} onPress={goBook} activeOpacity={0.9}>
          <Icon name="calendar-check" size={20} color="#fff" />
          <LocalizedText style={styles.bookBtnText}>احجز الآن</LocalizedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  backBtn: { position: 'absolute', right: 16, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, elevation: 4 },
  title: { fontFamily: 'Cairo-Black', fontSize: 24, textAlign: 'right' },
  factsRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  factChip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 100, borderWidth: 1 },
  factText: { fontFamily: 'Cairo-Bold', fontSize: 13, color: '#141A2A' },
  card: { borderRadius: 18, borderWidth: 1, padding: 16, marginTop: 16 },
  cardTitle: { fontFamily: 'Cairo-Black', fontSize: 16, textAlign: 'right', marginBottom: 8 },
  cardBody: { fontFamily: 'Cairo-Regular', fontSize: 14, lineHeight: 24, textAlign: 'right' },
  prepIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FF980015', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderTopWidth: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  bookBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, backgroundColor: '#23B5CE', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 16 },
  bookBtnText: { fontFamily: 'Cairo-Black', fontSize: 16, color: '#fff' },
});
