// @ts-nocheck
// app/health/smart-reminders.tsx
// <MaterialIcons name="notifications" size={24} color={resolveColor('var(--p)', isDark)} /> التذكيرات الذكية — تتعلم عاداتك وتذكّرك في الوقت المناسب
import React, { useState } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity,
  Switch, StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { useGuestGuard } from '../../src/hooks/useGuestGuard';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';

interface Reminder {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  enabled: boolean;
  time: string;
  frequency: string;
  aiSuggested: boolean;
  streak: number;
}

const REMINDERS: Reminder[] = [
  { id: '1', title: 'قياس الضغط', subtitle: 'يومياً في الصباح', icon: 'monitor_heart', color: '#F0695C', enabled: true, time: '8:00 ص', frequency: 'يومي', aiSuggested: false, streak: 12 },
  { id: '2', title: 'دواء ميتفورمين', subtitle: 'مع وجبة الغداء', icon: 'medication', color: '#5BA84F', enabled: true, time: '1:00 م', frequency: 'يومي', aiSuggested: false, streak: 28 },
  { id: '3', title: 'شرب الماء', subtitle: 'AI يقترح كل ساعتين', icon: 'water', color: '#23B5CE', enabled: true, time: 'كل ساعتين', frequency: 'ذكي', aiSuggested: true, streak: 5 },
  { id: '4', title: 'قياس السكر', subtitle: 'قبل النوم', icon: 'bloodtype', color: '#7A6BEA', enabled: false, time: '10:00 م', frequency: 'يومي', aiSuggested: false, streak: 0 },
  { id: '5', title: 'تمرين رياضي', subtitle: 'AI لاحظ نشاطك يرتفع مساءً', icon: 'run', color: '#F0A526', enabled: true, time: '6:00 م', frequency: 'ذكي', aiSuggested: true, streak: 7 },
  { id: '6', title: 'فحص الوزن', subtitle: 'أسبوعياً — الجمعة صباحاً', icon: 'weight', color: '#00C9A7', enabled: true, time: 'الجمعة 7:00 ص', frequency: 'أسبوعي', aiSuggested: false, streak: 4 },
];

const AI_INSIGHTS = [
  { text: 'لاحظت أنك تنسى دواءك بين الساعة 1–3 م. هل تريد تعديل وقت التذكير؟', icon: 'robot', color: '#6366F1' },
  { text: 'تحقق الضغط لديك في الصباح يُظهر أرقاماً أفضل — AI يقترح الاستمرار', icon: 'trending_up', color: '#5BA84F' },
  { text: 'منذ 3 أسابيع لم تقس السكر قبل النوم. هل تريد إعادة التفعيل؟', icon: 'warning', color: '#F0A526' },
];

export default function SmartRemindersScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const { isGuest, requireAuth } = useGuestGuard();
  if (isGuest) { requireAuth(); return null; }
  
  

  const [reminders, setReminders] = useState(REMINDERS);
  const [activeTab, setActiveTab] = useState<'all' | 'ai' | 'medications'>('all');

  const toggleReminder = (id: string) => {
    setReminders(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const filtered = activeTab === 'all' ? reminders
    : activeTab === 'ai' ? reminders.filter(r => r.aiSuggested)
    : reminders.filter(r => r.title.includes('دواء') || r.title.includes('دواء'));

  const totalStreak = reminders.filter(r => r.enabled).reduce((s, r) => s + r.streak, 0);
  const activeCount = reminders.filter(r => r.enabled).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle="light-content" />
      <View style={{ paddingTop: insets.top + 16, paddingBottom: 8, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconButton icon="add" bg={colors.surfaceSecondary} color={colors.textPrimary} />
          <AppText variant="h3" color={colors.textPrimary}>التذكيرات الذكية</AppText>
          <IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} />
        </View>
        <View style={styles.statsRow}>
          {[
            { num: activeCount.toString(), label: 'تذكير نشط' },
            { num: totalStreak.toString(), label: 'مجموع الأيام' },
            { num: reminders.filter(r => r.aiSuggested && r.enabled).length.toString(), label: 'AI ذكي' },
          ].map((s, i) => (
            <View key={i} style={[styles.statItem, i > 0 && styles.statBorder]}>
              <AppText variant="bodySM">{s.num}</AppText>
              <AppText variant="bodySM">{s.label}</AppText>
            </View>
          ))}
        </View>
        </View>


      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
        {([['all', 'الكل'], ['ai', 'AI ذكي'], ['medications', 'أدوية']] as const).map(([key, label]) => (
          <TouchableOpacity
            key={key}
            onPress={() => setActiveTab(key)}
            style={[styles.tab, activeTab === key && { borderBottomWidth: 2.5, borderBottomColor: colors.primary } ]}>
            <AppText variant="bodySM">
              {label}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* AI Insights */}
        {activeTab === 'all' && (
          <View style={{ padding: 16, gap: 8 }}>
            <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6}}><Icon name="info" size={16} color={colors.primary} /><AppText variant="bodySM">رؤى الذكاء الاصطناعي</AppText></View>
            {AI_INSIGHTS.map((ins, i) => (
              <View key={i} style={[styles.insightCard, { backgroundColor: ins.color + '12', borderColor: ins.color + '30' } ]}>
                <TouchableOpacity style={[styles.insightAction, { backgroundColor: ins.color } ]}>
                  <AppText variant="bodySM">تعديل</AppText>
                </TouchableOpacity>
                <AppText variant="bodySM">{ins.text}</AppText>
                <Icon name={ins.icon} size={20} color={ins.color} />
              </View>
            ))}
          </View>
        )}

        {/* Reminders List */}
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {filtered.length === 0 && (
            <View style={styles.emptyState}>
              <Icon name="notification" size={20} color={colors.primary} />
              <AppText variant="bodySM">لا توجد تذكيرات في هذه الفئة</AppText>
            </View>
          )}
          {filtered.map(reminder => (
            <View key={reminder.id} style={[styles.reminderCard, { backgroundColor: isDark ? colors.surface : colors.white, opacity: reminder.enabled ? 1 : 0.6 } ]}>
              <View style={styles.reminderRight}>
                <Switch
                  value={reminder.enabled}
                  onValueChange={() => toggleReminder(reminder.id)}
                  trackColor={{ false: colors.border, true: reminder.color + '50' }}
                  thumbColor={reminder.enabled ? reminder.color : colors.textTertiary}
                />
                {reminder.streak > 0 && reminder.enabled && (
                  <View style={[styles.streakBadge, { backgroundColor: reminder.color + '15', flexDirection: 'row-reverse', alignItems: 'center', gap: 4 } ]}>
                    <Icon name="local_fire_department" size={14} color={reminder.color} />
                    <AppText variant="caption" color={reminder.color} style={{ fontWeight: 'bold' }}>{reminder.streak}</AppText>
                  </View>
                )}
              </View>
              <View style={styles.reminderInfo}>
                <View style={styles.reminderTitleRow}>
                  {reminder.aiSuggested && (
                    <View style={[styles.aiBadge, { backgroundColor: '#EEF2FF' } ]}>
                      <AppText variant="bodySM">AI</AppText>
                    </View>
                  )}
                  <AppText variant="bodySM">{reminder.title}</AppText>
                </View>
                <AppText variant="bodySM">{reminder.subtitle}</AppText>
                <View style={styles.reminderMeta}>
                  <View style={{flexDirection:'row-reverse',alignItems:'center',gap:4}}>
                    {reminder.frequency === 'ذكي' && <Icon name="auto_awesome" size={14} color={colors.primary} />}
                    <AppText variant="caption" color={reminder.frequency === 'ذكي' ? colors.primary : colors.textSecondary}>
                      {reminder.frequency}
                    </AppText>
                  </View>
                  <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6}}><Icon name="clock" size={16} color={colors.primary} /><AppText variant="bodySM">{reminder.time}</AppText></View>
                </View>
              </View>
              <View style={[styles.reminderIconWrap, { backgroundColor: reminder.color + '18' } ]}>
                <AppText variant="bodySM">{reminder.icon}</AppText>
              </View>
            </View>
          ))}
        </View>

        {/* Add Custom Reminder CTA */}
        <TouchableOpacity style={[styles.addBtn, { borderColor: colors.primary + '40', marginHorizontal: 16, marginTop: 8 } ]}>
          <Icon name="add" size={20} color={colors.primary} />
          <AppText variant="bodySM">إضافة تذكير جديد</AppText>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  hBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  statsRow: { flexDirection: 'row-reverse', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: 12 },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statBorder: { borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  statNum: { color: '#fff', fontSize: 20, fontFamily: 'Cairo-ExtraBold' },
  statLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '400' },
  tabBar: { flexDirection: 'row-reverse', borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 13, fontWeight: '700' },
  sectionTitle: { fontSize: 14, fontWeight: '800', textAlign: 'right', marginBottom: 4 },
  insightCard: { borderRadius: 16, borderWidth: 1, padding: 12, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  insightIcon: { fontSize: 24 },
  insightText: { flex: 1, fontSize: 12, fontWeight: '400', textAlign: 'right', lineHeight: 18 },
  insightAction: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  insightActionText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  reminderCard: { borderRadius: 18, padding: 14, flexDirection: 'row-reverse', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  reminderIconWrap: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  reminderInfo: { flex: 1, alignItems: 'flex-end', gap: 4 },
  reminderTitleRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  reminderTitle: { fontSize: 14, fontWeight: '800' },
  reminderSubtitle: { fontSize: 12, fontWeight: '400' },
  reminderMeta: { flexDirection: 'row-reverse', gap: 10 },
  reminderTime: { fontSize: 11, fontWeight: '700' },
  reminderFreq: { fontSize: 11, fontWeight: '700' },
  reminderRight: { alignItems: 'center', gap: 6 },
  streakBadge: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  streakText: { fontSize: 10, fontWeight: '800' },
  aiBadge: { borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  aiBadgeText: { fontSize: 9, fontWeight: '800' },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 14, fontWeight: '400' },
  addBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', paddingVertical: 14 },
  addBtnText: { fontSize: 14, fontWeight: '700' },
});
