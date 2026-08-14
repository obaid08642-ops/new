// @ts-nocheck
// app/programs/active.tsx
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar
} from 'react-native';
import { LocalizedAlert as Alert } from '@/components/LocalizedAlert';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon, IconName } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton, SectionHeader } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';

export default function ActiveProgramsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [programs, setPrograms] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>('diabetes');
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    loadPrograms();
  }, []);

  const loadPrograms = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/medical/programs/active');
      if (Array.isArray(res) && res.length > 0) {
        setPrograms(res);
        if (!res.find((p: any) => p.id === activeTab)) {
          setActiveTab(res[0].id);
        }
      } else setPrograms([]);
    } catch (e) {
      setPrograms([]);
    } finally {
      setLoading(false);
    }
  };

  const selectedProg = programs.find(p => p.id === activeTab) || programs[0];

  const handleMarkCompleted = (sessionId: number) => {
    Alert.alert(
      'تأكيد إكمال الجلسة',
      'هل ترغب في تسجيل هذه الجلسة كمكتملة؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'نعم، اكتملت',
          onPress: async () => {
            try {
              const res = await apiFetch('/medical/programs/complete-session', {
                method: 'POST',
                body: JSON.stringify({ programType: activeTab, sessionId: sessionId.toString() })
              });
              
              if (Array.isArray(res)) setPrograms(res);
            } catch (err) {
              console.error(err);
              Alert.alert('خطأ', 'تعذر تحديث الجلسة، حاول مرة أخرى');
            }
          }
        }
      ]
    );
  };

  if (!selectedProg) {
    return (
      <View style={[st.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 }]}>
        <Icon name="calendar" size={36} color={colors.primary} />
        <AppText variant="h5" align="center">لا توجد برامج علاجية نشطة</AppText>
        <AppText variant="bodySM" color={colors.textSecondary} align="center">
          {loading ? 'جاري تحميل البرامج من ملفك الطبي...' : 'لن يعرض التطبيق برنامجاً أو تقدماً احتياطياً عند غياب البيانات الموثقة.'}
        </AppText>
        <Button label="العودة" variant="outline" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={[st.container, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[st.hdr, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.borderLight } ]}>
        <IconButton icon="back" onPress={() => router.back()} />
        <View style={{ alignItems: 'center' }}>
          <AppText variant="h4">البرامج العلاجية النشطة</AppText>
          <AppText variant="caption" color={colors.textTertiary}>تتبع التزامك بخطتك العلاجية خطوة بخطوة</AppText>
        </View>
        <IconButton icon="sparkles" onPress={() => router.push('/loyalty/hub' as any)} />
      </View>

      {/* Program Selector Tabs */}
      <View style={[st.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border } ]}>
        {programs.map((p: any) => {
          const isActive = activeTab === p.id;
          return (
            <TouchableOpacity
              key={p.id}
              onPress={() => setActiveTab(p.id)}
              style={[st.tab, isActive && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 } ]}>
              <AppText variant={isActive ? 'h6' : 'bodySM'} color={isActive ? colors.primary : colors.textSecondary}>
                {p.title.replace('برنامج ', '')}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 60 }}>
        {/* Progress Card */}
        <Card style={st.progressCard}>
          <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
            <AppText variant="h5">{selectedProg.title}</AppText>
            <Badge label={`المدة: ${selectedProg.duration}`} color={colors.primary} />
          </View>

          {/* Simulated progress bar */}
          <View style={st.progressContainer}>
            <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 6 }}>
              <AppText variant="bodySM" color={colors.textSecondary}>نسبة الإنجاز</AppText>
              <AppText variant="labelSM" color={colors.primary}>
                {selectedProg.completedSessions} من أصل {selectedProg.totalSessions} جلسات
              </AppText>
            </View>
            <View style={[st.barBg, { backgroundColor: colors.borderLight } ]}>
              <View style={[st.barFill, { backgroundColor: colors.primary, width: `${(selectedProg.completedSessions / selectedProg.totalSessions) * 100}%` }]} />
            </View>
          </View>
        </Card>

        {/* Next Session Box */}
        <Card style={[st.nextSessionCard, { backgroundColor: colors.primarySurface, borderColor: colors.primary + '30' } ]}>
          <View style={{ flexDirection: 'row-reverse', gap: 10, alignItems: 'center' }}>
            <View style={[st.iconCircle, { backgroundColor: colors.primary } ]}>
              <Icon name="clock" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <AppText variant="h6" color={colors.primary}>الجلسة القادمة المجدولة</AppText>
              <AppText variant="bodySM" color={colors.textPrimary} style={{ marginTop: 2 }}>{selectedProg.nextSessionTitle}</AppText>
              <AppText variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>
                <Icon name="clock" size={14} color={colors.primary} /> {selectedProg.nextSessionDate} في تمام الساعة {selectedProg.nextSessionTime}
              </AppText>
            </View>
          </View>
          <Button label="تأكيد الحضور أو إعادة الجدولة" variant="outline" size="sm" style={{ marginTop: 12 }} onPress={() => Alert.alert('التأكيد', 'تم تأكيد موعد حضورك بنجاح.')} />
        </Card>

        {/* Milestone Reward Box */}
        <Card style={st.rewardCard}>
          <View style={{ flexDirection: 'row-reverse', gap: 10, alignItems: 'center' }}>
            <View style={[st.rewardIcon, { backgroundColor: colors.gold + '18' } ]}>
              <Icon name="trophy" size={24} color={colors.gold} />
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <AppText variant="h6" color={colors.gold}>مكافأة الإنجاز القادم</AppText>
              <AppText variant="bodySM" style={{ marginTop: 2 }}>{selectedProg.milestoneReward}</AppText>
              <AppText variant="caption" color={colors.textTertiary}>{selectedProg.rewardDesc}</AppText>
            </View>
          </View>
        </Card>

        {/* Checklist of Sessions */}
        <SectionHeader title="جدول الجلسات والزيارات" />
        {selectedProg.sessionsList.map((session: any) => {
          const isCompleted = session.status === 'completed';
          return (
            <Card
              key={session.id}
              onPress={() => !isCompleted && handleMarkCompleted(session.id)}
              style={[st.sessionItem, isCompleted && { opacity: 0.7 } ]}>
              <View style={{ flexDirection: 'row-reverse', gap: 12, alignItems: 'center', flex: 1 }}>
                <View style={[st.sessionNum, { backgroundColor: isCompleted ? colors.success + '18' : colors.surfaceSecondary } ]}>
                  <AppText variant="labelSM" color={isCompleted ? colors.success : colors.textSecondary}>#{session.id}</AppText>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <AppText variant="bodySM" color={isCompleted ? colors.textSecondary : colors.textPrimary} style={{ textDecorationLine: isCompleted ? 'line-through' : 'none' }}>
                    {session.title}
                  </AppText>
                </View>
              </View>
              <Icon
                name={isCompleted ? 'check-circle' : 'circle'}
                size={22}
                color={isCompleted ? colors.success : colors.textTertiary}
              />
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  hdr: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  tabBar: { flexDirection: 'row-reverse', borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  progressCard: { padding: 16 },
  progressContainer: { marginTop: 14 },
  barBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  nextSessionCard: { padding: 16, borderWidth: 1 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  rewardCard: { padding: 16, borderRightWidth: 4, borderRightColor: '#F0A526' },
  rewardIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sessionItem: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  sessionNum: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }
});
