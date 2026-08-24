// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions, Modal, TouchableWithoutFeedback, I18nManager, Alert } from 'react-native';
import { useApp } from '../../src/context/AppContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { apiFetch } from '../../src/utils/api';
import { resolveEffectiveAddress, formatAddressLine } from '../../src/utils/selectedAddress';
import { useFocusEffect } from 'expo-router';
import Svg, { Path, Circle, Rect, Line, Polyline } from 'react-native-svg';
import { LocalizedText } from '../../src/components/LocalizedText';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';

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
  const [gpsLocation, setGpsLocation] = useState<string | null>(null);
  const [addressObj, setAddressObj] = useState<any>(null);

  // Real selected/saved address — refreshed whenever the screen regains focus
  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      resolveEffectiveAddress().then((a) => {
        if (!active) return;
        setAddressObj(a);
        setGpsLocation(a ? formatAddressLine(a) : null);
      });
      return () => { active = false; };
    }, [])
  );

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
          // Real coverage check (endpoint /home-care/insurance/verify does not exist)
          const insData = await apiFetch(`/insurance/coverage-check?provider_id=${nurseId}&service_type=home_nursing`).catch(() => null);
          setInsuranceData(insData);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, [nurseId]);

  if (!nurse) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator size="large" color="#23B5CE" /></View>;

  // Financial Calculations — real price only; backend recomputes total from the service record
  const basePrice = nurse.price;
  const totalServiceFee = basePrice * daysCount; // estimate shown to the patient

  const handleSubmit = async () => {
    if (!addressObj) {
      showLocalizedAlert('العنوان مطلوب', 'يرجى تحديد عنوان تقديم الخدمة أولاً');
      return;
    }
    setProcessing(true);
    try {
      // selectedDate = YYYY-MM-DD, selectedTime like "08:00 ص" — convert to a real ISO timestamp
      const timeMatch = (selectedTime || '').match(/(\d{1,2}):(\d{2})\s*(ص|م)?/);
      let hours = timeMatch ? parseInt(timeMatch[1], 10) : 9;
      const minutes = timeMatch ? parseInt(timeMatch[2], 10) : 0;
      if (timeMatch?.[3] === 'م' && hours < 12) hours += 12;
      if (timeMatch?.[3] === 'ص' && hours === 12) hours = 0;
      const scheduled = new Date(`${selectedDate}T00:00:00`);
      scheduled.setHours(hours, minutes, 0, 0);

      const payload = {
        provider_id: nurseId,
        service_id: serviceId || undefined,
        service_name_ar: nurse?.service_name_ar || undefined,
        scheduled_at: scheduled.toISOString(),
        address: formatAddressLine(addressObj),
        payment_method: flow === 'insurance' ? 'insurance' : 'card',
        sessions_count: daysCount,
      };
      const res = await apiFetch('/home-care/bookings', { method: 'POST', body: JSON.stringify(payload) });
      const bookingId = res?.id || res?.booking_id;

      if (flow === 'insurance') {
        setInsuranceSent(true);
      } else if (bookingId) {
        router.replace({ pathname: '/nursing/live-tracking', params: { type: transportMode, bookingId } });
      } else {
        showLocalizedAlert('تم إرسال الطلب', 'تم استلام طلبك وسيتواصل معك مقدم الخدمة قريباً', [
          { text: 'حسناً', onPress: () => router.back() },
        ]);
      }
    } catch (err: any) {
      showLocalizedAlert('تعذّر الحجز', err?.message || 'تعذّر إرسال طلب الحجز — حاول مرة أخرى');
    } finally {
      setProcessing(false);
    }
  };

  if (insuranceSent) {
    return (
      <View style={styles.successView}>
        <View style={styles.successIconBox}><Svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#23B5CE" strokeWidth="2.5"><Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><Path d="M22 4L12 14.01l-3-3"/></Svg></View>
        <LocalizedText style={styles.successTitle}>الطلب قيد المراجعة</LocalizedText>
        <LocalizedText style={styles.successDesc}>تم استدعاء بيانات تأمينك وإرسال الطلب لشركة التأمين للحصول على الموافقة الطبية. سنعلمك فور صدور الموافقة.</LocalizedText>
        <TouchableOpacity style={styles.successBtn} onPress={() => router.push('/(tabs)')}>
          <LocalizedText style={styles.successBtnText}>العودة للرئيسية</LocalizedText>
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
        <LocalizedText style={styles.headerTitle}>حجز الخدمة</LocalizedText>
      </BlurView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* SECTION A: NURSE DETAILS */}
        <View style={styles.profileCard}>
          <View style={styles.avatarRow}>
             <View style={styles.avatarBox}>
               <Svg width="56" height="56" viewBox="0 0 24 24" fill="#FDECEB" stroke="#F0695C" strokeWidth="1"><Circle cx="12" cy="7" r="4"/><Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></Svg>
             </View>
             <View style={styles.profileInfo}>
               <LocalizedText style={styles.nurseName}>{nurse.name}</LocalizedText>
               <LocalizedText style={styles.facilityText}>{nurse.facility}</LocalizedText>
               <View style={styles.ratingRow}>
                 <Icons.Star />
                 <LocalizedText style={styles.ratingText}>{nurse.rating} ({nurse.reviews_count} تقييم)</LocalizedText>
               </View>
             </View>
          </View>
          <View style={styles.degreeRow}>
            <Icons.Degree />
            <LocalizedText style={styles.degreeText}>{nurse.degree}</LocalizedText>
          </View>
          <View style={styles.reviewBox}>
            <LocalizedText style={styles.reviewUser}>{nurse.reviews[0].user}:</LocalizedText>
            <LocalizedText style={styles.reviewText}>"{nurse.reviews[0].text}"</LocalizedText>
          </View>
        </View>

        {/* SECTION B: ADVANCED SCHEDULING (Fixed Layout) */}
        <LocalizedText style={styles.sectionTitle}>1. تحديد موعد الزيارة والتكرار</LocalizedText>
        <View style={styles.sectionCard}>

          <LocalizedText style={styles.label}>اليوم والتاريخ (30 يوماً)</LocalizedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={scrollStyle} style={styles.hScroll}>
            {datesArray.map(d => (
              <TouchableOpacity key={d.full} style={[styles.dateBox, selectedDate === d.full && styles.activeBox]} onPress={() => setSelectedDate(d.full)}>
                <LocalizedText style={[styles.dateDay, selectedDate === d.full && styles.activeText]} >{d.dayName}</LocalizedText>
                <LocalizedText style={[styles.dateNum, selectedDate === d.full && styles.activeText]} >{d.dateNum}</LocalizedText>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <LocalizedText style={styles.label}>الوقت (يومياً)</LocalizedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={scrollStyle} style={styles.hScroll}>
            {timesArray.map(t => (
              <TouchableOpacity key={t} style={[styles.timeBox, selectedTime === t && styles.activeBox]} onPress={() => setSelectedTime(t)}>
                <LocalizedText style={[styles.timeText, selectedTime === t && styles.activeText]} >{t}</LocalizedText>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <LocalizedText style={styles.label}>مدة وتكرار الزيارة</LocalizedText>
          <TouchableOpacity activeOpacity={0.8} style={styles.freqDropdown} onPress={() => setFrequencyModal(true)}>
            <View style={{flexDirection: 'row-reverse', alignItems: 'center'}}>
              <Icons.ChevronDown />
              <LocalizedText style={styles.freqDropdownText}>
                {daysCount === 1 ? 'زيارة واحدة فقط' : `كل يوم لمدة (${daysCount} أيام)`}
              </LocalizedText>
            </View>
            <LocalizedText style={styles.freqDropdownSub}>قابل للتعديل من 1 إلى 20 يوم</LocalizedText>
          </TouchableOpacity>
        </View>

        {/* SECTION C & D: LOCATION & TRANSPORT */}
        <LocalizedText style={styles.sectionTitle}>2. الموقع والمواصلات</LocalizedText>
        <View style={styles.sectionCard}>
          <View style={styles.gpsBox}>
            <View style={{flexDirection: 'row-reverse', alignItems: 'center'}}>
              <Icons.MapPin />
              <View style={{ marginRight: 12 }}>
                <LocalizedText style={styles.gpsLabel}>موقع تقديم الخدمة</LocalizedText>
                <LocalizedText style={styles.gpsValue}>{gpsLocation || 'لم تحدد عنواناً بعد'}</LocalizedText>
              </View>
            </View>
            <TouchableOpacity onPress={() => router.push('/delivery/address-select')}>
              <LocalizedText style={styles.gpsChange}>{gpsLocation ? 'تغيير' : 'اختيار'}</LocalizedText>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <TouchableOpacity style={[styles.transportBtn, transportMode === 'nurse' && styles.transportActive]} onPress={() => setTransportMode('nurse')}>
            <View style={styles.transportRadio}>{transportMode === 'nurse' && <View style={styles.radioDot} />}</View>
            <View style={{ flex: 1, marginRight: 12 }}>
              <LocalizedText style={styles.transportTitle}>الممرض سيوفر المواصلات</LocalizedText>
              <LocalizedText style={styles.transportDesc}>الممرض سيصل إلى موقعك{gpsLocation ? ` (${gpsLocation})` : ''}</LocalizedText>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.transportBtn, transportMode === 'patient' && styles.transportActive]} onPress={() => setTransportMode('patient')}>
            <View style={styles.transportRadio}>{transportMode === 'patient' && <View style={styles.radioDot} />}</View>
            <View style={{ flex: 1, marginRight: 12 }}>
              <LocalizedText style={styles.transportTitle}>أنا سأوفر المواصلات (0 ر.س)</LocalizedText>
              <LocalizedText style={styles.transportDesc}>سأرسل سيارة لإحضار الممرض من منشأته</LocalizedText>
            </View>
          </TouchableOpacity>
        </View>

        {/* SECTION E: PAYMENT LOGIC */}
        <LocalizedText style={styles.sectionTitle}>3. ملخص الدفع ({flow === 'cash' ? 'نقدي' : 'تأمين'})</LocalizedText>
        <View style={styles.sectionCard}>
          {flow === 'insurance' ? (
            <View style={styles.insuranceBox}>
              <View style={styles.insuranceHeader}>
                <Icons.Shield />
                <LocalizedText style={styles.insuranceTitle}>تم جلب التأمين تلقائياً</LocalizedText>
              </View>
              <LocalizedText style={styles.insuranceText}>الشركة: {insuranceData?.provider}</LocalizedText>
              <LocalizedText style={styles.insuranceText}>البوليصة: {insuranceData?.policy}</LocalizedText>
              <LocalizedText style={styles.insuranceWarning}>* سيتم إرسال الطلب لشركة التأمين للحصول على الموافقة الطبية أولاً.</LocalizedText>
            </View>
          ) : (
            <View style={styles.billBox}>
              <View style={styles.billRow}><LocalizedText style={styles.billVal}>{basePrice} ر.س</LocalizedText><LocalizedText style={styles.billLabel}>سعر الزيارة الواحدة</LocalizedText></View>
              <View style={styles.billRow}><LocalizedText style={styles.billVal}>{daysCount} أيام</LocalizedText><LocalizedText style={styles.billLabel}>عدد الأيام</LocalizedText></View>
              <View style={styles.divider} />
              <View style={styles.billRow}><LocalizedText style={styles.billTotal}>{totalServiceFee} ر.س</LocalizedText><LocalizedText style={styles.billTotalLabel}>الإجمالي التقديري</LocalizedText></View>
              <LocalizedText style={styles.insuranceWarning}>* السعر النهائي يُحتسب ويؤكد من مقدم الخدمة قبل الدفع.</LocalizedText>
            </View>
          )}
        </View>

      </ScrollView>

      {/* PINNED ACTION BUTTON */}
      <BlurView intensity={90} tint="light" style={styles.glassFooter}>
        {/* Validation hint */}
        {!selectedTime && (
          <LocalizedText style={{ textAlign: 'center', fontFamily: 'Cairo-SemiBold', fontSize: 13, color: '#F59E0B', marginBottom: 8 }}>
            ▲ اختر موعداً ووقت الزيارة أولاً
          </LocalizedText>
        )}
        <TouchableOpacity
          activeOpacity={selectedTime ? 0.8 : 1}
          style={[styles.payBtnWrap, !selectedTime && { opacity: 0.45 }]}
          onPress={selectedTime ? handleSubmit : undefined}
          disabled={processing || !selectedTime}
        >
          <View style={styles.payBtnGradient}>
            {processing ? <ActivityIndicator color="#fff" /> :
              <LocalizedText style={styles.payBtnText}>
                {flow === 'insurance' ? 'إرسال لطلب موافقة التأمين' : `تأكيد الحجز — ${totalServiceFee} ر.س تقديرياً`}
              </LocalizedText>
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
              <LocalizedText style={styles.modalTitle}>تحديد مدة الرعاية</LocalizedText>
              <LocalizedText style={styles.modalSubtitle}>اختر عدد الأيام المتتالية التي سيحضر فيها الممرض.</LocalizedText>

              <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                {customDaysArray.map(day => (
                  <TouchableOpacity
                    key={day}
                    style={[styles.customDayOption, daysCount === day && styles.customDayOptionActive]}
                    onPress={() => { setDaysCount(day); setFrequencyModal(false); }}
                  >
                    <LocalizedText style={[styles.customDayText, daysCount === day && styles.customDayTextActive]} >
                      {day === 1 ? 'زيارة واحدة فقط' : `${day} أيام متتالية`}
                    </LocalizedText>
                    {daysCount === day && <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#23B5CE" strokeWidth="3"><Path d="M20 6L9 17l-5-5"/></Svg>}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity style={styles.applyBtn} onPress={() => setFrequencyModal(false)}>
                <LocalizedText style={styles.applyBtnText}>إغلاق</LocalizedText>
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
