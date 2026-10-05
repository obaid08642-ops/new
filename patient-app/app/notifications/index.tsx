import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { AppHeader, Chip, EmptyState, ErrorState, FIcon, OfflineState, Screen, SectionHeader, Skeleton } from '../../../packages/ui-native/src';
import { COLUMN, step as scale, tint, useScreenUi } from '../../src/components/screen/ScreenKit';
import { useOptimisticMutation } from '../../src/hooks/useOptimisticMutation';
import { translateBackendRoute } from '../../src/hooks/usePushNotifications';
import { isApiError } from '../../src/services/http/errors';
import { outbox } from '../../src/services/offline/outbox';
import { apiFetch } from '../../src/utils/api';
import { dateLocale } from '../../src/utils/dates';
import { isOffline } from '../../src/utils/isOffline';
import {
  BELL,
  GROUPS,
  buildFeed,
  mapNotification,
  relativeTime,
  type FeedItem,
  type Notif,
  type NotifGroup,
  type RawNotification,
} from '../../src/utils/notificationsFeed';

/**
 * Notifications — board Notifications (canvas/Notifications.dc.html).
 *
 * Back button, centred title and "Read all" in the header; the feed in two white cards, "Today" and "Earlier",
 * one row per notification: the type's filled icon on its soft tone, the title (bold while unread), the body, the
 * time, and a coral dot when unread. The system / medical / offers filter is kept as the board's chips, shown
 * only when there is something to filter. All data is the real feed; a missing time is simply not drawn.
 *
 * 15.3/15.4: marking a notification read is a SAFE action, so it is applied to local
 * state immediately through `useOptimisticMutation` — which is deny-by-default, so
 * `mark-read` has to be on the allowlist for the local change to happen at all — and
 * the previous state is restored (with the catalogue reason) if the server refuses.
 * A write that never reached the server because there is no connection goes into the
 * outbox instead, and replays in order on reconnect rather than rolling back.
 */

const CARD_RADIUS = 24;

function Row({ item, onOpen }: { item: Extract<FeedItem, { kind: 'row' }>; onOpen: (n: Notif) => void }) {
  const { theme, t, c, flow, tr } = useScreenUi();
  const { n, first, last } = item;
  const time = relativeTime(n.createdAt, tr, dateLocale());
  return (
    // the card is drawn row by row (surface, hairline ring, rounded ends) so a long feed stays virtualised
    <View
      style={{
        backgroundColor: c.bg.surface,
        borderColor: c.border.hairline,
        borderStartWidth: 1,
        borderEndWidth: 1,
        borderTopWidth: first ? 1 : 0,
        borderBottomWidth: last ? 1 : 0,
        borderTopStartRadius: first ? CARD_RADIUS : 0,
        borderTopEndRadius: first ? CARD_RADIUS : 0,
        borderBottomStartRadius: last ? CARD_RADIUS : 0,
        borderBottomEndRadius: last ? CARD_RADIUS : 0,
        overflow: 'hidden',
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={[n.title, n.body, time, n.read ? '' : tr('جديد')].filter(Boolean).join('. ')}
        onPress={() => onOpen(n)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          gap: 12,
          padding: 14,
          minHeight: 44,
          // the board's unread row: a whisper of the action colour over the surface
          backgroundColor: n.read ? 'transparent' : tint(c.action.primary.bg, 0.03),
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <FIcon icon={n.icon} tone={n.tone} size={42} theme={theme} />
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Text style={{ ...scale(t, 'segment', n.read ? 'medium' : 'bold'), color: c.text.primary, ...flow }}>{n.title}</Text>
          {n.body ? <Text style={{ ...scale(t, 'label', 'regular'), lineHeight: 19, color: c.text.secondary, ...flow }}>{n.body}</Text> : null}
          {time ? <Text style={{ ...scale(t, 'micro', 'regular'), color: c.text.tertiary, ...flow }}>{time}</Text> : null}
        </View>
        {!n.read ? <View accessibilityElementsHidden style={{ width: 8, height: 8, borderRadius: 4, marginTop: 6, backgroundColor: c.action.primary.bg }} /> : null}
      </Pressable>
      {!last ? <View style={{ height: 1, backgroundColor: c.border.subtle }} /> : null}
    </View>
  );
}

/** Four placeholder rows in one card while the first load runs. */
function FeedSkeleton() {
  const { theme, c, tr } = useScreenUi();
  return (
    <View accessibilityLabel={tr('جاري التحميل...')} accessibilityState={{ busy: true }} style={{ ...COLUMN, paddingHorizontal: 16, paddingTop: 8, gap: 16 }}>
      <Skeleton variant="title" width="half" theme={theme} />
      <View style={{ borderRadius: CARD_RADIUS, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 12, padding: 14, borderBottomWidth: i === 3 ? 0 : 1, borderBottomColor: c.border.subtle }}>
            <Skeleton variant="circle" theme={theme} />
            <View style={{ flex: 1 }}>
              <Skeleton lines={3} theme={theme} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function NotificationsScreen() {
  const { theme, t, c, dir, tr, lang } = useScreenUi();
  const [filter, setFilter] = useState<NotifGroup | 'all'>('all');
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState<'error' | 'offline' | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setFailed(null);
    try {
      const rows = await apiFetch<RawNotification[]>('/notifications');
      setNotifs((Array.isArray(rows) ? rows : []).map(mapNotification));
    } catch {
      setFailed((await isOffline()) ? 'offline' : 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const unread = notifs.filter((n) => !n.read).length;
  const groups = useMemo(() => GROUPS.filter((g) => notifs.some((n) => n.group === g.key)), [notifs]);
  // a filter whose group is gone (after a refresh) falls back to "All"
  useEffect(() => {
    if (filter !== 'all' && !groups.some((g) => g.key === filter)) setFilter('all');
  }, [filter, groups]);
  const feed = useMemo(() => buildFeed(filter === 'all' ? notifs : notifs.filter((n) => n.group === filter)), [notifs, filter]);

  // 15.3 + 15.4 — the write behind a read receipt. Applied optimistically by the
  // mutations below; if the request never reached the server (a transport failure
  // with no connection) it is handed to the outbox so it is replayed in order on
  // reconnect instead of being rolled back. A server refusal still propagates, and
  // the mutation restores the unread state.
  const sendReadReceipt = async (endpoint: string): Promise<void> => {
    try {
      await apiFetch(endpoint, { method: 'POST' });
    } catch (error) {
      if (isApiError(error) && error.transportFailure) {
        await outbox.submit({ kind: 'mark-read', method: 'POST', endpoint });
        return;
      }
      throw error;
    }
  };

  const markAllReadMutation = useOptimisticMutation<Notif[]>({
    kind: 'mark-read',
    read: () => notifs,
    write: setNotifs,
    apply: (current) => current.map((n) => ({ ...n, read: true })),
    locale: lang === 'en' ? 'en' : 'ar',
  });

  // Which single row is being marked, so "read one" only touches that row.
  const markingIdRef = React.useRef<string | null>(null);
  const markOneReadMutation = useOptimisticMutation<Notif[]>({
    kind: 'mark-read',
    read: () => notifs,
    write: setNotifs,
    apply: (current) => current.map((x) => (x.id === markingIdRef.current ? { ...x, read: true } : x)),
    locale: lang === 'en' ? 'en' : 'ar',
  });

  const markAllRead = () => {
    void markAllReadMutation.run(() => sendReadReceipt('/notifications/read-all'));
  };

  const openNotif = (n: Notif) => {
    if (!n.read) {
      markingIdRef.current = n.id;
      void markOneReadMutation
        .run(() => sendReadReceipt(`/notifications/${n.id}/read`))
        .finally(() => {
          markingIdRef.current = null;
        });
    }
    // Backend routes use the server vocabulary (/tracking/lab/:id, /orders/:id ...): translate them to app paths,
    // pushing them raw would land on an unmatched route.
    if (n.route) {
      const translated = translateBackendRoute(n.route);
      if (translated) router.push({ pathname: translated.pathname, params: translated.params || {} } as Href);
    }
  };

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/' as Href);
  };

  const header = (
    <View style={COLUMN}>
      <AppHeader
        title={tr('الإشعارات')}
        onBack={back}
        backLabel={tr('رجوع')}
        theme={theme}
        direction={dir}
        trailing={
          unread > 0 ? (
            <Pressable accessibilityRole="button" accessibilityLabel={tr('قراءة الكل')} disabled={markAllReadMutation.pending} onPress={markAllRead} hitSlop={6} style={{ minHeight: 44, paddingHorizontal: 4, justifyContent: 'center' }}>
              <Text style={{ ...scale(t, 'caption', 'bold'), color: c.text.link }}>{tr('قراءة الكل')}</Text>
            </Pressable>
          ) : undefined
        }
      />
      {notifs.length > 0 && groups.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 6 }}>
          <Chip label={tr('الكل')} selected={filter === 'all'} onPress={() => setFilter('all')} theme={theme} />
          {groups.map((g) => (
            <Chip key={g.key} label={tr(g.label)} selected={filter === g.key} onPress={() => setFilter(g.key)} theme={theme} />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );

  const refresh = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        void load(true);
      }}
      tintColor={c.text.primary}
    />
  );

  const emptyState =
    failed && notifs.length === 0 ? (
      failed === 'offline' ? (
        <OfflineState title={tr('لا يوجد اتصال بالإنترنت')} body={tr('اتصل بالشبكة ثم حاول مرة أخرى.')} retryLabel={tr('إعادة المحاولة')} onRetry={() => void load()} theme={theme} />
      ) : (
        <ErrorState title={tr('تعذر تحميل الإشعارات')} body={tr('تحقق من اتصالك ثم حاول مرة أخرى.')} retryLabel={tr('إعادة المحاولة')} onRetry={() => void load()} theme={theme} />
      )
    ) : (
      <EmptyState icon={BELL.icon} tone={BELL.tone} title={tr('لا توجد إشعارات بعد')} body={tr('ستظهر هنا تنبيهات مواعيدك وأدويتك وعروضك')} theme={theme} />
    );

  return (
    <Screen theme={theme} direction={dir} header={header} testID="notifications-screen">
      {loading ? (
        <FeedSkeleton />
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={feed}
          keyExtractor={(i) => i.key}
          refreshControl={refresh}
          initialNumToRender={15}
          maxToRenderPerBatch={15}
          windowSize={7}
          contentContainerStyle={{ ...COLUMN, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40, flexGrow: 1 }}
          ListEmptyComponent={<View style={{ flex: 1, justifyContent: 'center' }}>{emptyState}</View>}
          renderItem={({ item }) =>
            item.kind === 'title' ? (
              <View style={{ marginTop: item.section === 'earlier' && feed[0]?.key !== item.key ? 24 : 0, marginBottom: 10 }}>
                <SectionHeader title={tr(item.section === 'today' ? 'اليوم' : 'سابقًا')} theme={theme} />
              </View>
            ) : (
              <Row item={item} onOpen={openNotif} />
            )
          }
        />
      )}
    </Screen>
  );
}
