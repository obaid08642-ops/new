// @ts-nocheck
// app/maternity/maternity-setup.tsx
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card } from '../../src/components/ui';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '../../src/utils/api';
import { dateLocale } from '@/utils/dates';

const { width } = Dimensions.get('window');

const ar = (num: number | string) => {
  const arabicNums = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num).replace(/[0-9]/g, w => arabicNums[+w]);
};

// Mini Calendar Component
interface MiniCalendarProps {
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  maxDate?: Date;
  minDate?: Date;
}
const MiniCalendar = ({ selectedDate, onSelectDate, maxDate, minDate }: MiniCalendarProps) => {
  const { colors, isDark } = useApp();
  const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date());

  const daysOfWeek = ['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج'];
  const monthNames = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const numDays = new Date(year, month + 1, 0).getDate();
  const startDay = new Date(year, month, 1).getDay();

  const daysGrid = [];
  for (let i = 0; i < startDay; i++) daysGrid.push(null);
  for (let i = 1; i <= numDays; i++) daysGrid.push(i);

  return (
    <View style={[styles.calContainer, { backgroundColor: isDark ? colors.backgroundSecondary : '#F8FAFC', borderColor: colors.border } ]}>
      <View style={styles.calHeader}>
        <TouchableOpacity onPress={() => setCurrentMonth(new Date(year, month - 1, 1))} style={styles.calArrow}>
          <Icon name="chevron_right" size={18} color={colors.primary} />
        </TouchableOpacity>
        <AppText variant="labelLG" style={{ fontWeight: '800' }}>
          {monthNames[month]} {ar(year)}
        </AppText>
        <TouchableOpacity onPress={() => setCurrentMonth(new Date(year, month + 1, 1))} style={styles.calArrow}>
          <Icon name="chevron_left" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.calDaysRow}>
        {daysOfWeek.map((d, i) => (
          <AppText key={i} variant="caption" color={colors.textTertiary} style={styles.calDayName}>{d}</AppText>
        ))}
      </View>

      <View style={styles.calGrid}>
        {daysGrid.map((day, idx) => {
          if (day === null) return <View key={idx} style={styles.calDayBox} />;
          const dayDate = new Date(year, month, day);
          const isSelected = selectedDate && selectedDate.getDate() === day && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;
          const isDisabled = (maxDate && dayDate > maxDate) || (minDate && dayDate < minDate);

          return (
            <TouchableOpacity
              key={idx}
              disabled={isDisabled}
              onPress={() => onSelectDate(dayDate)}
              style={[
                styles.calDayBox,
                isSelected && { backgroundColor: colors.primary },
                isDisabled && { opacity: 0.25 }]} >
              <AppText 
                variant="bodyXS" 
                color={isSelected ? '#FFF' : isDisabled ? colors.textDisabled : colors.textPrimary}
                style={{ fontFamily: isSelected ? 'Cairo-Bold' : 'Cairo-Regular' }}>
                {ar(day)}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default function MaternitySetupScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  const [step, setStep] = useState(0);
  const [track, setTrack] = useState<'pregnant' | 'planning' | null>(null);
  
  // Pregnant Track State
  const [calcMethod, setCalcMethod] = useState<'lmp' | 'due_date' | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);

  // Planning Track State / LMP
  const [lastPeriod, setLastPeriod] = useState<Date | null>(null);
  const [cycleLen, setCycleLen] = useState(28);

  const [saving, setSaving] = useState(false);

  const handleNext = () => {
    if (step === 0 && !track) {
      alert('الرجاء اختيار المسار الخاص بكِ');
      return;
    }
    if (step === 1 && track === 'pregnant') {
      if (!calcMethod) {
        alert('الرجاء اختيار طريقة حساب موعد الولادة');
        return;
      }
      setStep(2);
      return;
    }
    if (step === 1 && track === 'planning') {
      if (!lastPeriod) {
        alert('الرجاء تحديد تاريخ آخر دورة شهرية');
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2 && track === 'pregnant') {
      if (calcMethod === 'lmp' && !lastPeriod) {
        alert('الرجاء تحديد تاريخ آخر دورة شهرية');
        return;
      }
      if (calcMethod === 'due_date' && !dueDate) {
        alert('الرجاء تحديد موعد الولادة المتوقع');
        return;
      }
      handleSave();
      return;
    }
    if (step === 2 && track === 'planning') {
      handleSave();
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      let finalDueDate = dueDate;
      if (track === 'pregnant' && calcMethod === 'lmp' && lastPeriod) {
        // Calculate due date (LMP + 280 days)
        finalDueDate = new Date(lastPeriod.getTime() + 280 * 24 * 60 * 60 * 1000);
      }

      const payload = {
        is_pregnant: track === 'pregnant',
        due_date: track === 'pregnant' ? finalDueDate?.toISOString() : 'transparent',
        last_period_date: lastPeriod?.toISOString(), // used by both if available
        cycle_length: track === 'planning' ? cycleLen : 'transparent',
        is_regular: track === 'planning' ? true : 'transparent',
      };

      const res = await apiFetch('/maternity/profile', {
        method: 'POST',
        body: JSON.stringify({ track }),
      });

      if (res) {
        await AsyncStorage.setItem('nabd_maternity_profile', JSON.stringify(res));
      } else {
        // In case API returns undefined but no throw
        await AsyncStorage.setItem('nabd_maternity_profile', JSON.stringify({ track }));
      }
      
      await AsyncStorage.setItem('maternity_setup_complete', 'true');
      router.replace('/maternity/hub');
    } catch (err) {
      console.error('Setup save error:', err);
      // Fallback: save payload locally and redirect anyway so user isn't stuck
      await AsyncStorage.setItem('nabd_maternity_profile', JSON.stringify({ track }));
      await AsyncStorage.setItem('maternity_setup_complete', 'true');
      router.replace('/maternity/hub');
    } finally {
      setSaving(false);
    }
  };

  const stepsCount = track === 'planning' ? 3 : (track === 'pregnant' ? 3 : 2);
  const progressPct = ((step + 1) / stepsCount) * 100;
  const cardBg = isDark ? colors.surface : colors.white;

  return (
    <View style={[styles.container, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle="light-content" />
      
      <View style={[styles.header, { paddingTop: insets.top + 8 } ]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.hBtn}>
            <Icon name="close" size={22} color="#fff" />
          </TouchableOpacity>
          <AppText variant="h5" color="#fff" style={{ fontFamily: 'Cairo-Bold' }}>إعدادات الأمومة</AppText>
          <View style={{ width: 36 }}/>
        </View>
      </View>

      <View style={styles.quizWrapper}>
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
          </View>
          <AppText variant="caption" color={colors.textTertiary}>الخطوة {ar(step + 1)} من {ar(stepsCount)}</AppText>
        </View>

        <ScrollView contentContainerStyle={styles.quizScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.questionContainer}>
            <View style={[styles.qGlow, { backgroundColor: '#FCE8F1' } ]}>
              <Icon 
                name={
                  step === 0 ? 'waving_hand' :
                  track === 'pregnant' ? 'child_care' :
                  step === 1 ? 'calendar_today' : 'schedule'
                } 
                size={36} 
                color="#EC4899" 
              />
            </View>
            <AppText variant="h2" style={styles.qText}>
              {step === 0 && 'أهلاً بكِ في مساحة الأمومة! ما هي مرحلتك الحالية؟'}
              {step === 1 && track === 'pregnant' && 'كيف تفضلين حساب موعد ولادتك؟'}
              {step === 2 && track === 'pregnant' && calcMethod === 'due_date' && 'متى هو موعد ولادتك المتوقع؟'}
              {step === 2 && track === 'pregnant' && calcMethod === 'lmp' && 'متى كان أول يوم في آخر دورة شهرية (LMP)؟'}
              {step === 1 && track === 'planning' && 'متى كان أول يوم في آخر دورة شهرية؟'}
              {step === 2 && track === 'planning' && 'كم متوسط طول دورتكِ الشهرية؟'}
            </AppText>
          </View>

          {/* Step 0: Track Selection */}
          {step === 0 && (
            <View style={styles.choiceContainer}>
              <TouchableOpacity 
                onPress={() => setTrack('pregnant')}
                style={[
                  styles.choiceBtn,
                  { backgroundColor: cardBg, borderColor: track === 'pregnant' ? '#EC4899' : colors.border },
                  track === 'pregnant' && { backgroundColor: isDark ? '#4D0E2B' : '#FDF2F8' }]} >
                <View style={[styles.radio, { borderColor: track === 'pregnant' ? '#EC4899' : colors.border } ]}>
                  {track === 'pregnant' && <View style={[styles.radioInner, { backgroundColor: '#EC4899' }]} />}
                </View>
                <AppText variant="labelLG" style={{ fontWeight: '800' }}>أنا حامل حالياً</AppText>
                <Icon name="pregnant_woman" size={24} color={track === 'pregnant' ? '#EC4899' : colors.textTertiary} style={{ position: 'absolute', left: 16 }}/>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => setTrack('planning')}
                style={[
                  styles.choiceBtn,
                  { backgroundColor: cardBg, borderColor: track === 'planning' ? '#EC4899' : colors.border },
                  track === 'planning' && { backgroundColor: isDark ? '#4D0E2B' : '#FDF2F8' }]} >
                <View style={[styles.radio, { borderColor: track === 'planning' ? '#EC4899' : colors.border } ]}>
                  {track === 'planning' && <View style={[styles.radioInner, { backgroundColor: '#EC4899' }]} />}
                </View>
                <AppText variant="labelLG" style={{ fontWeight: '800' }}>أخطط للحمل</AppText>
                <Icon name="favorite" size={24} color={track === 'planning' ? '#EC4899' : colors.textTertiary} style={{ position: 'absolute', left: 16 }}/>
              </TouchableOpacity>
            </View>
          )}

          {/* Step 1: Pregnant -> Calc Method */}
          {step === 1 && track === 'pregnant' && (
            <View style={styles.choiceContainer}>
              <TouchableOpacity 
                onPress={() => setCalcMethod('lmp')}
                style={[
                  styles.choiceBtn,
                  { backgroundColor: cardBg, borderColor: calcMethod === 'lmp' ? '#EC4899' : colors.border },
                  calcMethod === 'lmp' && { backgroundColor: isDark ? '#4D0E2B' : '#FDF2F8' }]} >
                <View style={[styles.radio, { borderColor: calcMethod === 'lmp' ? '#EC4899' : colors.border } ]}>
                  {calcMethod === 'lmp' && <View style={[styles.radioInner, { backgroundColor: '#EC4899' }]} />}
                </View>
                <AppText variant="labelLG" style={{ fontWeight: '800' }}>عن طريق آخر دورة شهرية (LMP)</AppText>
                <Icon name="event_available" size={24} color={calcMethod === 'lmp' ? '#EC4899' : colors.textTertiary} style={{ position: 'absolute', left: 16 }}/>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => setCalcMethod('due_date')}
                style={[
                  styles.choiceBtn,
                  { backgroundColor: cardBg, borderColor: calcMethod === 'due_date' ? '#EC4899' : colors.border },
                  calcMethod === 'due_date' && { backgroundColor: isDark ? '#4D0E2B' : '#FDF2F8' }]} >
                <View style={[styles.radio, { borderColor: calcMethod === 'due_date' ? '#EC4899' : colors.border } ]}>
                  {calcMethod === 'due_date' && <View style={[styles.radioInner, { backgroundColor: '#EC4899' }]} />}
                </View>
                <AppText variant="labelLG" style={{ fontWeight: '800' }}>أعرف موعد ولادتي من الطبيب</AppText>
                <Icon name="medical_services" size={24} color={calcMethod === 'due_date' ? '#EC4899' : colors.textTertiary} style={{ position: 'absolute', left: 16 }}/>
              </TouchableOpacity>
            </View>
          )}

          {/* Step 2: Pregnant -> Due Date Input */}
          {step === 2 && track === 'pregnant' && calcMethod === 'due_date' && (
            <View style={styles.inputContainer}>
              <MiniCalendar 
                selectedDate={dueDate} 
                onSelectDate={setDueDate} 
                minDate={new Date()} // due date must be in the future
              />
              {dueDate && (
                <View style={styles.selectedIndicator}>
                  <Icon name="check_circle" size={18} color="#5BA84F" />
                  <AppText variant="bodySM" color="#5BA84F" style={{ fontWeight: '800' }}>
                    تم اختيار: {dueDate.toLocaleDateString(dateLocale(), { day: 'numeric', month: 'long', year: 'numeric' })}
                  </AppText>
                </View>
              )}
            </View>
          )}

          {/* Step 2: Pregnant -> LMP Input */}
          {step === 2 && track === 'pregnant' && calcMethod === 'lmp' && (
            <View style={styles.inputContainer}>
              <MiniCalendar 
                selectedDate={lastPeriod} 
                onSelectDate={setLastPeriod} 
                maxDate={new Date()} // past date only
              />
              {lastPeriod && (
                <View style={styles.selectedIndicator}>
                  <Icon name="check_circle" size={18} color="#5BA84F" />
                  <AppText variant="bodySM" color="#5BA84F" style={{ fontWeight: '800' }}>
                    تم اختيار: {lastPeriod.toLocaleDateString(dateLocale(), { day: 'numeric', month: 'long', year: 'numeric' })}
                  </AppText>
                </View>
              )}
              <AppText variant="caption" color={colors.textTertiary} style={{ textAlign: 'center', marginTop: 10 }}>
                سيقوم التطبيق بحساب موعد الولادة المتوقع والأسبوع الحالي لكِ بناءً على هذا التاريخ بدقة طبيّة.
              </AppText>
            </View>
          )}

          {/* Step 1: Planning -> Last Period */}
          {step === 1 && track === 'planning' && (
            <View style={styles.inputContainer}>
              <MiniCalendar 
                selectedDate={lastPeriod} 
                onSelectDate={setLastPeriod} 
                maxDate={new Date()} // past date only
              />
              {lastPeriod && (
                <View style={styles.selectedIndicator}>
                  <Icon name="check_circle" size={18} color="#5BA84F" />
                  <AppText variant="bodySM" color="#5BA84F" style={{ fontWeight: '800' }}>
                    تم اختيار: {lastPeriod.toLocaleDateString(dateLocale(), { day: 'numeric', month: 'long', year: 'numeric' })}
                  </AppText>
                </View>
              )}
            </View>
          )}

          {/* Step 2: Planning -> Cycle Length */}
          {step === 2 && track === 'planning' && (
            <View style={styles.cycleInputBox}>
              <Card style={[styles.cycleCard, { backgroundColor: cardBg } ]}>
                <AppText variant="caption" color={colors.textTertiary}>طول الدورة الشهرية</AppText>
                <View style={styles.counterRow}>
                  <TouchableOpacity onPress={() => setCycleLen(Math.max(21, cycleLen - 1))} style={styles.cntBtn}>
                    <Icon name="remove_circle_outline" size={32} color="#EC4899" />
                  </TouchableOpacity>
                  <View style={styles.cntValBox}>
                    <AppText variant="displayMD" style={{ fontFamily: 'Cairo-ExtraBold' }}>{ar(cycleLen)}</AppText>
                    <AppText variant="bodySM" color={colors.textSecondary}>يوم</AppText>
                  </View>
                  <TouchableOpacity onPress={() => setCycleLen(Math.min(45, cycleLen + 1))} style={styles.cntBtn}>
                    <Icon name="add_circle_outline" size={32} color="#EC4899" />
                  </TouchableOpacity>
                </View>
                <AppText variant="caption" color={colors.textTertiary} style={{ textAlign: 'center', marginTop: 10 }}>
                  المتوسط الطبيعي للرعاية هو ٢١ إلى ٣٥ يوماً
                </AppText>
              </Card>
            </View>
          )}
        </ScrollView>

        <View style={[styles.bottomActions, { borderTopColor: colors.border, backgroundColor: isDark ? colors.background : colors.white } ]}>
          {step > 0 && (
            <TouchableOpacity onPress={handleBack} style={[styles.backBtn, { borderColor: colors.border } ]}>
              <AppText variant="labelLG" color={colors.textPrimary}>السابق</AppText>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleNext} disabled={saving} style={[styles.nextBtn, saving && { opacity: 0.7 } ]}>
            <AppText variant="labelLG" color="#FFF" style={{ fontWeight: '800' }}>
              {saving ? 'جاري الحفظ...' : (step === stepsCount - 1 ? 'ابدئي التجربة' : 'التالي')}
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  hBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  
  quizWrapper: { flex: 1, justifyContent: 'space-between' },
  progressContainer: { padding: 16, gap: 8, alignItems: 'flex-end', marginTop: 10 },
  progressBarBg: { width: '100%', height: 6, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3, backgroundColor: '#EC4899' },
  
  quizScroll: { paddingHorizontal: 16, paddingBottom: 120 },
  questionContainer: { alignItems: 'center', marginVertical: 20 },
  qGlow: { width: 72, height: 72, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 16, shadowColor: '#EC4899', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4 },
  qText: { textAlign: 'center', fontWeight: '800', lineHeight: 32, paddingHorizontal: 20 },

  choiceContainer: { width: '100%', gap: 12 },
  choiceBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 14, padding: 22, borderRadius: 16, borderWidth: 1.5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5 },

  inputContainer: { width: '100%', gap: 12 },
  selectedIndicator: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, justifyContent: 'center', marginTop: 8 },
  
  cycleInputBox: { width: '100%', alignItems: 'center' },
  cycleCard: { width: '100%', padding: 24, alignItems: 'center', borderRadius: 20 },
  counterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginVertical: 14 },
  cntBtn: { padding: 4 },
  cntValBox: { alignItems: 'center', minWidth: 80 },

  bottomActions: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row-reverse', padding: 16, gap: 12, borderTopWidth: 1 },
  backBtn: { flex: 1, padding: 16, borderRadius: 16, borderWidth: 1.5, alignItems: 'center' },
  nextBtn: { flex: 2, padding: 16, borderRadius: 16, backgroundColor: '#EC4899', alignItems: 'center' },

  calContainer: { borderRadius: 16, padding: 14, borderWidth: 1.5 },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  calArrow: { padding: 6 },
  calDaysRow: { flexDirection: 'row-reverse', justifyContent: 'space-around', marginBottom: 6 },
  calDayName: { width: 30, textAlign: 'center', fontWeight: '800' },
  calGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'space-around', rowGap: 6 },
  calDayBox: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
});
