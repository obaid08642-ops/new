// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, StatusBar, ActivityIndicator, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton, SectionHeader } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PregnancyTrackerScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Kicks state
  const [kicksCount, setKicksCount] = useState(0);
  const [kicksDuration, setKicksDuration] = useState(0);
  const [kicksActive, setKicksActive] = useState(false);
  const kicksTimer = useRef<any>(null);

  // Contraction state
  const [contractionActive, setContractionActive] = useState(false);
  const [contractionStart, setContractionStart] = useState<number | null>(null);
  const [lastContractionEnd, setLastContractionEnd] = useState<number | null>(null);
  const [lastRecordedContraction, setLastRecordedContraction] = useState<{ duration: number; interval: number } | null>(null);

  const [savingKicks, setSavingKicks] = useState(false);
  const [savingContraction, setSavingContraction] = useState(false);

  useEffect(() => {
    loadProfile();
    return () => {
      if (kicksTimer.current) clearInterval(kicksTimer.current);
    };
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      let res = await apiFetch('/maternity/profile').catch(() => null);
      if (!res) {
        const local = await AsyncStorage.getItem('nabd_maternity_profile');
        if (local) res = JSON.parse(local);
      }
      
      if (res && res.is_pregnant) {
        const lmp = res.last_period_date ? new Date(res.last_period_date) : null;
        const dueDate = res.due_date && res.due_date !== 'transparent' ? new Date(res.due_date) : null;
        const today = new Date();
        let calcWeek = res.current_week || 4; // fallback
        if (lmp) {
          const diffTime = Math.abs(today.getTime() - lmp.getTime());
          calcWeek = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
        } else if (dueDate) {
          const diffTime = dueDate.getTime() - today.getTime();
          const weeksLeft = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
          calcWeek = 40 - weeksLeft;
        }
        res.current_week = Math.max(1, Math.min(40, calcWeek));
      }
      
      setProfile(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Kicks counter control
  const handleRecordKick = () => {
    if (!kicksActive) {
      setKicksActive(true);
      kicksTimer.current = setInterval(() => {
        setKicksDuration(d => d + 1);
      }, 1000);
    }
    setKicksCount(c => c + 1);
  };

  const handleSaveKicks = async () => {
    if (kicksCount === 0) return;
    try {
      setSavingKicks(true);
      if (kicksTimer.current) {
        clearInterval(kicksTimer.current);
        kicksTimer.current = null;
      }
      setKicksActive(false);
      const updated = await apiFetch('/maternity/kicks', {
        method: 'POST',
        body: JSON.stringify({ count: kicksCount, duration_seconds: kicksDuration }),
      });
      setProfile(updated);
      // Reset
      setKicksCount(0);
      setKicksDuration(0);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingKicks(false);
    }
  };

  // Contraction counter control
  const handleToggleContraction = async () => {
    const now = Date.now();
    if (!contractionActive) {
      // Start contraction
      setContractionActive(true);
      setContractionStart(now);
    } else {
      // End contraction
      setContractionActive(false);
      if (contractionStart) {
        const durationSeconds = Math.round((now - contractionStart) / 1000);
        const intervalSeconds = lastContractionEnd ? Math.round((contractionStart - lastContractionEnd) / 1000) : 0;
        
        setLastContractionEnd(now);
        setLastRecordedContraction({ duration: durationSeconds, interval: intervalSeconds });

        // Auto save to database
        try {
          setSavingContraction(true);
          const updated = await apiFetch('/maternity/contractions', {
            method: 'POST',
            body: JSON.stringify({ interval_seconds: intervalSeconds, duration_seconds: durationSeconds }),
          });
          setProfile(updated);
        } catch (err) {
          console.error(err);
        } finally {
          setSavingContraction(false);
        }
      }
    }
  };

  const handleToggleCheckup = async (week: string) => {
    // Optimistic local update
    if (profile) {
      const updatedCheckups = (profile.checkups || []).map((c: any) => 
        c.week === week ? { ...c, done: !c.done } : c
      );
      setProfile({ ...profile, checkups: updatedCheckups });
    }

    try {
      const updated = await apiFetch(`/maternity/checkups/${encodeURIComponent(week)}/toggle`, { method: 'PUT' });
      if (updated) {
        setProfile(updated);
      }
    } catch (err) {
      console.error('Error toggling checkup:', err);
    }
  };

  if (loading) {
    return (
      <View style={[st.c, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' } ]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const week = profile?.current_week || 24;
  const trimester = week <= 12 ? 1 : week <= 27 ? 2 : 3;

  return (
    <View style={[st.c, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle="light-content" />
      <View style={[st.hdr, { paddingTop: insets.top + 12 } ]}>
        <View style={st.hdrRow}>
          <View style={{ width: 40 }}/>
          <AppText variant="h4" color="#fff" style={{ fontFamily: 'Cairo-Bold' }}>متابعة الحمل</AppText>
          <IconButton icon="back" bg="rgba(255,255,255,0.18)" color="#fff" onPress={() => router.back()} />
        </View>
        <View style={st.weekCard}>
          <View style={{ alignItems: 'center' }}>
            <AppText variant="displayMD" color="#fff" style={{ fontFamily: 'Cairo-ExtraBold' }}>{week}</AppText>
            <AppText variant="bodySM" color="rgba(255,255,255,0.8)">أسبوع</AppText>
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end', gap: 4 }}>
            <Badge label={`الثلث ${trimester === 1 ? 'الأول' : trimester === 2 ? 'الثاني' : 'الثالث'}`} color="#fff" bg="rgba(255,255,255,0.2)" />
            <AppText variant="bodySM" color="rgba(255,255,255,0.85)">متابعة مؤشرات نمو الجنين والأنشطة</AppText>
            <View style={[st.progressBar]} >
              <View style={[st.progressFill, { width: `${(week / 40) * 100}%`, backgroundColor: colors.surface }]} />
            </View>
            <AppText variant="caption" color="rgba(255,255,255,0.7)">{40 - week} أسبوع متبقي</AppText>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }}>
        {/* Kick Counter Widget */}
        <Card>
          <SectionHeader title="حساب ركلات الجنين" />
          <AppText variant="bodySM" color={colors.textSecondary} style={{ marginBottom: 12, textAlign: 'right' }}>
            اضغطي على الزر أدناه كلما شعرت بركلة. يوصى بتسجيل 10 ركلات خلال ساعتين.
          </AppText>

          <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-around', alignItems: 'center', marginVertical: 12 }}>
            <View style={{ alignItems: 'center' }}>
              <AppText variant="h2" color="#EC4899" style={{ fontFamily: 'Cairo-Bold' }}>{kicksCount}</AppText>
              <AppText variant="caption" color={colors.textTertiary}>عدد الركلات</AppText>
            </View>
            <View style={{ alignItems: 'center' }}>
              <AppText variant="h2" color="#EC4899" style={{ fontFamily: 'Cairo-Bold' }}>
                {Math.floor(kicksDuration / 60)}:{(kicksDuration % 60).toString().padStart(2, '0')}
              </AppText>
              <AppText variant="caption" color={colors.textTertiary}>الوقت المنقضي</AppText>
            </View>
          </View>

          <View style={{ flexDirection: 'row-reverse', gap: 10, marginTop: 10 }}>
            <TouchableOpacity onPress={handleRecordKick} style={[st.recordKickBtn, { backgroundColor: '#EC4899' } ]}>
              <Icon name="child_care" size={24} color="#fff" />
              <AppText variant="h6" color="#fff" style={{ fontFamily: 'Cairo-Bold' }}>سجّلي ركلة</AppText>
            </TouchableOpacity>
            {kicksCount > 0 && (
              <Button label="حفظ الجلسة" variant="gradient" loading={savingKicks} onPress={handleSaveKicks} style={{ flex: 1 }}/>
            )}
          </View>
          
          {profile?.kicks_log?.length > 0 && (
            <View style={{ borderTopWidth: 1, borderTopColor: colors.borderLight, marginTop: 14, paddingTop: 10 }}>
              <AppText variant="caption" color={colors.textTertiary} style={{ textAlign: 'right', marginBottom: 6 }}>آخر جلسة مسجلة:</AppText>
              <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }}>
                <AppText variant="bodySM" color={colors.textSecondary}>
                  {profile.kicks_log[profile.kicks_log.length - 1].count} ركلات
                </AppText>
                <AppText variant="caption" color={colors.textTertiary}>
                  المدة: {Math.round(profile.kicks_log[profile.kicks_log.length - 1].duration_seconds / 60)} دقيقة
                </AppText>
              </View>
            </View>
          )}
        </Card>

        {/* Contraction Timer Widget */}
        <Card>
          <SectionHeader title="مؤقت الانقباضات (الطلق)" />
          <AppText variant="bodySM" color={colors.textSecondary} style={{ marginBottom: 12, textAlign: 'right' }}>
            قومي بقياس مدة وتكرار الانقباضات لمعرفة اقتراب موعد الولادة.
          </AppText>

          <View style={{ alignItems: 'center', marginVertical: 10 }}>
            <TouchableOpacity onPress={handleToggleContraction} style={[st.contractionCircle, { backgroundColor: contractionActive ? '#F0695C' : '#10B981' } ]}>
              <Icon name="monitor_heart" size={32} color="#fff" />
              <AppText variant="h6" color="#fff" style={{ marginTop: 4 }}>
                {contractionActive ? 'إيقاف الانقباض' : 'بدء الانقباض'}
              </AppText>
            </TouchableOpacity>
          </View>

          {lastRecordedContraction && (
            <Card style={{ backgroundColor: colors.surfaceSecondary, marginTop: 10, padding: 12 }}>
              <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }}>
                <AppText variant="caption" color={colors.textTertiary}>مدة الانقباضة الأخيرة:</AppText>
                <AppText variant="bodySM" color={colors.textPrimary}>{lastRecordedContraction.duration} ثواني</AppText>
              </View>
              {lastRecordedContraction.interval > 0 && (
                <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', marginTop: 4 }}>
                  <AppText variant="caption" color={colors.textTertiary}>الفاصل بين الانقباضات:</AppText>
                  <AppText variant="bodySM" color={colors.textPrimary}>{Math.round(lastRecordedContraction.interval / 60)} دقيقة</AppText>
                </View>
              )}
            </Card>
          )}
        </Card>

        <Card>
          <SectionHeader title="الفحوصات القادمة" />
          {(profile?.checkups || []).map((m: any, i: number) => (
            <TouchableOpacity 
              key={i} 
              onPress={() => handleToggleCheckup(m.week)}
              style={[st.milestone, i > 0 && { borderTopWidth: 1, borderTopColor: colors.borderLight }]}>
              <Icon name={m.done ? 'check_circle' : 'schedule'} size={18} color={m.done ? colors.success : colors.textTertiary} />
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <AppText variant="h6" color={m.done ? colors.textTertiary : colors.textPrimary}>{m.name}</AppText>
                <AppText variant="caption" color={colors.textTertiary}>الأسبوع {m.week}</AppText>
              </View>
              {m.done ? <Badge label="تم" color={colors.success} /> : null}
            </TouchableOpacity>
          ))}
        </Card>

        <View style={{ gap: 10 }}>
          <Button label="استشارة طبيب نساء وولادة" variant="gradient" icon="doctor" onPress={() => router.push('/(tabs)/consultations')} />
          <Button label="خطة تغذية للحامل" variant="outline" icon="food" onPress={() => router.push('/nutrition/ai-plan-builder')} />
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: { paddingHorizontal: 16, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  hdrRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  weekCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: 16, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 20, padding: 16 },
  progressBar: { width: '100%', height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)' },
  progressFill: { height: '100%', borderRadius: 3 },
  milestone: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 10 },
  recordKickBtn: { flex: 1.5, flexDirection: 'row-reverse', gap: 8, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  contractionCircle: { width: 130, height: 130, borderRadius: 65, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
});
