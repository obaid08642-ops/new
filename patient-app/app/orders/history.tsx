// app/orders/history.tsx — 23.6 own order/booking status-history view.
//
// No new backend path: it reuses the status-history arrays already embedded in
// the order/booking payloads the app reads today (`status_history` /
// `state_history` on pharmacy orders, lab/radiology/nursing bookings and
// appointments). Sources that fail load show an honest retry banner (same
// `safe()` pattern as the order center); nothing is mocked.
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, IconButton } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';
import { fmtDateTime } from '../settings/history-events';

interface HistoryStep {
  from: string | null;
  to: string;
  at: string | null;
  by: string | null;
  note: string | null;
}

interface HistoryGroup {
  key: string;
  kind: string;
  kindLabel: string;
  title: string;
  status: string;
  steps: HistoryStep[];
  hasHistory: boolean;
}

function str(v: unknown): string | null {
  if (typeof v === 'string' && v.length > 0) return v;
  if (v == null) return null;
  return String(v);
}

function toStep(raw: unknown): HistoryStep | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const to = str(r.to ?? r.state ?? r.status);
  if (!to) return null;
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
    from: str(r.from ?? r.from_state ?? null),
    to,
    at,
    by: str(r.by_user_id ?? r.by ?? r.actor ?? null),
    note: str(r.note ?? r.reason ?? null),
  };
}

function stepsOf(item: unknown): { steps: HistoryStep[]; hasHistory: boolean } {
  if (!item || typeof item !== 'object') return { steps: [], hasHistory: false };
  const r = item as Record<string, unknown>;
  const raw = r.status_history ?? r.state_history;
  if (!Array.isArray(raw)) return { steps: [], hasHistory: false };
  const steps = raw.map(toStep).filter((s): s is HistoryStep => s !== null);
  return { steps, hasHistory: true };
}

const KIND_LABEL: Record<string, string> = {
  pharmacy: 'صيدلية',
  labs: 'تحاليل',
  radiology: 'أشعة',
  nursing: 'تمريض',
  doctors: 'استشارة',
};

function shortId(id: string): string {
  return id.length > 6 ? `#${id.slice(-6)}` : `#${id}`;
}

export default function OrderStatusHistoryScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  const [groups, setGroups] = useState<HistoryGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [failedSources, setFailedSources] = useState<number>(0);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    let failures = 0;
    const safe = async (p: Promise<unknown>): Promise<unknown> => {
      try {
        return await p;
      } catch {
        failures += 1;
        return null;
      }
    };
    const [pharmacyOrders, legacyOrders, labs, rads, nursing, appts] = await Promise.all([
      safe(apiFetch('/patient/pharmacy/orders')),
      safe(apiFetch('/orders/mine')),
      safe(apiFetch('/labs/bookings/mine')),
      safe(apiFetch('/radiology/bookings/mine')),
      safe(apiFetch('/home-care/bookings/my')),
      safe(apiFetch('/care/appointments')),
    ]);
    setFailedSources(failures);

    const arr = (x: unknown): unknown[] =>
      Array.isArray(x) ? x : (x as { data?: unknown[]; items?: unknown[] } | null)?.data ??
        (x as { items?: unknown[] } | null)?.items ?? [];
    const out: HistoryGroup[] = [];
    const push = (
      row: unknown,
      kind: string,
      title: (o: Record<string, unknown>) => string,
      statusOf: (o: Record<string, unknown>) => string,
    ): void => {
      if (!row || typeof row !== 'object') return;
      const o = row as Record<string, unknown>;
      const id = String(o.id ?? o._id ?? '');
      if (!id) return;
      const { steps, hasHistory } = stepsOf(o);
      out.push({
        key: `${kind}-${id}`,
        kind,
        kindLabel: KIND_LABEL[kind] ?? kind,
        title: title(o),
        status: statusOf(o),
        steps,
        hasHistory,
      });
    };

    for (const o of arr(pharmacyOrders))
      push(
        o,
        'pharmacy',
        (r) => `طلب صيدلية ${shortId(String(r.id ?? ''))}`,
        (r) => String(r.governed_state ?? r.effective_status ?? r.status ?? '—'),
      );
    for (const o of arr(legacyOrders))
      push(
        o,
        'pharmacy',
        (r) => `طلب صيدلية ${shortId(String(r.id ?? ''))}`,
        (r) => String(r.state ?? r.status ?? '—'),
      );
    for (const b of arr(labs))
      push(
        b,
        'labs',
        (r) => String(r.service_name_ar ?? r.service_name_en ?? r.package_name_ar ?? 'حجز تحاليل'),
        (r) => String(r.state ?? r.status ?? '—'),
      );
    for (const b of arr(rads))
      push(
        b,
        'radiology',
        (r) => String(r.service_name_ar ?? r.service_name_en ?? 'حجز أشعة'),
        (r) => String(r.state ?? r.status ?? '—'),
      );
    for (const b of arr(nursing))
      push(
        b,
        'nursing',
        (r) => String(r.service_name_ar ?? r.service_name_en ?? 'زيارة تمريض'),
        (r) => String(r.state ?? r.status ?? '—'),
      );
    for (const a of arr(appts))
      push(
        a,
        'doctors',
        (r) => String(r.doctor_name ?? r.doctorName ?? 'موعد استشارة'),
        (r) => String(r.status ?? '—'),
      );

    setGroups(out);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  const toggle = (key: string): void =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ paddingTop: insets.top + 12, paddingBottom: 8, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ width: 40 }} />
          <AppText variant="h3" color={colors.textPrimary}>
            سجل حالات الطلبات
          </AppText>
          <IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} />
        </View>
      </View>

      {failedSources > 0 && !loading && (
        <TouchableOpacity
          onPress={() => { setLoading(true); void load(); }}
          style={styles.retryBanner}
          accessibilityRole="button"
        >
          <AppText variant="caption" color="#92400E" style={{ textAlign: 'center' }}>
            تعذّر تحميل بعض الأقسام ({failedSources}) — اضغط لإعادة المحاولة
          </AppText>
        </TouchableOpacity>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
          <AppText variant="bodySM" color={colors.textSecondary} style={{ marginTop: 8 }}>
            جاري تحميل سجل الحالات…
          </AppText>
        </View>
      ) : groups.length === 0 ? (
        <View style={styles.center}>
          <Icon name="receipt" size={46} color={colors.textTertiary} />
          <AppText variant="bodySM" color={colors.textSecondary} style={{ textAlign: 'center', marginTop: 8 }}>
            لا توجد طلبات أو حجوزات لعرض سجلها.
          </AppText>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); void load(); }}
              colors={[colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {groups.map((g) => {
            const open = expanded[g.key] === true;
            return (
              <Card key={g.key}>
                <TouchableOpacity onPress={() => toggle(g.key)} accessibilityRole="button">
                  <View style={styles.head}>
                    <View style={[styles.chip, { backgroundColor: isDark ? colors.surfaceSecondary : '#DEF5F9' }]}>
                      <AppText variant="caption" color={colors.primary}>
                        {g.kindLabel}
                      </AppText>
                    </View>
                    <View style={styles.headInfo}>
                      <AppText variant="bodySM">{g.title}</AppText>
                      <AppText variant="caption" color={colors.textSecondary}>
                        الحالة الحالية: {g.status}
                        {!g.hasHistory || g.steps.length === 0 ? ' · (لا يوجد سجل مراحل بعد)' : ` · ${g.steps.length} مرحلة`}
                      </AppText>
                    </View>
                    <Icon name={open ? 'chevronRight' : 'chevronLeft'} size={16} color={colors.textTertiary} />
                  </View>
                </TouchableOpacity>
                {open && (
                  <View style={styles.timeline}>
                    {g.steps.length === 0 ? (
                      <AppText variant="caption" color={colors.textTertiary}>
                        سجل المراحل غير متوفر لهذا العنصر بعد — تُعرض الحالة الحالية فقط.
                      </AppText>
                    ) : (
                      g.steps.map((s, i) => (
                        <View key={`${g.key}-s${i}`} style={styles.step}>
                          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                          <View style={styles.stepInfo}>
                            <AppText variant="labelMD">
                              {s.from ? `${s.from} ← ` : ''}{s.to}
                            </AppText>
                            <AppText variant="caption" color={colors.textTertiary}>
                              {fmtDateTime(s.at)}
                              {s.by ? ` · بواسطة ${s.by}` : ''}
                            </AppText>
                            {!!s.note && (
                              <AppText variant="caption" color={colors.textSecondary}>
                                {s.note}
                              </AppText>
                            )}
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </Card>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  retryBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
  },
  list: { padding: 16, gap: 10, paddingBottom: 90 },
  head: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  chip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  headInfo: { flex: 1, alignItems: 'flex-end', gap: 2 },
  timeline: { marginTop: 10, gap: 8, borderTopWidth: 1, borderTopColor: '#E5E8EE', paddingTop: 10 },
  step: { flexDirection: 'row-reverse', gap: 8, alignItems: 'flex-start' },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  stepInfo: { flex: 1, alignItems: 'flex-end', gap: 1 },
});
