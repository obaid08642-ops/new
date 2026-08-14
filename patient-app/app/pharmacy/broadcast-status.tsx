// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity,
  Animated, StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';

import { apiFetch } from '../../src/utils/api';
import { useLocalSearchParams } from 'expo-router';

export default function BroadcastStatusScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  
  
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const [timeLeft, setTimeLeft] = useState(120);
  const [responses, setResponses] = useState<any[]>([]);
  const [selectedPharmacy, setSelectedPharmacy] = useState<string | null>(null);
  const [phase, setPhase] = useState<'waiting' | 'offers' | 'confirmed'>('waiting');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();

    // Progress
    Animated.timing(progressAnim, { toValue: 1, duration: 120000, useNativeDriver: false }).start();

    // Countdown
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timer); setPhase('offers'); return 0; }
        return t - 1;
      });
    }, 1000);

    const pollBids = async () => {
      try {
        const data = await apiFetch(`/orders/bids/request/${requestId || 'default'}`);
        if (data && Array.isArray(data)) {
          setResponses(data);
        }
      } catch (err) {}
    };

    pollBids();
    const intervalId = setInterval(pollBids, 5000);

    return () => { clearInterval(timer); clearInterval(intervalId); };
  }, [requestId]);

  const handleAccept = async (pharmacyId: string) => {
    try {
      await apiFetch(`/orders/bids/${pharmacyId}/accept`, 'POST');
    } catch(err) {}
    setSelectedPharmacy(pharmacyId);
    setPhase('confirmed');
    setTimeout(() => {
      router.replace({ pathname: '/pharmacy/order-tracking', params: { orderId: 'ORD001' } });
    }, 2000);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  if (phase === 'confirmed') {
    const pharmacy = responses.find(p => p.id === selectedPharmacy);
    return (
      <View style={[styles.confirmedContainer, { backgroundColor: colors.background } ]}>
        <View style={[StyleSheet.absoluteFillObject, {backgroundColor: "#16A34A"}]} />
        <Icon name="check_circle" size={20} color={colors.primary} />
        <AppText variant="bodySM">تم قبول عرض {pharmacy?.name}!</AppText>
        <AppText variant="bodySM">جاري تجهيز طلبك... سيصلك خلال {pharmacy?.eta} دقيقة</AppText>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={{ paddingTop: insets.top + 16, paddingBottom: 8, paddingHorizontal: 16 }}>
        <View style={styles.headerContent}>
          <View>
            <AppText variant="bodySM">
              {phase === 'waiting' ? ' بث الطلب للصيدليات' : 'اختر أفضل عرض'}
            </AppText>
            <AppText variant="bodySM">
              {phase === 'waiting' ? `${responses.length} صيدلية ردّت حتى الآن` : `${responses.length} عروض متاحة`}
            </AppText>
          </View>
          {phase === 'waiting' && (
            <View style={styles.timerBadge}>
              <AppText variant="bodySM">{formatTime(timeLeft)}</AppText>
              <AppText variant="bodySM">متبقي</AppText>
            </View>
          )}
        </View>
        {/* Progress bar */}
        {phase === 'waiting' && (
          <View style={styles.progressBg}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 80 }]} showsVerticalScrollIndicator={false}>
        {/* Status Indicator */}
        {phase === 'waiting' && (
          <View style={styles.broadcastCenter}>
            <Animated.View style={[styles.broadcastRing, { transform: [{ scale: pulseAnim }], borderColor: colors.secondary + '40' }]}/>
            <View style={[styles.broadcastRing2, { borderColor: colors.secondary + '20' }]} />
            <View style={[styles.broadcastCore, { backgroundColor: colors.secondarySurface } ]}>
              <Icon name="globe" size={20} color={colors.primary} />
            </View>
            <AppText variant="bodySM">نبحث عن أفضل الصيدليات القريبة...</AppText>
          </View>
        )}

        {/* Offers List */}
        <AppText variant="bodySM">
          {phase === 'waiting' ? 'الردود الواردة حتى الآن:' : 'اختر الأنسب لك:'}
        </AppText>

        {responses.map((ph) => (
          <View
            key={ph.id}
            style={[
              styles.offerCard,
              { backgroundColor: isDark ? colors.surface : colors.white },
              selectedPharmacy === ph.id && { borderColor: colors.secondary, borderWidth: 2 },]} >
            <View style={styles.offerHeader}>
              <View style={styles.offerLeft}>
                {ph.status === 'accepted' && (
                  <View style={[styles.badge, { backgroundColor: '#DCFCE7' } ]}>
                    <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6}}><Icon name="check_circle" size={16} color={colors.primary} /><AppText variant="bodySM">قبل طلبك</AppText></View>
                  </View>
                )}
                {ph.status === 'pending' && (
                  <View style={[styles.badge, { backgroundColor: '#FEF3C7' } ]}>
                    <AppText variant="bodySM">ينظر...</AppText>
                  </View>
                )}
                {ph.discount > 0 && (
                  <View style={[styles.discountBadge, { backgroundColor: colors.errorSurface } ]}>
                    <AppText variant="bodySM">خصم {ph.discount}%</AppText>
                  </View>
                )}
              </View>
              <View style={styles.offerRight}>
                <AppText variant="bodySM">{ph.logo}</AppText>
                <View>
                  <AppText variant="bodySM">{ph.name}</AppText>
                  <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6}}><Icon name="star" size={16} color={colors.primary} /><AppText variant="bodySM">{ph.rating} • {ph.distance} كم</AppText></View>
                </View>
              </View>
            </View>

            {ph.status === 'accepted' && (
              <>
                <View style={[styles.offerDetails, { borderTopColor: colors.border } ]}>
                  <View style={styles.offerDetail}>
                    <AppText variant="bodySM">{ph.totalPrice} ر</AppText>
                    <AppText variant="bodySM">الإجمالي</AppText>
                  </View>
                  <View style={styles.offerDetail}>
                    <AppText variant="bodySM">{ph.eta} دقيقة</AppText>
                    <AppText variant="bodySM">وقت التوصيل</AppText>
                  </View>
                  <View style={styles.offerDetail}>
                    <AppText variant="bodySM">
                      {ph.discount > 0 ? `وفّر ${Math.round(150 * ph.discount / 100)} ر` : 'لا يوجد'}
                    </AppText>
                    <AppText variant="bodySM">التوفير</AppText>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => handleAccept(ph.id)}
                  style={styles.acceptBtn}
                >
                  <View style={[styles.acceptBtnInner, { backgroundColor: '#16A34A' }]}>
                    <AppText variant="bodySM">قبول هذا العرض </AppText>
                  </View>
                </TouchableOpacity>
              </>
            )}
          </View>
        ))}

        {/* Skip broadcast and pick yourself */}
        {phase === 'waiting' && (
          <TouchableOpacity
            onPress={() => setPhase('offers')}
            style={[styles.skipBroadcast, { borderColor: colors.border } ]}>
            <AppText variant="bodySM">تخطي الانتظار واختر صيدلية بنفسك</AppText>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Bottom: Cancel */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 } ]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.cancelBtn, { borderColor: colors.border } ]}>
          <AppText variant="bodySM">إلغاء الطلب</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  confirmedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  confirmedTitle: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  confirmedSub: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '400', textAlign: 'center', paddingHorizontal: 32 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerContent: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800', textAlign: 'right' },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '400', textAlign: 'right' },
  timerBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14, padding: 10, alignItems: 'center' },
  timerText: { color: '#fff', fontSize: 22, fontFamily: 'Cairo-ExtraBold' },
  timerLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '400' },
  progressBg: { height: 5, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 3 },
  content: { padding: 16, gap: 12 },
  broadcastCenter: { alignItems: 'center', paddingVertical: 24, position: 'relative', height: 160 },
  broadcastRing: { position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 2 },
  broadcastRing2: { position: 'absolute', width: 100, height: 100, borderRadius: 50, borderWidth: 1.5 },
  broadcastCore: { width: 70, height: 70, borderRadius: 22, justifyContent: 'center', alignItems: 'center', position: 'absolute', top: 45 },
  broadcastLabel: { position: 'absolute', bottom: 0, fontSize: 12, fontWeight: '400' },
  listTitle: { fontSize: 15, fontWeight: '800', textAlign: 'right', marginBottom: 4 },
  offerCard: { borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  offerHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  offerRight: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  pharmLogo: { fontSize: 32 },
  pharmName: { fontSize: 15, fontWeight: '800', textAlign: 'right' },
  pharmRating: { fontSize: 12, fontWeight: '400' },
  offerLeft: { flexDirection: 'column', gap: 4, alignItems: 'flex-start' },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#16A34A' },
  discountBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  offerDetails: { flexDirection: 'row-reverse', borderTopWidth: 1, paddingVertical: 12, paddingHorizontal: 16 },
  offerDetail: { flex: 1, alignItems: 'center', gap: 4 },
  detailVal: { fontSize: 16, fontFamily: 'Cairo-ExtraBold' },
  detailLabel: { fontSize: 11, fontWeight: '400' },
  acceptBtn: { margin: 12, marginTop: 4, borderRadius: 14, overflow: 'hidden' },
  acceptBtnInner: { height: 46, justifyContent: 'center', alignItems: 'center' },
  acceptBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  skipBroadcast: { borderRadius: 14, borderWidth: 1, paddingVertical: 12, alignItems: 'center' },
  skipText: { fontSize: 13, fontWeight: '400' },
  bottomBar: { paddingHorizontal: 16, paddingTop: 8 },
  cancelBtn: { borderRadius: 14, borderWidth: 1.5, height: 48, justifyContent: 'center', alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '700' },
});
