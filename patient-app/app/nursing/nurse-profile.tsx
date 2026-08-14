// @ts-nocheck
import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Modal,
  TouchableWithoutFeedback,
  I18nManager
} from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { useApp } from '../../src/context/AppContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { apiFetch } from '../../src/utils/api';
import Svg, { Path, Circle, Rect, Line, Polyline } from 'react-native-svg';

const { width } = Dimensions.get('window');

const Icons = {
  Star: () => <Svg width="14" height="14" viewBox="0 0 24 24" fill="#FBBF24" stroke="#FBBF24" strokeWidth="2"><Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></Svg>,
  Degree: () => <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2"><Path d="M22 10v6M2 10l10-5 10 5-10 5z"/><Path d="M6 12v5c3 3 9 3 12 0v-5"/></Svg>,
  MapPin: () => <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#23B5CE" strokeWidth="2"><Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><Circle cx="12" cy="10" r="3"/></Svg>,
  Shield: () => <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></Svg>,
  ChevronDown: () => <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2"><Path d="M6 9l6 6 6-6"/></Svg>
};

export default function NursingMegaProfile() {
  const router = useRouter();
  const { colors, isDark } = useApp();
  const { nurseId, flow, serviceId } = useLocalSearchParams();
  
  // Data
  const [nurse, setNurse] = useState<any>(null);
  const [insuranceData, setInsuranceData] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [insuranceSent, setInsuranceSent] = useState(false);

  // Scheduling State
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  
  // Custom Frequency (Days count)
  const [daysCount, setDaysCount] = useState<number>(1);
  const [frequencyModal, setFrequencyModal] = useState(false);

  // Transport State
  const [transportMode, setTransportMode] = useState<'patient'|'nurse'>('nurse');
  const [gpsLocation, setGpsLocation] = useState('حي الملقا، الرياض');

  // Generator: 30 Days array
  const generateDays = () => {
    const days = [];
    const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    let d = new Date();
    for (let i = 0; i < 30; i++) {
      days.push({
        full: d.toISOString().split('T')[0],
        dateNum: d.getDate(),
        dayName: dayNames[d.getDay()]
      });
      d.setDate(d.getDate() + 1);
    }
    return days;
  };
  
  const datesArray = generateDays();
  const timesArray = ['08:00 ص', '08:30 ص', '09:00 ص', '09:30 ص', '10:00 ص', '10:30 ص', '11:00 ص', '11:30 ص', '12:00 م', '12:30 م', '01:00 م'];
  const customDaysArray = Array.from({length: 20}, (_, i) => i + 1);

  useEffect(() => {
    setSelectedDate(datesArray[0].full);
    setSelectedTime(timesArray[0]);

    const fetchData = async () => {
      try {
        const nurseData = await apiFetch(`/home-care/providers/${nurseId}`);
        setNurse(nurseData);

        if (flow === 'insurance') {
          const insData = await apiFetch('/home-care/insurance/verify', { method: 'POST', body: JSON.stringify({ user_id: 'user-1' }) });
          setInsuranceData(insData);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, [nurseId]);

  if (!nurse) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator size="large" color="#23B5CE" /></View>;

  // Financial Calculations
  const basePrice = nurse.price;
  const totalServiceFee = basePrice * daysCount; // Multiply by days
  const transportFee = transportMode === 'nurse' ? 50 : 0;
  // Apply a 10% discount if days > 7, 20% if days > 14
  let discount = 0;
  if (daysCount > 14) discount = totalServiceFee * 0.2;
  else if (daysCount > 7) discount = totalServiceFee * 0.1;
  
  const finalTotal = (totalServiceFee - discount) + transportFee;

  const handleSubmit = async () => {
    setProcessing(true);
    try {
      const payload = {
        provider_id: nurseId,
        service_type: serviceId,
        start_date: selectedDate,
        time_slot: selectedTime,
        days_count: daysCount,
        transport_mode: transportMode,
        payment_flow: flow,
        total_price: finalTotal
      };
      const res = await apiFetch('/home-care/bookings', { method: 'POST', body: JSON.stringify(payload) });
      
      if (flow === 'insurance') {
        setInsuranceSent(true);
      } else {
        router.replace({ pathname: '/nursing/live-tracking', params: { type: transportMode, bookingId: res?.booking_id || 'BKG-9921' } });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  if (insuranceSent) {
    return (
      <View style={styles.successView}>
        <View style={styles.successIconBox}><Svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#23B5CE" strokeWidth="2.5"><Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><Path d="M22 4L12 14.01l-3-3"/></Svg></View>
        <Text style={styles.successTitle}>الطلب قيد المراجعة</Text>
        <Text style={styles.successDesc}>تم استدعاء بيانات تأمينك وإرسال الطلب لشركة التأمين للحصول على الموافقة الطبية. سنعلمك فور صدور الموافقة.</Text>
        <TouchableOpacity style={styles.successBtn} onPress={() => router.push('/(tabs)')}>
          <Text style={styles.successBtnText}>العودة للرئيسية</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // \u0627\u0644\u062a\u0648\u0627\u0631\u064a\u062e \u0645\u0646\u0637\u0642\u064a\u0629 \u0648\u062a\u0633\u064a\u0631 \u0645\u0646 \u0627\u0644\u064a\u0633\u0627\u0631 \u0644\u0644\u064a\u0645\u064a\u0646 (\u0627\u0644\u064a\u0648\u0645 \u0623\u0648\u0644 \u0634\u064a\u0621 \u0638\u0627\u0647\u0631 \u0639\u0646\u062f offset=0)
  const scrollStyle = { flexDirection: 'row' } as any;

  return (
    <View style={styles.container}>
      <View style={StyleSheet.absoluteFillObject} />

      {/* HEADER */}
      <BlurView intensity={90} tint="light" style={styles.glassHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1E293B" strokeWidth="2.5"><Path d="M9 18l6-6-6-6" /></Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>حجز الخدمة</Text>
      </BlurView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* SECTION A: NURSE DETAILS */}
        <View style={styles.profileCard}>
          <View style={styles.avatarRow}>
             <View style={styles.avatarBox}>
               <Svg width="56" height="56" viewBox="0 0 24 24" fill="#FDECEB" stroke="#F0695C" strokeWidth="1"><Circle cx="12" cy="7" r="4"/><Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></Svg>
             </View>
             <View style={styles.profileInfo}>
               <Text style={styles.nurseName}>{nurse.name}</Text>
               <Text style={styles.facilityText}>{nurse.facility}</Text>
               <View style={styles.ratingRow}>
                 <Icons.Star />
                 <Text style={styles.ratingText}>{nurse.rating} ({nurse.reviews_count} تقييم)</Text>
               </View>
             </View>
          </View>
          <View style={styles.degreeRow}>
            <Icons.Degree />
            <Text style={styles.degreeText}>{nurse.degree}</Text>
          </View>
          <View style={styles.reviewBox}>
            <Text style={styles.reviewUser}>{nurse.reviews[0].user}:</Text>
            <Text style={styles.reviewText}>"{nurse.reviews[0].text}"</Text>
          </View>
        </View>

        {/* SECTION B: ADVANCED SCHEDULING (Fixed Layout) */}
        <Text style={styles.sectionTitle}>1. تحديد موعد الزيارة والتكرار</Text>
        <View style={styles.sectionCard}>
          
          <Text style={styles.label}>اليوم والتاريخ (30 يوماً)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={scrollStyle} style={styles.hScroll}>
            {datesArray.map(d => (
              <TouchableOpacity key={d.full} style={[styles.dateBox, selectedDate === d.full && styles.activeBox]} onPress={() => setSelectedDate(d.full)}>
                <Text style={[styles.dateDay, selectedDate === d.full && styles.activeText]} >{d.dayName}</Text>
                <Text style={[styles.dateNum, selectedDate === d.full && styles.activeText]} >{d.dateNum}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.label}>الوقت (يومياً)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={scrollStyle} style={styles.hScroll}>
            {timesArray.map(t => (
              <TouchableOpacity key={t} style={[styles.timeBox, selectedTime === t && styles.activeBox]} onPress={() => setSelectedTime(t)}>
                <Text style={[styles.timeText, selectedTime === t && styles.activeText]} >{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.label}>مدة وتكرار الزيارة</Text>
          <TouchableOpacity activeOpacity={0.8} style={styles.freqDropdown} onPress={() => setFrequencyModal(true)}>
            <View style={{flexDirection: 'row-reverse', alignItems: 'center'}}>
              <Icons.ChevronDown />
              <Text style={styles.freqDropdownText}>
                {daysCount === 1 ? 'زيارة واحدة فقط' : `كل يوم لمدة (${daysCount} أيام)`}
              </Text>
            </View>
            <Text style={styles.freqDropdownSub}>قابل للتعديل من 1 إلى 20 يوم</Text>
          </TouchableOpacity>
        </View>

        {/* SECTION C & D: LOCATION & TRANSPORT */}
        <Text style={styles.sectionTitle}>2. الموقع والمواصلات</Text>
        <View style={styles.sectionCard}>
          <View style={styles.gpsBox}>
            <View style={{flexDirection: 'row-reverse', alignItems: 'center'}}>
              <Icons.MapPin />
              <View style={{ marginRight: 12 }}>
                <Text style={styles.gpsLabel}>موقع تقديم الخدمة</Text>
                <Text style={styles.gpsValue}>{gpsLocation}</Text>
              </View>
            </View>
            <TouchableOpacity><Text style={styles.gpsChange}>تغيير</Text></TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <TouchableOpacity style={[styles.transportBtn, transportMode === 'nurse' && styles.transportActive]} onPress={() => setTransportMode('nurse')}>
            <View style={styles.transportRadio}>{transportMode === 'nurse' && <View style={styles.radioDot} />}</View>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.transportTitle}>الممرض سيوفر المواصلات (+50 ر.س)</Text>
              <Text style={styles.transportDesc}>الممرض سيصل إلى موقعك (حي الملقا)</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.transportBtn, transportMode === 'patient' && styles.transportActive]} onPress={() => setTransportMode('patient')}>
            <View style={styles.transportRadio}>{transportMode === 'patient' && <View style={styles.radioDot} />}</View>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.transportTitle}>أنا سأوفر المواصلات (0 ر.س)</Text>
              <Text style={styles.transportDesc}>سأرسل سيارة لإحضار الممرض من (مستشفى دله)</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* SECTION E: PAYMENT LOGIC */}
        <Text style={styles.sectionTitle}>3. ملخص الدفع ({flow === 'cash' ? 'نقدي' : 'تأمين'})</Text>
        <View style={styles.sectionCard}>
          {flow === 'insurance' ? (
            <View style={styles.insuranceBox}>
              <View style={styles.insuranceHeader}>
                <Icons.Shield />
                <Text style={styles.insuranceTitle}>تم جلب التأمين تلقائياً</Text>
              </View>
              <Text style={styles.insuranceText}>الشركة: {insuranceData?.provider}</Text>
              <Text style={styles.insuranceText}>البوليصة: {insuranceData?.policy}</Text>
              <Text style={styles.insuranceWarning}>* سيتم إرسال الطلب لشركة التأمين للحصول على الموافقة الطبية أولاً.</Text>
            </View>
          ) : (
            <View style={styles.billBox}>
              <View style={styles.billRow}><Text style={styles.billVal}>{basePrice} ر.س</Text><Text style={styles.billLabel}>سعر الزيارة الواحدة</Text></View>
              <View style={styles.billRow}><Text style={styles.billVal}>{daysCount} أيام</Text><Text style={styles.billLabel}>عدد الأيام</Text></View>
              {discount > 0 && <View style={styles.billRow}><Text style={[styles.billVal, {color: '#10B981'} ]}>- {discount} ر.س</Text><Text style={styles.billLabel}>خصم الباقة</Text></View>}
              <View style={styles.billRow}><Text style={styles.billVal}>{transportFee} ر.س</Text><Text style={styles.billLabel}>رسوم الطريق</Text></View>
              <View style={styles.divider} />
              <View style={styles.billRow}><Text style={styles.billTotal}>{finalTotal} ر.س</Text><Text style={styles.billTotalLabel}>الإجمالي المستحق</Text></View>
            </View>
          )}
        </View>

      </ScrollView>

      {/* PINNED ACTION BUTTON */}
      <BlurView intensity={90} tint="light" style={styles.glassFooter}>
        {/* Validation hint */}
        {!selectedTime && (
          <Text style={{ textAlign: 'center', fontFamily: 'Cairo-SemiBold', fontSize: 13, color: '#F59E0B', marginBottom: 8 }}>
            ▲ اختر موعداً ووقت الزيارة أولاً
          </Text>
        )}
        <TouchableOpacity
          activeOpacity={selectedTime ? 0.8 : 1}
          style={[styles.payBtnWrap, !selectedTime && { opacity: 0.45 }]}
          onPress={selectedTime ? handleSubmit : undefined}
          disabled={processing || !selectedTime}
        >
          <View style={styles.payBtnGradient}>
            {processing ? <ActivityIndicator color="#fff" /> : 
              <Text style={styles.payBtnText}>
                {flow === 'insurance' ? 'إرسال لطلب موافقة التأمين' : `دفع ${finalTotal} ر.س (Visa/Apple Pay)`}
              </Text>
            }
          </View>
        </TouchableOpacity>
      </BlurView>

      {/* FREQUENCY CUSTOM PICKER MODAL */}
      <Modal visible={frequencyModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={() => setFrequencyModal(false)}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>تحديد مدة الرعاية</Text>
              <Text style={styles.modalSubtitle}>اختر عدد الأيام المتتالية التي سيحضر فيها الممرض.</Text>
              
              <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                {customDaysArray.map(day => (
                  <TouchableOpacity 
                    key={day} 
                    style={[styles.customDayOption, daysCount === day && styles.customDayOptionActive]}
                    onPress={() => { setDaysCount(day); setFrequencyModal(false); }}
                  >
                    <Text style={[styles.customDayText, daysCount === day && styles.customDayTextActive]} >
                      {day === 1 ? 'زيارة واحدة فقط' : `${day} أيام متتالية`}
                    </Text>
                    {daysCount === day && <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#23B5CE" strokeWidth="3"><Path d="M20 6L9 17l-5-5"/></Svg>}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <TouchableOpacity style={styles.applyBtn} onPress={() => setFrequencyModal(false)}>
                <Text style={styles.applyBtnText}>إغلاق</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  glassHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, paddingTop: 60, paddingBottom: 20, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.7)' },
  backBtn: { position: 'absolute', right: 20, top: 60, padding: 8 },
  headerTitle: { fontFamily: 'Cairo-Bold', fontSize: 18, color: '#1E293B' },
  content: { paddingTop: 120, paddingBottom: 150 },
  
  profileCard: { backgroundColor: 'transparent', marginHorizontal: 20, marginBottom: 24, borderRadius: 24, padding: 20, shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 4, borderWidth: 1, borderColor: '#F1F5F9' },
  avatarRow: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 16 },
  avatarBox: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginLeft: 16, borderWidth: 2, borderColor: '#F1F5F9' },
  profileInfo: { flex: 1, alignItems: 'flex-end' },
  nurseName: { fontFamily: 'Cairo-Bold', fontSize: 19, color: '#1E293B', marginBottom: 4 },
  facilityText: { fontFamily: 'Cairo-Bold', fontSize: 14, color: '#475569', marginBottom: 6 },
  ratingRow: { flexDirection: 'row-reverse', alignItems: 'center' },
  ratingText: { fontFamily: 'Cairo-Bold', fontSize: 13, color: '#64748B', marginRight: 6 },
  degreeRow: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, marginBottom: 12 },
  degreeText: { fontFamily: 'Cairo-Medium', fontSize: 13, color: '#475569', marginRight: 8 },
  reviewBox: { backgroundColor: '#FEF3C7', padding: 12, borderRadius: 12 },
  reviewUser: { fontFamily: 'Cairo-Bold', fontSize: 12, color: '#D97706', marginBottom: 4, textAlign: 'right' },
  reviewText: { fontFamily: 'Cairo-Medium', fontSize: 13, color: '#92400E', textAlign: 'right', fontStyle: 'italic' },
  
  sectionTitle: { fontFamily: 'Cairo-Bold', fontSize: 16, color: '#0F172A', textAlign: 'right', marginHorizontal: 24, marginBottom: 12 },
  sectionCard: { backgroundColor: 'transparent', marginHorizontal: 20, marginBottom: 24, borderRadius: 24, padding: 20, shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' },
  
  label: { fontFamily: 'Cairo-Bold', fontSize: 14, color: '#475569', textAlign: 'right', marginBottom: 12, marginTop: 8 },
  hScroll: { marginBottom: 20 },
  dateBox: { width: 68, height: 76, borderRadius: 16, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1.5, borderColor: '#E2E8F0' },
  dateDay: { fontFamily: 'Cairo-Medium', fontSize: 13, color: '#64748B', marginBottom: 4 },
  dateNum: { fontFamily: 'Cairo-Bold', fontSize: 20, color: '#1E293B' },
  timeBox: { paddingHorizontal: 22, paddingVertical: 14, borderRadius: 100, backgroundColor: '#F8FAFC', marginRight: 12, borderWidth: 1.5, borderColor: '#E2E8F0' },
  timeText: { fontFamily: 'Cairo-Bold', fontSize: 15, color: '#1E293B' },
  
  activeBox: { backgroundColor: '#E8F8FA', borderColor: '#23B5CE' },
  activeText: { color: '#23B5CE' },

  freqDropdown: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 16, backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0' },
  freqDropdownText: { fontFamily: 'Cairo-Bold', fontSize: 15, color: '#1E293B', marginRight: 8 },
  freqDropdownSub: { fontFamily: 'Cairo-Medium', fontSize: 13, color: '#3b82f6' },

  gpsBox: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  gpsLabel: { fontFamily: 'Cairo-Medium', fontSize: 12, color: '#64748B', textAlign: 'right' },
  gpsValue: { fontFamily: 'Cairo-Bold', fontSize: 15, color: '#1E293B', textAlign: 'right' },
  gpsChange: { fontFamily: 'Cairo-Bold', fontSize: 14, color: '#3b82f6' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 16 },
  
  transportBtn: { flexDirection: 'row-reverse', alignItems: 'center', padding: 16, borderRadius: 16, backgroundColor: '#F8FAFC', marginBottom: 12, borderWidth: 1.5, borderColor: '#F1F5F9' },
  transportActive: { borderColor: '#23B5CE', backgroundColor: '#E8F8FA' },
  transportRadio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#CBD5E1', justifyContent: 'center', alignItems: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#23B5CE' },
  transportTitle: { fontFamily: 'Cairo-Bold', fontSize: 14, color: '#1E293B', textAlign: 'right', marginBottom: 2 },
  transportDesc: { fontFamily: 'Cairo-Medium', fontSize: 12, color: '#64748B', textAlign: 'right' },

  insuranceBox: { backgroundColor: '#EFF6FF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#BFDBFE' },
  insuranceHeader: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 12 },
  insuranceTitle: { fontFamily: 'Cairo-Bold', fontSize: 15, color: '#1E3A8A', marginRight: 8 },
  insuranceText: { fontFamily: 'Cairo-Bold', fontSize: 14, color: '#1E40AF', textAlign: 'right', marginBottom: 4 },
  insuranceWarning: { fontFamily: 'Cairo-Medium', fontSize: 12, color: '#60A5FA', textAlign: 'right', marginTop: 8 },

  billBox: { padding: 4 },
  billRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 12 },
  billLabel: { fontFamily: 'Cairo-Medium', fontSize: 15, color: '#64748B' },
  billVal: { fontFamily: 'Cairo-Bold', fontSize: 15, color: '#1E293B' },
  billTotalLabel: { fontFamily: 'Cairo-Bold', fontSize: 17, color: '#0F172A' },
  billTotal: { fontFamily: 'Cairo-Bold', fontSize: 24, color: '#23B5CE' },

  glassFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, paddingBottom: 40, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.7)' },
  payBtnWrap: { borderRadius: 100, overflow: 'hidden', shadowColor: '#1E293B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 6 },
  payBtnGradient: { paddingVertical: 20, alignItems: 'center' },
  payBtnText: { fontFamily: 'Cairo-Bold', fontSize: 16, color: '#fff' },

  modalBg: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
  modalHandle: { width: 40, height: 5, backgroundColor: '#E2E8F0', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontFamily: 'Cairo-Bold', fontSize: 20, color: '#0F172A', textAlign: 'right', marginBottom: 8 },
  modalSubtitle: { fontFamily: 'Cairo-Medium', fontSize: 14, color: '#64748B', textAlign: 'right', marginBottom: 20 },
  customDayOption: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  customDayOptionActive: { backgroundColor: '#F8FAFC' },
  customDayText: { fontFamily: 'Cairo-Bold', fontSize: 16, color: '#475569' },
  customDayTextActive: { color: '#23B5CE' },
  applyBtn: { backgroundColor: '#F1F5F9', paddingVertical: 16, borderRadius: 100, alignItems: 'center', marginTop: 16 },
  applyBtnText: { fontFamily: 'Cairo-Bold', fontSize: 16, color: '#475569' },

  successView: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, backgroundColor: '#F8FAFC' },
  successIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E8F8FA', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  successTitle: { fontFamily: 'Cairo-Bold', fontSize: 24, color: '#0F172A', marginBottom: 12 },
  successDesc: { fontFamily: 'Cairo-Medium', fontSize: 15, color: '#64748B', textAlign: 'center', marginBottom: 40, lineHeight: 26 },
  successBtn: { backgroundColor: '#23B5CE', paddingVertical: 18, paddingHorizontal: 40, borderRadius: 100 },
  successBtnText: { fontFamily: 'Cairo-Bold', fontSize: 16, color: '#fff' }
});
