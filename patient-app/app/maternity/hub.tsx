// @ts-nocheck
// app/maternity/hub.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { LocalizedAlert as Alert } from '@/components/LocalizedAlert';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, IconButton } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
const { width } = Dimensions.get('window');

const DEFAULT_PREGNANT_LINKS: any[] = [];
const DEFAULT_PLANNING_LINKS: any[] = [];
const DEFAULT_WEEKLY_TIPS: any[] = [];
const DEFAULT_PLANNING_TIPS: any[] = [];
const DEFAULT_CHECKUPS: any[] = [];

// Arabic helper for numbers
const ar = (num: number | string) => {
  const arabicNums = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num).replace(/[0-9]/g, w => arabicNums[+w]);
};

export default function MaternityHubScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const user = useSelector((state: any) => state?.auth?.user);
  
  const [profile, setProfile] = useState<any>(null);
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'pregnant' | 'planning'>('pregnant');
  const [ovulationData, setOvulationData] = useState<any>(null);

  useEffect(() => {
    loadData();
    if (!user || user?.gender === 'male') {
      Alert.alert(
        'ملاحظة طبية',
        !user 
          ? 'أنت تتصفح كزائر. يرجى تسجيل الدخول لحفظ بيانات حملك ومتابعة حالتك بدقة.'
          : 'شاشات رعاية الأمومة والتبويض مصممة للإناث لمتابعة الدورة الشهرية وتخطيط الحمل والولادة. يمكنك تصفح الشاشة والاطلاع على الميزات بشكل طبيعي.'
      );
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      apiFetch('/maternity/content').then(res => setContent(res)).catch(() => null);

      const res = await apiFetch('/maternity/profile').catch(() => null);
      let activeProfile = res;
      
      if (res) {
        setProfile(res);
        setStatus(res.is_pregnant ? 'pregnant' : 'planning');
        await AsyncStorage.setItem('nabd_maternity_profile', JSON.stringify(res));
      } else {
        // Fallback to local profile from AsyncStorage
        const localProf = await AsyncStorage.getItem('nabd_maternity_profile');
        if (localProf) {
          activeProfile = JSON.parse(localProf);
          setProfile(activeProfile);
          setStatus(activeProfile.is_pregnant ? 'pregnant' : 'planning');
        } else {
          const setupComplete = await AsyncStorage.getItem('maternity_setup_complete');
          if (!setupComplete) {
            router.replace('/maternity/maternity-setup');
            return;
          }
          // Default profile fallback if setup was completed
          const defaultProf = {
            current_week: 28,
            due_date: new Date(Date.now() + 112 * 24 * 60 * 60 * 1000).toISOString(),
            is_pregnant: true,
            checkups: DEFAULT_CHECKUPS
          };
          activeProfile = defaultProf;
          setProfile(defaultProf);
          setStatus('pregnant');
          await AsyncStorage.setItem('nabd_maternity_profile', JSON.stringify(defaultProf));
        }
      }

      if (activeProfile) {
        // --- Dynamic Pregnancy Week Calculation ---
        if (activeProfile.is_pregnant) {
          let calcWeek = activeProfile.current_week || 1;
          const now = new Date();
          
          if (activeProfile.last_period_date && activeProfile.last_period_date !== 'transparent') {
            const lmp = new Date(activeProfile.last_period_date);
            const diffTime = Math.abs(now.getTime() - lmp.getTime());
            calcWeek = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
          } else if (activeProfile.due_date && activeProfile.due_date !== 'transparent') {
            const due = new Date(activeProfile.due_date);
            const diffTime = due.getTime() - now.getTime();
            const weeksLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
            calcWeek = 40 - weeksLeft;
          }
          
          if (calcWeek < 1) calcWeek = 1;
          if (calcWeek > 42) calcWeek = 42;
          
          activeProfile.current_week = calcWeek;
          setProfile(activeProfile);
        }
        // ------------------------------------------
        if (!activeProfile.is_pregnant && activeProfile.last_period_date) {
          // Re-generate results structure dynamically if backend has cycle dates
          const lastPeriod = new Date(activeProfile.last_period_date);
          const cycleLen = activeProfile.cycle_length || 28;
          const regular = activeProfile.is_regular !== undefined ? activeProfile.is_regular : true;
          const prevPeriod = activeProfile.prev_period_date ? new Date(activeProfile.prev_period_date) : null;
          
          const ovOffset = cycleLen - 14;
          const ovulationDay = new Date(lastPeriod.getTime());
          ovulationDay.setDate(lastPeriod.getDate() + ovOffset);

          const fertileStart = new Date(ovulationDay.getTime());
          fertileStart.setDate(ovulationDay.getDate() - 4);

          const fertileEnd = new Date(ovulationDay.getTime());
          fertileEnd.setDate(ovulationDay.getDate() + 1);

          const nextPeriodDate = new Date(lastPeriod.getTime());
          nextPeriodDate.setDate(lastPeriod.getDate() + cycleLen);

          let calculatedDiffDays = 0;
          if (prevPeriod) {
            const diffTime = Math.abs(lastPeriod.getTime() - prevPeriod.getTime());
            calculatedDiffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          }

          let aiText = '';
          if (regular) {
            const avgInterval = calculatedDiffDays > 0 ? calculatedDiffDays : cycleLen;
            aiText = `دورتك الشهرية منتظمة بمتوسط فواصل يبلغ ${ar(avgInterval)} يوماً، مما يجعل دقة التوقعات مرتفعة للغاية. تقع نافذة الخصوبة العالية بين ${fertileStart.toLocaleDateString('ar-SA', { day: 'numeric', month: 'long' })} و${fertileEnd.toLocaleDateString('ar-SA', { day: 'numeric', month: 'long' })}. هذه الفترة هي الأمثل لحدوث الحمل. ننصح بالاستمرار في تناول مكملات حمض الفوليك والابتعاد عن التوتر.`;
          } else {
            const actualDiffText = calculatedDiffDays > 0 
              ? `تبين من مراجعة دورتيك السابقتين وجود تباين زمني (حوالي ${ar(calculatedDiffDays)} يوماً مقارنة بالطول المعتاد البالغ ${ar(cycleLen)} يوماً).`
              : '';
            aiText = `نظراً لأن دورتك الشهرية غير منتظمة، فإن التوقعات الحسابية تعتبر تقديرية وتقريبية. ${actualDiffText} ننصحكِ بمتابعة المؤشرات الجسدية المباشرة (مثل درجة الحرارة الأساسية وإفرازات عنق الرحم) واستخدام اختبارات التبويض المنزلية لتحديد الموعد بدقة، كما يُفضل مراجعة طبيبتكِ لتنظيم الدورة إذا لزم الأمر.`;
          }

          setOvulationData({
            regular,
            cycleLen,
            results: {
              ovulationDayStr: ovulationDay.toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' }),
              fertileStartStr: fertileStart.toLocaleDateString('ar-SA', { day: 'numeric', month: 'long' }),
              fertileEndStr: fertileEnd.toLocaleDateString('ar-SA', { day: 'numeric', month: 'long' }),
              nextPeriodStr: nextPeriodDate.toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' }),
              daysToOvulation: Math.max(0, Math.ceil((ovulationDay.getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
              aiText
            }
          });
        } else {
          // fallback to local storage
          const localOv = await AsyncStorage.getItem('nabd_ovulation_data');
          if (localOv) {
            setOvulationData(JSON.parse(localOv));
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (newStatus: 'pregnant' | 'planning') => {
    setStatus(newStatus);
    
    // Save to local profile state first to prevent latency/errors
    if (profile) {
      const updatedProfile = { ...profile, is_pregnant: newStatus === 'pregnant' };
      setProfile(updatedProfile);
      await AsyncStorage.setItem('nabd_maternity_profile', JSON.stringify(updatedProfile));
    }

    try {
      const updated = await apiFetch('/maternity/profile', {
        method: 'POST',
        body: JSON.stringify({ is_pregnant: newStatus === 'pregnant' }),
      });
      if (updated) {
        setProfile(updated);
        await AsyncStorage.setItem('nabd_maternity_profile', JSON.stringify(updated));
      }
    } catch (err) {
      console.error('Error toggling pregnancy status on backend:', err);
    }
  };

  const handleToggleCheckup = async (week: string) => {
    // Optimistic local state update
    if (profile) {
      const updatedCheckups = (profile.checkups || DEFAULT_CHECKUPS).map((c: any) => 
        c.week === week ? { ...c, done: !c.done } : c
      );
      const updatedProfile = { ...profile, checkups: updatedCheckups };
      setProfile(updatedProfile);
      await AsyncStorage.setItem('nabd_maternity_profile', JSON.stringify(updatedProfile));
    }

    try {
      const updated = await apiFetch(`/maternity/checkups/${encodeURIComponent(week)}/toggle`, { method: 'PUT' });
      if (updated) {
        setProfile(updated);
        await AsyncStorage.setItem('nabd_maternity_profile', JSON.stringify(updated));
      }
    } catch (err) {
      console.error('Error toggling checkup on backend:', err);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' } ]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Pregnant Calculations
  const week = profile?.current_week || 28;
  const dueDate = profile ? new Date(profile.due_date) : new Date(Date.now() + 112 * 24 * 60 * 60 * 1000);
  const dueDateStr = dueDate.toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' });
  const daysLeft = Math.max(0, Math.ceil((dueDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
  const progressPct = Math.min(100, Math.max(0, Math.round((week / 40) * 100)));
  const trimesterText = week <= 12 ? 'الثلث الأول' : week <= 26 ? 'الثلث الثاني' : 'الثلث الثالث';
  const checkupsList = profile?.checkups || DEFAULT_CHECKUPS;

  // Theme-aware adaptive colors
  const cardBg = isDark ? colors.surface : colors.white;
  const adaptivePinkBg = isDark ? '#4D0E2B' : '#FDF2F8';
  const adaptivePurpleBg = isDark ? '#2E1A47' : '#EDEBFD';

  return (
    <View 
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />
      
      {/* Sticky Header Top Row */}
      <View style={[
        styles.stickyHeader, 
        { 
          paddingTop: insets.top + 8,
          backgroundColor: status === 'pregnant' ? '#9D174D' : '#5B21B6' 
        } ]}>
        <View style={styles.headerRow}>
          <TouchableOpacity 
            onPress={() => router.push((status === 'pregnant' ? '/maternity/baby-development' : '/maternity/ovulation-tracker') as any)} 
            style={styles.hBtn}
          >
            <Icon name={status === 'pregnant' ? 'child_care' : 'favorite'} size={20} color="#fff" />
          </TouchableOpacity>
          <AppText variant="h5" color="#fff" style={{ fontFamily: 'Cairo-Bold' }}>لوحة رعاية الأمومة</AppText>
          <TouchableOpacity onPress={() => router.back()} style={styles.hBtn}>
            <Icon name="back" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header Large Gradient Card */}
        <View
          style={styles.headerCard}
        >
          <View style={styles.headerOrb} />
          
          {/* Status Toggle Switch */}
          <View style={[styles.toggleContainer, { backgroundColor: 'rgba(255,255,255,0.18)' } ]}>
            <TouchableOpacity 
              onPress={() => handleToggleStatus('planning')} 
              style={[styles.toggleBtn, status === 'planning' && { backgroundColor: colors.surface } ]}>
              <AppText 
                variant="bodySM" 
                color={status === 'planning' ? (isDark ? colors.textPrimary : '#7C3AED') : '#FFF'} 
                style={{ fontFamily: status === 'planning' ? 'Cairo-Bold' : 'Cairo-Regular' }}>
                تخطيط للحمل
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => handleToggleStatus('pregnant')} 
              style={[styles.toggleBtn, status === 'pregnant' && { backgroundColor: colors.surface } ]}>
              <AppText 
                variant="bodySM" 
                color={status === 'pregnant' ? (isDark ? colors.textPrimary : '#BE185D') : '#FFF'} 
                style={{ fontFamily: status === 'pregnant' ? 'Cairo-Bold' : 'Cairo-Regular' }}>
                حامل حالياً
              </AppText>
            </TouchableOpacity>
          </View>

          {/* Dynamic Status card based on Toggle state */}
          {status === 'pregnant' ? (
            <View style={styles.pregnancyCard}>
              <View style={styles.pregnancyRight}>
                <AppText variant="caption" color="rgba(255,255,255,0.8)">الأسبوع</AppText>
                <AppText variant="h1" color="#FFF" style={styles.weekNum}>{ar(week)}</AppText>
                <AppText variant="caption" color="rgba(255,255,255,0.9)" style={{ fontWeight: '800' }}>{trimesterText}</AppText>
              </View>
              <View style={styles.pregnancyLeft}>
                <AppText variant="caption" color="rgba(255,255,255,0.85)">موعد الولادة المتوقع: {dueDateStr}</AppText>
                <View style={[styles.daysLeft, { backgroundColor: 'rgba(255,255,255,0.2)' } ]}>
                  <AppText variant="h4" color="#FFF" style={{ fontFamily: 'Cairo-ExtraBold' }}>{ar(daysLeft)}</AppText>
                  <AppText variant="caption" color="#FFF">يوم متبقي</AppText>
                </View>
                <View style={styles.progressWrap}>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${progressPct}%`, backgroundColor: colors.surface }]} />
                  </View>
                  <AppText variant="caption" color="#FFF" style={{ fontWeight: '800' }}>{ar(progressPct)}%</AppText>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.pregnancyCard}>
              {ovulationData ? (
                <>
                  <View style={styles.pregnancyRight}>
                    <AppText variant="caption" color="rgba(255,255,255,0.8)">التبويض المتوقع</AppText>
                    <AppText variant="h2" color="#FFF" style={styles.ovDaysNum}>بعد {ar(ovulationData.results.daysToOvulation)}</AppText>
                    <AppText variant="caption" color="#FFF">أيام</AppText>
                  </View>
                  <View style={styles.pregnancyLeft}>
                    <AppText variant="caption" color="rgba(255,255,255,0.85)">الدورة القادمة: {ovulationData.results.nextPeriodStr}</AppText>
                    <View style={[styles.daysLeft, { backgroundColor: 'rgba(255,255,255,0.2)', width: '100%' } ]}>
                      <Icon name="favorite" size={16} color="#FFF" />
                      <AppText variant="caption" color="#FFF" style={{ fontWeight: '800', textAlign: 'right', flex: 1 }}>
                        الخصوبة: {ovulationData.results.fertileStartStr} - {ovulationData.results.fertileEndStr}
                      </AppText>
                    </View>
                    <View style={{ width: '100%', alignItems: 'flex-start', marginTop: 4 }}>
                      <Badge label={ovulationData.regular ? "دورة منتظمة" : "دورة غير منتظمة"} color="#7C3AED" bg={colors.surface} />
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.noDataBox}>
                  <Icon name="analytics" size={32} color="#FFF" />
                  <AppText variant="labelLG" color="#FFF" style={{ fontWeight: '800', marginTop: 6 }}>لم يتم حساب بيانات التبويض بعد</AppText>
                  <AppText variant="caption" color="rgba(255,255,255,0.8)" style={{ textAlign: 'center', marginVertical: 4 }}>
                    احسبي نافذة الخصوبة وأيام التبويض والدورة القادمة للحصول على تحليلات دقيقة.
                  </AppText>
                  <TouchableOpacity 
                    onPress={() => router.push('/maternity/ovulation-tracker' as any)}
                    style={styles.calcBtn}
                  >
                    <AppText variant="caption" color={colors.primary} style={{ fontWeight: '800' }}>ابدئي الحساب الآن</AppText>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Dynamic Quick Links Grid */}
        <View style={styles.quickGrid}>
          {(status === 'pregnant' ? (content?.pregnant_links || DEFAULT_PREGNANT_LINKS) : (content?.planning_links || DEFAULT_PLANNING_LINKS)).map((q: any, i: number) => (
            <TouchableOpacity 
              key={i} 
              onPress={() => router.push(q.route as any)}
              style={[styles.quickCard, { backgroundColor: cardBg } ]}>
              <View style={[styles.qIconBox, { backgroundColor: q.color + '1A' } ]}>
                <Icon name={q.icon as any} size={24} color={q.color} />
              </View>
              <AppText variant="bodySM" style={{ fontWeight: '800', marginTop: 4 }}>{q.label}</AppText>
            </TouchableOpacity>
          ))}
        </View>

        {status === 'pregnant' ? (
          // Pregnant Dashboard Sections
          <>
            {/* Baby size card */}
            <View style={[styles.babyCard, { backgroundColor: cardBg } ]}>
              <View style={styles.cardHeaderRow}>
                <TouchableOpacity onPress={() => router.push('/maternity/baby-development')}>
                  <AppText variant="caption" color={colors.primary} style={{ fontWeight: '800' }}>التفاصيل</AppText>
                </TouchableOpacity>
                <AppText variant="bodySM" style={{ fontWeight: '800' }}>طفلك هذا الأسبوع</AppText>
              </View>
              
              <View style={styles.babyInfo}>
                <View style={[styles.babyEmojiBig, { backgroundColor: adaptivePinkBg } ]}>
                  <Icon name="grass" size={32} color="#EC4899" />
                  <AppText variant="caption" color="#EC4899" style={{ fontWeight: '800', marginTop: 4 }}>حجم قرنبيط</AppText>
                </View>
                
                <View style={styles.babyStats}>
                  {[
                    { label: 'الوزن المقدر', val: ar('1.0 كجم'), icon: 'speed', col: '#5BA84F' },
                    { label: 'الطول المقدر', val: ar('37.6 سم'), icon: 'straighten', col: '#4889D4' },
                    { label: 'الأسبوع الحالي', val: `${ar(week)}/٤٠`, icon: 'calendar_today', col: '#EC4899' },
                  ].map((s, i) => (
                    <View key={i} style={[styles.babyStatRow, { backgroundColor: isDark ? colors.backgroundSecondary : '#FDF2F8' } ]}>
                      <Icon name={s.icon as any} size={16} color={s.col} />
                      <AppText variant="caption" color={colors.textSecondary} style={{ flex: 1, textAlign: 'right', marginRight: 8 }}>{s.label}</AppText>
                      <AppText variant="bodySM" style={{ fontWeight: '800' }}>{s.val}</AppText>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Weekly tips card */}
            <View style={[styles.tipsCard, { backgroundColor: cardBg } ]}>
              <AppText variant="bodySM" style={styles.cardTitle}>نصائح الأسبوع {ar(week)}</AppText>
              {(content?.weekly_tips || DEFAULT_WEEKLY_TIPS).map((tip: string, i: number) => (
                <View key={i} style={styles.tipRow}>
                  <AppText variant="bodySM" color={colors.textSecondary} style={styles.tipText}>{tip}</AppText>
                  <Icon name="favorite" size={16} color="#EC4899" style={{ marginTop: 2 }}/>
                </View>
              ))}
            </View>

            {/* Checkups timeline */}
            <View style={[styles.timelineCard, { backgroundColor: cardBg } ]}>
              <AppText variant="bodySM" style={styles.cardTitle}>جدول الفحوصات الطبية</AppText>
              {checkupsList.map((c: any, i: number) => {
                const isCurrent = c.week === `${week} أسبوع`;
                return (
                  <View key={i} style={styles.checkRow}>
                    {i < checkupsList.length - 1 && (
                      <View style={[styles.checkLine, { backgroundColor: c.done ? colors.primary : colors.border }]} />
                    )}
                    <TouchableOpacity 
                      onPress={() => handleToggleCheckup(c.week)} 
                      style={[
                        styles.checkCircle, 
                        {
                          backgroundColor: c.done ? colors.primary : isCurrent ? adaptivePinkBg : colors.surfaceSecondary,
                          borderWidth: isCurrent ? 2 : 0, 
                          borderColor: colors.primary,
                        } ]}>
                      {c.done ? (
                        <Icon name="check" size={14} color="#fff" />
                      ) : (
                        <View style={[styles.checkDot, { backgroundColor: isCurrent ? colors.primary : colors.border }]} />
                      )}
                    </TouchableOpacity>

                    <View style={styles.checkInfo}>
                      <AppText variant="bodySM" style={{ fontWeight: '800' }}>{c.name}</AppText>
                      <AppText variant="caption" color={colors.textSecondary}>{c.week}</AppText>
                    </View>

                    {isCurrent && (
                      <TouchableOpacity 
                        onPress={() => router.push('/(tabs)/consultations')}
                        style={[styles.bookNowBtn, { backgroundColor: colors.primary } ]}>
                        <AppText variant="caption" color="#fff" style={{ fontWeight: '800' }}>حجز</AppText>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          </>
        ) : (
          // Planning Dashboard Sections
          <>
            {/* AI Diagnostics summary if local data exists */}
            {ovulationData && (
              <Card style={[styles.tipsCard, { backgroundColor: adaptivePurpleBg, borderLeftWidth: 4, borderLeftColor: '#7A6BEA', padding: 16 } ]}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Icon name="auto_awesome" size={18} color="#7A6BEA" />
                  <AppText variant="bodySM" color={colors.primary} style={{ fontWeight: '800' }}>التقرير الذكي للتخطيط للحمل</AppText>
                </View>
                <AppText variant="bodySM" color={colors.textSecondary} style={{ textAlign: 'right', lineHeight: 22 }}>
                  {ovulationData.results.aiText}
                </AppText>
              </Card>
            )}

            {/* Planning Advice Tips */}
            <View style={[styles.tipsCard, { backgroundColor: cardBg } ]}>
              <AppText variant="bodySM" style={styles.cardTitle}>نصائح ذكية للتخطيط للحمل</AppText>
              {(content?.planning_tips || DEFAULT_PLANNING_TIPS).map((tip: string, i: number) => (
                <View key={i} style={styles.tipRow}>
                  <AppText variant="bodySM" color={colors.textSecondary} style={styles.tipText}>{tip}</AppText>
                  <Icon name="grass" size={16} color="#7C3AED" style={{ marginTop: 2 }}/>
                </View>
              ))}
            </View>

            {/* Fertility Diagnostics CTA */}
            <View style={[styles.babyCard, { backgroundColor: cardBg, padding: 18 } ]}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <View style={[styles.qIconBox, { backgroundColor: 'rgba(16,185,129,0.1)' } ]}>
                  <Icon name="science" size={24} color="#10B981" />
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <AppText variant="bodySM" style={{ fontWeight: '800' }}>باقة تحاليل ما قبل الحمل</AppText>
                  <AppText variant="caption" color={colors.textTertiary}>فحص الهرمونات والمعادن الأساسية والحديد</AppText>
                </View>
              </View>
              <TouchableOpacity 
                onPress={() => router.push('/(tabs)/diagnostics' as any)}
                style={[styles.calcBtn, { backgroundColor: colors.success } ]}>
                <AppText variant="caption" color="#FFF" style={{ fontWeight: '800' }}>عرض المختبرات وحجز فحص</AppText>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  stickyHeader: { paddingHorizontal: 20, paddingBottom: 12, width: '100%', zIndex: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  headerCard: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 26, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
  headerOrb: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.04)', top: -60, right: -40 },
  headerRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  hBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },
  
  toggleContainer: { flexDirection: 'row', padding: 4, borderRadius: 16, marginBottom: 20 },
  toggleBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  pregnancyCard: { 
    flexDirection: 'row-reverse', 
    backgroundColor: 'rgba(255,255,255,0.15)', 
    borderRadius: 24, 
    padding: 18, 
    gap: 14, 
    width: '100%',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.22)'
  },
  pregnancyRight: { alignItems: 'center', gap: 2, minWidth: 90 },
  weekNum: { fontSize: 46, fontFamily: 'Cairo-ExtraBold', lineHeight: 48, marginTop: 4 },
  ovDaysNum: { fontSize: 30, fontFamily: 'Cairo-ExtraBold', marginTop: 4 },
  pregnancyLeft: { flex: 1, alignItems: 'flex-end', gap: 8 },
  daysLeft: { borderRadius: 14, paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  progressWrap: { width: '100%', flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  progressBarBg: { flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },

  noDataBox: { flex: 1, alignItems: 'center', padding: 12 },
  calcBtn: { backgroundColor: '#FFF', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 18, marginTop: 8 },

  quickGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', padding: 16, gap: 12, justifyContent: 'space-between' },
  quickCard: { 
    width: '48%', 
    borderRadius: 24, 
    padding: 18, 
    alignItems: 'center', 
    gap: 8, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 10 }, 
    shadowOpacity: 0.04, 
    shadowRadius: 15, 
    elevation: 3,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.02)'
  },
  qIconBox: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },

  babyCard: { 
    marginHorizontal: 16, 
    borderRadius: 24, 
    padding: 18, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 10 }, 
    shadowOpacity: 0.04, 
    shadowRadius: 15, 
    elevation: 3,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.02)'
  },
  cardHeaderRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  babyInfo: { flexDirection: 'row-reverse', alignItems: 'center', gap: 14 },
  babyEmojiBig: { width: 96, height: 96, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  babyStats: { flex: 1, gap: 8 },
  babyStatRow: { borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, flexDirection: 'row-reverse', alignItems: 'center' },

  tipsCard: { 
    marginHorizontal: 16, 
    marginTop: 14, 
    borderRadius: 24, 
    padding: 18, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 10 }, 
    shadowOpacity: 0.04, 
    shadowRadius: 15, 
    elevation: 3,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.02)'
  },
  cardTitle: { fontWeight: '800', textAlign: 'right', marginBottom: 14 },
  tipRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 6, gap: 10 },
  tipText: { flex: 1, textAlign: 'right', lineHeight: 20 },

  timelineCard: { 
    marginHorizontal: 16, 
    marginTop: 14, 
    borderRadius: 24, 
    padding: 18, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 10 }, 
    shadowOpacity: 0.04, 
    shadowRadius: 15, 
    elevation: 3,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.02)'
  },
  checkRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, paddingVertical: 12, position: 'relative' },
  checkLine: { position: 'absolute', right: 16, top: 44, width: 2, height: '70%' },
  checkCircle: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  checkDot: { width: 10, height: 10, borderRadius: 5 },
  checkInfo: { flex: 1, alignItems: 'flex-end', gap: 2 },
  bookNowBtn: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
});
