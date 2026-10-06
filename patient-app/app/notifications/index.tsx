// @ts-nocheck
// app/notifications/index.tsx — Grouped notifications by System, Medical, Promotions (real backend feed)
import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, StatusBar, TouchableOpacity, ActivityIndicator, RefreshControl, FlatList } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon, IconName } from '../../src/components/Icon';
import { AppText, Card, IconButton } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';
import { translateBackendRoute } from '../../src/hooks/usePushNotifications';
import { dateLocale } from '@/utils/dates';

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

// Map backend notification.type → display group + icon + color
const TYPE_META: Record<string, { group: CategoryGroup; icon: IconName; color: string }> = {
  appointment:  { group: 'medical',   icon: 'doctor',     color: '#23B5CE' },
  prescription: { group: 'medical',   icon: 'medication', color: '#16A34A' },
  medication:   { group: 'medical',   icon: 'medication', color: '#16A34A' },
  emergency:    { group: 'medical',   icon: 'warning',    color: '#F0695C' },
  labs:         { group: 'medical',   icon: 'science',    color: '#7A6BEA' },
  promo:        { group: 'promotion', icon: 'gift',       color: '#F0A526' },
  order:        { group: 'system',    icon: 'document',     color: '#64748B' },
  alert:        { group: 'system',    icon: 'warning',    color: '#F0695C' },
  info:         { group: 'system',    icon: 'info',       color: '#64748B' },
};
const DEFAULT_META = TYPE_META.info;

const GROUP_CONFIG: Record<CategoryGroup, { label: string; icon: IconName; color: string }> = {
  system: { label: 'نظامي', icon: 'settings', color: '#64748B' },
  medical: { label: 'طبي', icon: 'doctor', color: '#23B5CE' },
  promotion: { label: 'عروض', icon: 'gift', color: '#F0A526' }
};

function relativeTime(iso?: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'أمس';
  if (days < 30) return `منذ ${days} يوم`;
  return new Date(iso).toLocaleDateString(dateLocale());
}

function mapNotification(n: any): Notif {
  const meta = TYPE_META[n.type] || DEFAULT_META;
  return {
    id: n.id,
    title: n.title || '',
    body: n.body || '',
    time: relativeTime(n.createdAt),
    group: meta.group,
    read: !!n.read,
    route: n.action?.route,
    icon: meta.icon,
    color: meta.color,
  };
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [filter, setFilter] = useState<CategoryGroup | 'all'>('all');
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(false);
    try {
      const rows = await apiFetch<any[]>('/notifications');
      setNotifs((Array.isArray(rows) ? rows : []).map(mapNotification));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === 'all' ? notifs : notifs.filter(n => n.group === filter);
  const unreadCount = notifs.filter(n => !n.read).length;

  const markAllRead = async () => {
    setNotifs(p => p.map(n => ({ ...n, read: true })));
    try { await apiFetch('/notifications/read-all', { method: 'POST' }); }
    catch { load(true); } // revert by reloading on failure
  };

  const openNotif = async (n: Notif) => {
    if (!n.read) {
      setNotifs(p => p.map(x => x.id === n.id ? { ...x, read: true } : x));
      apiFetch(`/notifications/${n.id}/read`, { method: 'POST' }).catch(() => {});
    }
    // Backend routes use the server vocabulary (/tracking/lab/:id, /orders/:id …) —
    // translate to real app paths; pushing raw would hit an unmatched-route blank screen.
    if (n.route) {
      const translated = translateBackendRoute(n.route);
      if (translated) router.push({ pathname: translated.pathname as any, params: translated.params || {} });
    }
  };

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
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={colors.primary} />}
          initialNumToRender={15}
          maxToRenderPerBatch={15}
          windowSize={7}
          removeClippedSubviews
          ListEmptyComponent={
            error && notifs.length === 0 ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <Icon name="warning" size={44} color={colors.textTertiary} />
                <AppText variant="bodyMD" color={colors.textSecondary}>تعذر تحميل الإشعارات</AppText>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="إعادة المحاولة" onPress={() => load()} style={[st.filterChip, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                  <AppText variant="bodySM" color="#fff">إعادة المحاولة</AppText>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <Icon name="bell" size={44} color={colors.textTertiary} />
                <AppText variant="bodyMD" color={colors.textSecondary}>لا توجد إشعارات بعد</AppText>
                <AppText variant="caption" color={colors.textTertiary}>ستظهر هنا تنبيهات مواعيدك وأدويتك وعروضك</AppText>
              </View>
            )
          }
          renderItem={({ item: n }) => (
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${n.title}. ${n.body}`} activeOpacity={0.85} onPress={() => openNotif(n)}>
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
                    {!!n.time && <AppText variant="caption" color={colors.textTertiary}>{n.time}</AppText>}
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          )}
        />
      )}
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
