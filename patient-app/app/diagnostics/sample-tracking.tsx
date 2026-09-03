import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  I18nManager,
} from 'react-native';
import { AppText } from '../../src/components/ui';
import { useApp } from '../../src/context/AppContext';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { apiFetch } from '../../src/utils/api';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function SampleTrackingScreen() {
  const { colors } = useApp();
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId?: string }>();
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState<any>(null);
  const [booking, setBooking] = useState<any>(null);

  useEffect(() => {
    if (!bookingId) {
      setLoading(false);
      return;
    }
    let stopped = false;
    const fetchTracking = async () => {
      try {
        const [bookingRes, trackRes] = await Promise.all([
          apiFetch(`/labs/bookings/${bookingId}`).catch(() => null),
          apiFetch(`/labs/bookings/${bookingId}/tracking`).catch(() => null),
        ]);
        if (stopped) return;
        if (bookingRes?.data || bookingRes) setBooking(bookingRes?.data || bookingRes);
        if (trackRes?.data || trackRes) setTracking(trackRes?.data || trackRes);
      } catch (err) {
        console.log('Error fetching sample tracking:', err);
      } finally {
        if (!stopped) setLoading(false);
      }
    };

    fetchTracking();
    const interval = setInterval(fetchTracking, 15000);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [bookingId]);

  const steps = tracking?.steps || [
    { title: 'تم استلام طلب التحليل', done: true },
    { title: 'جاري تخصيص أخصائي سحب العينة', done: tracking?.techName ? true : false },
    { title: 'أخصائي السحب في الطريق', done: false },
    { title: 'تم سحب العينة بنجاح', done: false },
    { title: 'العينة قيد الفحص بالمختبر', done: false },
    { title: 'النتائج والتقرير الطبي جاهز', done: false },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon
            name={I18nManager.isRTL ? 'arrow-right' : 'arrow-left'}
            size={24}
            color={colors.textPrimary}
          />
        </TouchableOpacity>
        <AppText variant="h2" style={{ fontSize: 18, fontWeight: 'bold', color: colors.textPrimary }}>
          تتبع سحب العينة المخبرية
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
        ) : (
          <>
            {/* Summary Card */}
            <Animated.View entering={FadeInDown.duration(400)} style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.badgeRow}>
                <View style={[styles.statusBadge, { backgroundColor: `${colors.primary}15` }]}>
                  <AppText style={{ color: colors.primary, fontSize: 13, fontWeight: 'bold' }}>
                    {booking?.state || 'قيد المتابعة'}
                  </AppText>
                </View>
                {tracking?.eta != null && (
                  <View style={[styles.statusBadge, { backgroundColor: '#10B98115' }]}>
                    <AppText style={{ color: '#10B981', fontSize: 13, fontWeight: 'bold' }}>
                      الوصول خلال {tracking.eta} دقيقة
                    </AppText>
                  </View>
                )}
              </View>

              {tracking?.techName && (
                <View style={styles.infoRow}>
                  <Icon name="account-tie" size={20} color={colors.primary} />
                  <AppText style={[styles.infoText, { color: colors.textPrimary }]}>
                    أخصائي السحب: <AppText style={{ fontWeight: 'bold' }}>{tracking.techName}</AppText>
                  </AppText>
                </View>
              )}

              {booking?.scheduled_at && (
                <View style={styles.infoRow}>
                  <Icon name="calendar-clock" size={20} color={colors.textSecondary} />
                  <AppText style={[styles.infoText, { color: colors.textSecondary }]}>
                    الموعد المحدد: {new Date(booking.scheduled_at).toLocaleString('ar-SA')}
                  </AppText>
                </View>
              )}
            </Animated.View>

            {/* Preparation Guidelines */}
            <View style={[styles.guideCard, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Icon name="information-outline" size={20} color="#2563EB" />
                <AppText style={{ color: '#1E3A8A', fontWeight: 'bold', fontSize: 14 }}>
                  تعليمات ما قبل سحب العينة
                </AppText>
              </View>
              <AppText style={{ color: '#1E40AF', fontSize: 13, lineHeight: 20 }}>
                يرجى الالتزام بالصيام التام لمدة 8 إلى 12 ساعة في حال شملت الباقة تحاليل السكر الصائم أو وظائف الدهون، مع إمكانية شرب الماء النقي فقط.
              </AppText>
            </View>

            {/* Timeline */}
            <View style={[styles.timelineWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <AppText style={{ color: colors.textPrimary, fontWeight: 'bold', fontSize: 16, marginBottom: 16 }}>
                مراحل تنفيذ الفحص
              </AppText>

              {steps.map((step: any, index: number) => {
                const isLast = index === steps.length - 1;
                return (
                  <View key={index} style={styles.timelineItem}>
                    <View style={styles.markerCol}>
                      <View
                        style={[
                          styles.dot,
                          {
                            backgroundColor: step.done ? colors.primary : colors.border,
                            borderColor: step.done ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        {step.done && <Icon name="check" size={12} color="#fff" />}
                      </View>
                      {!isLast && (
                        <View
                          style={[
                            styles.line,
                            { backgroundColor: step.done ? colors.primary : colors.border },
                          ]}
                        />
                      )}
                    </View>
                    <View style={styles.stepContent}>
                      <AppText
                        style={{
                          color: step.done ? colors.textPrimary : colors.textSecondary,
                          fontWeight: step.done ? 'bold' : 'normal',
                          fontSize: 14,
                        }}
                      >
                        {step.title}
                      </AppText>
                      {step.time && (
                        <AppText style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                          {step.time}
                        </AppText>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, gap: 16 },
  summaryCard: { padding: 18, borderRadius: 16, borderWidth: 1, gap: 12 },
  badgeRow: { flexDirection: 'row', gap: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { fontSize: 14 },
  guideCard: { padding: 14, borderRadius: 12, borderWidth: 1 },
  timelineWrap: { padding: 18, borderRadius: 16, borderWidth: 1 },
  timelineItem: { flexDirection: 'row', gap: 14 },
  markerCol: { alignItems: 'center', width: 20 },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  line: { width: 2, flex: 1, minHeight: 32, marginVertical: 4 },
  stepContent: { flex: 1, paddingBottom: 20 },
});
