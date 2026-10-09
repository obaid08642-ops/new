// app/settings/history-events.tsx — 23.6 own audit events for PDPL export.
//
// Contract (built in parallel by the backend agent — code against it exactly):
//   GET /api/v1/patient/history/events → own audit events for PDPL export
// (called below as `/patient/history/events` because apiFetch's BASE_URL
// already carries the `/api/v1` prefix).
//
// No mock data: an unbuilt backend shows an honest "not available yet" state,
// and the PDPL export (settings/privacy) includes these events only when the
// server actually returns them.
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Button, Card } from '../../src/components/ui';
import { apiFetch, describeError } from '../../src/utils/api';

export const HISTORY_EVENTS_PATH = '/patient/history/events';

export interface AuditEvent {
  id: string;
  action: string;
  entity: string;
  at: string | null;
  actorRole?: string | null;
  ip?: string | null;
  device?: string | null;
  reason?: string | null;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

export function normalizeAuditEvent(raw: unknown, index: number): AuditEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const action = str(r.action ?? r.event ?? r.type);
  if (!action) return null;
  const at =
    typeof r.at === 'string'
      ? (r.at as string)
      : typeof r.created_at === 'string'
        ? (r.created_at as string)
        : typeof r.createdAt === 'string'
          ? (r.createdAt as string)
          : typeof r.timestamp === 'string'
            ? (r.timestamp as string)
            : null;
  return {
    id: str(r.id ?? r._id ?? r.event_id) || `event-${index}`,
    action,
    entity: str(r.entity ?? r.entity_type ?? r.resource_kind) || '—',
    at,
    actorRole: typeof r.actor_role === 'string' ? (r.actor_role as string) : typeof r.role === 'string' ? (r.role as string) : null,
    ip: typeof r.ip === 'string' ? (r.ip as string) : typeof r.ip_address === 'string' ? (r.ip_address as string) : null,
    device: typeof r.device === 'string' ? (r.device as string) : typeof r.device_label === 'string' ? (r.device_label as string) : null,
    reason: typeof r.reason === 'string' ? (r.reason as string) : null,
  };
}

export function fmtDateTime(d: string | null): string {
  if (!d) return '—';
  try {
    const t = new Date(d);
    if (Number.isNaN(t.getTime())) return '—';
    return t.toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return '—';
  }
}

export default function HistoryEventsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [notAvailable, setNotAvailable] = useState<boolean>(false);

  const load = useCallback(async () => {
    setError(null);
    setNotAvailable(false);
    try {
      const res = await apiFetch<unknown>(`${HISTORY_EVENTS_PATH}?limit=100`);
      const list = Array.isArray(res)
        ? res
        : res && typeof res === 'object'
          ? (() => {
              const r = res as Record<string, unknown>;
              const key = ['events', 'data', 'items'].find((k) => Array.isArray(r[k]));
              return key ? (r[key] as unknown[]) : [];
            })()
          : [];
      setEvents(
        list.map((e, i) => normalizeAuditEvent(e, i)).filter((e): e is AuditEvent => e !== null),
      );
    } catch (e: unknown) {
      const status = (e as { status?: number | null })?.status;
      if (status === 404) {
        setNotAvailable(true);
        setEvents([]);
      } else {
        try {
          setError(describeError(e).message || 'تعذر تحميل سجل النشاط');
        } catch {
          setError('تعذر تحميل سجل النشاط — تحقق من الاتصال وحاول مرة أخرى');
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 8, backgroundColor: isDark ? colors.surface : colors.white },
        ]}
      >
        <AppText variant="h4">سجل النشاط</AppText>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="رجوع">
          <Icon name="back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
          <AppText variant="bodySM" color={colors.textSecondary} style={styles.hint}>
            جاري تحميل سجل النشاط…
          </AppText>
        </View>
      ) : notAvailable ? (
        <View style={styles.center}>
          <Icon name="document" size={44} color={colors.textTertiary} />
          <AppText variant="h5" style={styles.title}>
            سجل النشاط غير متاح بعد
          </AppText>
          <AppText variant="bodySM" color={colors.textSecondary} style={styles.sub}>
            مسار الخادم (GET /api/v1/patient/history/events) لم يُنشر بعد. لا توجد بيانات
            معروضة — ولن تُعرض بيانات وهمية.
          </AppText>
          <Button label="إعادة المحاولة" variant="outline" full={false} onPress={() => { setLoading(true); void load(); }} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Icon name="error" size={44} color={colors.error} />
          <AppText variant="h5" style={styles.title}>
            تعذر تحميل سجل النشاط
          </AppText>
          <AppText variant="bodySM" color={colors.textSecondary} style={styles.sub}>
            {error}
          </AppText>
          <Button label="إعادة المحاولة" variant="outline" full={false} onPress={() => { setLoading(true); void load(); }} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); void load(); }}
              colors={[colors.primary]}
            />
          }
        >
          <Card>
            <AppText variant="bodySM" color={colors.textSecondary}>
              أحداث التدقيق الخاصة بك ({events.length}) — تُرفق تلقائياً مع تصدير البيانات
              (PDPL) عند توفرها من الخادم.
            </AppText>
            <TouchableOpacity onPress={() => router.push('/settings/privacy' as any)} style={styles.link}>
              <AppText variant="labelSM" color={colors.primary}>
                الذهاب إلى تصدير بياناتي
              </AppText>
            </TouchableOpacity>
          </Card>

          {events.length === 0 ? (
            <View style={styles.center}>
              <Icon name="document" size={44} color={colors.textTertiary} />
              <AppText variant="bodySM" color={colors.textSecondary} style={styles.hint}>
                لا توجد أحداث مسجلة على حسابك بعد.
              </AppText>
            </View>
          ) : (
            events.map((e) => (
              <Card key={e.id}>
                <View style={styles.row}>
                  <View style={[styles.icon, { backgroundColor: colors.surfaceSecondary }]}>
                    <Icon name="clock" size={18} color={colors.primary} />
                  </View>
                  <View style={styles.info}>
                    <AppText variant="labelLG">{e.action}</AppText>
                    <AppText variant="caption" color={colors.textSecondary}>
                      {e.entity}
                      {e.actorRole ? ` · الدور: ${e.actorRole}` : ''}
                    </AppText>
                    {!!e.reason && (
                      <AppText variant="caption" color={colors.textSecondary}>
                        السبب: {e.reason}
                      </AppText>
                    )}
                    <AppText variant="caption" color={colors.textTertiary}>
                      {fmtDateTime(e.at)}
                      {e.ip ? ` · IP: ${e.ip}` : ''}
                      {e.device ? ` · ${e.device}` : ''}
                    </AppText>
                  </View>
                </View>
              </Card>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  title: { textAlign: 'center', marginTop: 8 },
  sub: { textAlign: 'center', maxWidth: 300 },
  hint: { textAlign: 'center', marginTop: 8 },
  list: { padding: 16, gap: 10, paddingBottom: 90 },
  link: { marginTop: 8, alignSelf: 'flex-end' },
  row: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10 },
  icon: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1, alignItems: 'flex-end', gap: 2 },
});
