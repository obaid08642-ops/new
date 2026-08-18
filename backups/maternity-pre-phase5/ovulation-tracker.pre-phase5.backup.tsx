// @ts-nocheck
// app/maternity/ovulation-tracker.tsx
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
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

// Arabic helper for numbers
const ar = (num: number | string) => {
  const arabicNums = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num).replace(/[0-9]/g, w => arabicNums[+w]);
};

// Custom Mini Calendar Picker Component
interface MiniCalendarProps {
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  maxDate?: Date;
}
const MiniCalendar = ({ selectedDate, onSelectDate, maxDate = new Date() }: MiniCalendarProps) => {
  const { colors, isDark } = useApp();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const daysOfWeek = ['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج'];
  const monthNames = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // Get number of days in month
  const numDays = new Date(year, month + 1, 0).getDate();
  // Get start day of month (0 = Sunday, 1 = Monday, etc.)
  const startDay = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const handleDaySelect = (dayNum: number) => {
    const d = new Date(year, month, dayNum);
    if (d <= maxDate) {
      onSelectDate(d);
    }
  };

  const daysGrid = [];
  // Empty spaces for start day
  for (let i = 0; i < startDay; i++) {
    daysGrid.push(null);
  }
  // Days of month
  for (let i = 1; i <= numDays; i++) {
    daysGrid.push(i);
  }

  return (
    <View style={[styles.calContainer, { backgroundColor: isDark ? colors.backgroundSecondary : '#F8FAFC', borderColor: colors.border } ]}>
      <View style={styles.calHeader}>
        <TouchableOpacity onPress={handlePrevMonth} style={styles.calArrow}>
          <Icon name="chevron_right" size={18} color={colors.primary} />
        </TouchableOpacity>
        <AppText variant="labelLG" style={{ fontWeight: '800' }}>
          {monthNames[month]} {ar(year)}
        </AppText>
        <TouchableOpacity onPress={handleNextMonth} style={styles.calArrow}>
          <Icon name="chevron_left" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.calDaysRow}>
        {daysOfWeek.map((d, i) => (
          <AppText key={i} variant="caption" color={colors.textTertiary} style={styles.calDayName}>
            {d}
          </AppText>
        ))}
      </View>

      <View style={styles.calGrid}>
        {daysGrid.map((day, idx) => {
          if (day === null) {
            return <View key={idx} style={styles.calDayBox} />;
          }

          const dayDate = new Date(year, month, day);
          const isSelected = selectedDate && 
            selectedDate.getDate() === day && 
            selectedDate.getMonth() === month && 
            selectedDate.getFullYear() === year;

          const isFuture = dayDate > maxDate;

          return (
            <TouchableOpacity
              key={idx}
              disabled={isFuture}
              onPress={() => handleDaySelect(day)}
              style={[
                styles.calDayBox,
                isSelected && { backgroundColor: colors.primary },
                isFuture && { opacity: 0.25 }]} >
              <AppText 
                variant="bodyXS" 
                color={isSelected ? '#FFF' : isFuture ? colors.textDisabled : colors.textPrimary}
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

export default function OvulationTrackerScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  const [step, setStep] = useState(0);
  const [lastPeriod, setLastPeriod] = useState<Date | null>(null);
  const [regular, setRegular] = useState<boolean | null>(null);
  const [cycleLen, setCycleLen] = useState(28);
  const [prevPeriod, setPrevPeriod] = useState<Date | null>(null);
  const [results, setResults] = useState<any>(null);

  const stepsCount = 4;

  const handleNext = () => {
    if (step === 0 && !lastPeriod) {
      alert('الرجاء اختيار تاريخ آخر دورة شهرية');
      return;
    }
    if (step === 1 && regular === null) {
      alert('الرجاء تحديد ما إذا كانت دورتك منتظمة');
      return;
    }
    if (step === 2) {
      setStep(3);
      return;
    }
    if (step === 3) {
      calculateResults();
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const calculateResults = async () => {
    if (!lastPeriod) return;

    // Expected Ovulation: cycleLen - 14 days from last period
    const ovOffset = cycleLen - 14;
    const ovulationDay = new Date(lastPeriod.getTime());
    ovulationDay.setDate(lastPeriod.getDate() + ovOffset);

    // High Fertility Window: 4 days before ovulation to 1 day after
    const fertileStart = new Date(ovulationDay.getTime());
    fertileStart.setDate(ovulationDay.getDate() - 4);

    const fertileEnd = new Date(ovulationDay.getTime());
    fertileEnd.setDate(ovulationDay.getDate() + 1);

    // Next Period: cycleLen days after last period
    const nextPeriodDate = new Date(lastPeriod.getTime());
    nextPeriodDate.setDate(lastPeriod.getDate() + cycleLen);

    // AI Analysis generator
    let aiText = '';
    let calculatedDiffDays = 0;

    if (prevPeriod && lastPeriod) {
      // Calculate actual days between last two periods
      const diffTime = Math.abs(lastPeriod.getTime() - prevPeriod.getTime());
      calculatedDiffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    if (regular) {
      const avgInterval = calculatedDiffDays > 0 ? calculatedDiffDays : cycleLen;
      aiText = `دورتك الشهرية منتظمة بمتوسط فواصل يبلغ ${ar(avgInterval)} يوماً، مما يجعل دقة التوقعات مرتفعة للغاية. تقع نافذة الخصوبة العالية بين ${fertileStart.toLocaleDateString(dateLocale(), { day: 'numeric', month: 'long' })} و${fertileEnd.toLocaleDateString(dateLocale(), { day: 'numeric', month: 'long' })}. هذه الفترة هي الأمثل لحدوث الحمل. ننصح بالاستمرار في تناول مكملات حمض الفوليك والابتعاد عن التوتر.`;
    } else {
      const actualDiffText = calculatedDiffDays > 0 
        ? `تبين من مراجعة دورتيك السابقتين وجود تباين زمني (حوالي ${ar(calculatedDiffDays)} يوماً مقارنة بالطول المعتاد البالغ ${ar(cycleLen)} يوماً).`
        : '';
      aiText = `نظراً لأن دورتك الشهرية غير منتظمة، فإن التوقعات الحسابية تعتبر تقديرية وتقريبية. ${actualDiffText} ننصحكِ بمتابعة المؤشرات الجسدية المباشرة (مثل درجة الحرارة الأساسية وإفرازات عنق الرحم) واستخدام اختبارات التبويض المنزلية لتحديد الموعد بدقة، كما يُفضل مراجعة طبيبتكِ لتنظيم الدورة إذا لزم الأمر.`;
    }

    const calculatedResultsObj = {
      ovulationDayStr: ovulationDay.toLocaleDateString(dateLocale(), { day: 'numeric', month: 'long', year: 'numeric' }),
      fertileStartStr: fertileStart.toLocaleDateString(dateLocale(), { day: 'numeric', month: 'long' }),
      fertileEndStr: fertileEnd.toLocaleDateString(dateLocale(), { day: 'numeric', month: 'long' }),
      nextPeriodStr: nextPeriodDate.toLocaleDateString(dateLocale(), { day: 'numeric', month: 'long', year: 'numeric' }),
      daysToOvulation: Math.max(0, Math.ceil((ovulationDay.getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
      aiText
    };

    setResults(calculatedResultsObj);

    // Save locally and on the backend
    try {
      await AsyncStorage.setItem('nabd_ovulation_data', JSON.stringify({
        lastPeriod: lastPeriod.toISOString(),
        regular,
        cycleLen,
        prevPeriod: prevPeriod ? prevPeriod.toISOString() : null,
        results: calculatedResultsObj
      }));

      // Sync to remote database
      await apiFetch('/maternity/profile', {
        method: 'POST',
        body: JSON.stringify({
          is_pregnant: false,
          cycle_length: cycleLen,
          is_regular: regular,
          last_period_date: lastPeriod.toISOString(),
          prev_period_date: prevPeriod ? prevPeriod.toISOString() : 'transparent',
        }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveAndExit = () => {
    router.replace('/maternity/hub');
  };

  const progressPct = ((step + 1) / stepsCount) * 100;
  const cardBg = isDark ? colors.surface : colors.white;

  return (
    <View style={[styles.container, { backgroundColor: colors.background } ]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 } ]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.hBtn}>
            <Icon name="back" size={22} color="#fff" />
          </TouchableOpacity>
          <AppText variant="h5" color="#fff">حاسبة التبويض والدورة</AppText>
          <View style={{ width: 36 }}/>
        </View>
      </View>

      {results ? (
        // Results View
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          {/* Main Target Banner */}
          <View style={styles.resultBanner}>
            <View style={styles.glowCircle}>
              <Icon name="auto_awesome" size={32} color="#FFF" />
            </View>
            <AppText variant="bodySM" color="rgba(255,255,255,0.85)">يوم التبويض المتوقّع</AppText>
            {results.daysToOvulation > 0 ? (
              <AppText variant="h1" color="#FFF" style={styles.resultDays}>بعد {ar(results.daysToOvulation)} يوم</AppText>
            ) : (
              <AppText variant="h1" color="#FFF" style={styles.resultDays}>اليوم هو يوم التبويض!</AppText>
            )}
            <AppText variant="caption" color="rgba(255,255,255,0.8)">{results.ovulationDayStr}</AppText>
          </View>

          {/* AI Analysis Panel */}
          <Card style={[styles.aiCard, { borderColor: '#EBE9FD', backgroundColor: isDark ? colors.surface : '#F7F6FF' } ]}>
            <View style={styles.aiHeaderRow}>
              <Icon name="auto_awesome" size={16} color={colors.primary} />
              <AppText variant="labelLG" color={colors.primary} style={{ fontWeight: '800' }}>تحليل ذكي بالذكاء الاصطناعي</AppText>
            </View>
            <AppText variant="bodySM" color={colors.textSecondary} style={styles.aiText}>
              {results.aiText}
            </AppText>
          </Card>

          {/* Table Details */}
          <Card style={{ backgroundColor: cardBg }}>
            <AppText variant="h6" style={styles.tableTitle}>التفاصيل والتواريخ المتوقعة</AppText>
            
            <View style={styles.tableRow}>
              <View style={[styles.bulletIcon, { backgroundColor: 'rgba(232,86,142,0.1)' } ]}>
                <Icon name="favorite" size={18} color="#E8568E" />
              </View>
              <View style={styles.tableCell}>
                <AppText variant="bodySM" color={colors.textSecondary}>نافذة الخصوبة العالية</AppText>
                <AppText variant="labelLG" style={{ fontWeight: '800' }}>من {results.fertileStartStr} إلى {results.fertileEndStr}</AppText>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.tableRow}>
              <View style={[styles.bulletIcon, { backgroundColor: 'rgba(122,107,234,0.1)' } ]}>
                <Icon name="auto_awesome" size={18} color={colors.primary} />
              </View>
              <View style={styles.tableCell}>
                <AppText variant="bodySM" color={colors.textSecondary}>يوم الإباضة المتوقع</AppText>
                <AppText variant="labelLG" style={{ fontWeight: '800' }}>{results.ovulationDayStr}</AppText>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.tableRow}>
              <View style={[styles.bulletIcon, { backgroundColor: 'rgba(240,165,38,0.1)' } ]}>
                <Icon name="calendar_today" size={18} color="#F0A526" />
              </View>
              <View style={styles.tableCell}>
                <AppText variant="bodySM" color={colors.textSecondary}>موعد الدورة القادمة</AppText>
                <AppText variant="labelLG" style={{ fontWeight: '800' }}>{results.nextPeriodStr}</AppText>
              </View>
            </View>
          </Card>

          {/* Advice Warning */}
          <View style={[styles.warningBox, { backgroundColor: isDark ? colors.backgroundSecondary : '#FEF4E0' } ]}>
            <Icon name="error_outline" size={20} color="#F0A526" style={{ marginTop: 2 }}/>
            <AppText variant="bodyXS" color={colors.textSecondary} style={styles.warningText}>
              تنبيه طبي: هذه التوقعات إرشادية وحسابية فقط بناءً على المتوسطات، ولا تُغني عن استشارة طبيبكِ المختص أو استخدام الفحوصات الطبية المعتمدة.
            </AppText>
          </View>

          {/* Action CTA */}
          <TouchableOpacity onPress={handleSaveAndExit} style={[styles.saveBtn, { backgroundColor: colors.primary } ]}>
            <AppText variant="labelLG" color="#FFF" style={{ fontWeight: '800' }}>حفظ النتائج والرجوع</AppText>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        // Quiz Flow
        <View style={styles.quizWrapper}>
          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
            </View>
            <AppText variant="caption" color={colors.textTertiary}>
              السؤال {ar(step + 1)} من {ar(stepsCount)}
            </AppText>
          </View>

          <ScrollView contentContainerStyle={styles.quizScroll} showsVerticalScrollIndicator={false}>
            {/* Question Box */}
            <View style={styles.questionContainer}>
              <View style={[styles.qGlow, { backgroundColor: '#EDEBFD' } ]}>
                <Icon 
                  name={
                    step === 0 ? 'calendar_today' :
                    step === 1 ? 'sync' :
                    step === 2 ? 'schedule' :
                    'repeat'
                  } 
                  size={36} 
                  color={colors.primary} 
                />
              </View>
              <AppText variant="h2" style={styles.qText}>
                {step === 0 && 'متى كان أول يوم في آخر دورة شهرية؟'}
                {step === 1 && 'هل دورتكِ الشهرية منتظمة عادةً؟'}
                {step === 2 && 'كم متوسط طول دورتكِ الشهرية؟'}
                {step === 3 && 'متى كان أول يوم في الدورة التي قبل الأخيرة؟ (اختياري)'}
              </AppText>
            </View>

            {/* Answer inputs based on step */}
            {step === 0 && (
              <View style={styles.inputContainer}>
                <MiniCalendar selectedDate={lastPeriod} onSelectDate={setLastPeriod} />
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

            {step === 1 && (
              <View style={styles.choiceContainer}>
                <TouchableOpacity 
                  onPress={() => setRegular(true)}
                  style={[
                    styles.choiceBtn,
                    { backgroundColor: cardBg, borderColor: regular === true ? '#7A6BEA' : colors.border },
                    regular === true && { backgroundColor: '#F7F6FF' }]} >
                  <View style={[styles.radio, { borderColor: regular === true ? '#7A6BEA' : colors.border } ]}>
                    {regular === true && <View style={styles.radioInner} />}
                  </View>
                  <AppText variant="labelLG" style={{ fontWeight: '800' }}>نعم، منتظمة بانتظام</AppText>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => setRegular(false)}
                  style={[
                    styles.choiceBtn,
                    { backgroundColor: cardBg, borderColor: regular === false ? '#7A6BEA' : colors.border },
                    regular === false && { backgroundColor: '#F7F6FF' }]} >
                  <View style={[styles.radio, { borderColor: regular === false ? '#7A6BEA' : colors.border } ]}>
                    {regular === false && <View style={styles.radioInner} />}
                  </View>
                  <AppText variant="labelLG" style={{ fontWeight: '800' }}>غير منتظمة (تتأخر أو تتقدم)</AppText>
                </TouchableOpacity>
              </View>
            )}

            {step === 2 && (
              <View style={styles.cycleInputBox}>
                <Card style={[styles.cycleCard, { backgroundColor: cardBg } ]}>
                  <AppText variant="caption" color={colors.textTertiary}>طول الدورة الشهرية</AppText>
                  <View style={styles.counterRow}>
                    <TouchableOpacity onPress={() => setCycleLen(Math.max(21, cycleLen - 1))} style={styles.cntBtn}>
                      <Icon name="remove_circle_outline" size={32} color={colors.primary} />
                    </TouchableOpacity>
                    <View style={styles.cntValBox}>
                      <AppText variant="displayMD" style={{ fontFamily: 'Cairo-ExtraBold' }}>{ar(cycleLen)}</AppText>
                      <AppText variant="bodySM" color={colors.textSecondary}>يوم</AppText>
                    </View>
                    <TouchableOpacity onPress={() => setCycleLen(Math.min(45, cycleLen + 1))} style={styles.cntBtn}>
                      <Icon name="add_circle_outline" size={32} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                  <AppText variant="caption" color={colors.textTertiary} style={{ textAlign: 'center', marginTop: 10 }}>
                    المتوسط الطبيعي للرعاية هو ٢١ إلى ٣٥ يوماً
                  </AppText>
                </Card>
              </View>
            )}

            {step === 3 && (
              <View style={styles.inputContainer}>
                <MiniCalendar 
                  selectedDate={prevPeriod} 
                  onSelectDate={setPrevPeriod} 
                  maxDate={lastPeriod || new Date()} 
                />
                {prevPeriod && (
                  <View style={styles.selectedIndicator}>
                    <Icon name="check_circle" size={18} color="#5BA84F" />
                    <AppText variant="bodySM" color="#5BA84F" style={{ fontWeight: '800' }}>
                      تم اختيار: {prevPeriod.toLocaleDateString(dateLocale(), { day: 'numeric', month: 'long', year: 'numeric' })}
                    </AppText>
                  </View>
                )}
                {!prevPeriod && (
                  <AppText variant="caption" color={colors.textTertiary} style={{ textAlign: 'center', marginTop: 8 }}>
                    يمكنكِ تخطي هذا السؤال بالضغط على "احسب التبويض" مباشرة.
                  </AppText>
                )}
              </View>
            )}
          </ScrollView>

          {/* Navigation Bottom Actions */}
          <View style={[styles.bottomActions, { borderTopColor: colors.border, backgroundColor: isDark ? colors.background : colors.white } ]}>
            {step > 0 && (
              <TouchableOpacity onPress={handleBack} style={[styles.backBtn, { borderColor: colors.border } ]}>
                <AppText variant="labelLG" color={colors.textPrimary}>السابق</AppText>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleNext} style={styles.nextBtn}>
              <AppText variant="labelLG" color="#FFF" style={{ fontWeight: '800' }}>
                {step === stepsCount - 1 ? 'احسب التبويض' : 'التالي'}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14 },
  headerRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  hBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  
  // Results styles
  resultBanner: { borderRadius: 24, padding: 24, alignItems: 'center', margin: 16 },
  glowCircle: { width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  resultDays: { fontFamily: 'Cairo-ExtraBold', fontSize: 32, marginVertical: 6 },
  
  aiCard: { padding: 18, borderLeftWidth: 4, borderRadius: 16 },
  aiHeaderRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 8 },
  aiText: { textAlign: 'right', lineHeight: 22 },
  
  tableTitle: { fontWeight: '800', textAlign: 'right', marginBottom: 16 },
  tableRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 14, paddingVertical: 4 },
  bulletIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  tableCell: { flex: 1, alignItems: 'flex-end', gap: 2 },
  divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.05)', marginVertical: 12 },

  warningBox: { flexDirection: 'row-reverse', borderRadius: 16, padding: 14, gap: 10 },
  warningText: { flex: 1, textAlign: 'right', lineHeight: 18 },
  saveBtn: { padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 10 },

  // Quiz styles
  quizWrapper: { flex: 1, justifyContent: 'space-between' },
  progressContainer: { padding: 16, gap: 8, alignItems: 'flex-end' },
  progressBarBg: { width: '100%', height: 6, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3, backgroundColor: '#7A6BEA' },
  
  quizScroll: { paddingHorizontal: 16, paddingBottom: 120 },
  questionContainer: { alignItems: 'center', marginVertical: 20 },
  qGlow: { width: 72, height: 72, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 16, shadowColor: '#7A6BEA', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4 },
  qText: { textAlign: 'center', fontWeight: '800', lineHeight: 32, paddingHorizontal: 20 },

  inputContainer: { width: '100%', gap: 12 },
  selectedIndicator: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, justifyContent: 'center', marginTop: 8 },
  
  choiceContainer: { width: '100%', gap: 12 },
  choiceBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 14, padding: 18, borderRadius: 16, borderWidth: 1.5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#7A6BEA' },

  cycleInputBox: { width: '100%', alignItems: 'center' },
  cycleCard: { width: '100%', padding: 24, alignItems: 'center', borderRadius: 20 },
  counterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginVertical: 14 },
  cntBtn: { padding: 4 },
  cntValBox: { alignItems: 'center', minWidth: 80 },

  bottomActions: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row-reverse', padding: 16, gap: 12, borderTopWidth: 1 },
  backBtn: { flex: 1, padding: 16, borderRadius: 16, borderWidth: 1.5, alignItems: 'center' },
  nextBtn: { flex: 2, padding: 16, borderRadius: 16, backgroundColor: '#7A6BEA', alignItems: 'center' },

  // Calendar Specific styles
  calContainer: { borderRadius: 16, padding: 14, borderWidth: 1.5 },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  calArrow: { padding: 6 },
  calDaysRow: { flexDirection: 'row-reverse', justifyContent: 'space-around', marginBottom: 6 },
  calDayName: { width: 30, textAlign: 'center', fontWeight: '800' },
  calGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'space-around', rowGap: 6 },
  calDayBox: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
});
