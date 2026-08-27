// @ts-nocheck
import React, { useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, FlatList, TextInput, Image, ActivityIndicator, Platform, Alert, StatusBar, KeyboardAvoidingView, Modal, I18nManager, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../src/components/ui';
import { useApp } from '../../src/context/AppContext';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming, 
  withDelay, 
  withSequence,
  ZoomIn,
  FadeInDown
} from 'react-native-reanimated';

export default function BookingSuccess() {
  const router = useRouter();
  const { colors } = useApp();
  const { serviceType = 'clinic', bookingId, reference, total } = useLocalSearchParams();
  const bookingReference = typeof reference === 'string' && reference ? reference : (typeof bookingId === 'string' ? bookingId : '—');
  const bookingTotal = typeof total === 'string' && total ? total : null;

  const scale = useSharedValue(0);
  const checkOpacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSequence(
      withTiming(1.2, { duration: 400 }),
      withSpring(1, { damping: 12, stiffness: 100 })
    );
    checkOpacity.value = withDelay(300, withTiming(1, { duration: 400 }));
  }, []);

  const animatedCircle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedCheck = useAnimatedStyle(() => ({
    opacity: checkOpacity.value,
  }));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background } ]}><View style={{flex: 1, paddingVertical: 20}}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.content}>
        <Animated.View style={[styles.circle, { backgroundColor: '#4CAF50' }, animatedCircle]} >
          <Animated.View style={animatedCheck}>
            <Icon name="check-bold" size={60} color="#fff" />
          </Animated.View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(500)} style={{ alignItems: 'center', marginTop: 32 }}>
          <AppText style={{ fontSize: 28, fontWeight: '900', color: colors.textPrimary, marginBottom: 12, textAlign: 'center' }}>
            تم استلام طلب الحجز
          </AppText>
          <AppText style={{ fontSize: 16, color: colors.textSecondary, textAlign: 'center', lineHeight: 24, paddingHorizontal: 32 }}>
            {serviceType === 'home'
              ? 'ستظهر حالة الطلب وتفاصيل الزيارة المنزلية بعد مراجعة التوافر من المزود.'
              : 'ستظهر حالة تأكيد الموعد وتفاصيل المركز في سجل حجوزاتك بعد مراجعة المزود.'}
          </AppText>
        </Animated.View>

        <Animated.View entering={ZoomIn.duration(600).delay(800)} style={[styles.bookingDetails, { backgroundColor: colors.surface, borderColor: colors.border } ]}>
          <View style={styles.detailRow}>
            <AppText style={{ color: colors.textSecondary }}>رقم المرجع:</AppText>
            <AppText style={{ fontWeight: 'bold', color: colors.textPrimary }}>{bookingReference}</AppText>
          </View>
          {bookingTotal && (
            <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' }}>
              <AppText style={{ color: colors.textSecondary, marginBottom: 8, textAlign: 'left' }}>إجمالي الحجز:</AppText>
              <View style={{ flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center' }}>
                <Icon name="cash" size={18} color={colors.primary} />
                <AppText style={{ fontWeight: 'bold', color: colors.textPrimary, marginLeft: 8, flex: 1, textAlign: 'left' }}>
                  {bookingTotal} ر.س
                </AppText>
              </View>
            </View>
          )}
        </Animated.View>
      </View>

      <Animated.View entering={FadeInDown.duration(600).delay(1000)} style={styles.footer}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary, marginBottom: 16 }]} onPress={() => router.replace('/diagnostics/orders' as never)}>
          <Icon name="clipboard-text-outline" size={20} color="#fff" style={{ marginLeft: I18nManager.isRTL ? 0 : 8, marginRight: I18nManager.isRTL ? 8 : 0 }}/>
          <AppText style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>عرض حجوزاتي</AppText>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.secondaryBtn, { borderColor: colors.primary }]} onPress={() => router.push('/(tabs)')}>
          <AppText style={{ color: colors.primary, fontSize: 16, fontWeight: 'bold' }}>العودة للرئيسية</AppText>
        </TouchableOpacity>
      </Animated.View>
    </View></SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  circle: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', shadowColor: '#4CAF50', shadowOpacity: 0.4, shadowRadius: 20, elevation: 10 },
  bookingDetails: { marginTop: 40, padding: 16, borderRadius: 16, borderWidth: 1, width: '80%' },
  detailRow: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  footer: { padding: 32, paddingBottom: 48 },
  actionBtn: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  secondaryBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, borderWidth: 1 }
});
