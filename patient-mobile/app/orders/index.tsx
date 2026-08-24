// @ts-nocheck
// app/orders/index.tsx — مركز الطلبات الموحد (S10): كل الطلبات والحجوزات في مكان واحد
import React, { useState, useCallback } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity, FlatList,
  StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, IconButton } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';
import { pickLocalized } from '../../src/utils/localize';
import { dateLocale } from '@/utils/dates';

const STATUS_AR: Record<string, string> = {
  PENDING: 'بانتظار التأكيد', CONFIRMED: 'مؤكد', CHECKED_IN: 'تم الحضور',
  IN_PROGRESS: 'جارٍ', COMPLETED: 'مكتمل', CANCELLED: 'ملغي',
  RESCHEDULED: 'أعيدت جدولته', NO_SHOW: 'لم يحضر', REFUNDED: 'مسترد',
  NEW_REQUEST: 'طلب جديد', PROVIDER_ASSIGNED: 'تم تعيين مقدم الخدمة',
  EN_ROUTE: 'في الطريق', ARRIVED: 'وصل', ACCEPTED: 'مقبول',
  REJECTED: 'مرفوض', PREPARING: 'قيد التحضير', READY: 'جاهز',
  OUT_FOR_DELIVERY: 'في الطريق إليك', DELIVERED: 'تم التوصيل',
  SCHEDULED: 'مجدول', PROCESSING: 'قيد المعالجة', SAMPLE_COLLECTED: 'تم سحب العينة',
  RESULT_READY: 'النتيجة جاهزة', approved: 'مقبولة', rejected: 'مرفوضة',
  pending: 'قيد المراجعة', submitted: 'مقدّمة', active: 'نشط', resolved: 'تمت المعالجة',
};

const PENDING_STATES = new Set(['PENDING', 'NEW_REQUEST', 'CONFIRMED', 'ACCEPTED', 'PREPARING', 'READY', 'PROVIDER_ASSIGNED', 'EN_ROUTE', 'OUT_FOR_DELIVERY', 'SCHEDULED', 'PROCESSING', 'CHECKED_IN', 'IN_PROGRESS', 'pending', 'submitted', 'active', 'SAMPLE_COLLECTED']);
const COMPLETED_STATES = new Set(['COMPLETED', 'DELIVERED', 'RESULT_READY', 'approved', 'resolved']);
const CANCELLED_STATES = new Set(['CANCELLED', 'REJECTED', 'NO_SHOW', 'rejected', 'REFUNDED']);

const KIND_META: Record<string, { label: string; icon: string; color: string }> = {
  doctors: { label: 'استشارة', icon: 'doctor', color: '#23B5CE' },
  pharmacy: { label: 'صيدلية', icon: 'medication', color: '#5BA84F' },
  labs: { label: 'تحاليل', icon: 'science', color: '#7A6BEA' },
  radiology: { label: 'أشعة', icon: 'radiology-box-outline', color: '#F0A526' },
  nursing: { label: 'تمريض', icon: 'nurse', color: '#EC4899' },
  ambulance: { label: 'إسعاف', icon: 'ambulance', color: '#F0695C' },
  insurance: { label: 'مطالبة تأمين', icon: 'shield', color: '#0EA5E9' },
  returns: { label: 'مرتجع', icon: 'refresh', color: '#8B5CF6' },
};

const TABS: Array<[string, string]> = [
  ['all', 'الكل'], ['pending', 'معلقة'], ['completed', 'مكتملة'], ['cancelled', 'ملغية'],
  ['doctors', 'أطباء'], ['pharmacy', 'أدوية'], ['labs', 'تحاليل'], ['radiology', 'أشعة'],
  ['nursing', 'تمريض'], ['ambulance', 'إسعاف'], ['insurance', 'تأمين'], ['returns', 'مرتجعات'],
];

function statusBucket(status: string): 'pending' | 'completed' | 'cancelled' {
  if (COMPLETED_STATES.has(status)) return 'completed';
  if (CANCELLED_STATES.has(status)) return 'cancelled';
  return 'pending';
}

function fmtDate(d: any): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return '—'; }
}

export default function OrderCenterScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failedSources, setFailedSources] = useState(0);
  const [tab, setTab] = useState('all');

  const load = useCallback(async () => {
    let failures = 0;
    const safe = async (p: Promise<any>) => {
      try { return await p; } catch { failures++; return null; }
    };
    const [appts, orders, labs, rads, nursing, claims, returns, emergency] = await Promise.all([
      safe(apiFetch('/care/appointments')),
      safe(apiFetch('/orders/mine')),
      safe(apiFetch('/labs/bookings/mine')),
      safe(apiFetch('/radiology/bookings/mine')),
      safe(apiFetch('/home-care/bookings/my')),
      safe(apiFetch('/insurance/claims')),
      safe(apiFetch('/pharmacy/returns')),
      safe(apiFetch('/emergency/my/active')),
    ]);
    setFailedSources(failures);

    const arr = (x: any) => (Array.isArray(x) ? x : x?.data || x?.items || []);
    const unified: any[] = [];

    for (const a of arr(appts)) {
      unified.push({
        id: a.id, kind: 'doctors',
        title: a.doctor_name || a.doctorName || 'موعد استشارة',
        subtitle: a.service_type === 'video' ? 'استشارة مرئية' : a.service_type === 'home' ? 'زيارة منزلية' : 'زيارة عيادة',
        status: a.status || 'PENDING', date: a.slot_start || a.createdAt,
        route: { pathname: '/consultations/appointment-detail', params: { appointmentId: a.id } },
      });
    }
    for (const o of arr(orders)) {
      unified.push({
        id: o.id, kind: 'pharmacy',
        title: `طلب صيدلية ${o.id ? '#' + String(o.id).slice(-6) : ''}`,
        subtitle: o.items?.length ? `${o.items.length} صنف` : (o.pharmacy_name || ''),
        status: o.state || o.status || 'PENDING', date: o.createdAt,
        route: { pathname: '/pharmacy/order-tracking', params: { orderId: o.id } },
      });
    }
    for (const b of arr(labs)) {
      unified.push({
        id: b.id, kind: 'labs',
        title: pickLocalized(b.service_name_ar, b.service_name_en) || pickLocalized(b.package_name_ar, b.package_name_en) || 'حجز تحاليل',
        subtitle: b.visit_type === 'home' ? 'سحب منزلي' : 'في المختبر',
        status: b.state || b.status || 'SCHEDULED', date: b.scheduled_at || b.createdAt,
        route: { pathname: '/diagnostics/orders' },
      });
    }
    for (const b of arr(rads)) {
      unified.push({
        id: b.id, kind: 'radiology',
        title: pickLocalized(b.service_name_ar, b.service_name_en) || 'حجز أشعة',
        subtitle: b.center_name || '',
        status: b.state || b.status || 'SCHEDULED', date: b.scheduled_at || b.createdAt,
        route: { pathname: '/diagnostics/orders' },
      });
    }
    for (const b of arr(nursing)) {
      unified.push({
        id: b.id, kind: 'nursing',
        title: pickLocalized(b.service_name_ar, b.service_name_en) || 'زيارة تمريض',
        subtitle: b.address || '',
        status: b.state || 'NEW_REQUEST', date: b.scheduled_at || b.createdAt,
        route: { pathname: '/nursing/live-tracking', params: { bookingId: b.id, type: 'nurse' } },
      });
    }
    for (const c of arr(claims)) {
      unified.push({
        id: c.id, kind: 'insurance',
        title: c.title || `مطالبة ${c.claim_number || ''}`.trim() || 'مطالبة تأمين',
        subtitle: c.provider || c.insurance_company || '',
        status: c.status || 'submitted', date: c.createdAt || c.submitted_at,
        route: { pathname: '/insurance/claim-tracking' },
      });
    }
    for (const r of arr(returns)) {
      unified.push({
        id: r.id, kind: 'returns',
        title: r.reason ? `مرتجع: ${r.reason}` : 'طلب إرجاع',
        subtitle: r.order_id ? `طلب #${String(r.order_id).slice(-6)}` : '',
        status: r.status || r.state || 'pending', date: r.createdAt,
        route: { pathname: '/returns/detail', params: { returnId: r.id } },
      });
    }
    const em = emergency?.data || emergency;
    if (em && em.id) {
      unified.push({
        id: em.id, kind: 'ambulance',
        title: 'طلب إسعاف نشط',
        subtitle: em.address || '',
        status: 'active', date: em.createdAt,
        route: { pathname: '/emergency/tracking' },
      });
    }

    unified.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    setItems(unified);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const filtered = items.filter((it) => {
    if (tab === 'all') return true;
    if (tab === 'pending' || tab === 'completed' || tab === 'cancelled') return statusBucket(it.status) === tab;
    return it.kind === tab;
  });

  const countFor = (key: string) => {
    if (key === 'all') return items.length;
    if (key === 'pending' || key === 'completed' || key === 'cancelled') return items.filter((i) => statusBucket(i.status) === key).length;
    return items.filter((i) => i.kind === key).length;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={{ paddingTop: insets.top + 12, paddingBottom: 8, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ width: 40 }} />
          <AppText variant="h3" color={colors.textPrimary}>مركز الطلبات</AppText>
          <IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} />
        </View>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 12, gap: 8, paddingBottom: 10 }}>
        {TABS.map(([key, label]) => {
          const n = countFor(key);
          const active = tab === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => setTab(key)}
              style={[styles.tabChip, {
                backgroundColor: active ? colors.primary : (isDark ? colors.surface : colors.white),
                borderColor: active ? colors.primary : colors.border,
              }]}
            >
              <AppText variant="bodySM" color={active ? '#fff' : colors.textPrimary}>
                {label}{n > 0 ? ` (${n})` : ''}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {failedSources > 0 && !loading && (
        <TouchableOpacity onPress={() => { setLoading(true); load(); }} style={{ marginHorizontal: 16, marginBottom: 8, padding: 10, borderRadius: 10, backgroundColor: '#FEF3C7' }}>
          <AppText variant="caption" color="#92400E" style={{ textAlign: 'center' }}>
            تعذّر تحميل بعض الأقسام ({failedSources}) — اضغط لإعادة المحاولة
          </AppText>
        </TouchableOpacity>
      )}

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View style={{ alignItems: 'center', marginTop: 60, gap: 8, paddingHorizontal: 32 }}>
          <Icon name="receipt" size={46} color={colors.textTertiary} />
          <AppText variant="bodySM" color={colors.textSecondary} style={{ textAlign: 'center' }}>
            {items.length === 0 ? 'لا توجد طلبات أو حجوزات بعد' : 'لا توجد عناصر في هذا التصنيف'}
          </AppText>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(it) => `${it.kind}-${it.id}`}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 90 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[colors.primary]} />}
          initialNumToRender={12}
          maxToRenderPerBatch={12}
          windowSize={7}
          removeClippedSubviews
          renderItem={({ item: it }) => {
            const meta = KIND_META[it.kind] || KIND_META.doctors;
            const bucket = statusBucket(it.status);
            const chipColor = bucket === 'completed' ? '#16A34A' : bucket === 'cancelled' ? '#DC2626' : '#D97706';
            const chipBg = bucket === 'completed' ? '#DCFCE7' : bucket === 'cancelled' ? '#FEE2E2' : '#FEF3C7';
            return (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`${it.title} — ${STATUS_AR[it.status] || it.status}`}
                onPress={() => it.route && router.push(it.route)}
                style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white }]}
              >
                <View style={[styles.chip, { backgroundColor: chipBg }]}>
                  <AppText variant="caption" color={chipColor}>{STATUS_AR[it.status] || it.status}</AppText>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end', gap: 3 }}>
                  <AppText variant="bodySM">{it.title}</AppText>
                  {!!it.subtitle && <AppText variant="caption" color={colors.textSecondary}>{it.subtitle}</AppText>}
                  <AppText variant="caption" color={colors.textTertiary}>{fmtDate(it.date)}</AppText>
                </View>
                <View style={[styles.kindIcon, { backgroundColor: meta.color + '18' }]}>
                  <Icon name={meta.icon} size={20} color={meta.color} />
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabChip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  card: { flexDirection: 'row-reverse', alignItems: 'center', borderRadius: 14, padding: 12, gap: 10 },
  chip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  kindIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
