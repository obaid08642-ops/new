// @ts-nocheck
// app/notifications/index.tsx — Grouped notifications by System, Medical, Promotions
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon, IconName } from '../../src/components/Icon';
import { AppText, Card, Badge, Chip, IconButton } from '../../src/components/ui';

type CategoryGroup = 'system' | 'medical' | 'promotion';

interface Notif {
  id: string;
  title: string;
  body: string;
  time: string;
  group: CategoryGroup;
  read: boolean;
  route?: string;
  icon: IconName;
  color: string;
}

const NOTIFS: Notif[] = [
  { id: '1', title: 'موعدك بعد ساعة', body: 'د. محمد أحمد — استشارة فيديو 2:00 م', time: 'منذ 30 دقيقة', group: 'medical', read: false, route: '/consultations/waiting-room', icon: 'doctor', color: '#23B5CE' },
  { id: '2', title: 'وقت جرعة ميتفورمين', body: '1 حبة — 500mg — بعد الأكل', time: 'منذ ساعة', group: 'medical', read: false, route: '/health/reminders', icon: 'medication', color: '#16A34A' },
  { id: '3', title: 'طلب صلاحيات عائلية جديد', body: 'أحمد محمد يطلب الوصول لبياناتك الصحية — اضغط للقبول أو الرفض', time: 'منذ 5 دقائق', group: 'system', read: false, route: '/family/permissions', icon: 'users', color: '#7A6BEA' },
  { id: '4', title: 'تم تعديل صلاحياتك', body: 'سارة أحمد عدّلت صلاحيات الوصول لبياناتك العائلية', time: 'منذ ساعة', group: 'system', read: true, route: '/family/hub', icon: 'shield', color: '#64748B' },
  { id: '5', title: 'خصم 25% على الاستشارات', body: 'استخدم كود: NABDAH25 — ينتهي غداً', time: 'أمس', group: 'promotion', read: true, icon: 'gift', color: '#F0A526' },
  { id: '6', title: 'نتائج تحاليلك جاهزة', body: 'تحاليل دم شاملة — مختبرات البرج', time: 'منذ 3 ساعات', group: 'medical', read: false, route: '/reports/timeline', icon: 'science', color: '#7A6BEA' },
  { id: '7', title: 'تنبيه: أوشك مخزون دوائك على النفاد', body: 'منظم السكر Metformin متبقي 5 أيام. اضغط لإعادة الصرف الفوري.', time: 'منذ ساعتين', group: 'medical', read: false, route: '/health/refills', icon: 'warning', color: '#F0695C' },
  { id: '8', title: 'عرض استرجاع كاشباك جديد', body: 'احصل على 10% كاشباك فوري عند الحجز باستخدام المحفظة هذا الأسبوع.', time: 'أمس', group: 'promotion', read: true, route: '/loyalty/hub', icon: 'wallet', color: '#10B981' }
];

const GROUP_CONFIG: Record<CategoryGroup, { label: string; icon: IconName; color: string }> = {
  system: { label: 'نظامي', icon: 'settings', color: '#64748B' },
  medical: { label: 'طبي', icon: 'doctor', color: '#23B5CE' },
  promotion: { label: 'عروض', icon: 'gift', color: '#F0A526' }
};

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [filter, setFilter] = useState<CategoryGroup | 'all'>('all');
  const [notifs, setNotifs] = useState(NOTIFS);

  const filtered = filter === 'all' ? notifs : notifs.filter(n => n.group === filter);
  const unreadCount = notifs.filter(n => !n.read).length;

  const markAllRead = () => setNotifs(p => p.map(n => ({ ...n, read: true })));

  return (
    <View style={[st.c, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[st.hdr, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.borderLight } ]}>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllRead}><AppText variant="labelMD" color={colors.primary}>قراءة الكل</AppText></TouchableOpacity>
        ) : <View style={{ width: 60 }}/>}
        <View style={{ alignItems: 'center' }}>
          <AppText variant="h4">الإشعارات</AppText>
          {unreadCount > 0 && <AppText variant="caption" color={colors.primary}>{unreadCount} جديد</AppText>}
        </View>
        <IconButton icon="back" onPress={() => {
          if (router.canGoBack()) router.back();
          else router.replace('/');
        }} />
      </View>

      {/* Categories chips (System, Medical, Promotions) */}
      <View style={{ paddingVertical: 12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row-reverse', gap: 10, paddingHorizontal: 16 }}>
          <TouchableOpacity onPress={() => setFilter('all')} style={[st.filterChip, filter === 'all' ? { backgroundColor: colors.primary, borderColor: colors.primary } : { backgroundColor: colors.surface, borderColor: colors.borderLight }]} >
            <AppText variant="bodySM" color={filter === 'all' ? '#fff' : colors.textPrimary}>الكل</AppText>
          </TouchableOpacity>
          {(Object.keys(GROUP_CONFIG) as CategoryGroup[]).map(g => (
            <TouchableOpacity key={g} onPress={() => setFilter(g)} style={[st.filterChip, filter === g ? { backgroundColor: GROUP_CONFIG[g].color, borderColor: GROUP_CONFIG[g].color } : { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              <Icon name={GROUP_CONFIG[g].icon} size={16} color={filter === g ? '#fff' : GROUP_CONFIG[g].color} />
              <AppText variant="bodySM" color={filter === g ? '#fff' : colors.textPrimary}>{GROUP_CONFIG[g].label}</AppText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Notifications feed */}
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}>
        {filtered.map(n => {
          const cfg = GROUP_CONFIG[n.group];
          return (
            <TouchableOpacity key={n.id} activeOpacity={0.85} onPress={() => n.route && router.push(n.route as any)}>
              <Card style={[st.notifCard, !n.read && { backgroundColor: isDark ? 'rgba(35,181,206,0.1)' : '#DEF5F9' } ]}>
                <View style={{ flexDirection: 'row-reverse', gap: 12, alignItems: 'flex-start' }}>
                  <View style={[st.nIcon, { backgroundColor: n.color + '25' } ]}>
                    <Icon name={n.icon} size={22} color={n.color} />
                  </View>
                  <View style={{ flex: 1, alignItems: 'flex-end', gap: 3 }}>
                    <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', width: '100%' }}>
                      <AppText variant="h6">{n.title}</AppText>
                      {!n.read && <View style={[st.unreadDot, { backgroundColor: colors.primary }]} />}
                    </View>
                    <AppText variant="bodySM" color={colors.textSecondary}>{n.body}</AppText>
                    <AppText variant="caption" color={colors.textTertiary}>{n.time}</AppText>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  notifCard: { shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, padding: 14 },
  nIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  filterChip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 }
});
