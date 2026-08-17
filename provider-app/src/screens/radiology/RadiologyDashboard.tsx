// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator, Switch } from 'react-native';
import { useTheme, useLang, useToast } from '../../context';
import client from '../../api/client';
import { NBtn, NCard, NInput, NStatCard, NAvatar, NBadge, NHeader, NScroll, NSecHeader, NBottomNav, NSheet, NPriceInput, NEmpty } from '../../components/ui';
import { IBg, I } from '../../components/icons';
import { SP, R, FS, FW } from '../../constants';
import { ProviderWalletScreen, MedicalJobsScreen, MedicalDrugIndexScreen } from '../shared/SharedScreens';
import { InsuranceRequestsScreen } from '../shared/InsuranceRequestsScreen';

// ══════ PILLAR 1: STATE MACHINE LABELS ══════
const STATE_LABELS: Record<string, { ar: string; en: string; color: string }> = {
  NEW_REQUEST:       { ar: 'طلب جديد',             en: 'New Request',       color: '#2196F3' },
  PENDING_INSURANCE: { ar: 'انتظار التأمين',         en: 'Pending Insurance', color: '#FF9800' },
  WAITING_COPAY:     { ar: 'بانتظار دفع المريض',     en: 'Waiting Co-Pay',    color: '#9C27B0' },
  CONFIRMED:         { ar: 'مجدول',                  en: 'Confirmed',         color: '#009688' },
  ARRIVED_CHECKIN:   { ar: 'المريض بالانتظار',       en: 'Patient Waiting',   color: '#00BCD4' },
  IN_SCANNING:       { ar: 'داخل غرفة الأشعة',      en: 'In Scanning',       color: '#FF5722' },
  REPORT_DRAFT:      { ar: 'مسودة التقرير',          en: 'Report Draft',      color: '#795548' },
  UNDER_REVIEW:      { ar: 'قيد المراجعة',           en: 'Under Review',      color: '#607D8B' },
  REPORT_READY:      { ar: 'مكتمل',                  en: 'Complete',          color: '#4CAF50' },
  SCAN_ABORTED:      { ar: 'فحص ملغى (طارئ)',        en: 'Scan Aborted',      color: '#F44336' },
  CANCELLED:         { ar: 'ملغى',                   en: 'Cancelled',         color: '#9E9E9E' },
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
const Stack = createNativeStackNavigator();

export function RadiologyDashboardNavigator({ onLogout }: { onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState('home');
  const { lang } = useLang();
  const AR = lang === 'ar';
  
  const tabs = [
    { key: 'home',     icon: 'home',     label: AR ? 'الرئيسية' : 'Home'    },
    { key: 'orders',   icon: 'document', label: AR ? 'الطلبات'  : 'Orders'  },
    { key: 'catalog',  icon: 'grid',     label: AR ? 'الكتالوج' : 'Catalog' },
    { key: 'schedule', icon: 'calendar', label: AR ? 'الجدول'   : 'Schedule'},
    { key: 'settings', icon: 'settings', label: AR ? 'الإعدادات': 'Settings'},
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

      <Stack.Screen name="order_detail">{({ navigation, route }: any) => <OrderDetailScreen order={route.params?.param} onBack={() => navigation.goBack()} onNav={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
      <Stack.Screen name="reporting">{({ navigation, route }: any) => <ReportingScreen order={route.params?.param} onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="insurance_requests">{({ navigation }: any) => <InsuranceRequestsScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="wallet">{({ navigation }: any) => <ProviderWalletScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
      <Stack.Screen name="drug_index">{({ navigation }: any) => <MedicalDrugIndexScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
    </Stack.Navigator>
  );
}

// ══════ HOME TAB ══════
function RadiologyHome({ onNav }: { onNav: (s: string, p?: any) => void }) {
  const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast();
  const AR = lang === 'ar';
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ todayCount: 0, inScanCount: 0, completedCount: 0, revenue: 0 });
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await client.get('/radiology/provider/inbox');
      const data: any[] = res.data || [];
      setOrders(data);
      setStats({ todayCount: data.length, inScanCount: data.filter(o => o.state === 'IN_SCANNING').length, completedCount: data.filter(o => o.state === 'REPORT_READY').length, revenue: data.reduce((acc, cur) => acc + (cur.total || 0), 0) });
    } catch { setOrders([]); setStats({ todayCount: 0, inScanCount: 0, completedCount: 0, revenue: 0 }); } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  return (
    <NScroll refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchOrders} tintColor="#009688" />}>
      <NHeader title={AR?'لوحة الأشعة':'Radiology Dashboard'} right={<TouchableOpacity onPress={() => onNav('wallet')} style={{ padding: SP.sm }}><I name="wallet" size={24} color={theme.primary} /></TouchableOpacity>} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.md, marginBottom: SP.xl }}>
        <NStatCard icon="◎" label={AR ? 'فحوصات اليوم' : "Today's Scans"} value={String(stats.todayCount)} color="#009688" style={{ width: '47%' }} />
        <NStatCard icon="◔" label={AR ? 'جاري الفحص' : 'In Scanning'} value={String(stats.inScanCount)} color="#FF9800" style={{ width: '47%' }} />
        <NStatCard icon="check" label={AR ? 'مكتمل' : 'Completed'} value={String(stats.completedCount)} color="#4CAF50" style={{ width: '47%' }} />
        <NStatCard icon="◈" label={AR ? 'الإيرادات' : 'Revenue'} value={String(stats.revenue)} unit={AR ? 'ر' : 'SAR'} color="#009688" style={{ width: '47%' }} />
      </View>
      <NSecHeader title={AR ? 'طلبات اليوم' : "Today's Orders"} />
      {orders.length === 0 && !loading && <NEmpty title={AR ? 'لا توجد طلبات اليوم' : 'No orders today'} icon="document" />}
      {orders.slice(0, 6).map(order => {
        const meta = STATE_LABELS[order.state] || STATE_LABELS.NEW_REQUEST;
        const sq = order.safety_questionnaire || {};
        return (
          <NCard key={order.id} style={{ marginBottom: SP.md }} accent={meta.color} onPress={() => onNav('order_detail', order)}>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: SP.sm }}>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.sm }}>
                <IBg name="scan" size={16} color="#009688" bg="#00968812" />
                <View><Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{order.patient_name || '—'}</Text><Text style={{ fontSize: FS.xs, color: theme.textSub }}>{order.scan_name_ar || order.scan_name_en || 'Scan'}</Text></View>
              </View>
              <NBadge label={AR ? meta.ar : meta.en} style={{ backgroundColor: meta.color + '22' }} labelStyle={{ color: meta.color }} size="xs" />
            </View>
            <View style={{ flexDirection: 'row', gap: SP.sm, flexWrap: 'wrap' }}>
              {sq.is_pregnant!== undefined && <View style={{ backgroundColor: sq.is_pregnant?'#F4433620':'#4CAF5020', borderRadius: R.sm, paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ fontSize: 9, color: sq.is_pregnant?'#F44336':'#4CAF50' }}>{AR?`حمل: ${sq.is_pregnant?'نعم':'لا'}`:`Pregnant: ${sq.is_pregnant?'YES':'NO'}`}</Text></View>}
              {sq.has_pacemaker!== undefined && <View style={{ backgroundColor: sq.has_pacemaker?'#F4433620':'#4CAF5020', borderRadius: R.sm, paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ fontSize: 9, color: sq.has_pacemaker?'#F44336':'#4CAF50' }}>{AR?`منظم: ${sq.has_pacemaker?'نعم':'لا'}`:`Pacemaker: ${sq.has_pacemaker?'YES':'NO'}`}</Text></View>}
              {sq.has_contrast_allergy!== undefined && <View style={{ backgroundColor: sq.has_contrast_allergy?'#F4433620':'#4CAF5020', borderRadius: R.sm, paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ fontSize: 9, color: sq.has_contrast_allergy?'#F44336':'#4CAF50' }}>{AR?`صبغة: ${sq.has_contrast_allergy?'نعم':'لا'}`:`Contrast: ${sq.has_contrast_allergy?'YES':'NO'}`}</Text></View>}
              {!order.preparation_confirmed && order.state ==='CONFIRMED' && <View style={{ backgroundColor:'#FF980020', borderRadius: R.sm, paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ fontSize: 9, color:'#FF9800' }}>{AR?'التحضير: غير مؤكد':'Prep: Not Confirmed'}</Text></View>}
            </View>
          </NCard>
        );
      })}
    </NScroll>
  );
}

// ══════ ORDERS TAB ══════
function RadiologyOrdersTab({ onNav }: { onNav: (s: string, p?: any) => void }) {
  const { theme } = useTheme(); const { lang } = useLang();
  const AR = lang === 'ar';
  const [tab, setTab] = useState<'new'|'insurance'|'confirmed'|'inScan'>('new');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const fetch = useCallback(async () => { try { setLoading(true); const res = await client.get('/radiology/provider/inbox'); setOrders(res.data || []); } catch {} finally { setLoading(false); } }, []);
  useEffect(() => { fetch(); }, [fetch]);
  const filtered = orders.filter(o => {
    if (tab === 'new')       return o.state === 'NEW_REQUEST';
    if (tab === 'insurance') return ['PENDING_INSURANCE', 'WAITING_COPAY'].includes(o.state);
    if (tab === 'confirmed') return o.state === 'CONFIRMED';
    if (tab === 'inScan')    return ['ARRIVED_CHECKIN', 'IN_SCANNING', 'REPORT_DRAFT', 'UNDER_REVIEW'].includes(o.state);
    return true;
  });
  const subTabs = [{ key: 'new', label: AR ? 'جديد' : 'New' }, { key: 'insurance', label: AR ? 'تأمين' : 'Insurance' }, { key: 'confirmed', label: AR ? 'مجدول' : 'Confirmed' }, { key: 'inScan', label: AR ? 'جاري' : 'In Progress' }];
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'إدارة الطلبات' : 'Order Management'} />
      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', borderBottomWidth: 1, borderColor: theme.border }}>
        {subTabs.map(t => <TouchableOpacity key={t.key} style={{ flex: 1, padding: SP.sm, alignItems: 'center', borderBottomWidth: tab === t.key ? 2 : 0, borderColor: '#009688' }} onPress={() => setTab(t.key as any)}><Text style={{ fontSize: FS.xs, color: tab === t.key ? '#009688' : theme.textSub, fontWeight: tab === t.key ? FW.bold : FW.normal }}>{t.label}</Text></TouchableOpacity>)}
      </View>
      <ScrollView contentContainerStyle={{ padding: SP.lg, paddingBottom: 100 }}>
        {loading && <ActivityIndicator size="large" color="#009688" />}
        {!loading && filtered.length === 0 && <NEmpty title={AR ? 'لا توجد طلبات' : 'No orders'} icon="document" />}
        {filtered.map(order => {
          const meta = STATE_LABELS[order.state] || STATE_LABELS.NEW_REQUEST;
          return (
            <NCard key={order.id} style={{ marginBottom: SP.md }} accent={meta.color} onPress={() => onNav('order_detail', order)}>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.sm }}>
                <View><Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{order.patient_name || '—'}</Text><Text style={{ fontSize: FS.xs, color: theme.textSub }}>{order.scan_name_ar || order.scan_name_en || 'Scan'}</Text></View>
                <NBadge label={AR ? meta.ar : meta.en} style={{ backgroundColor: meta.color + '22' }} labelStyle={{ color: meta.color }} size="xs" />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{order.scheduled_at ? new Date(order.scheduled_at).toLocaleString('ar-SA-u-ca-gregory') : '—'}</Text>
                <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: '#009688' }}>{order.total || 0} {AR ? 'ر.س' : 'SAR'}</Text>
              </View>
            </NCard>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ══════ ORDER DETAIL SCREEN — PILLAR 4+5+6 ══════
function OrderDetailScreen({ order, onBack, onNav }: { order: any; onBack: () => void; onNav: (s: string, p?: any) => void }) {
  const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast();
  const AR = lang === 'ar';
  const [loading, setLoading] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(order);
  const [showNphies, setShowNphies] = useState(false);
  const [nphiesCode, setNphiesCode] = useState('');
  const [copay, setCopay] = useState('');
  const [showAbort, setShowAbort] = useState(false);
  const [abortReason, setAbortReason] = useState('');
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleDays, setRescheduleDays] = useState<number | null>(null);

  const refresh = async () => { try { const res = await client.get(`/radiology/bookings/${order.id}`); setCurrentOrder(res.data); } catch {} };
  const doAction = async (action: string, body?: any) => {
    setLoading(true);
    try { await client.post(`/radiology/bookings/${currentOrder.id}/${action}`, body || {}); show(AR ? 'تم بنجاح' : 'Done', 'success'); await refresh(); }
    catch (e: any) { show(e.message || (AR ? 'حدث خطأ' : 'Error'), 'error'); }
    finally { setLoading(false); }
  };

  const handleInsuranceApproval = async () => {
    if (!nphiesCode) return show(AR ? 'أدخل رمز الموافقة' : 'Enter approval code', 'warning');
    setLoading(true);
    try { await client.post(`/radiology/bookings/${currentOrder.id}/insurance-approval`, { approval_code: nphiesCode, copay: parseFloat(copay) || 0 }); show(AR ? 'تم إرسال التأمين للمريض' : 'Insurance approval sent', 'success'); setShowNphies(false); await refresh(); }
    catch (e: any) { show(e.message, 'error'); } finally { setLoading(false); }
  };

  const handleAbort = async () => {
    if (!abortReason) return show(AR ? 'اختر سبب الإلغاء' : 'Select abort reason', 'warning');
    setLoading(true);
    try { await client.post(`/radiology/bookings/${currentOrder.id}/abort`, { reason: abortReason }); show(AR ? 'تم إلغاء الفحص وإنشاء طلب استرداد' : 'Scan aborted. Refund ticket created.', 'info'); setShowAbort(false); await refresh(); }
    catch (e: any) { show(e.message, 'error'); } finally { setLoading(false); }
  };

  const RESCHEDULE_OPTIONS = [
    { days: 1, ar: 'غداً', en: 'Tomorrow' },
    { days: 2, ar: 'بعد يومين', en: 'In 2 days' },
    { days: 3, ar: 'بعد 3 أيام', en: 'In 3 days' },
    { days: 7, ar: 'بعد أسبوع', en: 'In a week' },
  ];

  const handleReschedule = async () => {
    if (!rescheduleDays) return show(AR ? 'اختر الموعد الجديد' : 'Select new slot', 'warning');
    setLoading(true);
    try {
      const newDate = new Date(Date.now() + rescheduleDays * 24 * 60 * 60 * 1000).toISOString();
      await client.patch(`/radiology/bookings/${currentOrder.id}/reschedule`, { new_date: newDate, reason: 'reschedule_after_abort' });
      show(AR ? 'تمت إعادة الجدولة بنجاح' : 'Rescheduled successfully', 'success');
      setShowReschedule(false); setRescheduleDays(null); await refresh();
    } catch (e: any) { show(e.message, 'error'); } finally { setLoading(false); }
  };

  const sq = currentOrder.safety_questionnaire || {};
  const meta = STATE_LABELS[currentOrder.state] || STATE_LABELS.NEW_REQUEST;

  return (
    <NScroll>
      <NHeader title={AR ? 'تفاصيل الطلب' : 'Order Detail'} onBack={onBack} />
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
          <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>{AR ? 'الموعد:' : 'Scheduled:'} {currentOrder.scheduled_at ? new Date(currentOrder.scheduled_at).toLocaleString('ar-SA-u-ca-gregory') : '—'}</Text>
          <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left', marginTop: 4 }}>{AR ? 'الدفع:' : 'Payment:'} {currentOrder.payment_method || 'cash'} | {currentOrder.total || 0} {AR ? 'ر.س' : 'SAR'}</Text>
        </View>
      </NCard>

      {/* Safety Questionnaire — PILLAR 3 */}
      <NSecHeader title={AR?' استبيان السلامة':' Safety Questionnaire'} />
      <NCard style={{ marginBottom: SP.lg }}>
        {[{ key: 'is_pregnant', ar: 'حمل أو اشتباه حمل', en: 'Pregnant / Suspected' }, { key: 'has_pacemaker', ar: 'منظم ضربات قلب', en: 'Pacemaker' }, { key: 'has_metal_implant', ar: 'دعامات معدنية', en: 'Metal Implants' }, { key: 'has_contrast_allergy', ar: 'حساسية من الصبغة', en: 'Contrast Allergy' }].map(item => {
          const val = sq[item.key];
          if (val === undefined) return null;
          return (<View key={item.key} style={{ flexDirection: AR?'row-reverse':'row', justifyContent:'space-between', alignItems:'center', paddingVertical: SP.sm, borderBottomWidth: 1, borderColor: theme.border }}><Text style={{ fontSize: FS.sm, color: theme.text }}>{AR? item.ar: item.en}</Text><Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: val?'#F44336':'#4CAF50' }}>{val? (AR?'نعم':'YES'): (AR?'لا':'NO')}</Text></View>);
        })}
        {Object.keys(sq).length === 0 && <Text style={{ color: theme.textSub, textAlign: 'center', padding: SP.md }}>{AR ? 'لم يُجب المريض على الاستبيان بعد' : 'Questionnaire not completed'}</Text>}
      </NCard>

      {/* Actions by State — PILLAR 5 */}
      <NSecHeader title={AR ? 'الإجراءات' : 'Actions'} />
      <View style={{ gap: SP.md, marginBottom: SP.xl }}>
        {currentOrder.state === 'NEW_REQUEST' && (<>
          <NBtn label={AR?' تأكيد الطلب (كاش)':' Confirm Order (Cash)'} loading={loading} onPress={async () => { setLoading(true); try { await client.patch(`/radiology/bookings/${currentOrder.id}/state`, { state:'CONFIRMED', note:'Cash confirmed' }); show(AR?'تم التأكيد':'Confirmed','success'); await refresh(); } catch(e:any){show(e.message,'error');} finally{setLoading(false);} }} />
          <NBtn label={AR?' طلب موافقة تأمين (NPHIES)':' Request Insurance Approval'} variant="outline" onPress={() => setShowNphies(true)} />
          <NBtn label={AR?' رفض الطلب':' Decline Order'} variant="danger" loading={loading} onPress={async () => { setLoading(true); try { await client.patch(`/radiology/bookings/${currentOrder.id}/state`, { state:'CANCELLED', note:'Rejected by center' }); show(AR?'تم الرفض':'Declined','info'); onBack(); } catch(e:any){show(e.message,'error');} finally{setLoading(false);} }} />
        </>)}
        {currentOrder.state ==='PENDING_INSURANCE' && <NBtn label={AR?' إدخال موافقة التأمين':' Enter Insurance Approval'} onPress={() => setShowNphies(true)} />}
        {currentOrder.state ==='CONFIRMED' && <NBtn label={AR?' تأكيد حضور المريض (Check-in)':' Confirm Patient Arrival (Check-in)'} loading={loading} onPress={() => doAction('checkin')} style={{ backgroundColor:'#009688' }} />}
        {currentOrder.state === 'ARRIVED_CHECKIN' && (<>
          <NBtn label={AR?' استدعاء لغرفة الأشعة':' Call to Scanning Room'} loading={loading} onPress={() => doAction('start-scan')} style={{ backgroundColor:'#FF9800' }} />
          <NBtn label={AR?' إلغاء الفحص طارئ':' Emergency Abort'} variant="danger" onPress={() => setShowAbort(true)} />
        </>)}
        {currentOrder.state === 'IN_SCANNING' && (<>
          <NBtn label={AR?' رفع التقرير والنتائج':' Upload Report & Results'} onPress={() => onNav('reporting', currentOrder)} />
          <NBtn label={AR?' إلغاء الفحص طارئ':' Emergency Abort Scan'} variant="danger" onPress={() => setShowAbort(true)} />
        </>)}
        {currentOrder.state ==='REPORT_DRAFT' && <NBtn label={AR?' إرسال للمراجعة الطبية':' Submit for Radiologist Review'} loading={loading} onPress={() => doAction('submit-report-for-review')} />}
        {currentOrder.state ==='UNDER_REVIEW' && <NBtn label={AR?' اعتماد وإرسال التقرير':' Approve & Publish Report'} loading={loading} onPress={() => doAction('approve-report')} style={{ backgroundColor:'#4CAF50' }} />}
        {currentOrder.state ==='SCAN_ABORTED' && (<View style={{ backgroundColor:'#F4433612', borderRadius: R.md, padding: SP.md }}><Text style={{ color:'#F44336', fontWeight: FW.bold, textAlign:'center', marginBottom: SP.md }}>{AR?` سبب الإلغاء: ${currentOrder.abort_reason}`:` Abort Reason: ${currentOrder.abort_reason}`}</Text><NBtn label={AR?' إعادة الجدولة':' Reschedule'} loading={loading} onPress={() => setShowReschedule(true)} /></View>)}
        {currentOrder.state ==='REPORT_READY' && (<View style={{ backgroundColor:'#4CAF5012', borderRadius: R.md, padding: SP.lg, alignItems:'center' }}><Text style={{ color:'#4CAF50', fontSize: FS.lg, fontWeight: FW.bold }}>{AR?' التقرير أُرسل للمريض':' Report Sent to Patient'}</Text>{currentOrder.doctor_notified && <Text style={{ color:'#009688', fontSize: FS.sm, marginTop: SP.sm }}>{AR?' تم إشعار الطبيب المحيل':' Referring doctor notified'}</Text>}</View>)}
      </View>

      {/* NPHIES Insurance Modal */}
      <NSheet visible={showNphies} onClose={() => setShowNphies(false)} title={AR ? 'إدخال موافقة التأمين' : 'Insurance Approval'}>
        <NInput label={AR ? 'رمز الموافقة (NPHIES)' : 'NPHIES Approval Code'} value={nphiesCode} onChange={setNphiesCode} placeholder="NPH-2024-XXXXX" />
        <NPriceInput label={AR ? 'نسبة التحمل (Co-Pay) ر.س' : 'Co-Pay Amount SAR'} value={copay} onChange={setCopay} />
        <Text style={{ fontSize: FS.xs, color: '#FF9800', textAlign: AR ? 'right' : 'left', marginBottom: SP.md }}>{AR ? 'إذا كانت نسبة التحمل > 0، سيُطلب من المريض الدفع أولاً.' : 'If co-pay > 0, patient must pay before confirmation.'}</Text>
        <NBtn label={AR ? 'إرسال للمريض' : 'Send to Patient'} loading={loading} onPress={handleInsuranceApproval} />
      </NSheet>

      {/* Abort Modal — PILLAR 5 */}
      <NSheet visible={showAbort} onClose={() => setShowAbort(false)} title={AR?' إلغاء الفحص - اختر السبب':' Abort Scan - Select Reason'}>
        <Text style={{ color: '#F44336', marginBottom: SP.md, textAlign: AR ? 'right' : 'left', fontSize: FS.sm }}>{AR ? 'سيتم إلغاء الفحص وإنشاء طلب استرداد تلقائي للإدارة.' : 'Scan will be aborted and a refund request will be auto-generated for admin.'}</Text>
        {ABORT_REASONS.map(r => (
          <TouchableOpacity key={r.key} style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md, paddingVertical: SP.md, borderBottomWidth: 1, borderColor: '#F4433630' }} onPress={() => setAbortReason(r.key)}>
            <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#F44336', alignItems: 'center', justifyContent: 'center' }}>{abortReason === r.key && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#F44336' }} />}</View>
            <Text style={{ fontSize: FS.sm, color: '#F44336' }}>{AR ? r.ar : r.en}</Text>
          </TouchableOpacity>
        ))}
        <NBtn label={AR?' تأكيد إلغاء الفحص':' Confirm Abort'} loading={loading} disabled={!abortReason} onPress={handleAbort} style={{ backgroundColor:'#F44336', borderColor:'#F44336', marginTop: SP.xl }} />
      </NSheet>

      {/* Reschedule Modal */}
      <NSheet visible={showReschedule} onClose={() => setShowReschedule(false)} title={AR?' إعادة جدولة الفحص':' Reschedule Scan'}>
        <Text style={{ color: '#56606E', marginBottom: SP.md, textAlign: AR ? 'right' : 'left', fontSize: FS.sm }}>{AR ? 'اختر الموعد الجديد للفحص بعد الإلغاء الطارئ.' : 'Select the new scan slot after the emergency abort.'}</Text>
        {RESCHEDULE_OPTIONS.map(o => (
          <TouchableOpacity key={o.days} style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md, paddingVertical: SP.md, borderBottomWidth: 1, borderColor: '#00968830' }} onPress={() => setRescheduleDays(o.days)}>
            <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#009688', alignItems: 'center', justifyContent: 'center' }}>{rescheduleDays === o.days && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#009688' }} />}</View>
            <Text style={{ fontSize: FS.sm, color: '#009688' }}>{AR ? o.ar : o.en}</Text>
          </TouchableOpacity>
        ))}
        <NBtn label={AR?' تأكيد إعادة الجدولة':' Confirm Reschedule'} loading={loading} disabled={!rescheduleDays} onPress={handleReschedule} style={{ backgroundColor:'#009688', borderColor:'#009688', marginTop: SP.xl }} />
      </NSheet>
    </NScroll>
  );
}

// ══════ REPORTING SCREEN — PILLAR 6 + MODULE 10 ══════
function ReportingScreen({ order, onBack }: { order: any; onBack: () => void }) {
  const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast();
  const AR = lang === 'ar';
  const [loading, setLoading] = useState(false);
  const [pdfUploaded, setPdfUploaded] = useState(!!order.signed_report_pdf_url);
  const [dicomUrl, setDicomUrl] = useState(order.dicom_url || '');
  const [findings, setFindings] = useState(order.clinical_impression_report || '');
  const [reportStatus, setReportStatus] = useState(order.report_status || 'draft');

  const handleUploadPdf = async () => {
    setLoading(true);
    try {
      await client.post(`/radiology/bookings/${order.id}/upload-report`, { pdf_url: 'https://storage.nabdah.com/reports/' + order.id + '.pdf', dicom_url: dicomUrl || null, findings });
      setPdfUploaded(true); setReportStatus('draft');
      show(AR ? 'تم رفع التقرير — المسودة جاهزة' : 'Report uploaded — Draft ready', 'success');
    } catch (e: any) { show(e.message, 'error'); } finally { setLoading(false); }
  };

  const handleSubmitForReview = async () => {
    if (!pdfUploaded) return show(AR ? 'يجب رفع PDF أولاً (إلزامي)' : 'PDF upload is mandatory', 'warning');
    setLoading(true);
    try { await client.post(`/radiology/bookings/${order.id}/submit-report-for-review`, {}); setReportStatus('under_review'); show(AR ? 'تم الإرسال للمراجعة' : 'Sent for review', 'success'); }
    catch (e: any) { show(e.message, 'error'); } finally { setLoading(false); }
  };

  const handleApproveAndPublish = async () => {
    setLoading(true);
    try { await client.post(`/radiology/bookings/${order.id}/approve-report`, {}); setReportStatus('ready'); show(AR?'تم نشر التقرير للمريض':'Report published','success'); onBack(); }
    catch (e: any) { show(e.message, 'error'); } finally { setLoading(false); }
  };

  const STEPS = [{ key: 'draft', ar: 'رفع الملفات', en: 'Upload' }, { key: 'under_review', ar: 'مراجعة', en: 'Review' }, { key: 'ready', ar: 'نُشر', en: 'Published' }];
  const stepIdx = STEPS.findIndex(s => s.key === reportStatus);

  return (
    <NScroll>
      <NHeader title={AR ? 'رفع التقرير والنتائج' : 'Upload Report & Results'} onBack={onBack} />
      <NCard style={{ marginBottom: SP.lg, flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, alignItems: 'center' }}><IBg name="scan" size={16} color="#009688" bg="#00968812" /><View><Text style={{ fontWeight: FW.bold, color: theme.text }}>{order.patient_name || '—'}</Text><Text style={{ fontSize: FS.xs, color: theme.textSub }}>{order.scan_name_ar || order.scan_name_en || '—'}</Text></View></NCard>

      {/* MODULE 10: Report Quality Steps */}
      <NCard style={{ marginBottom: SP.lg }}>
        <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text, marginBottom: SP.md, textAlign: AR ? 'right' : 'left' }}>{AR ? 'مسار جودة التقرير' : 'Report Quality Workflow'}</Text>
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center' }}>
          {STEPS.map((step, i) => (<React.Fragment key={step.key}><View style={{ alignItems: 'center', flex: 1 }}><View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: i <= stepIdx ? '#009688' : theme.border, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: i <= stepIdx ? '#fff' : theme.textSub, fontSize: 12, fontWeight: FW.bold }}>{i + 1}</Text></View><Text style={{ fontSize: 9, color: i <= stepIdx ? '#009688' : theme.textSub, marginTop: 4, textAlign: 'center' }}>{AR ? step.ar : step.en}</Text></View>{i < STEPS.length - 1 && <View style={{ flex: 0.5, height: 2, backgroundColor: i < stepIdx ? '#009688' : theme.border }} />}</React.Fragment>))}
        </View>
      </NCard>

      {/* Section 1: PDF (Mandatory) */}
      <NSecHeader title={AR?' قسم 1: تقرير PDF (إلزامي)':' Section 1: PDF Report (Mandatory)'} />
      <NCard style={{ marginBottom: SP.lg }}>
        <NInput label={AR ? 'النتائج السريرية (Findings)' : 'Clinical Findings'} value={findings} onChange={setFindings} multi lines={4} placeholder={AR ? 'اذكر النتائج الإشعاعية...' : 'Describe radiology findings...'} />
        <NBtn label={pdfUploaded? (AR?' PDF مرفوع — إعادة الرفع':' PDF Uploaded — Re-upload'): (AR?' رفع تقرير PDF':' Upload PDF Report')} loading={loading} onPress={handleUploadPdf} style={{ backgroundColor: pdfUploaded?'#4CAF50':'#009688' }} />
        {!pdfUploaded && <Text style={{ fontSize: FS.xs, color: '#F44336', textAlign: AR ? 'right' : 'left', marginTop: SP.sm }}>{AR ? '* رفع PDF إلزامي قبل المراجعة' : '* PDF is mandatory before review'}</Text>}
      </NCard>

      {/* Section 2: DICOM (Optional) */}
      <NSecHeader title={AR?' قسم 2: صور DICOM (اختياري)':' Section 2: DICOM Images (Optional)'} />
      <NCard style={{ marginBottom: SP.lg }}>
        <NInput label={AR ? 'رابط PACS/DICOM الخارجي' : 'External PACS/DICOM URL'} value={dicomUrl} onChange={setDicomUrl} placeholder="https://pacs.hospital.com/viewer/..." />
        <NBtn label={AR?' رفع صور الأشعة (JPEG/PNG)':' Upload Scan Images (JPEG/PNG)'} variant="outline" loading={loading} onPress={() => show(AR?'سيتم دعمه مع تكامل S3':'Coming with S3 integration','info')} />
      </NCard>

      {reportStatus ==='draft' && pdfUploaded && <NBtn label={AR?' إرسال للمراجعة الطبية':' Submit for Radiologist Review'} loading={loading} onPress={handleSubmitForReview} style={{ marginBottom: SP.md }} />}
      {reportStatus ==='under_review' && <NBtn label={AR?' اعتماد وإرسال للمريض':' Approve & Publish to Patient'} loading={loading} onPress={handleApproveAndPublish} style={{ backgroundColor:'#4CAF50', marginBottom: SP.md }} />}
      {reportStatus ==='ready' && <View style={{ backgroundColor:'#4CAF5012', borderRadius: R.md, padding: SP.lg, alignItems:'center', marginBottom: SP.md }}><Text style={{ color:'#4CAF50', fontSize: FS.lg, fontWeight: FW.bold }}>{AR?' نُشر التقرير للمريض':' Report Published to Patient'}</Text></View>}
    </NScroll>
  );
}

// ══════ CATALOG MANAGER — PILLAR 2+3 + MODULE 15 ══════
function CatalogManagerTab() {
  const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast();
  const AR = lang === 'ar';
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => { client.get('/provider/capabilities/radiology').then(r => setServices(r.data || [])).catch(() => {}).finally(() => setLoading(false)); }, []);

  const handleSubmitDelta = async () => {
    if (!nameEn || !price) return show(AR ? 'أدخل الاسم والسعر' : 'Enter name and price', 'warning');
    try {
      await client.post('/radiology/catalog/delta-request', { name_ar: nameAr, name_en: nameEn, modality_category: modality, price: parseFloat(price), estimated_duration_minutes: parseInt(duration) || 30, insurance_availability: insAvail, portable_ultrasound: portableUS, requires_pregnancy_check: riskPregnancy, requires_metal_implant_check: riskMetal, requires_contrast_allergy_check: riskContrast, preparation_keys: prepItems });
      show(AR ? 'تم إرسال طلب الإضافة للمراجعة الإدارية' : 'Add request sent for admin review', 'success');
      setShowAdd(false);
    } catch (e: any) { show(e.message, 'error'); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'كتالوج الأشعة' : 'Radiology Catalog'} />
      <ScrollView contentContainerStyle={{ padding: SP.lg, paddingBottom: 100 }}>
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.lg }}>
          <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.textSub }}>{AR ? 'الفحوصات المتاحة' : 'Available Scans'} ({services.length})</Text>
          <NBtn label={AR ? '+ إضافة فحص' : '+ Add Scan'} size="sm" onPress={() => setShowAdd(true)} full={false} />
        </View>
        {loading && <ActivityIndicator color="#009688" />}
        {services.map(s => (
          <NCard key={s.id} style={{ marginBottom: SP.md }}>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <NBadge label={s.modality_category || s.modality || '—'} variant="info" size="xs" />
                <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginTop: 4 }}>{AR ? (s.name_ar || s.name_en) : s.name_en}</Text>
                <Text style={{ fontSize: FS.xs, color: '#009688' }}>{s.price} {AR ? 'ر.س' : 'SAR'} | {s.estimated_duration_minutes || 30} {AR ? 'د' : 'min'}</Text>
                <View style={{ flexDirection: 'row', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                  {s.requires_pregnancy_check && <View style={{ backgroundColor: '#FF980020', borderRadius: 4, padding: 2 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}><I name="pregnancy" size={10} color="#FF9800" /><Text style={{ fontSize: 8, color: '#FF9800' }}>Pregnancy</Text></View></View>}
                  {s.requires_metal_implant_check && <View style={{ backgroundColor: '#9C27B020', borderRadius: 4, padding: 2 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}><I name="wrench" size={10} color="#9C27B0" /><Text style={{ fontSize: 8, color: '#9C27B0' }}>Metal</Text></View></View>}
                  {s.requires_contrast_allergy_check && <View style={{ backgroundColor: '#F4433620', borderRadius: 4, padding: 2 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}><I name="syringe" size={10} color="#F44336" /><Text style={{ fontSize: 8, color: '#F44336' }}>Contrast</Text></View></View>}
                </View>
              </View>
              <NBtn label={AR ? 'تعديل' : 'Edit'} size="xs" variant="outline" full={false} onPress={() => show(AR ? 'التعديلات تُرسل للمراجعة الإدارية' : 'Edits go through admin review', 'info')} />
            </View>
          </NCard>
        ))}
        {!loading && services.length === 0 && <NEmpty title={AR ? 'لا توجد فحوصات بعد' : 'No scans yet'} icon="scan" />}
      </ScrollView>

      <NSheet visible={showAdd} onClose={() => setShowAdd(false)} title={AR ? 'إضافة فحص جديد' : 'Add New Scan'}>
        <Text style={{ fontSize: FS.xs, color:'#FF9800', textAlign: AR?'right':'left', marginBottom: SP.md }}>{AR?' يذهب للمراجعة الإدارية قبل ظهوره للمرضى.':' Goes for admin review before patient visibility.'}</Text>
        <Text style={{ fontSize: FS.sm, color: theme.text, marginBottom: SP.sm }}>{AR ? 'فئة الجهاز (Modality)' : 'Modality Category'}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SP.md }}>
          <View style={{ flexDirection: 'row', gap: SP.sm }}>{MODALITIES.map(m => <TouchableOpacity key={m} style={{ paddingHorizontal: SP.md, paddingVertical: SP.sm, borderRadius: R.md, backgroundColor: modality === m ? '#009688' : theme.surface2, borderWidth: 1, borderColor: modality === m ? '#009688' : theme.border }} onPress={() => setModality(m)}><Text style={{ color: modality === m ? '#fff' : theme.text, fontSize: FS.sm }}>{m}</Text></TouchableOpacity>)}</View>
        </ScrollView>
        <NInput label={AR ? 'اسم الفحص (عربي)' : 'Scan Name (Arabic)'} value={nameAr} onChange={setNameAr} placeholder="رنين مغناطيسي الدماغ بصبغة" />
        <NInput label={AR ? 'اسم الفحص (إنجليزي)' : 'Scan Name (English)'} value={nameEn} onChange={setNameEn} placeholder="MRI Brain with Contrast" />
        <NPriceInput label={AR ? 'السعر كاش (ر.س)' : 'Cash Price (SAR)'} value={price} onChange={setPrice} />
        <NInput label={AR ? 'المدة المتوقعة (دقيقة)' : 'Expected Duration (minutes)'} value={duration} onChange={setDuration} placeholder="30" />
        <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text, marginVertical: SP.md }}>{AR?' عوامل الخطر (Risk Flags)':' Risk Flags'}</Text>
        {[{ label: AR ? 'يتطلب فحص حمل (X-Ray, CT)' : 'Requires Pregnancy Check', state: riskPregnancy, set: setRiskPregnancy }, { label: AR ? 'يتطلب فحص معدن/منظم (MRI)' : 'Requires Metal/Pacemaker Check', state: riskMetal, set: setRiskMetal }, { label: AR ? 'يتطلب فحص حساسية صبغة' : 'Requires Contrast Allergy Check', state: riskContrast, set: setRiskContrast }].map((item, i) => <View key={i} style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.sm }}><Text style={{ fontSize: FS.sm, color: theme.text, flex: 1 }}>{item.label}</Text><Switch value={item.state} onValueChange={item.set} trackColor={{ true: '#F44336' }} /></View>)}
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.sm }}><Text style={{ fontSize: FS.sm, color: theme.text }}>{AR ? 'أشعة منزلية محمولة (US فقط)' : 'Portable Ultrasound (Home Visit)'}</Text><Switch value={portableUS} onValueChange={setPortableUS} trackColor={{ true: '#009688' }} /></View>
        <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text, marginVertical: SP.md }}>{AR?' تعليمات التحضير':' Patient Preparation'}</Text>
        {PREP_OPTIONS.map(p => <TouchableOpacity key={p.key} style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.sm, paddingVertical: SP.sm }} onPress={() => setPrepItems(prev => prev.includes(p.key) ? prev.filter(x => x !== p.key) : [...prev, p.key])}><View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: '#009688', backgroundColor: prepItems.includes(p.key) ? '#009688' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>{prepItems.includes(p.key) && <I name="check" size={12} color="#fff" />}</View><Text style={{ fontSize: FS.sm, color: theme.text }}>{AR ? p.ar : p.en}</Text></TouchableOpacity>)}
        <NBtn label={AR ? 'إرسال للمراجعة الإدارية' : 'Submit for Admin Review'} onPress={handleSubmitDelta} style={{ marginTop: SP.xl }} />
      </NSheet>
    </View>
  );
}

// ══════ AVAILABILITY SCHEDULE — MODULE 9 ══════
function AvailabilityScheduleTab() {
  const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast();
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
    try { await client.post('/radiology/catalog/delta-request', { type: 'schedule_update', working_days: workingDays, morning_shift: { from: morningFrom, to: morningTo }, evening_shift: { from: eveningFrom, to: eveningTo }, emergency_available: emergencyAvailable }); show(AR ? 'تم حفظ الجدول وإرساله للمراجعة' : 'Schedule saved and sent for review', 'success'); }
    catch (e: any) { show(e.message, 'error'); } finally { setSaving(false); }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ padding: SP.lg, paddingBottom: 120 }}>
      <NHeader title={AR ? 'جدول المواعيد والتوفر' : 'Availability Schedule'} />
      <NSecHeader title={AR?' أيام العمل':' Working Days'} />
      <NCard style={{ marginBottom: SP.lg }}>
        {DAYS_AR.map((day, i) => <TouchableOpacity key={i} style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SP.md, borderBottomWidth: i < 6 ? 1 : 0, borderColor: theme.border }} onPress={() => setWorkingDays(prev => { const n = [...prev]; n[i] = !n[i]; return n; })}><Text style={{ fontSize: FS.sm, color: theme.text }}>{AR ? day : DAYS_EN[i]}</Text><View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: workingDays[i] ? '#009688' : theme.surface2, borderWidth: 2, borderColor: workingDays[i] ? '#009688' : theme.border, alignItems: 'center', justifyContent: 'center' }}>{workingDays[i] && <I name="check" size={12} color="#fff" />}</View></TouchableOpacity>)}
      </NCard>
      <NSecHeader title={AR?' الفترة الصباحية':' Morning Shift'} />
      <NCard style={{ marginBottom: SP.lg, flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md }}>
        <NInput label={AR ? 'من' : 'From'} value={morningFrom} onChange={setMorningFrom} placeholder="08:00" style={{ flex: 1 }} />
        <NInput label={AR ? 'إلى' : 'To'} value={morningTo} onChange={setMorningTo} placeholder="14:00" style={{ flex: 1 }} />
      </NCard>
      <NSecHeader title={AR?' الفترة المسائية':' Evening Shift'} />
      <NCard style={{ marginBottom: SP.lg, flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md }}>
        <NInput label={AR ? 'من' : 'From'} value={eveningFrom} onChange={setEveningFrom} placeholder="17:00" style={{ flex: 1 }} />
        <NInput label={AR ? 'إلى' : 'To'} value={eveningTo} onChange={setEveningTo} placeholder="22:00" style={{ flex: 1 }} />
      </NCard>
      <NCard style={{ marginBottom: SP.xl }}>
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View><Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{AR?' متاح للطوارئ':' Emergency Availability'}</Text><Text style={{ fontSize: FS.xs, color: theme.textSub }}>{AR?'يسمح بالحجز خارج أوقات العمل':'Allow bookings outside working hours'}</Text></View>
          <Switch value={emergencyAvailable} onValueChange={setEmergencyAvailable} trackColor={{ true: '#F44336' }} />
        </View>
      </NCard>
      <NBtn label={AR ? 'حفظ وإرسال للمراجعة' : 'Save & Send for Review'} loading={saving} onPress={handleSave} />
    </ScrollView>
  );
}

// ══════ SETTINGS ══════
function RadiologySettingsScreen({ onLogout, onNav }: { onLogout: () => void; onNav?: (s: string, p?: any) => void }) {
  const { theme } = useTheme(); const { lang } = useLang();
  const AR = lang === 'ar';
  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ padding: SP.lg, paddingBottom: 100 }}>
      <NHeader title={AR ? 'الإعدادات' : 'Settings'} />
      <NCard style={{ marginBottom: SP.md }}><Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.md }}>{AR ? 'معلومات المركز' : 'Center Information'}</Text><Text style={{ color: theme.textSub, textAlign: AR ? 'right' : 'left', fontSize: FS.sm }}>{AR ? 'تعديل بيانات المركز يتطلب مراجعة إدارية' : 'Center data changes require admin review'}</Text></NCard>
      <NCard style={{ marginBottom: SP.md }}>
        <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.md }}>{AR ? 'التأمين' : 'Insurance'}</Text>
        <NBtn label={AR ? 'طلبات التأمين الواردة (قرار يدوي)' : 'Inbound Insurance Requests'} variant="outline" onPress={() => onNav && onNav('insurance_requests')} />
      </NCard>
      <NCard style={{ marginBottom: SP.md }}>
        <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.md }}>{AR ? 'الأدوية' : 'Drugs'}</Text>
        <NBtn label={AR ? 'دليل الأدوية الطبي' : 'Medical Drug Index'} variant="outline" onPress={() => onNav && onNav('drug_index')} />
      </NCard>
      <NCard style={{ marginTop: SP.xl }}><NBtn label={AR ? 'تسجيل الخروج' : 'Logout'} onPress={onLogout} style={{ backgroundColor: '#F44336', borderColor: '#F44336' }} /></NCard>
    </ScrollView>
  );
}
