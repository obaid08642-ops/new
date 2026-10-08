// app/settings/sessions.tsx — 23.6 "Active sessions" + login & device history.
//
// Contract (built in parallel by the backend agent — code against it exactly):
//   GET /api/v1/patient/security/sessions → own active sessions + login/device history
// (called below as `/patient/security/sessions` because apiFetch's BASE_URL
// already carries the `/api/v1` prefix).
//
// Revocation reuses the SAME resource path per item
// (DELETE /patient/security/sessions/:id); no second path is invented. When the
// backend answers 404/405 the screen degrades to an honest list-only view with
// a note instead of dead buttons. No mock data: every row comes from the
// server, and an unbuilt backend shows an honest "not available yet" state.
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
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';

export const SESSIONS_PATH = '/patient/security/sessions';

interface SessionItem {
  id: string;
  device: string;
  platform?: string | null;
  ip?: string | null;
  location?: string | null;
  userAgent?: string | null;
  appVersion?: string | null;
  lastActive?: string | null;
  createdAt?: string | null;
  current?: boolean;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

function normalizeSession(raw: unknown, index: number): SessionItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = str(r.id ?? r.session_id ?? r._id);
  if (!id) return null;
  const device =
    str(r.device_label ?? r.device ?? r.device_name ?? r.platform) || `جهاز ${index + 1}`;
  return {
    id,
    device,
    platform: typeof r.platform === 'string' ? (r.platform as string) : null,
    ip: typeof r.ip === 'string' ? (r.ip as string) : typeof r.ip_address === 'string' ? (r.ip_address as string) : null,
    location: typeof r.location === 'string' ? (r.location as string) : typeof r.city === 'string' ? (r.city as string) : null,
    userAgent: typeof r.user_agent === 'string' ? (r.user_agent as string) : null,
    appVersion: typeof r.app_version === 'string' ? (r.app_version as string) : null,
    lastActive:
      typeof r.last_active_at === 'string'
        ? (r.last_active_at as string)
        : typeof r.last_seen_at === 'string'
          ? (r.last_seen_at as string)
          : typeof r.updatedAt === 'string'
            ? (r.updatedAt as string)
            : null,
    createdAt:
      typeof r.created_at === 'string'
        ? (r.created_at as string)
        : typeof r.createdAt === 'string'
          ? (r.createdAt as string)
          : typeof r.login_at === 'string'
            ? (r.login_at as string)
            : null,
    current: r.current === true || r.is_current === true,
  };
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  try {
    const t = new Date(d);
    if (Number.isNaN(t.getTime())) return '—';
    return t.toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return '—';
  }
}

export default function ActiveSessionsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [historyCount, setHistoryCount] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [notAvailable, setNotAvailable] = useState<boolean>(false);
  const [revokeUnsupported, setRevokeUnsupported] = useState<boolean>(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState<boolean>(false);

  const load = useCallback(async () => {
    setError(null);
    setNotAvailable(false);
    try {
      const res = await apiFetch<unknown>(SESSIONS_PATH);
      let list: unknown[] = [];
      let hist: unknown[] = [];
      if (Array.isArray(res)) {
        list = res;
      } else if (res && typeof res === 'object') {
        const r = res as Record<string, unknown>;
        const firstArrayKey = ['sessions', 'active', 'active_sessions', 'data', 'items'].find(
          (k) => Array.isArray(r[k]),
        );
        list = firstArrayKey ? (r[firstArrayKey] as unknown[]) : [];
        const histKey = ['history', 'logins', 'login_history', 'devices', 'device_history'].find(
          (k) => Array.isArray(r[k]),
        );
        hist = histKey ? (r[histKey] as unknown[]) : [];
      }
      const items = [...list, ...hist]
        .map((s, i) => normalizeSession(s, i))
        .filter((s): s is SessionItem => s !== null);
      // De-duplicate by id, active sessions first.
      const seen = new Set<string>();
      const deduped = items.filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)));
      deduped.sort((a, b) => Number(b.current ?? false) - Number(a.current ?? false));
      setSessions(deduped);
      setHistoryCount(hist.length > 0 ? hist.length : null);
    } catch (e: unknown) {
      const status = (e as { status?: number | null })?.status;
      if (status === 404) {
        // Backend task 23.6 not deployed yet — honest, with retry. Never mock rows.
        setNotAvailable(true);
        setSessions([]);
      } else {
        try {
          setError(describeError(e).message || 'تعذر تحميل الجلسات');
        } catch {
          setError('تعذر تحميل الجلسات — تحقق من الاتصال وحاول مرة أخرى');
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

  const markRevokeUnsupported = useCallback((): void => {
    setRevokeUnsupported(true);
  }, []);

  type RevokeResult = 'ok' | 'unsupported' | 'error';

  const revokeOne = useCallback(
    async (id: string): Promise<RevokeResult> => {
      try {
        await apiFetch(`${SESSIONS_PATH}/${encodeURIComponent(id)}`, { method: 'DELETE' });
        return 'ok';
      } catch (e: unknown) {
        const status = (e as { status?: number | null })?.status;
        if (status === 404 || status === 405) {
          markRevokeUnsupported();
          return 'unsupported';
        }
        try {
          showLocalizedAlert('تعذّر إنهاء الجلسة', describeError(e).message);
        } catch {
          showLocalizedAlert('تعذّر إنهاء الجلسة', 'حدث خطأ — حاول مرة أخرى');
        }
        return 'error';
      }
    },
    [markRevokeUnsupported],
  );

  const confirmRevoke = useCallback(
    (s: SessionItem) => {
      showLocalizedAlert(
        'إنهاء الجلسة',
        `سيتم تسجيل الخروج من «${s.device}» فوراً.`,
        [
          { text: 'إلغاء', style: 'cancel' },
          {
            text: 'إنهاء',
            style: 'destructive',
            onPress: () => {
              void (async () => {
                setRevoking(s.id);
                try {
                  const result = await revokeOne(s.id);
                  if (result === 'ok') setSessions((prev) => prev.filter((x) => x.id !== s.id));
                } finally {
                  setRevoking(null);
                }
              })();
            },
          },
        ],
      );
    },
    [revokeOne],
  );

  const revokeOthers = useCallback(() => {
    const others = sessions.filter((s) => !s.current);
    if (others.length === 0) return;
    showLocalizedAlert(
      'إنهاء الجلسات الأخرى',
      `سيتم تسجيل الخروج من ${others.length} جهاز آخر.`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'إنهاء الكل',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setRevokingAll(true);
              try {
                const snapshot = sessions.filter((s) => !s.current);
                let unsupported = false;
                const removed = new Set<string>();
                for (const s of snapshot) {
                  const result = await revokeOne(s.id);
                  if (result === 'unsupported') {
                    unsupported = true;
                    break;
                  }
                  if (result === 'ok') removed.add(s.id);
                }
                // On `unsupported` the server state is unknown — re-list instead
                // of guessing. Otherwise drop exactly the revoked rows.
                if (unsupported) {
                  setRevokingAll(false);
                  void load();
                  return;
                }
                setSessions((prev) => prev.filter((x) => !removed.has(x.id)));
              } finally {
                setRevokingAll(false);
              }
            })();
          },
        },
      ],
    );
  }, [sessions, revokeOne, load]);

  const othersCount = sessions.filter((s) => !s.current).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 8, backgroundColor: isDark ? colors.surface : colors.white },
        ]}
      >
        <AppText variant="h4">الجلسات النشطة</AppText>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="رجوع">
          <Icon name="back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
          <AppText variant="bodySM" color={colors.textSecondary} style={styles.hint}>
            جاري تحميل الجلسات…
          </AppText>
        </View>
      ) : notAvailable ? (
        <View style={styles.center}>
          <Icon name="shield" size={44} color={colors.textTertiary} />
          <AppText variant="h5" style={styles.title}>
            سجل الجلسات غير متاح بعد
          </AppText>
          <AppText variant="bodySM" color={colors.textSecondary} style={styles.sub}>
            مسار الخادم (GET /api/v1/patient/security/sessions) لم يُنشر بعد. لا توجد بيانات
            معروضة — ولن تُعرض بيانات وهمية.
          </AppText>
          <Button label="إعادة المحاولة" variant="outline" full={false} onPress={() => { setLoading(true); void load(); }} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Icon name="error" size={44} color={colors.error} />
          <AppText variant="h5" style={styles.title}>
            تعذر تحميل الجلسات
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
              الأجهزة المسجلة ({sessions.length}
              {historyCount != null ? ` — منها ${historyCount} في سجل الدخول` : ''})
            </AppText>
            {!revokeUnsupported && othersCount > 0 && (
              <Button
                label={revokingAll ? 'جاري الإنهاء…' : `إنهاء الجلسات الأخرى (${othersCount})`}
                variant="danger"
                loading={revokingAll}
                disabled={revokingAll}
                onPress={revokeOthers}
                style={styles.revokeAll}
              />
            )}
            {revokeUnsupported && (
              <AppText variant="caption" color={colors.textTertiary} style={styles.note}>
                العرض فقط حالياً — إنهاء الجلسات عن بُعد غير مدعوم من الخادم بعد.
              </AppText>
            )}
          </Card>

          {sessions.length === 0 ? (
            <View style={styles.center}>
              <Icon name="shield" size={44} color={colors.textTertiary} />
              <AppText variant="bodySM" color={colors.textSecondary} style={styles.hint}>
                لا توجد جلسات مسجلة على حسابك.
              </AppText>
            </View>
          ) : (
            sessions.map((s) => (
              <Card key={s.id}>
                <View style={styles.row}>
                  <View style={[styles.icon, { backgroundColor: s.current ? '#DCFCE7' : colors.surfaceSecondary }]}>
                    <Icon name="user" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.info}>
                    <View style={styles.titleRow}>
                      <AppText variant="labelLG">{s.device}</AppText>
                      {s.current && (
                        <View style={[styles.currentChip, { backgroundColor: '#DCFCE7' }]}>
                          <AppText variant="caption" color="#16A34A">
                            هذا الجهاز
                          </AppText>
                        </View>
                      )}
                    </View>
                    <AppText variant="caption" color={colors.textSecondary}>
                      {s.platform ? `${s.platform} · ` : ''}{s.appVersion ? `إصدار ${s.appVersion} · ` : ''}{s.ip ? `IP: ${s.ip}` : 'IP غير مسجل'}
                    </AppText>
                    {!!s.location && (
                      <AppText variant="caption" color={colors.textSecondary}>
                        {s.location}
                      </AppText>
                    )}
                    <AppText variant="caption" color={colors.textTertiary}>
                      آخر نشاط: {fmtDate(s.lastActive)} · أول دخول: {fmtDate(s.createdAt)}
                    </AppText>
                  </View>
                  {!s.current && !revokeUnsupported && (
                    <TouchableOpacity
                      onPress={() => confirmRevoke(s)}
                      disabled={revoking === s.id}
                      accessibilityRole="button"
                      accessibilityLabel={`إنهاء جلسة ${s.device}`}
                      style={[styles.endBtn, { backgroundColor: colors.errorSurface, opacity: revoking === s.id ? 0.5 : 1 }]}
                    >
                      <AppText variant="caption" color={colors.error}>
                        {revoking === s.id ? 'جاري…' : 'إنهاء'}
                      </AppText>
                    </TouchableOpacity>
                  )}
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
  revokeAll: { marginTop: 10 },
  note: { marginTop: 8 },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  icon: { width: 44, height: 44, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1, alignItems: 'flex-end', gap: 2 },
  titleRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  currentChip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  endBtn: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
});
