// @ts-nocheck
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, TextInput, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { resolveColor, darkColors, lightColors } from '../../src/theme/colors';
import { apiFetch } from '../../src/utils/api';
import { LocalizedText } from '../../src/components/LocalizedText';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';

const RATING_LABELS = ['', 'سيئ', 'مقبول', 'جيد', 'ممتاز', 'رائع جداً'];
const TAGS = ['ممتاز', 'سريع', 'احترافي', 'نظيف', 'متعاون', 'أنصح به'];

export default function PostCallRatingScreen() {
  const { appointmentId } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { isDark, lang } = useApp() as any;
  const colors = isDark ? darkColors : lightColors;
  const isRTL = lang === 'ar' || lang === 'ur';

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleTag = (t: string) => {
    if (activeTags.includes(t)) {
      setActiveTags(activeTags.filter(x => x !== t));
    } else {
      setActiveTags([...activeTags, t]);
    }
  };

  const submit = async () => {
    if (rating === 0) return;
    setLoading(true);
    try {
      if (appointmentId) {
        // E2: real endpoint (was non-existent POST /care/appointments/rating with a swallowed catch)
        await apiFetch('/patient-ux/review', {
          method: 'POST',
          body: JSON.stringify({ booking_kind: 'appointment', booking_id: String(appointmentId), rating, comment, aspects: activeTags })
        });
      }
      setLoading(false);
      router.replace('/(tabs)/consultations');
    } catch (e: any) {
      setLoading(false);
      showLocalizedAlert('تعذر إرسال التقييم', e?.message || 'حاول مرة أخرى لاحقاً.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg } ]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: colors.bd } ]}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)/consultations')} style={{ width: 40, height: 40, justifyContent: 'center' }}>
          <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', color: colors.n, fontSize: 24 }}>close</LocalizedText>
        </TouchableOpacity>
        <LocalizedText style={{ fontSize: 16, fontWeight: '800', color: colors.n }}>التقييم</LocalizedText>
        <View style={{ width: 40 }}/>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
          <View  style={styles.iconCircle}  >
            <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', fontSize: 40, color: resolveColor('var(--p)') }}>thumb_up</LocalizedText>
          </View>
          
          <LocalizedText style={{ fontSize: 20, fontWeight: '900', color: colors.n, marginBottom: 6 }}>كيف كانت تجربتك؟</LocalizedText>
          <LocalizedText style={{ fontSize: 12, color: colors.t2, marginBottom: 24 }}>تقييمك يساعدنا على تحسين خدماتنا</LocalizedText>
          
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(n => (
              <TouchableOpacity key={n} onPress={() => setRating(n)} activeOpacity={0.7}>
                <LocalizedText style={{ 
                  fontFamily: 'MaterialSymbolsRounded', 
                  fontSize: 42, 
                  color: n <= rating ? resolveColor('var(--am)') : colors.bd,
                  transform: [{ scale: n <= rating ? 1.1 : 1 }]
                }}>
                  {n <= rating ? 'star' : 'star'}
                </LocalizedText>
              </TouchableOpacity>
            ))}
          </View>
          <LocalizedText style={{ fontSize: 13, fontWeight: '700', color: resolveColor('var(--am)'), height: 20, marginBottom: 24 }}>
            {RATING_LABELS[rating]}
          </LocalizedText>
        </View>

        <View style={{ marginTop: 0 }}>
          <LocalizedText style={{ fontSize: 13, fontWeight: '700', color: colors.n, marginBottom: 10, textAlign: isRTL ? 'right' : 'left' }}>أضف تعليقاً (اختياري)</LocalizedText>
          <TextInput
            style={[styles.input, { backgroundColor: colors.bg, color: colors.n, textAlign: isRTL ? 'right' : 'left' }]}
            placeholder="اكتب رأيك في الخدمة..."
            placeholderTextColor={colors.t3}
            value={comment}
            onChangeText={setComment}
            multiline
          />
        </View>

        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
          {TAGS.map(t => {
            const active = activeTags.includes(t);
            return (
              <TouchableOpacity 
                key={t} 
                onPress={() => toggleTag(t)}
                style={[
                  styles.chip, 
                  active ? { backgroundColor: resolveColor('var(--ps)'), borderColor: resolveColor('var(--p)') } : { backgroundColor: colors.s, borderColor: colors.bd }]} >
                <LocalizedText style={{ fontSize: 11, fontWeight: '600', color: active ? resolveColor('var(--pt)') : colors.t2 }}>{t}</LocalizedText>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity 
          style={[styles.btn, { backgroundColor: colors.n, opacity: rating > 0 ? 1 : 0.5 }]} 
          onPress={submit}
          disabled={rating === 0 || loading}
        >
          {loading ? <ActivityIndicator color={colors.bg} /> : <LocalizedText style={{ fontSize: 14, fontWeight: '800', color: colors.bg }}>إرسال التقييم</LocalizedText>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  iconCircle: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 8 },
  input: { borderRadius: 14, padding: 14, minHeight: 80, fontSize: 12, textAlignVertical: 'top' },
  chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 50, borderWidth: 1.5 },
  btn: { width: '100%', marginTop: 30, padding: 15, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#141A2A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 8 }
});
