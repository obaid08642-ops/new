// @ts-nocheck
import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, FlatList, TextInput, Image, ActivityIndicator, Platform, Alert, StatusBar, KeyboardAvoidingView, Modal, I18nManager, Dimensions, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../src/components/ui';
import { useApp } from '../../src/context/AppContext';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import Animated, { FadeInDown, SlideInUp } from 'react-native-reanimated';
import { apiFetch } from '../../src/utils/api';
import { useDiagnosticsCart } from '../../src/context/DiagnosticsCartContext';

const { width } = Dimensions.get('window');

// Generate 30 days of dates starting from today
const generateDates = () => {
  const dates = [];
  const today = new Date();
  const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push({
      id: i.toString(),
      dayName: i === 0 ? 'اليوم' : i === 1 ? 'غداً' : dayNames[d.getDay()],
      dayNumber: d.getDate(),
      monthNumber: d.getMonth() + 1,
      fullDate: d.toISOString().split('T')[0]
    });
  }
  return dates;
};

const TIME_SLOTS = [
  '٠٨:٠٠ ص', '٠٨:٣٠ ص', '٠٩:٠٠ ص', '٠٩:٣٠ ص', '١٠:٠٠ ص', '١٠:٣٠ ص',
  '٠٤:٠٠ م', '٠٤:٣٠ م', '٠٥:٠٠ م', '٠٥:٣٠ م', '٠٦:٠٠ م', '٠٦:٣٠ م'
];

export default function DiagnosticsCheckout() {
  const router = useRouter();
  const { colors } = useApp();
  const params = useLocalSearchParams();
  const serviceType = params.serviceType || params.visitType || 'clinic';
  const labName = params.labName || 'مختبرات البرج';
  const labId = params.labId || null;
  const totalParam = params.copay ? `${params.copay}` : (params.total || '٢٩٩');
  
  const { items, clearCart } = useDiagnosticsCart();
  
  const [dates] = useState(generateDates());
  const [selectedDate, setSelectedDate] = useState(dates[0].id);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  
  // Payment methods: Apple Pay, Visa, Mada, (Cash only if clinic)
  const [selectedPayment, setSelectedPayment] = useState<string>('visa');

  // Radiology Safety Questionnaire State
  const isRadiology = params.isRadiology === 'true';
  const radiologyType = params.radiologyType || '';
  const [isPregnant, setIsPregnant] = useState(false);
  const [hasMetal, setHasMetal] = useState(false);
  const [hasAllergy, setHasAllergy] = useState(false);

  // Safety Lock Logic
  const isCTorXRay = radiologyType.includes('مقطعية') || radiologyType.includes('CT') || radiologyType.includes('سينية') || radiologyType.includes('X-Ray');
  const isMRI = radiologyType.includes('رنين') || radiologyType.includes('MRI');
  const isLocked = (isRadiology && isPregnant && isCTorXRay) || (isRadiology && hasMetal && isMRI);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background } ]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.topHeader, { backgroundColor: colors.background, borderBottomColor: colors.border } ]}>
        <View style={{ width: 40 }}/>
        <AppText style={{ fontSize: 18, fontWeight: 'bold', color: colors.textPrimary }}>تأكيد الموعد والدفع</AppText>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Icon name={I18nManager.isRTL ? 'arrow-right' : 'arrow-left'} size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Summary Card */}
        <Animated.View entering={FadeInDown.duration(400)} style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border } ]}>
          <View style={[styles.summaryIconWrap, { backgroundColor: `${colors.primary}15` }]} >
            <Icon name={serviceType === 'home' ? 'home-heart' : 'hospital-building'} size={28} color={colors.primary} />
          </View>
          <View style={styles.summaryInfo}>
            <AppText style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'left' }}>
              {serviceType === 'home' ? 'سحب العينة من المنزل بواسطة مختص' : 'الزيارة في المركز'}
            </AppText>
            <AppText style={{ fontSize: 16, fontWeight: 'bold', color: colors.textPrimary, marginTop: 4, textAlign: 'left' }}>
              {labName}
            </AppText>
          </View>
          <View style={styles.summaryPrice}>
            <AppText style={{ fontSize: 18, fontWeight: '900', color: colors.primary }}>{totalParam}</AppText>
            <AppText style={{ fontSize: 10, color: colors.textSecondary }}>ر.س</AppText>
          </View>
        </Animated.View>

        {/* Safety Questionnaire (Only for Radiology) */}
        {isRadiology && (
          <Animated.View entering={FadeInDown.duration(400).delay(50)} style={styles.section}>
            <AppText variant="h3" color={colors.textPrimary} style={styles.sectionTitle}>🛡️ استبيان السلامة الإلزامي</AppText>
            <View style={[styles.paymentBox, { backgroundColor: colors.surface, borderColor: isLocked ? '#F44336' : colors.border, padding: 16 } ]}>
              
              <View style={styles.switchRow}>
                <AppText style={{ color: colors.textPrimary, flex: 1, textAlign: 'right' }}>هل يوجد حمل أو اشتباه حمل؟</AppText>
                <Switch value={isPregnant} onValueChange={setIsPregnant} trackColor={{ true: '#F44336' }} />
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: 12 }]} />
              
              <View style={styles.switchRow}>
                <AppText style={{ color: colors.textPrimary, flex: 1, textAlign: 'right' }}>هل لديك منظم ضربات قلب أو دعامات معدنية؟</AppText>
                <Switch value={hasMetal} onValueChange={setHasMetal} trackColor={{ true: '#F44336' }} />
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: 12 }]} />
              
              <View style={styles.switchRow}>
                <AppText style={{ color: colors.textPrimary, flex: 1, textAlign: 'right' }}>هل لديك حساسية من الصبغة الطبية؟</AppText>
                <Switch value={hasAllergy} onValueChange={setHasAllergy} trackColor={{ true: '#FF9800' }} />
              </View>

            </View>

            {isLocked && (
              <View style={[styles.insuranceNotice, { backgroundColor: '#F4433620', marginTop: 12 }]} >
                <Icon name="alert" size={20} color="#F44336" />
                <AppText style={{ flex: 1, marginLeft: 8, fontSize: 12, color: '#F44336', textAlign: 'left', fontWeight: 'bold' }}>
                  عذراً، لا يمكن إجراء هذا الفحص لحالتك حرصاً على سلامتك. يرجى مراجعة الطبيب.
                </AppText>
              </View>
            )}
          </Animated.View>
        )}

        {/* Calendar: 30 Days */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.section}>
          <AppText variant="h3" color={colors.textPrimary} style={styles.sectionTitle}>اختر يوم الموعد</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
            {dates.map((d) => {
              const isSelected = selectedDate === d.id;
              return (
                <TouchableOpacity 
                  key={d.id} 
                  onPress={() => setSelectedDate(d.id)}
                  style={[
                    styles.dateCard, 
                    { backgroundColor: isSelected ? colors.primary : colors.surface, borderColor: isSelected ? colors.primary : colors.border },
                    isSelected && { shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }]} >
                  <AppText style={{ fontSize: 12, color: isSelected ? 'rgba(255,255,255,0.8)' : colors.textSecondary }}>{d.dayName}</AppText>
                  <AppText style={{ fontSize: 20, fontWeight: 'bold', color: isSelected ? '#fff' : colors.textPrimary, marginVertical: 4 }}>{d.dayNumber}</AppText>
                  <AppText style={{ fontSize: 11, color: isSelected ? 'rgba(255,255,255,0.8)' : colors.textSecondary }}>{d.monthNumber}</AppText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* Time Slots */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.section}>
          <AppText variant="h3" color={colors.textPrimary} style={styles.sectionTitle}>اختر وقت الموعد</AppText>
          <View style={styles.timeGrid}>
            {TIME_SLOTS.map((time, idx) => {
              const isSelected = selectedTime === time;
              return (
                <TouchableOpacity 
                  key={idx}
                  onPress={() => setSelectedTime(time)}
                  style={[
                    styles.timeSlot, 
                    { backgroundColor: isSelected ? `${colors.primary}15` : colors.surface, borderColor: isSelected ? colors.primary : colors.border }]} >
                  <AppText style={{ fontSize: 14, fontWeight: isSelected ? 'bold' : 'normal', color: isSelected ? colors.primary : colors.textPrimary }}>{time}</AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* Payment Methods */}
        <Animated.View entering={FadeInDown.duration(400).delay(300)} style={styles.section}>
          <AppText variant="h3" color={colors.textPrimary} style={styles.sectionTitle}>طريقة الدفع</AppText>
          <View style={[styles.paymentBox, { backgroundColor: colors.surface, borderColor: colors.border } ]}>
            
            <TouchableOpacity style={styles.paymentOption} onPress={() => setSelectedPayment('apple')}>
              <Icon name="apple" size={28} color={colors.textPrimary} />
              <AppText style={styles.paymentText}>Apple Pay</AppText>
              <View style={[styles.radioBtn, { borderColor: selectedPayment === 'apple' ? colors.primary : colors.textSecondary } ]}>
                {selectedPayment === 'apple' && <View style={[styles.radioFill, { backgroundColor: colors.primary }]} />}
              </View>
            </TouchableOpacity>
            
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            
            <TouchableOpacity style={styles.paymentOption} onPress={() => setSelectedPayment('visa')}>
              <Icon name="credit-card" size={28} color="#1A1F71" />
              <AppText style={styles.paymentText}>البطاقة الائتمانية / مدى</AppText>
              <View style={[styles.radioBtn, { borderColor: selectedPayment === 'visa' ? colors.primary : colors.textSecondary } ]}>
                {selectedPayment === 'visa' && <View style={[styles.radioFill, { backgroundColor: colors.primary }]} />}
              </View>
            </TouchableOpacity>

            {/* Only show Cash if it's a clinic visit */}
            {serviceType === 'clinic' && (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <TouchableOpacity style={styles.paymentOption} onPress={() => setSelectedPayment('cash')}>
                  <Icon name="cash-multiple" size={28} color="#4CAF50" />
                  <AppText style={styles.paymentText}>الدفع عند الوصول للمركز</AppText>
                  <View style={[styles.radioBtn, { borderColor: selectedPayment === 'cash' ? colors.primary : colors.textSecondary } ]}>
                    {selectedPayment === 'cash' && <View style={[styles.radioFill, { backgroundColor: colors.primary }]} />}
                  </View>
                </TouchableOpacity>
              </>
            )}

          </View>

          {/* Insurance Information notice if applicable */}
          <View style={[styles.insuranceNotice, { backgroundColor: `${colors.secondary}10` }]} >
            <Icon name="shield-check" size={20} color={colors.secondary} />
            <AppText style={{ flex: 1, marginLeft: 8, fontSize: 12, color: colors.textPrimary, textAlign: 'left', lineHeight: 18 }}>
              في حال استخدام التأمين، سيتم رفع الطلب لشركة التأمين وسيظهر لك مبلغ التحمل النهائي في صفحة النتائج والدفع.
            </AppText>
          </View>
        </Animated.View>

        <View style={{ height: 100 }}/>
      </ScrollView>

      {/* Floating Bottom Confirm */}
      <Animated.View entering={SlideInUp.duration(400)} style={[styles.floatingBottom, { backgroundColor: colors.surface, borderTopColor: colors.border } ]}>
        <View style={styles.totalRow}>
          <AppText style={{ fontSize: 14, color: colors.textSecondary }}>الإجمالي</AppText>
          <AppText style={{ fontSize: 24, fontWeight: '900', color: colors.textPrimary }}>{totalParam} <AppText style={{ fontSize: 12, color: colors.textSecondary }}>ر.س</AppText></AppText>
        </View>
        <TouchableOpacity 
          style={[styles.confirmBtn, { backgroundColor: (selectedTime && !isLocked) ? colors.primary : colors.textSecondary }]} 
          disabled={!selectedTime || isLocked}
          onPress={async () => {
            try {
              const endpoint = isRadiology ? '/radiology/bookings' : '/labs/bookings';
              const payload = {
                items: items.map(i => ({ service_id: i.id })),
                location_type: serviceType,
                facility_id: labId,
                provider_account_id: labId,
                scheduled_at: new Date(dates.find(d => d.id === selectedDate)!.fullDate + 'T' + (selectedTime!.replace(' ص', '').replace(' م', '').replace(/٠/g, '0').replace(/١/g, '1').replace(/٢/g, '2').replace(/٣/g, '3').replace(/٤/g, '4').replace(/٥/g, '5').replace(/٦/g, '6').replace(/٧/g, '7').replace(/٨/g, '8').replace(/٩/g, '9')) + ':00Z'),
                payment_method: selectedPayment === 'cash' ? 'cash' : 'card',
                ...(isRadiology && {
                  safety_questionnaire: {
                    is_pregnant: isPregnant,
                    has_pacemaker: hasMetal,
                    has_contrast_allergy: hasAllergy
                  }
                })
              };
              await apiFetch(endpoint, {
                method: 'POST',
                body: JSON.stringify(payload)
              });
              await clearCart();
              router.push({ pathname: '/diagnostics/booking-success', params: { serviceType } } as any);
            } catch (e) {
              console.error(e);
              // Fallback
              router.push({ pathname: '/diagnostics/booking-success', params: { serviceType } } as any);
            }
          }}
        >
          <AppText style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>{selectedPayment === 'cash' ? 'تأكيد الحجز' : 'تأكيد ودفع'}</AppText>
        </TouchableOpacity>
      </Animated.View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  topHeader: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1 },
  headerBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },
  scrollContent: { padding: 20 },
  summaryCard: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 24 },
  summaryIconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginLeft: I18nManager.isRTL ? 0 : 16, marginRight: I18nManager.isRTL ? 16 : 0 },
  summaryInfo: { flex: 1, alignItems: I18nManager.isRTL ? 'flex-end' : 'flex-start' },
  summaryPrice: { alignItems: 'center', paddingLeft: I18nManager.isRTL ? 16 : 0, paddingRight: I18nManager.isRTL ? 0 : 16, borderLeftWidth: I18nManager.isRTL ? 1 : 0, borderRightWidth: I18nManager.isRTL ? 0 : 1, borderColor: 'rgba(0,0,0,0.05)' },
  section: { marginBottom: 32 },
  sectionTitle: { marginBottom: 16, textAlign: I18nManager.isRTL ? 'right' : 'left' },
  horizontalScroll: { gap: 12, paddingBottom: 10 },
  dateCard: { width: 70, height: 90, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  timeGrid: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', flexWrap: 'wrap', gap: 12 },
  timeSlot: { width: '31%', paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  paymentBox: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  paymentOption: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', padding: 16 },
  paymentText: { flex: 1, fontSize: 15, fontWeight: 'bold', marginHorizontal: 12, textAlign: I18nManager.isRTL ? 'right' : 'left' },
  radioBtn: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioFill: { width: 12, height: 12, borderRadius: 6 },
  divider: { height: 1, marginHorizontal: 16 },
  insuranceNotice: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', alignItems: 'center', padding: 16, borderRadius: 16, marginTop: 16 },
  switchRow: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  floatingBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 40, borderTopWidth: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  totalRow: { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  confirmBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16 }
});
