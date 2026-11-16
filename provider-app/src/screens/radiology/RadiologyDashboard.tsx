// @ts-nocheck
import { confirmBlocker, confirmBlockerText } from '../../utils/confirmBlocker';
import { MyContractRow } from '../../components/MyContract';
import { NotificationsCenterScreen } from '../shared/RealScreens';
import { BookingChatScreen } from '../shared/BookingChatScreen';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator, Switch } from 'react-native';
import { useTheme, useLang, useToast } from '../../context';
import client from '../../api/client';
import { ProviderApi } from '../../api/provider';
import * as DocumentPicker from 'expo-document-picker';
import { NBtn, NCard, NInput, NStatCard, NAvatar, NBadge, NHeader, NScroll, NSecHeader, NBottomNav, NSheet, NPriceInput, NEmpty } from '../../components/ui';
import { IBg, I } from '../../components/icons';
import { SP, R, FS, FW, C } from '../../constants';
import { ProviderWalletScreen, WithdrawalWorkflow, MedicalJobsScreen, MedicalDrugIndexScreen } from '../shared/SharedScreens';
import { InsuranceRequestsScreen } from '../shared/InsuranceRequestsScreen';
import { MyServicesScreen } from '../shared/MyServicesScreen';
import { orderingStackScreens, ORDERING_ENTRY } from '../ordering';

// ══════ PILLAR 1: STATE MACHINE LABELS ══════
const STATE_LABELS: Record<string, { ar: string; en: string; color: string }> = {
  NEW_REQUEST:       { ar: 'طلب جديد',             en: 'New Request',       color: tokens.info },
  PENDING_INSURANCE: { ar: 'انتظار التأمين',         en: 'Pending Insurance', color: tokens.warning },
  WAITING_COPAY:     { ar: 'بانتظار دفع المريض',     en: 'Waiting Co-Pay',    color: tokens.purple },
  CONFIRMED:         { ar: 'مجدول',                  en: 'Confirmed',         color: tokens.mintDeep },
  ARRIVED_CHECKIN:   { ar: 'المريض بالانتظار',       en: 'Patient Waiting',   color: '#00BCD4' },
  IN_SCANNING:       { ar: 'داخل غرفة الأشعة',      en: 'In Scanning',       color: tokens.coral },
  REPORT_DRAFT:      { ar: 'مسودة التقرير',          en: 'Report Draft',      color: '#795548' },
  UNDER_REVIEW:      { ar: 'قيد المراجعة',           en: 'Under Review',      color: tokens.textSecondary },
  REPORT_READY:      { ar: 'مكتمل',                  en: 'Complete',          color: tokens.success },
  SCAN_ABORTED:      { ar: 'فحص ملغى (طارئ)',        en: 'Scan Aborted',      color: tokens.error },
  CANCELLED:         { ar: 'ملغى',                   en: 'Cancelled',         color: tokens.textTertiary },
};

const ABORT_REASONS = [
  { key: 'PATIENT_PANIC',      ar: 'هلع المريض / رهاب الأماكن المغلقة', en: 'Patient Panic / Claustrophobia' },
  { key: 'MACHINE_FAILURE',    ar: 'عطل في الجهاز',                      en: 'Machine Failure' },
  { key: 'CONTRAST_REACTION',  ar: 'تفاعل تحسسي من الصبغة',              en: 'Contrast Allergic Reaction' },
  { key: 'CLAUSTROPHOBIA',     ar: 'رهاب المساحة الضيقة',                en: 'Claustrophobia' },
  { key: 'PATIENT_NO_SHOW',    ar: 'المريض لم يحضر',                     en: 'Patient No-Show' },
  { key: 'TECHNICAL_ERROR',    ar: 'خطأ تقني',                           en: 'Technical Error' },
  { key: 'EMERGENCY_SHUTDOWN', ar: 'إيقاف طارئ',                         en: 'Emergency Shutdown' },
];

// ══════ NAVIGATOR ══════
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { tokens, withAlpha } from '../../theme/tokens';
import { fmtDateTime } from '../../utils/dates';
import { useUploadsEnabled } from '../../hooks/useUploadsEnabled';
import { UploadsUnavailable } from '../../components/UploadsUnavailable';
const Stack = createNativeStackNavigator();

export function RadiologyDashboardNavigator({ onLogout }: { onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState('home');
  const { lang, t, t: tt } = useLang();
  const AR = lang === 'ar';
  
  const tabs = [
    { key: 'home',     icon: 'home',     label: t('radiology.tab.home') },
    { key: 'orders',   icon: 'document', label: t('radiology.tab.orders') },
    { key: 'catalog',  icon: 'grid',     label: t('radiology.tab.catalog') },
    { key: 'schedule', icon: 'calendar', label: t('radiology.tab.schedule') },
    { key: 'settings', icon: 'settings', label: t('radiology.tab.settings') },
  ];

  return (
    <Stack.Navigator id={undefined as any} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs">
        {({ navigation }) => {
          const go = (s: string, param?: any) => navigation.navigate(s, { param });
          return (
            <View style={{ flex: 1 }}>
              {activeTab === 'home'     && <RadiologyHome onNav={go} />}
              {activeTab === 'orders'   && <RadiologyOrdersTab onNav={go} />}
              {activeTab === 'catalog'  && <CatalogManagerTab />}
              {activeTab === 'schedule' && <AvailabilityScheduleTab />}
              {activeTab === 'settings' && <RadiologySettingsScreen onLogout={onLogout} onNav={go} />}
              <NBottomNav tabs={tabs} active={activeTab} onPress={setActiveTab} />
            </View>
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="notifications">{({ navigation }: any) => <NotificationsCenterScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="order_detail">{({ navigation, route }: any) => <OrderDetailScreen order={route.params?.param} onBack={() => navigation.goBack()} onNav={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
      <Stack.Screen name="booking_chat">{({ navigation, route }: any) => <BookingChatScreen kind="radiology" order={route.params?.param} onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="reporting">{({ navigation, route }: any) => <ReportingScreen order={route.params?.param} onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="insurance_requests">{({ navigation }: any) => <InsuranceRequestsScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      {orderingStackScreens(Stack, 'radiology')}
      <Stack.Screen name="wallet">{({ navigation }: any) => <ProviderWalletScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
      <Stack.Screen name="withdrawal_workflow">{({ navigation }: any) => <WithdrawalWorkflow onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="medical_jobs">{({ navigation }: any) => <MedicalJobsScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="drug_index">{({ navigation }: any) => <MedicalDrugIndexScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
    </Stack.Navigator>
  );
}

// ══════ SHARED INBOX (home + orders tab) ══════
// One list for both tabs: same call (GET /radiology/provider/inbox), same card. Home shows the first rows, Orders filters them.
interface RadiologyInboxOrder {
  id: string;
  state: string;
  patient_name?: string;
  scan_name_ar?: string;
  scan_name_en?: string;
  total?: number;
  scheduled_at?: string;
  preparation_confirmed?: boolean;
  safety_questionnaire?: { is_pregnant?: boolean; has_pacemaker?: boolean; has_contrast_allergy?: boolean };
}

function useRadiologyInbox() {
  const [orders, setOrders] = useState<RadiologyInboxOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setLoadFailed(false);
      const res = await client.get('/radiology/provider/inbox');
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch { setOrders([]); setLoadFailed(true); } finally { setLoading(false); }
  }, []);
  useEffect(() => { reload(); }, [reload]);
  return { orders, loading, reload, loadFailed };
}

function SafetyChip({ label, on }: { label: string; on: boolean }) {
  return (
    <View style={{ backgroundColor: on ? withAlpha(tokens.error, 0.20) : withAlpha(tokens.success, 0.20), borderRadius: R.sm, paddingHorizontal: 6, paddingVertical: 2 }}>
      <Text style={{ fontSize: 9, color: on ? tokens.error : tokens.success }}>{label}</Text>
    </View>
  );
}

function RadiologyInboxList({ orders, loading, emptyTitle, onOpen }: { orders: RadiologyInboxOrder[]; loading: boolean; emptyTitle: string; onOpen: (o: RadiologyInboxOrder) => void }) {
  const { theme } = useTheme(); const { lang, t: tt } = useLang();
  const AR = lang === 'ar';
  const yes = tt('raddash.e52be584'); const no = tt('raddash.37b061b4');
  return (
    <>
      {loading && orders.length === 0 && <ActivityIndicator size="large" color={tokens.mintDeep} />}
      {!loading && orders.length === 0 && <NEmpty title={emptyTitle} icon="document" />}
      {orders.map(order => {
        const meta = STATE_LABELS[order.state] || STATE_LABELS.NEW_REQUEST;
        const sq = order.safety_questionnaire || {};
        return (
          <NCard key={order.id} style={{ marginBottom: SP.md }} accent={meta.color} onPress={() => onOpen(order)}>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.sm }}>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.sm }}>
                <IBg name="scan" size={16} color={tokens.mintDeep} bg={withAlpha(tokens.mintDeep, 0.12)} />
                <View><Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{order.patient_name || '—'}</Text><Text style={{ fontSize: FS.xs, color: theme.textSub }}>{order.scan_name_ar || order.scan_name_en || 'Scan'}</Text></View>
              </View>
              <NBadge label={AR ? meta.ar : meta.en} style={{ backgroundColor: meta.color + '22' }} labelStyle={{ color: meta.color }} size="xs" />
            </View>
            <View style={{ flexDirection: 'row', gap: SP.sm, flexWrap: 'wrap', marginBottom: SP.sm }}>
              {sq.is_pregnant !== undefined && <SafetyChip on={!!sq.is_pregnant} label={AR ? `حمل: ${sq.is_pregnant ? yes : no}` : `Pregnant: ${sq.is_pregnant ? yes : no}`} />}
              {sq.has_pacemaker !== undefined && <SafetyChip on={!!sq.has_pacemaker} label={AR ? `منظم: ${sq.has_pacemaker ? yes : no}` : `Pacemaker: ${sq.has_pacemaker ? yes : no}`} />}
              {sq.has_contrast_allergy !== undefined && <SafetyChip on={!!sq.has_contrast_allergy} label={AR ? `صبغة: ${sq.has_contrast_allergy ? yes : no}` : `Contrast: ${sq.has_contrast_allergy ? yes : no}`} />}
              {!order.preparation_confirmed && order.state === 'CONFIRMED' && <View style={{ backgroundColor: withAlpha(tokens.warning, 0.20), borderRadius: R.sm, paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ fontSize: 9, color: tokens.warning }}>{tt('raddash.7da43bd5')}</Text></View>}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{order.scheduled_at ? fmtDateTime(order.scheduled_at, AR) : '—'}</Text>
              <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: tokens.mintDeep }}>{order.total || 0} {tt('raddash.91d5796f')}</Text>
            </View>
          </NCard>
        );
      })}
    </>
  );
}

// ══════ HOME TAB ══════
function RadiologyHome({ onNav }: { onNav: (s: string, p?: any) => void }) {
  const { theme } = useTheme(); const { lang, t: tt } = useLang();
  const AR = lang === 'ar';
  const { orders, loading, reload } = useRadiologyInbox();
  const stats = {
    todayCount: orders.length,
    inScanCount: orders.filter(o => o.state === 'IN_SCANNING').length,
    completedCount: orders.filter(o => o.state === 'REPORT_READY').length,
    revenue: orders.reduce((acc, cur) => acc + (cur.total || 0), 0),
  };
  return (
    <NScroll refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={tokens.mintDeep} />}>
      <NHeader title={tt('raddash.c91b6ae4')} right={<TouchableOpacity onPress={() => onNav('wallet')} style={{ padding: SP.sm }}><I name="wallet" size={24} color={theme.primary} /></TouchableOpacity>} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.md, marginBottom: SP.xl }}>
        <NStatCard icon="◎" label={tt('raddash.2b732962')} value={String(stats.todayCount)} color={tokens.mintDeep} style={{ width: '47%' }} />
        <NStatCard icon="◔" label={tt('raddash.8422efb8')} value={String(stats.inScanCount)} color={tokens.warning} style={{ width: '47%' }} />
        <NStatCard icon="check" label={tt('raddash.a78b4dfb')} value={String(stats.completedCount)} color={tokens.success} style={{ width: '47%' }} />
        <NStatCard icon="◈" label={tt('raddash.625c26e2')} value={String(stats.revenue)} unit={tt('raddash.a629499b')} color={tokens.mintDeep} style={{ width: '47%' }} />
      </View>
      <NSecHeader title={tt('raddash.42d2477b')} />
      <RadiologyInboxList orders={orders.slice(0, 6)} loading={loading} emptyTitle={tt('raddash.29e6d31b')} onOpen={(o) => onNav('order_detail', o)} />
    </NScroll>
  );
}

// ══════ ORDERS TAB ══════
function RadiologyOrdersTab({ onNav }: { onNav: (s: string, p?: any) => void }) {
  const { theme } = useTheme(); const { lang, t, t: tt } = useLang();
  const AR = lang === 'ar';
  const [tab, setTab] = useState<'new'|'insurance'|'confirmed'|'inScan'>('new');
  const { orders, loading, reload, loadFailed } = useRadiologyInbox();
  const filtered = orders.filter(o => {
    if (tab === 'new')       return o.state === 'NEW_REQUEST';
    if (tab === 'insurance') return ['PENDING_INSURANCE', 'WAITING_COPAY'].includes(o.state);
    if (tab === 'confirmed') return o.state === 'CONFIRMED';
    if (tab === 'inScan')    return ['ARRIVED_CHECKIN', 'IN_SCANNING', 'REPORT_DRAFT', 'UNDER_REVIEW', 'SCAN_ABORTED'].includes(o.state);
    return true;
  });
  const subTabs = [{ key: 'new', label: tt('raddash.7a64641b') }, { key: 'insurance', label: tt('raddash.150549c6') }, { key: 'confirmed', label: tt('raddash.14908c81') }, { key: 'inScan', label: tt('raddash.8cce2238') }];
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={tt('raddash.cab364e4')} />
      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', borderBottomWidth: 1, borderColor: theme.border }}>
        {subTabs.map(t => <TouchableOpacity key={t.key} style={{ flex: 1, padding: SP.sm, alignItems: 'center', borderBottomWidth: tab === t.key ? 2 : 0, borderColor: tokens.mintDeep }} onPress={() => setTab(t.key as any)}><Text style={{ fontSize: FS.xs, color: tab === t.key ? tokens.mintDeep : theme.textSub, fontWeight: tab === t.key ? FW.bold : FW.normal }}>{t.label}</Text></TouchableOpacity>)}
      </View>
      <ScrollView contentContainerStyle={{ padding: SP.lg, paddingBottom: 100 }}>
        {loadFailed && orders.length === 0
          ? <NEmpty title={t('audit2.radiology.loadFailed')} actionLabel={t('audit2.retry')} onAction={reload} icon="document" />
          : <RadiologyInboxList orders={filtered} loading={loading} emptyTitle={t('audit2.radiology.noOrders')} onOpen={(o) => onNav('order_detail', o)} />}
      </ScrollView>
    </View>
  );
}

// ══════ ORDER DETAIL SCREEN — PILLAR 4+5+6 ══════
function OrderDetailScreen({ order, onBack, onNav }: { order: any; onBack: () => void; onNav: (s: string, p?: any) => void }) {
  const { theme } = useTheme(); const { lang, t, t: tt } = useLang(); const { show } = useToast();
  const AR = lang === 'ar';
  const [loading, setLoading] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(order);
  const [showApproval, setShowApproval] = useState(false);
  const [decisionRef, setDecisionRef] = useState('');
  const [copay, setCopay] = useState('');
  const [showAbort, setShowAbort] = useState(false);
  const [abortReason, setAbortReason] = useState('');
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleDays, setRescheduleDays] = useState<number | null>(null);

  const refresh = async () => { try { const res = await client.get(`/radiology/bookings/${order.id}`); setCurrentOrder(res.data); } catch {} };
  const doAction = async (action: string, body?: any) => {
    setLoading(true);
    try { await client.post(`/radiology/bookings/${currentOrder.id}/${action}`, body || {}); show(tt('raddash.5c041b6a'), 'success'); await refresh(); }
    catch (e: any) { show(e.message || (tt('raddash.71bdc228')), 'error'); }
    finally { setLoading(false); }
  };

  const handleInsuranceApproval = async () => {
    if (!decisionRef.trim()) return show(tt('raddash.352f4740'), 'warning');
    setLoading(true);
    try {
      const copayPercent = Math.max(0, Math.min(99, Number(copay)));
      const decision = copayPercent > 0 ? 'APPROVED_PARTIAL' : 'APPROVED_FULL';
      await client.post(`/radiology/bookings/${currentOrder.id}/coverage-decision`, {
        decision,
        decision_reference: decisionRef.trim(),
        ...(decision === 'APPROVED_PARTIAL' ? { copay_percent: copayPercent } : {}),
      });
      show(tt('raddash.bdf8525f'), 'success');
      setShowApproval(false); await refresh();
    } catch (e: any) { show(e.message, 'error'); } finally { setLoading(false); }
  };

  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const setState = async (state: string, note: string, done: string) => {
    setLoading(true);
    try { await client.patch(`/radiology/bookings/${currentOrder.id}/state`, { state, note }); show(done, 'success'); await refresh(); }
    catch (e: any) { show(e?.response?.data?.message || e.message, 'error'); } finally { setLoading(false); }
  };
  const acceptBooking = () => setState('CONFIRMED', 'accepted_by_center', tt('raddash.19982e2e'));
  const rejectBooking = async () => {
    if (rejectReason.trim().length < 5) return show(tt('raddash.a8119b74'), 'warning');
    await setState('CANCELLED', `rejected_by_center: ${rejectReason.trim()}`, tt('raddash.bd120a9e'));
    setShowReject(false);
  };

  const handleAbort = async () => {
    if (!abortReason) return show(tt('raddash.88bc6409'), 'warning');
    setLoading(true);
    try { await client.post(`/radiology/bookings/${currentOrder.id}/abort`, { reason: abortReason }); show(tt('raddash.11bd6c73'), 'info'); setShowAbort(false); await refresh(); }
    catch (e: any) { show(e.message, 'error'); } finally { setLoading(false); }
  };

  const RESCHEDULE_OPTIONS = [
    { days: 1, ar: 'غداً', en: 'Tomorrow' },
    { days: 2, ar: 'بعد يومين', en: 'In 2 days' },
    { days: 3, ar: 'بعد 3 أيام', en: 'In 3 days' },
    { days: 7, ar: 'بعد أسبوع', en: 'In a week' },
  ];

  const handleReschedule = async () => {
    if (!rescheduleDays) return show(tt('raddash.19211352'), 'warning');
    setLoading(true);
    try {
      const newDate = new Date(Date.now() + rescheduleDays * 24 * 60 * 60 * 1000).toISOString();
      await client.patch(`/radiology/bookings/${currentOrder.id}/reschedule`, { new_date: newDate, reason: 'reschedule_after_abort' });
      show(tt('raddash.81683654'), 'success');
      setShowReschedule(false); setRescheduleDays(null); await refresh();
    } catch (e: any) { show(e.message, 'error'); } finally { setLoading(false); }
  };

  // opened without an order (a deep link or a stale notification): say so instead of throwing and blanking the app
  if (!currentOrder) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        <NHeader title={tt('raddash.cb2621bb')} onBack={onBack} />
        <NEmpty title={tt('raddash.650002ca')} sub={tt('raddash.98824058')} />
      </View>
    );
  }
  const sq = currentOrder.safety_questionnaire || {};
  const meta = STATE_LABELS[currentOrder.state] || STATE_LABELS.NEW_REQUEST;

  return (
    <NScroll>
      <NHeader title={tt('raddash.dd2d4925')} onBack={onBack} />
      <NCard style={{ marginBottom: SP.lg }}>
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md, marginBottom: SP.md }}>
          <NAvatar name={currentOrder.patient_name || 'P'} size={48} />
          <View>
            <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.text }}>{currentOrder.patient_name || '—'}</Text>
            <Text style={{ fontSize: FS.sm, color: theme.textSub }}>{currentOrder.scan_name_ar || currentOrder.scan_name_en || '—'}</Text>
            <NBadge label={AR ? meta.ar : meta.en} style={{ backgroundColor: meta.color + '22', marginTop: 4 }} labelStyle={{ color: meta.color }} size="xs" />
          </View>
        </View>
        <View style={{ backgroundColor: theme.surface2, borderRadius: R.md, padding: SP.md }}>
          <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>{tt('raddash.e95dc17a')} {currentOrder.scheduled_at ? fmtDateTime(currentOrder.scheduled_at, AR) : '—'}</Text>
          <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left', marginTop: 4 }}>{tt('raddash.4fc36f32')} {currentOrder.payment_method || 'cash'} | {currentOrder.total || 0} {tt('raddash.91d5796f')}</Text>
        </View>
      </NCard>

      {/* Safety Questionnaire — PILLAR 3 */}
      <NSecHeader title={tt('raddash.c1681602')} />
      <NCard style={{ marginBottom: SP.lg }}>
        {[{ key: 'is_pregnant', ar: 'حمل أو اشتباه حمل', en: 'Pregnant / Suspected' }, { key: 'has_pacemaker', ar: 'منظم ضربات قلب', en: 'Pacemaker' }, { key: 'has_metal_implant', ar: 'دعامات معدنية', en: 'Metal Implants' }, { key: 'has_contrast_allergy', ar: 'حساسية من الصبغة', en: 'Contrast Allergy' }].map(item => {
          const val = sq[item.key];
          if (val === undefined) return null;
          return (<View key={item.key} style={{ flexDirection: AR?'row-reverse':'row', justifyContent:'space-between', alignItems:'center', paddingVertical: SP.sm, borderBottomWidth: 1, borderColor: theme.border }}><Text style={{ fontSize: FS.sm, color: theme.text }}>{AR? item.ar: item.en}</Text><Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: val?tokens.error:tokens.success }}>{val? (tt('raddash.e52be584')): (tt('raddash.37b061b4'))}</Text></View>);
        })}
        {Object.keys(sq).length === 0 && <Text style={{ color: theme.textSub, textAlign: 'center', padding: SP.md }}>{tt('raddash.a736c47a')}</Text>}
      </NCard>

      {/* Actions by State — PILLAR 5 */}
      <NSecHeader title={tt('raddash.d6954ca0')} />
      <View style={{ gap: SP.md, marginBottom: SP.xl }}>
        {!['CANCELLED', 'REJECTED'].includes(String(currentOrder.state)) && <NBtn label={t('bookingChat.open')} variant="outline" onPress={() => onNav('booking_chat', currentOrder)} />}
        {currentOrder.state === 'NEW_REQUEST' && (<>
          {currentOrder.payment_method === 'insurance' ? (
            <NBtn label={tt('raddash.22277872')} variant="outline" onPress={() => setShowApproval(true)} />
          ) : (
            // server accepts only cash at the center or a paid card booking (radiology.service assertConfirmable)
            confirmBlocker(currentOrder)
              ? <Text style={{ color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>{confirmBlockerText(confirmBlocker(currentOrder)!, AR)}</Text>
              : <NBtn label={t('audit2.radiology.acceptBooking')} loading={loading} onPress={acceptBooking} style={{ backgroundColor:tokens.mintDeep }} />
          )}
          <NBtn label={tt('raddash.6035b5a7')} variant="danger" onPress={() => setShowReject(true)} />
        </>)}
        {currentOrder.state ==='PENDING_INSURANCE' && <NBtn label={tt('raddash.c7226cd8')} onPress={() => setShowApproval(true)} />}
        {currentOrder.state ==='CONFIRMED' && <NBtn label={tt('raddash.5100ece5')} loading={loading} onPress={() => doAction('checkin')} style={{ backgroundColor:tokens.mintDeep }} />}
        {currentOrder.state === 'ARRIVED_CHECKIN' && (<>
          <NBtn label={tt('raddash.f097e55f')} loading={loading} onPress={() => doAction('start-scan')} style={{ backgroundColor:tokens.warning }} />
          <NBtn label={tt('raddash.c82f8373')} variant="danger" onPress={() => setShowAbort(true)} />
        </>)}
        {currentOrder.state === 'IN_SCANNING' && (<>
          <NBtn label={tt('raddash.723cca1f')} onPress={() => onNav('reporting', currentOrder)} />
          <NBtn label={tt('raddash.b5267aba')} variant="danger" onPress={() => setShowAbort(true)} />
        </>)}
        {currentOrder.state ==='REPORT_DRAFT' && <NBtn label={tt('raddash.223b9561')} loading={loading} onPress={() => doAction('submit-report-for-review')} />}
        {currentOrder.state ==='UNDER_REVIEW' && currentOrder.report_can_approve !== false && <NBtn label={tt('raddash.baf5326c')} loading={loading} onPress={() => doAction('approve-report')} style={{ backgroundColor:tokens.success }} />}
        {currentOrder.state ==='UNDER_REVIEW' && currentOrder.report_handled_by_me === true && <Text style={{ color: theme.textSub, fontSize: FS.sm, textAlign: AR ? 'right' : 'left' }}>{t('radiology.approve.handledByYou')}</Text>}
        {currentOrder.state ==='SCAN_ABORTED' && (<View style={{ backgroundColor:withAlpha(tokens.error, 0.12), borderRadius: R.md, padding: SP.md }}><Text style={{ color:tokens.error, fontWeight: FW.bold, textAlign:'center', marginBottom: SP.md }}>{AR?` سبب الإلغاء: ${currentOrder.abort_reason}`:` Abort Reason: ${currentOrder.abort_reason}`}</Text><NBtn label={tt('raddash.07f3aadc')} loading={loading} onPress={() => setShowReschedule(true)} /></View>)}
        {currentOrder.state ==='REPORT_READY' && (<View style={{ backgroundColor:withAlpha(tokens.success, 0.12), borderRadius: R.md, padding: SP.lg, alignItems:'center' }}><Text style={{ color:tokens.success, fontSize: FS.lg, fontWeight: FW.bold }}>{tt('raddash.673a0e54')}</Text>{currentOrder.doctor_notified && <Text style={{ color:tokens.mintDeep, fontSize: FS.sm, marginTop: SP.sm }}>{tt('raddash.b6fa78c1')}</Text>}</View>)}
      </View>

      {/* Insurance approval sheet */}
      <NSheet visible={showApproval} onClose={() => setShowApproval(false)} title={tt('raddash.afba36f9')}>
        <NInput label={tt('raddash.ad1a5d6b')} value={decisionRef} onChange={setDecisionRef} placeholder="REF-XXXXX" />
        <NPriceInput label={tt('raddash.f096e662')} value={copay} onChange={setCopay} />
        <Text style={{ fontSize: FS.xs, color: tokens.warning, textAlign: AR ? 'right' : 'left', marginBottom: SP.md }}>{tt('raddash.1b52df9b')}</Text>
        <NBtn label={tt('raddash.bbf529ee')} loading={loading} onPress={handleInsuranceApproval} />
      </NSheet>

      {/* Abort Modal — PILLAR 5 */}
      <NSheet visible={showReject} onClose={() => setShowReject(false)} title={tt('raddash.60357fbb')} height={320}>
        <NInput label={tt('raddash.15bcf925')} value={rejectReason} onChange={setRejectReason} icon="edit" />
        <NBtn label={tt('raddash.46984e50')} variant="danger" loading={loading} onPress={rejectBooking} style={{ marginTop: SP.md }} />
      </NSheet>
      <NSheet visible={showAbort} onClose={() => setShowAbort(false)} title={tt('raddash.f59306e0')}>
        <Text style={{ color: tokens.error, marginBottom: SP.md, textAlign: AR ? 'right' : 'left', fontSize: FS.sm }}>{tt('raddash.3ff8bb0d')}</Text>
        {ABORT_REASONS.map(r => (
          <TouchableOpacity key={r.key} style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md, paddingVertical: SP.md, borderBottomWidth: 1, borderColor: withAlpha(tokens.error, 0.30) }} onPress={() => setAbortReason(r.key)}>
            <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: tokens.error, alignItems: 'center', justifyContent: 'center' }}>{abortReason === r.key && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: tokens.error }} />}</View>
            <Text style={{ fontSize: FS.sm, color: tokens.error }}>{AR ? r.ar : r.en}</Text>
          </TouchableOpacity>
        ))}
        <NBtn label={tt('raddash.2952abdf')} loading={loading} disabled={!abortReason} onPress={handleAbort} style={{ backgroundColor:tokens.error, borderColor:tokens.error, marginTop: SP.xl }} />
      </NSheet>

      {/* Reschedule Modal */}
      <NSheet visible={showReschedule} onClose={() => setShowReschedule(false)} title={tt('raddash.9a079ea0')}>
        <Text style={{ color: '#56606E', marginBottom: SP.md, textAlign: AR ? 'right' : 'left', fontSize: FS.sm }}>{tt('raddash.b5a872b4')}</Text>
        {RESCHEDULE_OPTIONS.map(o => (
          <TouchableOpacity key={o.days} style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md, paddingVertical: SP.md, borderBottomWidth: 1, borderColor: withAlpha(tokens.mintDeep, 0.30) }} onPress={() => setRescheduleDays(o.days)}>
            <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: tokens.mintDeep, alignItems: 'center', justifyContent: 'center' }}>{rescheduleDays === o.days && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: tokens.mintDeep }} />}</View>
            <Text style={{ fontSize: FS.sm, color: tokens.mintDeep }}>{AR ? o.ar : o.en}</Text>
          </TouchableOpacity>
        ))}
        <NBtn label={tt('raddash.132436e6')} loading={loading} disabled={!rescheduleDays} onPress={handleReschedule} style={{ backgroundColor:tokens.mintDeep, borderColor:tokens.mintDeep, marginTop: SP.xl }} />
      </NSheet>
    </NScroll>
  );
}

// ══════ REPORTING SCREEN — PILLAR 6 + MODULE 10 ══════
function ReportingScreen({ order, onBack }: { order: any; onBack: () => void }) {
  const uploadsOn = useUploadsEnabled();
  const { theme } = useTheme(); const { lang, t: tt } = useLang(); const { show } = useToast();
  const AR = lang === 'ar';
  const [loading, setLoading] = useState(false);
  const [reportFile, setReportFile] = useState<any | null>(null);
  const [dicomFile, setDicomFile] = useState<any | null>(null);
  const [pdfUploaded, setPdfUploaded] = useState(Boolean(order.report_storage_object_id));
  const [findings, setFindings] = useState(order.clinical_impression_report || '');
  const [reportStatus, setReportStatus] = useState(order.report_status || 'draft');

  const pickFile = async (kind: 'report' | 'dicom') => {
    const result = await DocumentPicker.getDocumentAsync({
      type: kind === 'report' ? 'application/pdf' : '*/*',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset) return;
    if (kind === 'report') setReportFile(asset); else setDicomFile(asset);
  };
  const handleUploadPdf = async () => {
    if (!reportFile) {
      show(tt('raddash.4d2ba54b'), 'warning');
      return;
    }
    setLoading(true);
    try {
      const reportStorageObjectId = await ProviderApi.uploadFile(reportFile.uri, reportFile.mimeType || 'application/pdf', reportFile.name || 'radiology-report.pdf');
      const dicomStorageObjectId = dicomFile
        ? await ProviderApi.uploadFile(dicomFile.uri, dicomFile.mimeType || 'application/dicom', dicomFile.name || 'scan.dcm')
        : undefined;
      await client.post(`/radiology/bookings/${order.id}/upload-report`, {
        report_storage_object_id: reportStorageObjectId,
        dicom_storage_object_id: dicomStorageObjectId,
        findings: findings.trim(),
      });
      setPdfUploaded(true); setReportStatus('draft');
      show(tt('raddash.ba4df1d7'), 'success');
    } catch (e: any) { show(e?.response?.status === 423 ? (tt('raddash.a237e338')) : (e?.response?.data?.message || e.message), 'error'); } finally { setLoading(false); }
  };

  const handleSubmitForReview = async () => {
    if (!pdfUploaded) return show(tt('raddash.73b25aa5'), 'warning');
    setLoading(true);
    try { await client.post(`/radiology/bookings/${order.id}/submit-report-for-review`, {}); setReportStatus('under_review'); show(tt('raddash.0f4a5d72'), 'success'); }
    catch (e: any) { show(e.message, 'error'); } finally { setLoading(false); }
  };

  const handleApproveAndPublish = async () => {
    setLoading(true);
    try { await client.post(`/radiology/bookings/${order.id}/approve-report`, {}); setReportStatus('ready'); show(tt('raddash.7062ac79'),'success'); onBack(); }
    catch (e: any) { show(e?.response?.data?.message === 'report_reviewer_must_differ_from_uploader' ? (tt('raddash.a07a81d9')) : e.message, 'error'); } finally { setLoading(false); }
  };

  const STEPS = [{ key: 'draft', ar: 'رفع الملفات', en: 'Upload' }, { key: 'under_review', ar: 'مراجعة', en: 'Review' }, { key: 'ready', ar: 'نُشر', en: 'Published' }];
  const stepIdx = STEPS.findIndex(s => s.key === reportStatus);

  return (
    <NScroll>
      <NHeader title={tt('raddash.4c2fca02')} onBack={onBack} />
      <NCard style={{ marginBottom: SP.lg, flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, alignItems: 'center' }}><IBg name="scan" size={16} color={tokens.mintDeep} bg={withAlpha(tokens.mintDeep, 0.12)} /><View><Text style={{ fontWeight: FW.bold, color: theme.text }}>{order.patient_name || '—'}</Text><Text style={{ fontSize: FS.xs, color: theme.textSub }}>{order.scan_name_ar || order.scan_name_en || '—'}</Text></View></NCard>

      {/* MODULE 10: Report Quality Steps */}
      <NCard style={{ marginBottom: SP.lg }}>
        <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text, marginBottom: SP.md, textAlign: AR ? 'right' : 'left' }}>{tt('raddash.54ae8847')}</Text>
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center' }}>
          {STEPS.map((step, i) => (<React.Fragment key={step.key}><View style={{ alignItems: 'center', flex: 1 }}><View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: i <= stepIdx ? tokens.mintDeep : theme.border, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: i <= stepIdx ? '#fff' : theme.textSub, fontSize: 12, fontWeight: FW.bold }}>{i + 1}</Text></View><Text style={{ fontSize: 9, color: i <= stepIdx ? tokens.mintDeep : theme.textSub, marginTop: 4, textAlign: 'center' }}>{AR ? step.ar : step.en}</Text></View>{i < STEPS.length - 1 && <View style={{ flex: 0.5, height: 2, backgroundColor: i < stepIdx ? tokens.mintDeep : theme.border }} />}</React.Fragment>))}
        </View>
      </NCard>

      {/* Section 1: PDF (Mandatory) */}
      <NSecHeader title={tt('raddash.a722a482')} />
      <NCard style={{ marginBottom: SP.lg }}>
        {uploadsOn ? (
<NBtn label={reportFile ? (AR ? `ملف التقرير: ${reportFile.name}` : `Report file: ${reportFile.name}`) : (tt('raddash.3411532b'))} variant="outline" onPress={() => pickFile('report')} />
) : <UploadsUnavailable />}
        <NInput label={tt('raddash.b71f305d')} value={findings} onChange={setFindings} multi lines={4} placeholder={tt('raddash.79e46169')} />
        {uploadsOn ? (
<NBtn label={pdfUploaded ? (tt('raddash.96f339ca')) : (tt('raddash.b90bda3e'))} loading={loading} onPress={handleUploadPdf} style={{ backgroundColor: pdfUploaded ? tokens.success : tokens.mintDeep }} />
) : null}
        {!pdfUploaded && <Text style={{ fontSize: FS.xs, color: tokens.error, textAlign: AR ? 'right' : 'left', marginTop: SP.sm }}>{tt('raddash.ded2413b')}</Text>}
      </NCard>

      {/* Section 2: DICOM (Optional) */}
      <NSecHeader title={tt('raddash.eba6510d')} />
      <NCard style={{ marginBottom: SP.lg }}>
        {uploadsOn ? (
<NBtn label={dicomFile ? (AR ? `ملف DICOM: ${dicomFile.name}` : `DICOM file: ${dicomFile.name}`) : (tt('raddash.76f32096'))} variant="outline" onPress={() => pickFile('dicom')} />
) : <UploadsUnavailable />}
        <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left', marginTop: SP.sm }}>
          {tt('raddash.50cfb4d9')}
        </Text>
      </NCard>

      {reportStatus ==='draft' && pdfUploaded && <NBtn label={tt('raddash.223b9561')} loading={loading} onPress={handleSubmitForReview} style={{ marginBottom: SP.md }} />}
      {reportStatus ==='under_review' && <NBtn label={tt('raddash.00ff07bb')} loading={loading} onPress={handleApproveAndPublish} style={{ backgroundColor:tokens.success, marginBottom: SP.md }} />}
      {reportStatus ==='ready' && <View style={{ backgroundColor:withAlpha(tokens.success, 0.12), borderRadius: R.md, padding: SP.lg, alignItems:'center', marginBottom: SP.md }}><Text style={{ color:tokens.success, fontSize: FS.lg, fontWeight: FW.bold }}>{tt('raddash.cdc0fc9d')}</Text></View>}
    </NScroll>
  );
}

// ══════ CATALOG MANAGER — PILLAR 2+3 + MODULE 15 ══════
function CatalogManagerTab() {
  const { theme } = useTheme(); const { lang, t: tt } = useLang(); const { show } = useToast();
  const AR = lang === 'ar';
  const [showAdd, setShowAdd] = useState(false);
  const [modality, setModality] = useState('MRI');
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('30');
  const [insAvail, setInsAvail] = useState(true);
  const [portableUS, setPortableUS] = useState(false);
  const [riskPregnancy, setRiskPregnancy] = useState(false);
  const [riskMetal, setRiskMetal] = useState(false);
  const [riskContrast, setRiskContrast] = useState(false);
  const [prepItems, setPrepItems] = useState<string[]>([]);

  const PREP_OPTIONS = [
    { key: 'fasting_6h',       ar: 'صيام 6 ساعات',                  en: 'Fasting 6 hours' },
    { key: 'drink_water',      ar: 'شرب لتر ماء',                    en: 'Drink 1L water' },
    { key: 'hold_urine',       ar: 'حبس البول',                      en: 'Full bladder' },
    { key: 'creatinine',       ar: 'تحليل وظائف كلى (Creatinine)',   en: 'Recent Creatinine' },
    { key: 'no_metal',         ar: 'إزالة الأشياء المعدنية',          en: 'Remove metal objects' },
    { key: 'contrast_consent', ar: 'موافقة على الصبغة',              en: 'Contrast consent' },
  ];

  const MODALITIES = ['MRI', 'CT', 'X-Ray', 'Ultrasound', 'Mammography', 'DEXA', 'Fluoroscopy', 'PET'];

  const handleSubmitDelta = async () => {
    if (!nameEn || !price) return show(tt('raddash.83910b78'), 'warning');
    try {
      await client.post('/radiology/catalog/delta-request', { name_ar: nameAr, name_en: nameEn, modality_category: modality, price: parseFloat(price), estimated_duration_minutes: parseInt(duration) || 30, insurance_availability: insAvail, portable_ultrasound: portableUS, requires_pregnancy_check: riskPregnancy, requires_metal_implant_check: riskMetal, requires_contrast_allergy_check: riskContrast, preparation_keys: prepItems });
      show(tt('raddash.70985b54'), 'success');
      setShowAdd(false);
    } catch (e: any) { show(e.message, 'error'); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <MyServicesScreen vertical="radiology"
        footer={<NBtn label={tt('raddash.ad2647d3')} variant="outline" onPress={() => setShowAdd(true)} />} />
      <NSheet visible={showAdd} onClose={() => setShowAdd(false)} title={tt('raddash.1ba49c32')}>
        <Text style={{ fontSize: FS.xs, color:tokens.warning, textAlign: AR?'right':'left', marginBottom: SP.md }}>{tt('raddash.14907cd7')}</Text>
        <Text style={{ fontSize: FS.sm, color: theme.text, marginBottom: SP.sm }}>{tt('raddash.f837bb28')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SP.md }}>
          <View style={{ flexDirection: 'row', gap: SP.sm }}>{MODALITIES.map(m => <TouchableOpacity key={m} style={{ paddingHorizontal: SP.md, paddingVertical: SP.sm, borderRadius: R.md, backgroundColor: modality === m ? tokens.mintDeep : theme.surface2, borderWidth: 1, borderColor: modality === m ? tokens.mintDeep : theme.border }} onPress={() => setModality(m)}><Text style={{ color: modality === m ? '#fff' : theme.text, fontSize: FS.sm }}>{m}</Text></TouchableOpacity>)}</View>
        </ScrollView>
        <NInput label={tt('raddash.d91c01b5')} value={nameAr} onChange={setNameAr} placeholder="رنين مغناطيسي الدماغ بصبغة" />
        <NInput label={tt('raddash.1f9eb88f')} value={nameEn} onChange={setNameEn} placeholder="MRI Brain with Contrast" />
        <NPriceInput label={tt('raddash.39a4471e')} value={price} onChange={setPrice} />
        <NInput label={tt('raddash.d2889ad9')} value={duration} onChange={setDuration} placeholder="30" />
        <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text, marginVertical: SP.md }}>{tt('raddash.93a0edf5')}</Text>
        {[{ label: tt('raddash.6596c548'), state: riskPregnancy, set: setRiskPregnancy }, { label: tt('raddash.760780c7'), state: riskMetal, set: setRiskMetal }, { label: tt('raddash.b92b94fe'), state: riskContrast, set: setRiskContrast }].map((item, i) => <View key={i} style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.sm }}><Text style={{ fontSize: FS.sm, color: theme.text, flex: 1 }}>{item.label}</Text><Switch value={item.state} onValueChange={item.set} trackColor={{ true: tokens.error }} /></View>)}
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.sm }}><Text style={{ fontSize: FS.sm, color: theme.text }}>{tt('raddash.e820a35b')}</Text><Switch value={portableUS} onValueChange={setPortableUS} trackColor={{ true: tokens.mintDeep }} /></View>
        <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text, marginVertical: SP.md }}>{tt('raddash.87069951')}</Text>
        {PREP_OPTIONS.map(p => <TouchableOpacity key={p.key} style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.sm, paddingVertical: SP.sm }} onPress={() => setPrepItems(prev => prev.includes(p.key) ? prev.filter(x => x !== p.key) : [...prev, p.key])}><View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: tokens.mintDeep, backgroundColor: prepItems.includes(p.key) ? tokens.mintDeep : 'transparent', alignItems: 'center', justifyContent: 'center' }}>{prepItems.includes(p.key) && <I name="check" size={12} color={C.white} />}</View><Text style={{ fontSize: FS.sm, color: theme.text }}>{AR ? p.ar : p.en}</Text></TouchableOpacity>)}
        <NBtn label={tt('raddash.017b19ce')} onPress={handleSubmitDelta} style={{ marginTop: SP.xl }} />
      </NSheet>
    </View>
  );
}

// ══════ AVAILABILITY SCHEDULE — MODULE 9 ══════
function AvailabilityScheduleTab() {
  const { theme } = useTheme(); const { lang, t: tt } = useLang(); const { show } = useToast();
  const AR = lang === 'ar';
  const DAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const [workingDays, setWorkingDays] = useState([true, true, true, true, true, false, false]);
  const [morningFrom, setMorningFrom] = useState('08:00');
  const [morningTo, setMorningTo] = useState('14:00');
  const [eveningFrom, setEveningFrom] = useState('17:00');
  const [eveningTo, setEveningTo] = useState('22:00');
  const [emergencyAvailable, setEmergencyAvailable] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try { await client.post('/radiology/catalog/delta-request', { type: 'schedule_update', working_days: workingDays, morning_shift: { from: morningFrom, to: morningTo }, evening_shift: { from: eveningFrom, to: eveningTo }, emergency_available: emergencyAvailable }); show(tt('raddash.851685dc'), 'success'); }
    catch (e: any) { show(e.message, 'error'); } finally { setSaving(false); }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ padding: SP.lg, paddingBottom: 120 }}>
      <NHeader title={tt('raddash.30c7d077')} />
      <NSecHeader title={tt('raddash.71237ac3')} />
      <NCard style={{ marginBottom: SP.lg }}>
        {DAYS_AR.map((day, i) => <TouchableOpacity key={i} style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SP.md, borderBottomWidth: i < 6 ? 1 : 0, borderColor: theme.border }} onPress={() => setWorkingDays(prev => { const n = [...prev]; n[i] = !n[i]; return n; })}><Text style={{ fontSize: FS.sm, color: theme.text }}>{AR ? day : DAYS_EN[i]}</Text><View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: workingDays[i] ? tokens.mintDeep : theme.surface2, borderWidth: 2, borderColor: workingDays[i] ? tokens.mintDeep : theme.border, alignItems: 'center', justifyContent: 'center' }}>{workingDays[i] && <I name="check" size={12} color={C.white} />}</View></TouchableOpacity>)}
      </NCard>
      <NSecHeader title={tt('raddash.b9fabab9')} />
      <NCard style={{ marginBottom: SP.lg, flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md }}>
        <NInput label={tt('raddash.ecdb7711')} value={morningFrom} onChange={setMorningFrom} placeholder="08:00" style={{ flex: 1 }} />
        <NInput label={tt('raddash.32c46ecf')} value={morningTo} onChange={setMorningTo} placeholder="14:00" style={{ flex: 1 }} />
      </NCard>
      <NSecHeader title={tt('raddash.ee6f3eb2')} />
      <NCard style={{ marginBottom: SP.lg, flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md }}>
        <NInput label={tt('raddash.ecdb7711')} value={eveningFrom} onChange={setEveningFrom} placeholder="17:00" style={{ flex: 1 }} />
        <NInput label={tt('raddash.32c46ecf')} value={eveningTo} onChange={setEveningTo} placeholder="22:00" style={{ flex: 1 }} />
      </NCard>
      <NCard style={{ marginBottom: SP.xl }}>
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View><Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{tt('raddash.4701eeb3')}</Text><Text style={{ fontSize: FS.xs, color: theme.textSub }}>{tt('raddash.949a4fa3')}</Text></View>
          <Switch value={emergencyAvailable} onValueChange={setEmergencyAvailable} trackColor={{ true: tokens.error }} />
        </View>
      </NCard>
      <NBtn label={tt('raddash.4d7dc55e')} loading={saving} onPress={handleSave} />
    </ScrollView>
  );
}

// ══════ SETTINGS ══════
function RadiologySettingsScreen({ onLogout, onNav }: { onLogout: () => void; onNav?: (s: string, p?: any) => void }) {
  const { theme } = useTheme(); const { lang, t: tt } = useLang();
  const AR = lang === 'ar';
  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ padding: SP.lg, paddingBottom: 100 }}>
      <NHeader title={tt('raddash.5766fe8f')} />
      <NCard style={{ marginBottom: SP.md }}><Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.md }}>{tt('raddash.d0741654')}</Text><Text style={{ color: theme.textSub, textAlign: AR ? 'right' : 'left', fontSize: FS.sm }}>{tt('raddash.9065d708')}</Text></NCard>
      <NCard style={{ marginBottom: SP.md }}>
        <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.md }}>{tt('raddash.5e936739')}</Text>
        <NBtn label={tt('raddash.849acb0e')} variant="outline" onPress={() => onNav && onNav('insurance_requests')} />
      </NCard>
      <NCard style={{ marginBottom: SP.md }}>
        <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.md }}>{tt('raddash.7a80399f')}</Text>
        <NBtn label={tt('raddash.7a80399f')} variant="outline" onPress={() => onNav && onNav(ORDERING_ENTRY)} />
      </NCard>
      <NCard style={{ marginBottom: SP.md }}>
        <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.md }}>{tt('raddash.61bcd49d')}</Text>
        <NBtn label={tt('raddash.0e14b12f')} variant="outline" onPress={() => onNav && onNav('drug_index')} />
        <NBtn label={tt('raddash.ebb9f1de')} variant="outline" onPress={() => onNav && onNav('medical_jobs')} style={{ marginTop: SP.sm }} />
      </NCard>
      <NCard style={{ marginBottom: SP.md }}><MyContractRow /></NCard>
      <NCard style={{ marginTop: SP.xl }}><NBtn label={tt('raddash.b2a19694')} onPress={onLogout} style={{ backgroundColor: tokens.error, borderColor: tokens.error }} /></NCard>
    </ScrollView>
  );
}
