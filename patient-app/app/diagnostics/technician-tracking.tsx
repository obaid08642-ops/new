import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  I18nManager,
  Linking,
} from 'react-native';
import { AppText } from '../../src/components/ui';
import { useApp } from '../../src/context/AppContext';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { apiFetch } from '../../src/utils/api';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function TechnicianTrackingScreen() {
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
        console.log('Error fetching technician tracking:', err);
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

  const callTechnician = () => {
    if (tracking?.techPhone) {
      Linking.openURL(`tel:${tracking.techPhone}`);
    }
  };

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
          موقع أخصائي السحب
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
        ) : (
          <>
            {/* ETA Card */}
            <Animated.View entering={FadeInDown.duration(400)} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.etaHeader}>
                <View>
                  <AppText style={{ color: colors.textSecondary, fontSize: 13 }}>الوقت المقدر للوصول</AppText>
                  <AppText style={{ color: colors.primary, fontSize: 26, fontWeight: 'bold' }}>
                    {tracking?.eta ? `${tracking.eta} دقيقة` : 'قريب منك'}
                  </AppText>
                </View>
                <View style={[styles.iconBox, { backgroundColor: `${colors.primary}15` }]}>
                  <Icon name="moped" size={32} color={colors.primary} />
                </View>
              </View>

              {tracking?.techName && (
                <View style={styles.techRow}>
                  <View style={styles.techInfo}>
                    <Icon name="account-circle" size={40} color={colors.primary} />
                    <View>
                      <AppText style={{ fontWeight: 'bold', fontSize: 15, color: colors.textPrimary }}>
                        {tracking.techName}
                      </AppText>
                      <AppText style={{ color: colors.textSecondary, fontSize: 12 }}>أخصائي سحب معتمد</AppText>
                    </View>
                  </View>
                  {tracking?.techPhone && (
                    <TouchableOpacity style={[styles.callBtn, { backgroundColor: colors.primary }]} onPress={callTechnician}>
                      <Icon name="phone" size={18} color="#fff" />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </Animated.View>

            {/* Preparation Guidance */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, gap: 8 }]}>
              <AppText style={{ fontWeight: 'bold', fontSize: 15, color: colors.textPrimary }}>
                نصائح استقبال الأخصائي
              </AppText>
              <AppText style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 20 }}>
                • يرجى تجهيز مكان مريح وجيد الإضاءة لعملية سحب العينة.
                {"\n"}• تأكد من إبراز الهوية الوطنية أو الإقامة عند وصول الأخصائي.
                {"\n"}• سيتم إرسال العينات مباشرة في حاويات مبردة ومخصصة للمختبر المعتمد.
              </AppText>
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
  card: { padding: 18, borderRadius: 16, borderWidth: 1 },
  etaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  iconBox: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  techRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  techInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  callBtn: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
});
