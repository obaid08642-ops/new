/**
 * NABDAH PLUS – PHASE 4 · LAB & RADIOLOGY DASHBOARD (18 screens)
 */
import { confirmBlocker, confirmBlockerText } from '../../utils/confirmBlocker';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
 View, Text, TouchableOpacity, ScrollView, StyleSheet,
 Animated, FlatList, Alert, Dimensions, Switch, RefreshControl, TextInput
, ActivityIndicator, Modal } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useLang, useAuth, useToast } from '../../context';
import { BookingChatScreen } from '../shared/BookingChatScreen';
import client from '../../api/client';
import { ProviderApi } from '../../api/provider';
import * as DocumentPicker from 'expo-document-picker';
import { InsuranceRequestsScreen } from '../shared/InsuranceRequestsScreen';
import { orderingStackScreens, ORDERING_ENTRY } from '../ordering';
import { LabQcActions } from './LabQcActions';
import {
 NBtn, NCard, NInput, NStatCard, NAvatar, NBadge,
 NHeader, NScroll, NSheet, NSearch, NToggle, NSettingsRow,
 NSecHeader, NConfirm, NEmpty, NOnlineToggle, NBottomNav,
 NDivider, NPriceInput
} from '../../components/ui';
import { I, IBg, RatingStars } from '../../components/icons';
import { SP, R, FS, FW, RAD_SCANS, C } from '../../constants';
import { fetchCentralCatalog } from '../../api/central-catalog';
// Central catalog lookup (labs + radiology live DB, admin-managed).
// Hydrated async once at module load; display-only, never blocks rendering.
const centralTestMap: Record<string, any> = {};
fetchCentralCatalog().then((m) => Object.assign(centralTestMap, m)).catch(() => {});
const lookupTest = (tid: string) => centralTestMap[String(tid || '').toLowerCase()];
import {
 PromotionsDashboard, CreateCampaignScreen, 
 ReputationHub, LiveOrderAlarmModal, CrmHub, RevenueInsights,
 LabSampleScannerScreen
} from '../shared/BlueprintScreens';
import { MedicalJobsScreen, MedicalDrugIndexScreen, InsuranceConfigScreen, CertificatesConfigScreen, MediaConfigScreen, ProviderWalletScreen, ProviderProfileEditor, WithdrawalWorkflow, ProviderHomeStats, GlobalSystemSettings, ChatSystem } from '../shared/SharedScreens';
import { WorkingHoursEditorScreen, SecurityManagementScreen, NotificationsCenterScreen } from '../shared/RealScreens';
import { LabBundlesScreen, LabHomeServiceScreen } from '../shared/RealScreensExtended';
import { MyServicesScreen } from '../shared/MyServicesScreen';

const { width: W } = Dimensions.get('window');

// Connected to backend APIs for lab orders and samples
const STAGES = [
  { key: 'PENDING', ar: 'قيد الانتظار', en: 'Pending', color: tokens.warning },
  { key: 'SAMPLE_COLLECTED', ar: 'تم سحب العينة', en: 'Sample Collected', color: tokens.info },
  { key: 'PROCESSING', ar: 'قيد التحليل', en: 'Processing', color: tokens.purple },
  { key: 'RESULTS_READY', ar: 'النتائج جاهزة', en: 'Results Ready', color: tokens.success },
  { key: 'COMPLETED', ar: 'مكتمل', en: 'Completed', color: tokens.success },
  { key: 'SAMPLE_REJECTED', ar: 'عينة مرفوضة', en: 'Sample Rejected', color: tokens.error },
];


// Backend booking (labs.service): state, payment_method, location_type, items[{service_id,name_ar,name_en}].
// The detail screen reads a view shape; map once here so every list opens the same thing.
export const toLabOrderView = (x: any) => ({
  ...x,
  status: x.state,
  patient: x.patient_name,
  is_insurance: x.payment_method === 'insurance',
  insurance: x.payment_method === 'insurance' ? (x.insurance_provider || 'Insurance') : x.payment_method === 'card' ? 'Card' : 'Cash',
  homeCollection: x.location_type === 'home',
  tests: (x.items || []).map((i: any) => i.service_id),
  tech_name: x.technician_name || x.technician_id,
});

/** A home-collection booking with a phlebotomist assigned: it waits in CONFIRMED (assigning does not change the state) and is on the road in IN_TRANSIT. */
export const isTripOrder = (o: any): boolean => !!o?.homeCollection && !!o?.tech_name && (o.status === 'CONFIRMED' || o.status === 'IN_TRANSIT');

const BOOKING_STATES: Record<string, { ar: string; en: string; color: string }> = {
  NEW_REQUEST: { ar: 'طلب جديد', en: 'New request', color: tokens.warning },
  PENDING_INSURANCE: { ar: 'بانتظار التأمين', en: 'Pending insurance', color: tokens.warning },
  WAITING_COPAY: { ar: 'بانتظار التحمل', en: 'Waiting co-pay', color: tokens.warning },
  CONFIRMED: { ar: 'مؤكد', en: 'Confirmed', color: tokens.info },
  IN_TRANSIT: { ar: 'الفني في الطريق', en: 'In transit', color: tokens.info },
  IN_LAB: { ar: 'في المختبر', en: 'In lab', color: tokens.info },
  SAMPLE_COLLECTED: { ar: 'تم سحب العينة', en: 'Sample collected', color: tokens.info },
  PROCESSING: { ar: 'قيد التحليل', en: 'Processing', color: tokens.purple },
  RESULT_UPLOADED: { ar: 'النتيجة جاهزة', en: 'Result ready', color: tokens.success },
  REPORTED: { ar: 'تم إرسال التقرير', en: 'Reported', color: tokens.success },
  SAMPLE_REJECTED: { ar: 'عينة مرفوضة', en: 'Sample rejected', color: tokens.error },
  CANCELLED: { ar: 'ملغى', en: 'Cancelled', color: tokens.error },
};

// Sample custody stages (labs.service updateSampleStage): received → analyzing → result_ready → sent.
const SAMPLE_STAGES = [
  { key: 'received', ar: 'مستلمة', en: 'Received', color: tokens.info },
  { key: 'analyzing', ar: 'قيد التحليل', en: 'Analyzing', color: tokens.purple },
  { key: 'result_ready', ar: 'النتيجة جاهزة', en: 'Result ready', color: tokens.success },
  { key: 'sent', ar: 'مُرسلة', en: 'Sent', color: tokens.success },
];

// ══════════════════════════════════════════════════════════════════
// LAB ORDERS SUB-TABS COMPONENT
// ══════════════════════════════════════════════════════════════════

function LabOrdersTab({ onNav }: { onNav: (s: string, p?: any) => void }) {
  const { theme } = useTheme(); const { lang, t, t: tt } = useLang(); const AR = lang === 'ar';
  const [subTab, setSubTab] = useState<'incoming' | 'scheduled' | 'processing' | 'results'>('incoming');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [loadFailed, setLoadFailed] = useState(false);
  const loadInbox = useCallback(() => {
    setLoadFailed(false);
    client.get('/labs/provider/inbox')
      .then(res => setOrders((res.data || []).map(toLabOrderView)))
      .catch(() => { setOrders([]); setLoadFailed(true); }) // a failed load is an error with a retry, not "no orders"
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { loadInbox(); }, [loadInbox]);

  // Backend LabBookingState lives in `state` (not `status`): NEW_REQUEST,
  // PENDING_INSURANCE, WAITING_COPAY, CONFIRMED, IN_TRANSIT, IN_LAB,
  // SAMPLE_COLLECTED, PROCESSING, RESULT_UPLOADED, REPORTED, SAMPLE_REJECTED, CANCELLED.
  const getFilteredOrders = () => {
    if (subTab === 'incoming') return orders.filter(o => ['NEW_REQUEST', 'PENDING_INSURANCE', 'WAITING_COPAY'].includes(o.state));
    if (subTab === 'scheduled') return orders.filter(o => ['CONFIRMED', 'IN_TRANSIT'].includes(o.state));
    if (subTab === 'processing') return orders.filter(o => ['IN_LAB', 'SAMPLE_COLLECTED', 'PROCESSING', 'SAMPLE_REJECTED'].includes(o.state));
    if (subTab === 'results') return orders.filter(o => ['RESULT_UPLOADED', 'REPORTED'].includes(o.state));
    return [];
  };

  const filtered = getFilteredOrders();

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={[s.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text }}>{tt('labdash.a98be3bb')}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.surface, maxHeight: 60 }}>
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', paddingHorizontal: SP.md, gap: SP.md, alignItems: 'center' }}>
          <TouchableOpacity onPress={() => setSubTab('incoming')} style={{ paddingVertical: SP.md, borderBottomWidth: 2, borderBottomColor: subTab === 'incoming' ? theme.primary : 'transparent' }}>
            <Text style={{ fontWeight: subTab === 'incoming' ? 'bold' : 'normal', color: subTab === 'incoming' ? theme.primary : theme.textSub }}>{tt('labdash.e461af56')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSubTab('scheduled')} style={{ paddingVertical: SP.md, borderBottomWidth: 2, borderBottomColor: subTab === 'scheduled' ? theme.primary : 'transparent' }}>
            <Text style={{ fontWeight: subTab === 'scheduled' ? 'bold' : 'normal', color: subTab === 'scheduled' ? theme.primary : theme.textSub }}>{tt('labdash.63e5aebd')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSubTab('processing')} style={{ paddingVertical: SP.md, borderBottomWidth: 2, borderBottomColor: subTab === 'processing' ? theme.primary : 'transparent' }}>
            <Text style={{ fontWeight: subTab === 'processing' ? 'bold' : 'normal', color: subTab === 'processing' ? theme.primary : theme.textSub }}>{tt('labdash.49e2b07e')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSubTab('results')} style={{ paddingVertical: SP.md, borderBottomWidth: 2, borderBottomColor: subTab === 'results' ? theme.primary : 'transparent' }}>
            <Text style={{ fontWeight: subTab === 'results' ? 'bold' : 'normal', color: subTab === 'results' ? theme.primary : theme.textSub }}>{tt('labdash.ba058e12')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      <ScrollView contentContainerStyle={{ padding: SP.lg, paddingBottom: 100 }}>
        {loadFailed && filtered.length === 0 && <NEmpty title={tt('labdash.8f6d6125')} actionLabel={tt('labdash.cf333076')} onAction={loadInbox} icon="document" />}
        {!loadFailed && filtered.length === 0 && <NEmpty title={tt('labdash.f83f4c33')} icon="document" />}
        {filtered.map(order => {
          const st = BOOKING_STATES[order.status] || { ar: order.status, en: order.status, color: tokens.info };
          return (
            <NCard key={order.id} style={{ marginBottom: SP.md, borderColor: order.status === 'SAMPLE_REJECTED' ? theme.danger : theme.border, borderWidth: 1 }} onPress={() => onNav('order_detail', order)}>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{order.patient_name || 'Patient'}</Text>
                  <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <Text style={{ fontSize: FS.sm, color: theme.textSub, fontWeight:'bold' }}>{order.is_insurance?(tt('labdash.815dd0cb')):(tt('labdash.3cab163d'))}</Text>
                    <Text style={{ fontSize: FS.sm, color: theme.textSub }}>•</Text>
                    <Text style={{ fontSize: FS.sm, color: order.homeCollection? theme.primary: theme.textSub }}>{order.homeCollection?' سحب منزلي':' حضور للمختبر'}</Text>
                  </View>
                </View>
                <View style={{ alignItems: AR ? 'flex-start' : 'flex-end' }}>
                  <View style={{ backgroundColor: st.color + '22', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: 6 }}>
                    <Text style={{ color: st.color, fontSize: 11, fontWeight: 'bold' }}>{AR ? st.ar : st.en}</Text>
                  </View>
                  <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: FS.lg }}>{order.total} SAR</Text>
                </View>
              </View>
              {order.tech_name && (
                <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.border, flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center' }}>
                  <Text style={{ fontFamily: 'MaterialIcons', color: theme.primary, fontSize: 16 }}>directions_car</Text>
                  <Text style={{ color: theme.text, fontSize: 13, marginLeft: AR ? 0 : 8, marginRight: AR ? 8 : 0 }}>{order.tech_name}</Text>
                </View>
              )}
            </NCard>
          );
        })}
      </ScrollView>
		</View>
	);
}

// ══════════════════════════════════════════════════════════════════
// NAVIGATOR
// ══════════════════════════════════════════════════════════════════
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { tokens, withAlpha } from '../../theme/tokens';
const Stack = createNativeStackNavigator();

export function LabDashboardNavigator({ onLogout }: { onLogout:()=>void }) {
 const [tab, setTab] = useState('home');
 const { lang, t, t: tt } = useLang(); const AR = lang==='ar';
 const [alarmVisible, setAlarmVisible] = useState(false);

  const tabs = [
 { key: 'home', icon: 'home', label: tt('labdash.17c4ca45') },
 { key: 'orders', icon: 'document', label: tt('labdash.68fdab11') },
 { key: 'jobs', icon: 'profile', label: tt('labdash.ca8089ed') },
 { key: 'drugs', icon: 'activity', label: tt('labdash.61bcd49d') },
 { key: 'settings', icon: 'settings', label: tt('labdash.5766fe8f') },
 ];

 return (
   <Stack.Navigator id={undefined as any} screenOptions={{ headerShown: false }}>
     <Stack.Screen name="MainTabs">
       {({ navigation }) => {
         const go = (s: string, param?: any) => navigation.navigate(s, { param });
         return (
           <View style={{ flex: 1 }}>
             {tab==='home' && <LabHome onNav={go} onTriggerAlarm={() => setAlarmVisible(true)} />}
             {tab==='orders' && <LabOrdersTab onNav={go} />}
             {tab==='jobs' && <MedicalJobsScreen onBack={()=>setTab('home')} />}
             {tab==='drugs' && <MedicalDrugIndexScreen onBack={()=>setTab('home')} />}
             {tab==='settings' && <LabSettings onLogout={onLogout} onNavigate={go} />}
             <NBottomNav tabs={tabs} active={tab} onPress={setTab} />
            
             <LiveOrderAlarmModal
             visible={alarmVisible}
             onAccept={() => { setAlarmVisible(false); go('lab_scanner'); }}
             onDecline={() => setAlarmVisible(false)}
             />
           </View>
         );
       }}
     </Stack.Screen>

     <Stack.Screen name="order_detail">{({ navigation, route }: any) => <LabOrderDetail order={route.params?.param} onBack={() => navigation.goBack()} onNav={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
     <Stack.Screen name="booking_chat">{({ navigation, route }: any) => <BookingChatScreen kind="lab" order={route.params?.param} onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="sample_tracking">{({ navigation }: any) => <SampleTracking onBack={() => navigation.goBack()} onNav={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
     <Stack.Screen name="result_review">{({ navigation, route }: any) => <ResultReview sample={route.params?.param} onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="bundles">{({ navigation }: any) => <LabBundlesScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="add_test">{({ navigation }: any) => <AddCustomTest onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="home_collection">{({ navigation, route }: any) => <HomeCollection order={route.params?.param} onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="qr_label">{({ navigation, route }: any) => <QRSampleLabel sample={route.params?.param} onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="wallet">{({ navigation }: any) => <ProviderWalletScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
     <Stack.Screen name="withdrawal_workflow">{({ navigation }: any) => <WithdrawalWorkflow onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="chat">{({ navigation }: any) => <ChatSystem onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="tat_tracker">{({ navigation }: any) => <TATTracker onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="insurance">{({ navigation }: any) => <LabInsurance onBack={() => navigation.goBack()} />}</Stack.Screen>

     <Stack.Screen name="promotions">{({ navigation }: any) => <PromotionsDashboard onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
     <Stack.Screen name="create_promo">{({ navigation }: any) => <CreateCampaignScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="web_config">{({ navigation }: any) => <ProviderProfileEditor role="other" onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="reputation">{({ navigation }: any) => <ReputationHub onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="crm">{({ navigation }: any) => <CrmHub onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
     <Stack.Screen name="revenue_insights">{({ navigation }: any) => <RevenueInsights onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="lab_scanner">{({ navigation }: any) => <LabSampleScannerScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
     <Stack.Screen name="medical_jobs">{({ navigation }: any) => <MedicalJobsScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="drug_index">{({ navigation }: any) => <MedicalDrugIndexScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="insurance_config">{({ navigation }: any) => <InsuranceConfigScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="certificates_config">{({ navigation }: any) => <CertificatesConfigScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="media_config">{({ navigation }: any) => <MediaConfigScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="test_menu">{({ navigation }: any) => <LabTestMenuScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     
     <Stack.Screen name="home_service">{({ navigation }: any) => <LabHomeServiceScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="insurance_requests">{({ navigation }: any) => <InsuranceRequestsScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      {orderingStackScreens(Stack, 'lab')}
     <Stack.Screen name="working_hours">{({ navigation }: any) => <WorkingHoursEditorScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="password">{({ navigation }: any) => <SecurityManagementScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="2fa">{({ navigation }: any) => <SecurityManagementScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="devices">{({ navigation }: any) => <SecurityManagementScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="notifications">{({ navigation }: any) => <NotificationsCenterScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
   </Stack.Navigator>
 );
}

// ══════════════════════════════════════════════════════════════════
// HOME TAB
// ══════════════════════════════════════════════════════════════════
function LabHome({ onNav, onTriggerAlarm }:{ onNav:(s:string,p?:any)=>void; onTriggerAlarm?:()=>void }) {
 const insets = useSafeAreaInsets();
 const { theme } = useTheme(); const { lang, t, t: tt } = useLang(); const AR = lang==='ar';
 const { user, toggleOnline } = useAuth();
 const [refreshing, setR] = useState(false);
 const [orders, setOrders] = useState<any[]>([]);
 const [samples, setSamples] = useState<any[]>([]);
 const [stats, setStats] = useState({ todayCount: 0, analyzingCount: 0, readyCount: 0, revenue: 0 });

 const fetchLabData = useCallback(async () => {
 try {
 const inboxRes = await client.get('/labs/provider/inbox');
 const combined = inboxRes.data || [];
 setOrders(combined.map(toLabOrderView));

 const resSamples = await client.get('/labs/samples');
 setSamples(resSamples.data || []);

 setStats({
 todayCount: combined.filter((o: any) => o.scheduled_at && new Date(o.scheduled_at).toDateString() === new Date().toDateString() && o.state !== 'CANCELLED').length,
 analyzingCount: combined.filter((o: any) => ['SAMPLE_COLLECTED', 'PROCESSING'].includes(o.state)).length,
 readyCount: combined.filter((o: any) => ['RESULT_UPLOADED', 'REPORTED'].includes(o.state)).length,
 // reported today (the result was delivered, so the visit is done)
 revenue: combined.filter((o: any) => o.state === 'REPORTED' && o.updatedAt && new Date(o.updatedAt).toDateString() === new Date().toDateString())
   .reduce((acc: number, cur: any) => acc + (Number(cur.total) || 0), 0)
 });
 } catch (e: any) {
  // No fabricated numbers — show zeros and let the provider pull-to-refresh.
  setStats({ todayCount: 0, analyzingCount: 0, readyCount: 0, revenue: 0 });
  setOrders([]);
  setSamples([]);
 }
 }, [AR]);

 useEffect(() => {
 fetchLabData();
 }, [fetchLabData]);

 const onRefresh = async () => {
 setR(true);
 await fetchLabData();
 setR(false);
 };

 return (
 <View style={{ flex:1, backgroundColor:theme.bg }}>
 <View style={[s.topBar,{backgroundColor:theme.surface, borderBottomColor:theme.border, flexDirection:AR?'row-reverse':'row', paddingTop: Math.max(insets.top, 16) }]}>
 <View style={{flexDirection:AR?'row-reverse':'row',alignItems:'center',gap:SP.md}}>
 <IBg name="lab" size={18} color={tokens.purple} bg={withAlpha(tokens.purple, 0.12)} />
 <View>
 <Text style={{fontSize:FS.sm,color:theme.textSub}}>{tt('labdash.72a3043a')}</Text>
 <Text style={{fontSize:FS.md,fontWeight:FW.bold,color:theme.text}}>{tt('labdash.2ba7ed9e')}</Text>
 </View>
 </View>
 <View style={{flexDirection:'row',gap:SP.sm,alignItems:'center'}}>
 <NOnlineToggle value={user?.isOnline??true} onToggle={toggleOnline} />
 {/* Needs-review issue 1185: the bell opens the notifications center */}
 <TouchableOpacity onPress={()=>onNav('notifications')} accessibilityRole="button" accessibilityLabel={tt('labdash.5e885201')} style={[s.iconBtn,{backgroundColor:theme.surface2}]}><I name="bell" size={20} color={theme.text} /></TouchableOpacity>
 </View>
 </View>

 <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.purple} />}
 contentContainerStyle={{padding:SP.xl,paddingBottom:100}} showsVerticalScrollIndicator={false}>
 {/* Stats */}
 <View style={{flexDirection:'row',flexWrap:'wrap',gap:SP.md,marginBottom:SP.xl}}>
 <NStatCard icon="⊥" label={tt('labdash.42d2477b')} value={String(stats.todayCount)} color={tokens.info} style={{width:'47%'}} />
 <NStatCard icon="◔" label={tt('labdash.3b93ab46')} value={String(stats.analyzingCount)} color={tokens.warning} style={{width:'47%'}} />
 <NStatCard icon="◈" label={tt('labdash.eea3276e')} value={String(stats.revenue)} unit={tt('labdash.a629499b')} color={tokens.success} style={{width:'47%'}} />
 <NStatCard icon="" label={tt('labdash.c513492d')} value={String(stats.readyCount)} color={tokens.purple} style={{width:'47%'}} />
 </View>

 {/* Quick Actions */}
 <NSecHeader title={tt('labdash.88717c98')} />
 <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:SP.xl}}>
 <View style={{flexDirection:'row',gap:SP.md}}>
 {[
 {ar:'المحفظة والإيرادات',en:'Wallet & Revenue',screen:'wallet',color:tokens.purple},
 {ar:'تتبع العينات',en:'Track Samples',screen:'sample_tracking',color:tokens.info},
 {ar:'إدخال نتائج',en:'Enter Results',screen:'sample_tracking',color:tokens.success},
 {ar:'وقت النتائج',en:'TAT Tracker',screen:'tat_tracker',color:tokens.warning},
 {ar:'سحب منزلي',en:'Home Collection',screen:'home_collection',color:tokens.pink},
 {ar:'ملصق QR',en:'QR Label',screen:'qr_label',color:tokens.purple},
 {ar:'إدارة الحزم',en:'Bundles',screen:'bundles',color:tokens.mintDeep},
 {ar:'فحص مخصص',en:'Custom Test',screen:'add_test',color:tokens.coral},
 {ar:'مطالبات تأمين',en:'Insurance',screen:'insurance',color:tokens.navy},
 ].map(qa=>(
 <TouchableOpacity key={qa.screen} onPress={()=>onNav(qa.screen)}
 style={[s.quickAction,{backgroundColor:theme.card,borderColor:theme.border}]}>
 <View style={{width:36,height:36,borderRadius:18,backgroundColor:`${qa.color}12`,alignItems:'center',justifyContent:'center',marginBottom:SP.xs}}>
 <View style={{width:12,height:12,borderRadius:6,backgroundColor:qa.color}} />
 </View>
 <Text style={{fontSize:FS.xs,color:theme.text,fontWeight:FW.med,textAlign:'center',lineHeight:15}}>{AR?qa.ar:qa.en}</Text>
 </TouchableOpacity>
 ))}
 </View>
 </ScrollView>

 {/* Pipeline */}
 <NSecHeader title={tt('labdash.1be4b8ed')} action={tt('labdash.eabe5f68')} onAction={()=>onNav('sample_tracking')} />
 <View style={{flexDirection:AR?'row-reverse':'row',gap:SP.sm,marginBottom:SP.xl}}>
 {SAMPLE_STAGES.map(st=>{
 const count = samples.filter(sm=>sm.stage===st.key).length;
 return (
 <View key={st.key} style={{flex:1,backgroundColor:`${st.color}10`,borderRadius:R.lg,borderWidth:1,borderColor:`${st.color}30`,padding:SP.md,alignItems:'center'}}>
 <Text style={{fontSize:FS['2xl'],fontWeight:FW.xbold,color:st.color}}>{count}</Text>
 <Text style={{fontSize:9,color:st.color,fontWeight:FW.semi,textAlign:'center',marginTop:2}} numberOfLines={2}>{AR?st.ar:st.en}</Text>
 </View>
 );
 })}
 </View>

 </ScrollView>
 </View>
 );
}


// ══════════════════════════════════════════════════════════════════
// ORDER DETAIL
// ══════════════════════════════════════════════════════════════════
function LabOrderDetail({ order, onBack, onNav }:{ order:any; onBack:()=>void; onNav:(s:string,p?:any)=>void }) {
 const { theme } = useTheme(); const { lang, t, t: tt } = useLang(); const { show } = useToast(); const AR = lang==='ar';
  const [showRegister, setShowRegister] = useState(false);
  const [showApproval, setShowApproval] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [barcode, setBarcode] = useState('');
  const [notes, setNotes] = useState('');
  const [decisionRef, setDecisionRef] = useState('');
  const [copay, setCopay] = useState('');
  const [techName, setTechName] = useState('');   // the chosen technician's name (for the toast)
  const [techId, setTechId] = useState('');       // the chosen technician's id (own id when the lab has no team)
  const [techs, setTechs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [showCam, setShowCam] = useState(false);
  const [camPerm, requestCamPerm] = useCameraPermissions();

  const openScanner = async () => {
    try {
      if (!camPerm?.granted) {
        const r = await requestCamPerm();
        if (!r?.granted) { show(tt('labdash.fc9abbca'), 'error'); return; }
      }
      setShowCam(true);
    } catch { show(tt('labdash.6fdc4816'), 'error'); }
  };

 
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const handleReject = async () => {
    if (rejectReason.trim().length < 5) return show(tt('labdash.62e2e130'), 'warning');
    setLoading(true);
    try {
      await client.patch(`/labs/bookings/${order.id}/state`, { state: 'CANCELLED', note: `rejected_by_lab: ${rejectReason.trim()}` });
      show(tt('labdash.346f7380'), 'success');
      setShowReject(false);
      onBack();
    } catch (e: any) {
      show(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async () => {
    if (!decisionRef) return show(tt('labdash.dbcea9f4'), 'warning');
    setLoading(true);
    try {
      const copayPercent = Math.max(0, Math.min(99, Number(copay)));
      const decision = copayPercent > 0 ? 'APPROVED_PARTIAL' : 'APPROVED_FULL';
      await client.post(`/labs/bookings/${order.id}/coverage-decision`, {
        decision,
        decision_reference: decisionRef,
        ...(decision === 'APPROVED_PARTIAL' ? { copay_percent: copayPercent } : {}),
      });
      show(tt('labdash.bdf8525f'), 'success');
      setShowApproval(false);
      onBack();
    } catch (e: any) {
      show(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // The server accepts this only for cash at the facility (paid at the visit) or an already-paid card booking.
  const handleCashConfirm = async () => {
    setLoading(true);
    try {
      await client.patch(`/labs/bookings/${order.id}/state`, { state: 'CONFIRMED', note: 'accepted_by_lab' });
      show(tt('labdash.bd41261a'), 'success');
      onBack();
    } catch (e: any) {
      show(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!showAssign) return;
    client.get('/labs/team/technicians').then((r: any) => setTechs(Array.isArray(r?.data) ? r.data : [])).catch(() => setTechs([]));
  }, [showAssign]);

  const handleAssignTech = async () => {
    setLoading(true);
    try {
      // the server accepts a listed technician of this lab or the caller; without a pick it assigns the caller
      await client.post(`/labs/bookings/${order.id}/assign-technician`, techId ? { technician_id: techId } : {});
      show(techName ? (tt('tps.e709e6bb', { p1: String(techName) })) : (tt('labdash.4f05fe89')), 'success');
      setShowAssign(false);
      onBack();
    } catch (e: any) {
      show(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleDate) return show(tt('labdash.f815f1c1'), 'warning');
    setLoading(true);
    try {
      await client.patch(`/labs/bookings/${order.id}/reschedule`, { new_date: rescheduleDate, reason: 'Provider Reschedule' });
      show(tt('labdash.033c881f'), 'success');
      setShowReschedule(false);
      onBack();
    } catch (e: any) {
      show(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSample = async () => {
    if (!barcode) return show(tt('labdash.f3e1baf2'), 'warning');
    setLoading(true);
    try {
      await client.post('/labs/samples/register', {
        lab_order_id: order.id,
        barcode: barcode.trim(),
        tests: Array.isArray(order.tests) ? order.tests : [],
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      show(tt('labdash.5ab0cc27'), 'success');
      setShowRegister(false);
      onBack();
    } catch (e: any) {
      show(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Results are entered against the registered sample (custody record), found by its booking id.
  const openSampleForResults = async () => {
    try {
      const res = await client.get('/labs/samples');
      const sample = (res.data || []).find((sm: any) => sm.lab_order_id === order.id);
      if (!sample) return show(tt('labdash.26c52cf5'), 'warning');
      if (sample.stage === 'received') await client.patch(`/labs/samples/${sample.id}/stage`, { stage: 'analyzing' });
      onNav('result_review', { ...sample, stage: sample.stage === 'received' ? 'analyzing' : sample.stage });
    } catch (e: any) {
      show(e.message, 'error');
    }
  };

  const anyRequiresFasting = (order?.tests || []).some((tid: string) => lookupTest(tid)?.fasting);

 return (
 <NScroll>
 <NHeader title={tt('labdash.42b7afff')} onBack={onBack} />
 <NCard style={{marginBottom:SP.xl}}>
 <View style={{flexDirection:AR?'row-reverse':'row',gap:SP.lg,marginBottom:SP.lg}}>
 <NAvatar name={order?.patient??'مريض'} size={56} />
 <View style={{flex:1}}>
 <Text style={{fontSize:FS.xl,fontWeight:FW.bold,color:theme.text,textAlign:AR?'right':'left'}}>{order?.patient??'—'}</Text>
 <Text style={{fontSize:FS.sm,color:theme.textSub}}>{order?.doctor??'—'} | {order?.insurance??'Cash'}</Text>
 <NBadge label={order?.homeCollection?(tt('labdash.e379dc23')):(tt('labdash.9e68f203'))} variant={order?.homeCollection?'warning':'primary'} size="xs" style={{marginTop:SP.xs}} />
 </View>
 </View>

 {anyRequiresFasting && (
 <NCard style={{ backgroundColor: theme.warnBg, padding: SP.md, marginBottom: SP.lg, borderColor: theme.warn, borderWidth: 1 }}>
 <Text style={{ fontSize: FS.xs, color: theme.warn, textAlign: AR ? 'right' : 'left', fontWeight: FW.bold }}>
 {tt('labdash.ad84abed')}
 </Text>
 </NCard>
 )}

 <Text style={{fontSize:FS.md,fontWeight:FW.bold,color:theme.text,marginBottom:SP.md,textAlign:AR?'right':'left'}}>{tt('labdash.633d9b2b')}</Text>
 {(order?.tests??[]).map((tid:string)=>{
 const item=(order?.items||[]).find((i:any)=>i.service_id===tid);
 const t=lookupTest(tid) || (item ? { ar: item.name_ar || item.name_en, en: item.name_en || item.name_ar, fasting: !!item.fasting_required, hours: 24 } : null);
 return t ? <View key={tid} style={{flexDirection:AR?'row-reverse':'row',alignItems:'center',gap:SP.md,paddingVertical:SP.sm,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:theme.border}}>
 <IBg name="testTube" size={12} color={tokens.purple} bg={withAlpha(tokens.purple, 0.12)} />
 <View style={{flex:1}}>
 <Text style={{fontSize:FS.md,color:theme.text,textAlign:AR?'right':'left'}}>{AR?t.ar:t.en}</Text>
 <Text style={{fontSize:FS.xs,color:theme.textSub}}>{t.hours<1?`${t.hours*60}min`:`${t.hours}h`}{t.fasting?` | ${tt('labdash.83c51755')}`:''}</Text>
 </View>
 </View> : null;
 })}
 <NDivider style={{marginVertical:SP.lg}} />
        <View style={{flexDirection:AR?'row-reverse':'row',justifyContent:'space-between'}}>
          <Text style={{fontSize:FS.md,color:theme.textSub}}>{tt('labdash.e3959b9d')}</Text>
          <Text style={{fontSize:FS.xl,fontWeight:FW.xbold,color:tokens.purple}}>{order?.total??0} {tt('labdash.0e39e6ca')}</Text>
        </View>
      </NCard>

      {order?.status === 'NEW_REQUEST' && (
        <View style={{gap:SP.md}}>
          <NBtn label={t('bookingChat.open')} variant="outline" onPress={() => onNav('booking_chat', order)} />
          {order?.is_insurance ? (
            <NBtn label={tt('labdash.1560762d')} onPress={() => setShowApproval(true)} />
          ) : (
            confirmBlocker(order)
              ? <Text style={{ color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>{confirmBlockerText(confirmBlocker(order)!, AR)}</Text>
              : <NBtn label={tt('labdash.bbe8dd0a')} onPress={handleCashConfirm} />
          )}
          <NBtn label={tt('labdash.67e8e5ab')} variant="danger" onPress={() => setShowReject(true)} />
        </View>
      )}

      {order?.status === 'WAITING_COPAY' && (
        <NCard style={{ backgroundColor: theme.warnBg, borderColor: theme.warn, borderWidth: 1, alignItems: 'center' }}>
          <Text style={{ color: theme.warn, fontWeight: 'bold' }}>{tt('labdash.345de97f')}</Text>
        </NCard>
      )}

      {order?.status === 'CONFIRMED' && (
        <View style={{gap:SP.md}}>
          {order?.homeCollection ? (
            <NBtn label={tt('labdash.a1927b1d')} onPress={() => setShowAssign(true)} />
          ) : (
            <NBtn label={tt('labdash.48c2d8e4')} onPress={() => setShowRegister(true)} />
          )}
          <NBtn label={tt('labdash.57f31d3c')} variant="outline" onPress={async () => {
            try {
              await client.post(`/labs/bookings/${order?.id}/emergency`, { reason: 'PATIENT_ABSENT' });
              show(tt('labdash.b03c9282'), 'info');
              onBack();
            } catch (err: any) {
              show(err?.response?.data?.message || err.message, 'error');
            }
          }} />
          <NBtn label={tt('labdash.5087139f')} variant="outline" onPress={() => setShowReschedule(true)} />
        </View>
      )}

      {isTripOrder(order) && (
        <View style={{gap:SP.md}}>
          <NBtn label={tt('labdash.9fc826e8')} onPress={() => onNav('home_collection', order)} />
        </View>
      )}

      {order?.status === 'IN_LAB' && (
        <View style={{gap:SP.md}}>
          <NBtn label={tt('labdash.3128a6cd')} onPress={() => setShowRegister(true)} />
        </View>
      )}

      {order?.status === 'IN_TRANSIT' && (
        <View style={{gap:SP.md}}>
          <NBtn label={tt('labdash.b6c8ce56')} onPress={() => setShowRegister(true)} />
        </View>
      )}

      {order?.status === 'SAMPLE_COLLECTED' && (
        <View style={{gap:SP.md}}>
          <NBtn label={tt('labdash.29697c94')} onPress={openSampleForResults} />
        </View>
      )}

      {/* QC actions: urgent/STAT/critical/verify/double-verify/reject (Phase-1 APIs) */}
      {['CONFIRMED','IN_TRANSIT','SAMPLE_COLLECTED','PROCESSING'].includes(order?.status || order?.state) && (
        <LabQcActions booking={{ ...order, id: order.id, state: order.state || order.status }} onDone={() => onBack()} />
      )}

      {/* MODALS */}
      {/* Reschedule Sheet */}
      <NSheet visible={showReschedule} onClose={()=>setShowReschedule(false)} title={tt('labdash.5087139f')} height={350}>
        <View style={{ padding: SP.md }}>
          <Text style={{ fontSize: FS.sm, color: theme.textSub, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
            {tt('labdash.96e20d00')}
          </Text>
          <NInput label={tt('labdash.849441eb')} placeholder={tt('phx.41f82821')} value={rescheduleDate} onChange={setRescheduleDate} icon="event" />
          <NBtn label={tt('labdash.f21bee1b')} loading={loading} onPress={handleReschedule} style={{ marginTop: SP.md }} />
        </View>
      </NSheet>

      {/* Reject Sheet: a recorded reason is required */}
      <NSheet visible={showReject} onClose={()=>setShowReject(false)} title={tt('labdash.79949d9c')} height={320}>
        <View style={{ padding: SP.md }}>
          <NInput label={tt('labdash.15bcf925')} placeholder={tt('labdash.b5314e5c')} value={rejectReason} onChange={setRejectReason} icon="edit" />
          <NBtn label={tt('labdash.46984e50')} variant="danger" loading={loading} onPress={handleReject} style={{ marginTop: SP.md }} />
        </View>
      </NSheet>

      {/* Insurance approval sheet */}
      <NSheet visible={showApproval} onClose={()=>setShowApproval(false)} title={tt('labdash.881a5e09')} height={400}>
        <View style={{ padding: SP.md }}>
          <NInput label={tt('labdash.ad1a5d6b')} placeholder={tt('phx.c76f54e6')} value={decisionRef} onChange={setDecisionRef} icon="verified" />
          <NInput label={tt('labdash.cab8286b')} placeholder="0" value={copay} onChange={setCopay} icon="payments" kbType="numeric" />
          <NBtn label={tt('labdash.9a0c9e6c')} onPress={handleApproval} style={{ marginTop: SP.md }} />
        </View>
      </NSheet>

      {/* Tech Assignment Sheet */}
      <NSheet visible={showAssign} onClose={()=>setShowAssign(false)} title={tt('labdash.535f72b7')} height={400}>
        <View style={{ padding: SP.md }}>
          {techs.length === 0 ? (
            <Text style={{ color: theme.textSub, textAlign: AR ? 'right' : 'left', marginBottom: SP.md }}>{tt('labdash.7b77133b')}</Text>
          ) : techs.map((tc: any) => (
            <TouchableOpacity key={tc.id} accessibilityRole="button" onPress={() => { setTechId(tc.id); setTechName(tc.full_name || tc.email || ''); }}
              style={{ padding: SP.md, borderRadius: R.md, marginBottom: SP.sm, borderWidth: 1, borderColor: techId === tc.id ? theme.primary : theme.border, backgroundColor: techId === tc.id ? theme.infoBg : theme.surface }}>
              <Text style={{ color: theme.text, textAlign: AR ? 'right' : 'left' }}>{tc.full_name || tc.email || tc.id}</Text>
            </TouchableOpacity>
          ))}
          <NBtn label={tt('labdash.8efb0f5e')} onPress={handleAssignTech} style={{ marginTop: SP.md }} />
        </View>
      </NSheet>

      {/* Register Sample Sheet */}
      <NSheet visible={showRegister} onClose={()=>setShowRegister(false)} title={tt('labdash.a9aee7df')} height={400}>
        <View style={{ padding: SP.md }}>
          <NInput label={tt('labdash.757b0f25')} placeholder={tt('phx.b297654c')} value={barcode} onChange={setBarcode} icon="qr-code-scanner" />
          <NBtn label={tt('labdash.657d61ad')} variant="outline" onPress={openScanner} style={{ marginBottom: SP.sm }} />
          <NInput label={tt('labdash.46819ff8')} placeholder={tt('labdash.92b83bf2')} value={notes} onChange={setNotes} icon="edit" />
          <NBtn label={tt('labdash.f4e7235f')} loading={loading} onPress={handleRegisterSample} style={{ marginTop: SP.md }} />
        </View>
      </NSheet>

      {/* Real barcode camera scanner */}
      <Modal visible={showCam} animationType="slide" onRequestClose={()=>setShowCam(false)}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'code39', 'code93', 'ean13', 'ean8', 'upc_a', 'upc_e', 'datamatrix', 'pdf417', 'itf14'] }}
            onBarcodeScanned={({ data }: any) => { if (data) { setBarcode(String(data)); setShowCam(false); } }}
          />
          <TouchableOpacity onPress={()=>setShowCam(false)} style={{ position: 'absolute', bottom: 60, alignSelf: 'center', backgroundColor: '#00000099', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 28 }}>
            <Text style={{ color: C.white, fontWeight: FW.bold, fontSize: FS.md }}>{tt('labdash.210b779f')}</Text>
          </TouchableOpacity>
        </View>
      </Modal>

    </NScroll>
  );
}

// ══════════════════════════════════════════════════════════════════
// SAMPLE TRACKING — 4 Stage Pipeline
// ══════════════════════════════════════════════════════════════════
function SampleTracking({ onBack, onNav }:{ onBack:()=>void; onNav:(s:string,p?:any)=>void }) {
 const insets = useSafeAreaInsets();
 const { theme } = useTheme(); const { lang, t, t: tt } = useLang(); const { show } = useToast(); const AR = lang==='ar';
 const [filter, setFilter] = useState('all');
 const [samples, setSamples] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);

 const fetchSamples = useCallback(async () => {
 try {
 const res = await client.get('/labs/samples');
 setSamples(res.data || []);
 } catch (err) {
  setSamples([]);
  show(t('pa3.labDash.1'), 'error');   // a failed load is told, not shown as "no samples"
 } finally {
 setLoading(false);
 }
 }, []);

 useEffect(() => {
 fetchSamples();
 }, [fetchSamples]);

 const handleStartAnalysis = async (sam: any) => {
 try {
 await client.patch(`/labs/samples/${sam.id}/stage`, { stage: 'analyzing' });
 show(tt('labdash.52f727e7'), 'success');
 fetchSamples();
 } catch (err: any) {
 show(err.message || (tt('labdash.67209eb5')), 'error');
 }
 };

 const filtered = filter==='all' ? samples : samples.filter(sm=>sm.stage===filter);

 return (
 <View style={{flex:1,backgroundColor:theme.bg}}>
 <View style={[s.topBar,{backgroundColor:theme.surface,borderBottomColor:theme.border, paddingTop: Math.max(insets.top, 16) }]}>
 <TouchableOpacity onPress={onBack}><I name="back" size={20} color={theme.primary} /></TouchableOpacity>
 <Text style={{fontSize:FS.xl,fontWeight:FW.bold,color:theme.text}}>{tt('labdash.259b0bea')}</Text>
 <View style={{width:30}} />
 </View>
 {/* Stage filter */}
 <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal:SP.lg,paddingVertical:SP.md,gap:SP.sm}}>
 <TouchableOpacity onPress={()=>setFilter('all')} style={[s.chip,{backgroundColor:filter==='all'?tokens.purple:theme.surface2,borderColor:filter==='all'?tokens.purple:theme.border}]}>
 <Text style={{color:filter==='all'?'#FFF':theme.text,fontSize:FS.xs,fontWeight:FW.semi}}>{tt('labdash.eabe5f68')} ({samples.length})</Text>
 </TouchableOpacity>
 {SAMPLE_STAGES.map(st=>{
 const c=samples.filter(sm=>sm.stage===st.key).length;
 return <TouchableOpacity key={st.key} onPress={()=>setFilter(st.key)} style={[s.chip,{backgroundColor:filter===st.key?st.color:theme.surface2,borderColor:filter===st.key?st.color:theme.border}]}>
 <Text style={{color:filter===st.key?'#FFF':theme.text,fontSize:FS.xs,fontWeight:FW.semi}}>{AR?st.ar:st.en} ({c})</Text>
 </TouchableOpacity>;
 })}
 </ScrollView>
 <FlatList data={filtered} keyExtractor={i=>i.id} contentContainerStyle={{padding:SP.lg,paddingBottom:100}}
 refreshing={loading}
 onRefresh={fetchSamples}
 renderItem={({item:sam})=>{
 const si=SAMPLE_STAGES.findIndex(st=>st.key===sam.stage); const sc=SAMPLE_STAGES[Math.max(0, si)];
 return (
 <NCard style={{marginBottom:SP.md}} accent={sc?.color}>
 <View style={{flexDirection:AR?'row-reverse':'row',justifyContent:'space-between',marginBottom:SP.md}}>
 <View style={{flexDirection:AR?'row-reverse':'row',alignItems:'center',gap:SP.md}}>
 <NAvatar name={sam.patient_name || (tt('labdash.0f5f86ee'))} size={42} />
 <View>
 <Text style={{fontSize:FS.md,fontWeight:FW.bold,color:theme.text}}>{sam.patient_name || (tt('labdash.0f5f86ee'))}</Text>
 <Text style={{fontSize:FS.xs,color:theme.textSub}}>{sam.barcode}</Text>
 </View>
 </View>
 <NBadge label={AR?sc.ar:sc.en} variant={si>=2?'success':si===1?'warning':'info'} size="xs" />
 </View>
 {/* Progress dots */}
 <View style={{flexDirection:AR?'row-reverse':'row',alignItems:'center',gap:SP.xs,marginBottom:SP.md}}>
 {SAMPLE_STAGES.map((st2,i)=>(
 <React.Fragment key={st2.key}>
 <View style={{width:22,height:22,borderRadius:11,backgroundColor:i<=si?st2.color:theme.surface2,alignItems:'center',justifyContent:'center'}}>
 {i<=si && <I name="check" size={10} color={C.white} />}
 </View>
 {i<SAMPLE_STAGES.length-1 && <View style={{flex:1,height:2,backgroundColor:i<si?SAMPLE_STAGES[i+1].color:theme.border}} />}
 </React.Fragment>
 ))}
 </View>
 <View style={{flexDirection:'row',flexWrap:'wrap',gap:SP.xs,marginBottom:SP.sm}}>
 {(sam.tests || []).map(tid=>{const t=lookupTest(tid);return <View key={tid} style={{backgroundColor:theme.surface2,paddingHorizontal:SP.sm,paddingVertical:2,borderRadius:R.full,borderWidth:1,borderColor:theme.border}}><Text style={{fontSize:FS.xs,color:theme.text}}>{t?(AR?t.ar:t.en):tid}</Text></View>;})}
 </View>
 <Text style={{fontSize:FS.xs,color:theme.textSub}}>{tt('tps.90524324', { p1: String(sam.createdAt ? new Date(sam.createdAt).toLocaleTimeString() : '—'), p2: String(sam.barcode) })}</Text>
 <View style={{flexDirection:AR?'row-reverse':'row',gap:SP.sm,marginTop:SP.md}}>
 {sam.stage==='received' && <NBtn label={tt('labdash.a1a74336')} size="sm" full={false} style={{flex:1}} onPress={()=>handleStartAnalysis(sam)} />}
 {sam.stage==='analyzing' && <NBtn label={tt('labdash.fd60025b')} size="sm" full={false} style={{flex:1}} onPress={()=>onNav('result_review',sam)} />}
 {sam.stage==='result_ready' && <NBtn label={tt('labdash.183d502a')} size="sm" full={false} style={{flex:1}} onPress={()=>onNav('result_review',sam)} />}
 <NBtn label="QR" size="sm" variant="outline" full={false} style={{paddingHorizontal:SP.lg}} onPress={()=>onNav('qr_label',sam)} />
 </View>
 </NCard>
 );
 }} />
 </View>
 );
}

// ══════════════════════════════════════════════════════════════════
// RESULT REVIEW — Preview before sending
// ══════════════════════════════════════════════════════════════════
function ResultReview({ sample, onBack }:{ sample:any; onBack:()=>void }) {
 const { theme } = useTheme(); const { lang, t, t: tt } = useLang(); const { show } = useToast(); const AR = lang==='ar';
  const [sendTo, setSendTo] = useState<'patient'|'both'>('both');
 const [loading, setLoading] = useState(false);
 const [resultRows, setResultRows] = useState<any[]>(Array.isArray(sample?.structured_results) ? sample.structured_results : []);
 const [analyte, setAnalyte] = useState('');
 const [value, setValue] = useState('');
 const [unit, setUnit] = useState('');
 const [range, setRange] = useState('');
 const [isCritical, setIsCritical] = useState(false);
 const [reportFile, setReportFile] = useState<{ uri: string; name?: string; mimeType?: string } | null>(null);
 const pickReportFile = async () => {
   const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true, multiple: false });
   if (res.canceled || !res.assets?.[0]) return;
   setReportFile(res.assets[0]);
 };
 const addResultRow = () => {
   if (!analyte.trim() || !value.trim()) {
     show(tt('labdash.dfd72692'), 'error');
     return;
   }
   setResultRows((rows) => [...rows, { analyte: analyte.trim(), value: value.trim(), unit: unit.trim(), range: range.trim(), isCritical }]);
   setAnalyte(''); setValue(''); setUnit(''); setRange(''); setIsCritical(false);
 };
 const handleConfirmSend = async () => {
 if (!resultRows.length && !reportFile) {
   show(tt('labdash.a353b8c8'), 'error');
   return;
 }
 setLoading(true);
 try {
 // The server accepts a report once the booking is RESULT_UPLOADED, i.e. the sample reached result_ready.
 if (sample.stage === 'analyzing') await client.patch(`/labs/samples/${sample.id}/stage`, { stage: 'result_ready' });
 const reportStorageObjectId = reportFile ? await ProviderApi.uploadFile(reportFile.uri, reportFile.mimeType || 'application/pdf', reportFile.name || 'lab-report.pdf') : undefined;
 await client.post(`/labs/bookings/${sample.lab_order_id || sample.id}/upload-report`, { ...(resultRows.length ? { structuredData: resultRows } : {}), ...(reportStorageObjectId ? { report_storage_object_id: reportStorageObjectId } : {}), send_to: sendTo });
 await client.patch(`/labs/samples/${sample.id}/stage`, { stage: 'sent' });
 show(tt('labdash.01e8873b'), 'success');
 onBack();
 } catch (err: any) {
 show(err?.response?.status === 423 ? (tt('labdash.a237e338')) : (err.message || (tt('labdash.09ae9587'))), 'error');
 } finally {
 setLoading(false);
 }
 };

 return (
 <NScroll>
 <NHeader title={tt('labdash.9b689dba')} onBack={onBack} />
 <NCard style={{marginBottom:SP.xl}}>
 <View style={{flexDirection:AR?'row-reverse':'row',gap:SP.md,alignItems:'center',marginBottom:SP.lg}}>
 <NAvatar name={sample?.patient_name || (tt('labdash.0f5f86ee'))} size={48} />
 <View><Text style={{fontSize:FS.lg,fontWeight:FW.bold,color:theme.text}}>{sample?.patient_name || (tt('labdash.0f5f86ee'))}</Text><Text style={{fontSize:FS.xs,color:theme.textSub}}>{sample?.barcode??'—'}</Text></View>
 </View>
 <NCard style={{ marginBottom: SP.lg }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>{tt('labdash.4d14c11b')}</Text>
 <NInput label={tt('labdash.362e6a7d')} value={analyte} onChange={setAnalyte} required />
 <NInput label={tt('labdash.a0e33277')} value={value} onChange={setValue} required />
 <NInput label={tt('labdash.1d92094b')} value={unit} onChange={setUnit} />
 <NInput label={tt('labdash.7689cb51')} value={range} onChange={setRange} />
 <NToggle label={tt('labdash.c80ca4d0')} value={isCritical} onChange={setIsCritical} />
 <NBtn label={tt('labdash.6f0e2c3e')} variant="outline" onPress={addResultRow} style={{ marginTop: SP.sm }} />
 </NCard>
 {/* Table header */}
 <View style={{flexDirection:'row',backgroundColor:withAlpha(tokens.purple, 0.10),borderRadius:R.sm,padding:SP.sm,marginBottom:SP.sm}}>
 <Text style={{flex:3,fontSize:FS.xs,fontWeight:FW.bold,color:tokens.purple}}>{tt('labdash.83750e7d')}</Text>
 <Text style={{flex:2,fontSize:FS.xs,fontWeight:FW.bold,color:tokens.purple}}>{tt('labdash.a0e33277')}</Text>
 <Text style={{flex:2,fontSize:FS.xs,fontWeight:FW.bold,color:tokens.purple}}>{tt('labdash.ebcd24c8')}</Text>
 <View style={{flex:1,alignItems:'center'}}><I name="alert" size={12} color={tokens.purple} /></View>
 </View>
 {resultRows.length === 0 ? <NEmpty title={tt('labdash.b122cabf')} sub={tt('labdash.d7489391')} icon="flask" /> : resultRows.map((r,i)=>(
 <View key={`${r.analyte}-${i}`} style={{flexDirection:'row',paddingVertical:SP.sm,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:theme.border,alignItems:'center'}}>
 <Text style={{flex:3,fontSize:FS.sm,color:theme.text}}>{r.analyte}</Text>
 <Text style={{flex:2,fontSize:FS.sm,fontWeight:FW.bold,color:r.isCritical?tokens.error:theme.text}}>{r.value}{r.unit ? ` ${r.unit}` : ''}</Text>
 <Text style={{flex:2,fontSize:FS.xs,color:theme.textSub}}>{r.range}</Text>
 <View style={{flex:1,alignItems:'center'}}><View style={{width:8,height:8,borderRadius:4,backgroundColor:r.isCritical?tokens.error:tokens.success}} /></View>
 </View>
 ))}
 </NCard>
 {/* Send to */}
 <NCard style={{marginBottom:SP.xl}}>
 <Text style={{fontSize:FS.md,fontWeight:FW.bold,color:theme.text,marginBottom:SP.md,textAlign:AR?'right':'left'}}>{tt('labdash.e5ca5e96')}</Text>
 {([{v:'patient' as const,ar:'المريض فقط',en:'Patient Only'},{v:'both' as const,ar:'المريض + الطبيب',en:'Patient + Doctor'}]).map(opt=>(
 <TouchableOpacity key={opt.v} onPress={()=>setSendTo(opt.v)}
 style={{flexDirection:AR?'row-reverse':'row',alignItems:'center',gap:SP.md,paddingVertical:SP.md,paddingHorizontal:SP.lg,borderRadius:R.lg,borderWidth:1.5,
 backgroundColor:sendTo===opt.v?withAlpha(tokens.purple, 0.10):theme.surface2,borderColor:sendTo===opt.v?tokens.purple:theme.border,marginBottom:SP.sm}}>
 <View style={{width:20,height:20,borderRadius:10,borderWidth:2,borderColor:sendTo===opt.v?tokens.purple:theme.border,alignItems:'center',justifyContent:'center'}}>
 {sendTo===opt.v && <View style={{width:10,height:10,borderRadius:5,backgroundColor:tokens.purple}} />}
 </View>
 <Text style={{fontSize:FS.md,color:sendTo===opt.v?tokens.purple:theme.text,fontWeight:sendTo===opt.v?FW.bold:FW.reg}}>{AR?opt.ar:opt.en}</Text>
 </TouchableOpacity>
 ))}
 </NCard>
 <NBtn label={reportFile ? (AR ? `ملف مرفق: ${reportFile.name || ''} (إزالة)` : `Attached: ${reportFile.name || 'file'} (remove)`) : (tt('labdash.78424ac8'))} variant="outline" onPress={() => (reportFile ? setReportFile(null) : pickReportFile())} style={{ marginBottom: SP.md }} />
 <NBtn label={tt('labdash.c77f3f3d')} loading={loading} onPress={handleConfirmSend} />
 </NScroll>
 );
}


// ══════════════════════════════════════════════════════════════════
// BUNDLE MANAGEMENT
// ══════════════════════════════════════════════════════════════════
function BundleMgmt({ onBack }:{ onBack:()=>void }) {
 const { theme } = useTheme(); const { lang, t, t: tt } = useLang(); const { show } = useToast(); const AR = lang==='ar';
 const [bundlesList, setBundlesList] = useState<any[]>([]);
 useEffect(() => { client.get('/labs/packages').then(r => setBundlesList(r.data || [])).catch(() => {}); }, []);
 return (
 <NScroll>
 <NHeader title={tt('labdash.a111b6c7')} onBack={onBack} />
 <View style={{flexDirection:'row',gap:SP.md,marginBottom:SP.xl}}>
 <NStatCard icon="◈" label={tt('labdash.e4927cc4')} value={String(bundlesList.length)} color={tokens.purple} style={{flex:1}} />
 <NStatCard icon="" label={tt('labdash.f9ffe17e')} value={String(bundlesList.filter(b=>b.active).length)} color={tokens.success} style={{flex:1}} />
 </View>
 {bundlesList.map(b=>(
 <NCard key={b.id} style={{marginBottom:SP.md}} accent={b.active?tokens.purple:undefined}>
 <View style={{flexDirection:AR?'row-reverse':'row',justifyContent:'space-between',marginBottom:SP.md}}>
 <Text style={{fontSize:FS.md,fontWeight:FW.bold,color:theme.text}}>{AR?b.nameAr:b.nameEn}</Text>
 <NBadge label={b.active ? (tt('labdash.f9ffe17e')) : (tt('labdash.04ef5401'))} variant={b.active ? 'success' : 'default'} size="sm" />
 </View>
 <View style={{flexDirection:'row',flexWrap:'wrap',gap:SP.xs,marginBottom:SP.md}}>
 {b.tests.map(tid=>{const t=lookupTest(tid);return <View key={tid} style={{backgroundColor:theme.surface2,paddingHorizontal:SP.sm,paddingVertical:2,borderRadius:R.full,borderWidth:1,borderColor:theme.border}}><Text style={{fontSize:FS.xs,color:theme.text}}>{t?(AR?t.ar:t.en):tid}</Text></View>;})}
 </View>
 <View style={{flexDirection:AR?'row-reverse':'row',justifyContent:'space-between',alignItems:'center'}}>
 <View style={{flexDirection:'row',alignItems:'baseline',gap:SP.sm}}>
 <Text style={{fontSize:FS.xl,fontWeight:FW.xbold,color:tokens.purple}}>{b.price}</Text>
 <Text style={{fontSize:FS.sm,color:theme.textSub,textDecorationLine:'line-through'}}>{b.orig}</Text>
 <Text style={{fontSize:FS.sm,color:theme.textSub}}>{tt('labdash.0e39e6ca')}</Text>
 </View>
 <NBadge label={`${Math.round((1-b.price/b.orig)*100)}% ${tt('qqbm.8171cb18')}`} variant="success" size="sm" />
 </View>
 </NCard>
 ))}
 <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: 'center', marginTop: SP.md }}>{tt('labdash.63e6fd6b')}</Text>
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════
// ADD CUSTOM TEST → Admin Approval
// ══════════════════════════════════════════════════════════════════
function AddCustomTest({ onBack }:{ onBack:()=>void }) {
 const { theme } = useTheme(); const { lang, t, t: tt } = useLang(); const { show } = useToast(); const AR = lang==='ar';
 const [nameAr,setNameAr]=useState(''); const [nameEn,setNameEn]=useState(''); const [price,setPrice]=useState('');
 const [hours,setHours]=useState(''); const [fasting,setFasting]=useState(false); const [refLow,setRefLow]=useState('');
 const [refHigh,setRefHigh]=useState(''); const [unit,setUnit]=useState(''); const [loading,setLoading]=useState(false);

 return (
 <NScroll>
 <NHeader title={tt('labdash.9f608972')} onBack={onBack} />
 <NCard style={{backgroundColor:theme.warnBg,marginBottom:SP.xl}}>
 <Text style={{fontSize:FS.sm,color:theme.warn,lineHeight:20,textAlign:AR?'right':'left'}}>
 {tt('labdash.0e649588')}
 </Text>
 </NCard>
 <NInput label={tt('labdash.2633e985')} placeholder={tt('labdash.b024876e')} value={nameAr} onChange={setNameAr} required />
 <NInput label={tt('labdash.00ef02de')} placeholder={tt('phx.90d265e0')} value={nameEn} onChange={setNameEn} required />
 <View style={{flexDirection:AR?'row-reverse':'row',gap:SP.md}}>
 <View style={{flex:1}}><NPriceInput label={tt('labdash.137174f0')} value={price} onChange={setPrice} required /></View>
 <View style={{flex:1}}><NInput label={tt('labdash.1d94025e')} placeholder="2" value={hours} onChange={v=>setHours(v.replace(/\D/g,''))} kbType="numeric" maxLen={3} /></View>
 </View>
 <View style={{flexDirection:AR?'row-reverse':'row',gap:SP.md}}>
 <View style={{flex:1}}><NInput label={tt('labdash.a79d3e95')} placeholder="0" value={refLow} onChange={setRefLow} kbType="decimal-pad" /></View>
 <View style={{flex:1}}><NInput label={tt('labdash.a2e8628f')} placeholder="100" value={refHigh} onChange={setRefHigh} kbType="decimal-pad" /></View>
 <View style={{flex:1}}><NInput label={tt('labdash.1d92094b')} placeholder={tt('phx.f4c49028')} value={unit} onChange={setUnit} /></View>
 </View>
 <NCard style={{marginBottom:SP.xl}}><NToggle label={tt('labdash.e9a83ccf')} value={fasting} onChange={setFasting} /></NCard>
 <NBtn label={tt('labdash.16e3e9ee')} disabled={!nameAr.trim()||!price} loading={loading}
 onPress={async()=>{
  setLoading(true);
  try {
    // provider-journeys 28: a proposed test is a lab catalogue item the admin reviews (admin/service-proposals); the old
    // body (entity_type 'lab_test', camelCase fields) was refused by the server.
    const lo = Number(refLow), hi = Number(refHigh), hrs = Number(hours);
    await client.post('/approval-workflow/requests', {
      entity_type: 'service',
      change_data: {
        type: 'lab', name_ar: nameAr.trim(), name_en: nameEn.trim() || nameAr.trim(), price: Number(price) || 0, fasting_required: !!fasting,
        ...(Number.isFinite(hrs) && hrs > 0 ? { turnaround_hours: hrs } : {}),
        ...(refLow.trim() && refHigh.trim() && Number.isFinite(lo) && Number.isFinite(hi) ? { reference_ranges: { min: lo, max: hi, unit: unit.trim() } } : {}),
      },
    });
    show(tt('labdash.e544c183'),'success');
    onBack();
  } catch(e) {
    show(tt('labdash.5abe683d'),'error');
  }
  setLoading(false);
 }} />
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════
// HOME COLLECTION — Dispatch Phlebotomists
// ══════════════════════════════════════════════════════════════════
function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function HomeCollection({ order, onBack }:{ order:any; onBack:()=>void }) {
 const { theme } = useTheme(); const { lang, t, t: tt } = useLang(); const { show } = useToast(); const AR = lang==='ar';
 // R7-3: real technicians from the lab team endpoint — never hard-coded names.
 const [collectors, setCollectors] = useState<any[]>([]);
 const [loadingTeam, setLoadingTeam] = useState(true);
 useEffect(() => {
   let active = true;
   client.get('/labs/team/technicians')
     .then((res: any) => { if (active) setCollectors(res.data || []); })
     .catch(() => { if (active) setCollectors([]); })
     .finally(() => { if (active) setLoadingTeam(false); });
   return () => { active = false; };
 }, []);
  const [tracking, setTracking] = useState(false);
  const [eta, setEta] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [locError, setLocError] = useState('');

  const destGeo = order?.address?.geo || order?.address || null;
  const destLat = Number(destGeo?.lat);
  const destLng = Number(destGeo?.lng);
  const hasDestination = Number.isFinite(destLat) && Number.isFinite(destLng);

  useEffect(() => {
    let int: any;
    if (!tracking) return () => clearInterval(int);
    const tick = async () => {
      try {
        const { requestForegroundPermissionsAsync, getCurrentPositionAsync } = await import('expo-location');
        const perm = await requestForegroundPermissionsAsync();
        if (perm.status !== 'granted') { setLocError(tt('labdash.025d93e4')); return; }
        const pos = await getCurrentPositionAsync({ accuracy: 5 } as any);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        let etaMin: number | null = null;
        let distKm: number | null = null;
        if (hasDestination) {
          distKm = haversineKm(lat, lng, destLat, destLng);
          etaMin = Math.round((distKm / 30) * 60);
          setEta(etaMin);
          setDistance(Math.round(distKm * 10) / 10);
        }
        // R7-3: only real device GPS is ever posted — the server rejects 0,0.
        await client.post(`/labs/bookings/${order.id}/gps`, { lat, lng, eta: etaMin ?? 0, distance: distKm ?? 0 });
      } catch (e: any) {
        setLocError(e?.response?.data?.message || e?.message || '');
      }
    };
    void tick();
    int = setInterval(() => { void tick(); }, 15000);
    return () => clearInterval(int);
  }, [tracking, order?.id]);

  // The dashboard tile opens this screen without an order (it crashed on order.id): tracking needs one booking.
  if (!order) {
    return (
      <NScroll>
        <NHeader title={tt('labdash.4bc2fd44')} onBack={onBack} />
        <NEmpty title={tt('labdash.48570328')} sub={tt('labdash.1ea3df0e')} />
      </NScroll>
    );
  }
  if (isTripOrder(order) || tracking) {
    return (
      <NScroll>
        <NHeader title={tt('labdash.6255212c')} onBack={onBack} />
        
        {/* Map View */}
        <View style={{ height: 250, backgroundColor: tokens.infoSurface, borderRadius: R.xl, marginBottom: SP.lg, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderColor: theme.border, borderWidth: 1 }}>
          <Text style={{ fontSize: FS.xl, color:tokens.info, fontWeight: FW.bold }}> GPS TRACKING ACTIVE</Text>
          <Text style={{ fontSize: FS.md, color: tokens.info, marginTop: SP.md }}>{tt('labdash.53b8031b')}</Text>
        </View>

        <NCard style={{ marginBottom: SP.md }}>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ alignItems: AR ? 'flex-start' : 'flex-end' }}>
              <Text style={{ fontSize: FS.sm, color: theme.textSub }}>{tt('labdash.067d4d06')}</Text>
              <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.primary }}>{eta == null ? '—' : `${eta} ${tt('qqbm.c95d0c8a')}`}</Text>
            </View>
            <View style={{ alignItems: AR ? 'flex-start' : 'flex-end' }}>
              <Text style={{ fontSize: FS.sm, color: theme.textSub }}>{tt('labdash.54dbe9bc')}</Text>
              <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.primary }}>{distance == null ? '—' : `${distance} ${tt('qqbm.43b7eb43')}`}</Text>
            </View>
          </View>
          {!hasDestination ? (
            <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{tt('labdash.18cfdb2f')}</Text>
          ) : null}
          {locError ? (
            <Text style={{ fontSize: FS.xs, color: theme.danger }}>{locError}</Text>
          ) : null}
        </NCard>

        {(distance !== null && distance <= 0.1) || (!hasDestination && (tracking || order?.status === 'IN_TRANSIT')) ? (
          <NBtn label={tt('labdash.f60625a9')} variant="primary" onPress={async () => {
            try {
              await client.patch(`/labs/bookings/${order?.id}/state`, { state: 'IN_LAB', note: 'ARRIVED at location' });
              show(tt('labdash.2315ff59'), 'success');
              onBack();
            } catch (err: any) {
              show(err.message, 'error');
            }
          }} />
        ) : (
          <NBtn label={tt('labdash.f878b50b')} onPress={async () => {
            try {
              await client.patch(`/labs/bookings/${order?.id}/state`, { state: 'IN_TRANSIT' });
              setTracking(true);
            } catch (err: any) {
              show(err.message, 'error');
            }
          }} disabled={tracking} />
        )}

        <View style={{ marginTop: SP.xl, gap: SP.md }}>
          <NSecHeader title={tt('labdash.310c69f1')} />
          {([['PATIENT_ABSENT', tt('labdash.50c617ef')], ['WRONG_LOCATION', tt('labdash.a4b8b516')]] as const).map(([reason, label]) => (
            <NBtn key={reason} label={label} variant="outline" onPress={async () => {
              try {
                await client.post(`/labs/bookings/${order?.id}/emergency`, { reason });
                show(tt('labdash.967e1e10'), 'info');
                onBack();
              } catch (err: any) {
                show(err?.response?.data?.message || err.message, 'error');
              }
            }} />
          ))}
          <NBtn label={tt('labdash.b8876455')} variant="danger" onPress={async () => {
            try {
              await client.post(`/labs/bookings/${order?.id}/reassign`);
              setTracking(false);
              show(tt('labdash.cbf04650'), 'success');
              onBack();
            } catch (err: any) {
              show(err?.response?.data?.message || err.message, 'error');
            }
          }} />
        </View>

      </NScroll>
    );
  }

  return (
    <NScroll>
      <NHeader title={tt('labdash.7dca36d3')} onBack={onBack} />
      <NSecHeader title={tt('labdash.add75159')} />
      {loadingTeam ? (
        <Text style={{ fontSize: FS.sm, color: theme.textSub }}>{tt('labdash.ebb9bdbb')}</Text>
      ) : collectors.length === 0 ? (
        <NCard style={{ marginBottom: SP.sm }}>
          <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: 'center' }}>
            {tt('labdash.b1593c4f')}
          </Text>
        </NCard>
      ) : null}
      {collectors.map(col=>(
        <NCard key={col.id} style={{marginBottom:SP.sm}}>
          <View style={{flexDirection:AR?'row-reverse':'row',alignItems:'center',gap:SP.md}}>
            <NAvatar name={col.name} size={44} online />
            <View style={{flex:1}}>
              <Text style={{fontSize:FS.md,fontWeight:FW.bold,color:theme.text,textAlign:AR?'right':'left'}}>{col.name}</Text>
              <Text style={{fontSize:FS.xs,color:theme.textSub}}>{col.role || ''}</Text>
            </View>
            <View style={{alignItems:'flex-end',gap:SP.xs}}>
              <NBtn label={tt('labdash.2ed62c88')} size="xs" full={false} style={{paddingHorizontal:SP.md}} onPress={async () => {
                if (!order?.id) { show(tt('labdash.9b18d1a6'), 'error'); return; }
                try {
                  await client.post(`/labs/bookings/${order.id}/assign-technician`, { technician_id: col.id });
                  show(tt('tps.8b1776c4', { p1: String(col.name) }), 'success');
                  onBack();
                } catch(err: any) {
                  show(err?.response?.data?.message || err.message || 'Error', 'error');
                }
              }} />
            </View>
          </View>
        </NCard>
      ))}
    </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════
// QR SAMPLE LABEL
// ══════════════════════════════════════════════════════════════════
function QRSampleLabel({ sample, onBack }:{ sample:any; onBack:()=>void }) {
 const { theme } = useTheme(); const { lang, t, t: tt } = useLang(); const AR = lang==='ar';
 return (
 <NScroll>
 <NHeader title={tt('labdash.8269fa47')} onBack={onBack} />
 <NCard style={{alignItems:'center',padding:SP.xxl,marginBottom:SP.xl}}>
 <View style={{width:160,height:160,borderRadius:R.xl,borderWidth:3,borderColor:tokens.purple,alignItems:'center',justifyContent:'center'}}>
 <I name="qr" size={60} color={tokens.purple} />
 </View>
 <Text style={{fontSize:FS.lg,fontWeight:FW.bold,color:theme.text,marginTop:SP.xl}}>{/* Needs-review issue 1187: no made-up sample number */}{sample?.barcode??'—'}</Text>
 <Text style={{fontSize:FS.sm,color:theme.textSub,marginTop:SP.xs}}>{sample?.patient??'—'}</Text>
 <View style={{flexDirection:'row',flexWrap:'wrap',gap:SP.xs,justifyContent:'center',marginTop:SP.md}}>
 {(sample?.tests??[]).map((tid:string)=>{const t=lookupTest(tid);return <View key={tid} style={{backgroundColor:withAlpha(tokens.purple, 0.10),paddingHorizontal:SP.sm,paddingVertical:2,borderRadius:R.full,borderWidth:1,borderColor:withAlpha(tokens.purple, 0.30)}}><Text style={{fontSize:FS.xs,color:tokens.purple}}>{t?(AR?t.ar:t.en):tid}</Text></View>;})}
 </View>
 </NCard>
 <View style={{gap:SP.md}}>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{tt('labdash.bd73f21a')}</Text>
 {/* Needs-review issue 1188: "Save as Image" claimed success without saving anything; removed. */}
 </View>
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════
// TURNAROUND TIME TRACKER
// ══════════════════════════════════════════════════════════════════
function TATTracker({ onBack }:{ onBack:()=>void }) {
 const { theme } = useTheme(); const { lang, t, t: tt } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
 const [samples, setSamples] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 useEffect(() => {
   client.get('/labs/samples').then(r => setSamples(Array.isArray(r.data) ? r.data : [])).catch(() => {
     show(tt('labdash.4ce0b818'), 'error');
   }).finally(() => setLoading(false));
 }, []);
 const ageHours = (s: any) => {
   const c = Date.parse(s.createdAt || s.created_at || '');
   if (!Number.isFinite(c)) return null;
   return (Date.now() - c) / 3600000;
 };
 const byStage = (st: string) => samples.filter(s => s.stage === st);
 const sent = byStage('sent').length;
 const pct = samples.length ? Math.round((sent / samples.length) * 100) : 0;
 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NHeader title={tt('labdash.0b4e47ad')} onBack={onBack} />
 <NScroll>
 <View style={{ padding: SP.lg, gap: SP.md }}>
 {loading ? <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} /> : samples.length === 0 ? (
 <NEmpty title={tt('labdash.986d7e8c')} icon="flask" />
 ) : (<>
 <NStatCard icon="◷" label={tt('labdash.e87a57c2')} value={`${pct}%`} color={tokens.success} />
 {[['received', tt('labdash.c327cdfa')], ['analyzing', tt('labdash.08f4668d')], ['result_ready', tt('labdash.ba1b4758')], ['sent', tt('labdash.1eeb6648')]].map(([st, label]) => (
 <NCard key={st} style={{ marginBottom: SP.sm }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{label}: {byStage(st).length}</Text>
 </NCard>
 ))}
 {samples.slice(0, 20).map((s: any) => {
   const age = ageHours(s);
   return (
   <NCard key={String(s.id || s.barcode)} style={{ marginBottom: SP.sm }}>
   <Text style={{ fontSize: FS.sm, color: theme.text }}>{s.barcode || s.id} — {s.stage}</Text>
   {age !== null ? <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{tt('labdash.dc2fbbc1')} {age.toFixed(1)} {tt('qqbm.e6787e11')}</Text> : null}
   </NCard>
   );
 })}
 </>)}
 </View>
 </NScroll>
 </View>
 );
}

// ══════════════════════════════════════════════════════════════════
// LAB INSURANCE CLAIMS
// ══════════════════════════════════════════════════════════════════
function LabInsurance({ onBack }:{ onBack:()=>void }) {
 const { theme } = useTheme(); const { lang, t, t: tt } = useLang(); const { show } = useToast(); const AR = lang==='ar';
 const [orders, setOrders] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [selectedOrder, setSelectedOrder] = useState<any>(null);
 // D-37: the insurer's approval number from the lab's own system (required to approve).
 const [approvalRef, setApprovalRef] = useState('');
 const [rejectNote, setRejectNote] = useState('');   // the insurer's reason when the claim is rejected (the server needs one)

 const fetchOrders = async () => {
 try {
 setLoading(true);
 const res = await client.get('/labs/provider/inbox');
 // filter insurance orders
 setOrders(res.data.filter((o:any) => o.payment_method === 'insurance'));
 } catch (e) {
 show(tt('labdash.a27f6c48'), 'error');
 } finally {
 setLoading(false);
 }
 };
 
 useEffect(() => { fetchOrders(); }, []);

 const handleUpdateInsurance = async (status: string) => {
 if (status === 'rejected' && rejectNote.trim().length < 3) {
 show(t('pa3.labDash.2'), 'error');
 return;
 }
 if (status !== 'rejected' && !approvalRef.trim()) {
 show(tt('labdash.38103dfd'), 'error');
 return;
 }
 try {
 await client.patch(`/labs/bookings/${selectedOrder.id}/insurance`, {
 status,
 ...(status !== 'rejected' ? { approval_ref: approvalRef.trim() } : { reason: rejectNote.trim() }),
 totalCopay: selectedOrder.insurance_copay || 0,
 items: selectedOrder.items
 });
 show(tt('labdash.180b680e'), 'success');
 setApprovalRef(''); setRejectNote('');
 setSelectedOrder(null);
 fetchOrders();
 } catch(e: any) {
 show(e?.response?.data?.message || (t('pa3.labDash.3')), 'error');
 }
 };

 const toggleItemCovered = (idx: number, val: boolean) => {
 const newItems = [...selectedOrder.items];
 newItems[idx].isCovered = val;
 setSelectedOrder({...selectedOrder, items: newItems});
 };

 const setItemRejectReason = (idx: number, val: string) => {
 const newItems = [...selectedOrder.items];
 newItems[idx].rejectReason = val;
 setSelectedOrder({...selectedOrder, items: newItems});
 };

 const setItemCashPrice = (idx: number, val: string) => {
 const newItems = [...selectedOrder.items];
 newItems[idx].cashPrice = val;
 setSelectedOrder({...selectedOrder, items: newItems});
 };

 const setTotalCopay = (val: string) => {
 setSelectedOrder({...selectedOrder, insurance_copay: Number(val)});
 };

 if (selectedOrder) {
 return (
 <NScroll>
 <NHeader title={tt('labdash.1936f8b7')} onBack={() => setSelectedOrder(null)} />
 <NCard style={{marginBottom: SP.xl}}>
 <Text style={{fontSize: FS.lg, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left'}}>
 {selectedOrder.patient_name} - {selectedOrder.insurance_provider}
 </Text>
 <Text style={{fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left', marginTop: SP.xs}}>
 {tt('labdash.aaa61748')}: {selectedOrder.total} {tt('labdash.a629499b')}
 </Text>
 </NCard>
 
 <NSecHeader title={tt('labdash.8fcb8db1')} />
 <NCard style={{marginBottom: SP.xl}}>
 <NPriceInput label={tt('labdash.6025e95a')} value={String(selectedOrder.insurance_copay || '')} onChange={setTotalCopay} />
 </NCard>

 <NSecHeader title={tt('labdash.77887cf9')} />
 {selectedOrder.items.map((item:any, idx:number) => (
 <NCard key={item.service_id} style={{marginBottom: SP.sm}}>
 <View style={{flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center'}}>
 <Text style={{fontSize: FS.md, fontWeight: FW.semi, color: theme.text}}>{AR ? item.name_ar : item.name_en}</Text>
 <NToggle label={tt('labdash.8e77ba51')} value={item.isCovered ?? true} onChange={(v) => toggleItemCovered(idx, v)} />
 </View>
 {!(item.isCovered ?? true) && (
 <View style={{marginTop: SP.md}}>
 <NInput label={tt('labdash.9e63f799')} value={item.rejectReason || ''} onChange={(v) => setItemRejectReason(idx, v)} />
 <NPriceInput label={tt('labdash.b562e6f7')} value={String(item.cashPrice || '')} onChange={(v) => setItemCashPrice(idx, v)} />
 </View>
 )}
 </NCard>
 ))}

 <NCard style={{marginTop: SP.lg}}>
 <NInput label={tt('labdash.82ee435d')} placeholder={tt('phx.8870afeb')} value={approvalRef} onChange={setApprovalRef} />
 <NInput label={t('pa3.labDash.4')} value={rejectNote} onChange={setRejectNote} />
 </NCard>
 <View style={{flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginTop: SP.xl, marginBottom: SP.xxl}}>
 <NBtn label={tt('labdash.8a223f36')} variant="danger" onPress={() => handleUpdateInsurance('rejected')} style={{flex: 1}} />
 <NBtn label={tt('labdash.61c05766')} onPress={() => handleUpdateInsurance('partial_approval')} style={{flex: 1}} />
 </View>
 </NScroll>
 );
 }

 return (
 <NScroll>
 <NHeader title={tt('labdash.2b68239f')} onBack={onBack} />
 {loading ? <Text style={{textAlign: 'center', color: theme.textSub, marginTop: 50}}>{tt('labdash.2ac42d8b')}</Text> : (
 <>
 <View style={{flexDirection:'row',gap:SP.md,marginBottom:SP.xl}}>
 <NStatCard icon="◔" label={tt('labdash.94139241')} value={String(orders.filter(c=>c.insurance_status==='pending').length)} color={tokens.warning} style={{flex:1}} />
 <NStatCard icon="" label={tt('labdash.aec833ec')} value={String(orders.filter(c=>c.insurance_status!=='pending'&&c.insurance_status!=='none').length)} color={tokens.success} style={{flex:1}} />
 </View>
 {orders.map(cl=>(
 <TouchableOpacity key={cl.id} onPress={() => setSelectedOrder(cl)}>
 <NCard style={{marginBottom:SP.md}} accent={cl.insurance_status==='approved'||cl.insurance_status==='partial_approval'?tokens.success:cl.insurance_status==='rejected'?tokens.error:tokens.warning}>
 <View style={{flexDirection:AR?'row-reverse':'row',justifyContent:'space-between',marginBottom:SP.sm}}>
 <Text style={{fontSize:FS.md,fontWeight:FW.bold,color:theme.text}}>{cl.patient_name}</Text>
 <NBadge label={cl.insurance_status==='approved'||cl.insurance_status==='partial_approval'?(tt('labdash.a7151286')):cl.insurance_status==='rejected'?(tt('labdash.6022b490')):(tt('labdash.94139241'))} variant={cl.insurance_status==='approved'||cl.insurance_status==='partial_approval'?'success':cl.insurance_status==='rejected'?'danger':'warning'} size="xs" />
 </View>
 <Text style={{fontSize:FS.sm,color:theme.textSub}}>{cl.insurance_provider} | {cl.items?.length} {tt('qqbm.55edd5a8')} | {cl.total} {tt('labdash.a629499b')}</Text>
 </NCard>
 </TouchableOpacity>
 ))}
 {orders.length === 0 && (
 <Text style={{textAlign: 'center', color: theme.textSub, marginTop: 50}}>
 {tt('labdash.0a8e6600')}
 </Text>
 )}
 </>
 )}
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════
// LAB SETTINGS
// ══════════════════════════════════════════════════════════════════
function LabSettings({ onLogout, onNavigate }:{ onLogout:()=>void; onNavigate:(s:string,p?:any)=>void }) {
 const insets = useSafeAreaInsets();
 const { theme, toggle:toggleT, mode } = useTheme(); const { lang, toggle:toggleL, t: tt } = useLang();
 const { show } = useToast(); const AR = lang==='ar'; const [showLO, setShowLO] = useState(false);
 return (
 <View style={{flex:1,backgroundColor:theme.bg}}>
 <View style={[s.topBar,{backgroundColor:theme.surface,borderBottomColor:theme.border, paddingTop: Math.max(insets.top, 16) }]}>
 <Text style={{fontSize:FS.xl,fontWeight:FW.bold,color:theme.text}}>{tt('labdash.5766fe8f')}</Text>
 </View>
 <ScrollView contentContainerStyle={{padding:SP.xl,paddingBottom:100}}>
 <NCard style={{marginBottom:SP.xl,flexDirection:AR?'row-reverse':'row',gap:SP.lg,alignItems:'center'}}>
 <IBg name="lab" size={22} color={tokens.purple} bg={withAlpha(tokens.purple, 0.12)} />
 <View style={{flex:1}}>
 <Text style={{fontSize:FS.xl,fontWeight:FW.bold,color:theme.text,textAlign:AR?'right':'left'}}>{tt('labdash.2ba7ed9e')}</Text>
 <NBadge label={tt('labdash.03886b8f')} variant="success" size="xs" style={{marginTop:SP.xs}} />
 </View>
 </NCard>
 <NSecHeader title={tt('labdash.c41188df')} />
 <NCard style={{marginBottom:SP.xl}}>
 <NSettingsRow icon="document" label={tt('labdash.93935d9c')} onPress={()=>onNavigate('test_menu')} />
 <NSettingsRow icon="scan" label={tt('labdash.31ebb394')} onPress={()=>onNavigate('bundles')} />
 <NSettingsRow icon="home" label={tt('labdash.2b2e547e')} onPress={()=>onNavigate('home_service')} />
 <NSettingsRow icon="calendar" label={tt('labdash.82f7fda8')} onPress={()=>onNavigate('working_hours')} />
 <NSettingsRow icon="shield" label={tt('labdash.1653fa4d')} onPress={()=>onNavigate('insurance_config')} />
<NSettingsRow icon="shield" label={tt('labdash.679ae00d')} onPress={()=>onNavigate('insurance_requests')} />
<NSettingsRow icon="document" label={tt('labdash.7a80399f')} onPress={()=>onNavigate(ORDERING_ENTRY)} />
 <NSettingsRow icon="document" label={tt('labdash.2bd7bf71')} onPress={()=>onNavigate('certificates_config')} />
 <NSettingsRow icon="camera" label={tt('labdash.07de3762')} onPress={()=>onNavigate('media_config')} />
 </NCard>

 {/* Marketing & Reputation */}
 <NSecHeader title={tt('labdash.de62827e')} />
 <NCard style={{ marginBottom:SP.xl }}>
 {[
 { icon:'bell', ar:'مركز العروض الترويجية', en:'Promotions Center', action:()=>onNavigate('promotions') },
 { icon:'globe', ar:'إعدادات الصفحة العامة', en:'Mini-Website Settings', action:()=>onNavigate('web_config') },
 { icon:'star', ar:'مستوى السمعة والتقييمات',en:'Reputation & Ratings', action:()=>onNavigate('reputation') },
 { icon:'chart', ar:'إدارة العملاء والأرباح', en:'CRM & Business Insights', action:()=>onNavigate('crm') },
 { icon:'scan', ar:'ماسح باركود العينات (Vial)', en:'Vial Barcode Scanner', action:()=>onNavigate('lab_scanner') },
 ].map((row, i) => (
 <NSettingsRow key={i} icon={row.icon} label={AR ? row.ar : row.en} onPress={row.action} />
 ))}
 </NCard>
 <GlobalSystemSettings />
 <NSecHeader title={tt('labdash.a668a3ad')} />
 <NCard style={{marginBottom:SP.xl}}>
 <NSettingsRow icon="briefcase" label={tt('labdash.ebb9f1de')} onPress={() => onNavigate('medical_jobs')} />
 <NSettingsRow icon="bookOpen" label={tt('labdash.0e14b12f')} onPress={() => onNavigate('drug_index')} />
 </NCard>
 <NSecHeader title={tt('labdash.b42c5798')} />
 <NCard style={{marginBottom:SP.xl}}>
 {[
 { icon: 'lock', ar:'تغيير كلمة المرور', en:'Change Password', action: () => onNavigate('password') },
 { icon: 'shield', ar:'التحقق الثنائي', en:'Two-Factor Auth', action: () => onNavigate('2fa') },
 { icon: 'scan', ar:'الأجهزة', en:'Devices', action: () => onNavigate('devices') }
 ].map((r,i)=>(
 <NSettingsRow key={i} icon={r.icon} label={AR?r.ar:r.en} onPress={r.action} />
 ))}
 </NCard>
 <NCard><NSettingsRow icon="lock" label={tt('labdash.d56d4be0')} onPress={()=>setShowLO(true)} danger /></NCard>
 </ScrollView>
 <NConfirm visible={showLO} title={tt('labdash.d56d4be0')} msg={tt('labdash.2c77c9c9')}
 onOk={()=>{setShowLO(false);onLogout();}} onCancel={()=>setShowLO(false)} okLabel={tt('labdash.d6c04a80')} />
 </View>
 );
}

// ══════════════════════════════════════════════════════════════════
// RESULTS LIST (tab view)
// ══════════════════════════════════════════════════════════════════
function ResultsList({ onNav }:{ onNav:(s:string,p?:any)=>void }) {
 const insets = useSafeAreaInsets();
 const { theme } = useTheme(); const { lang, t, t: tt } = useLang(); const AR = lang==='ar';
 // Samples past accessioning: results being entered, ready to send, or sent.
 const [items, setItems] = useState<any[]>([]);
 const load = useCallback(() => {
   client.get('/labs/samples')
     .then((r: any) => setItems((r.data || []).filter((sm: any) => ['analyzing', 'result_ready', 'sent'].includes(sm.stage))
       .map((sm: any) => ({ ...sm, patient: sm.patient_name || (tt('labdash.c8b7f288')), tests: sm.tests || [] }))))
     .catch(() => setItems([]));
 }, [AR]);
 useEffect(() => { load(); }, [load]);
 return (
 <View style={{flex:1,backgroundColor:theme.bg}}>
 <View style={[s.topBar,{backgroundColor:theme.surface,borderBottomColor:theme.border, paddingTop: Math.max(insets.top, 16) }]}>
 <Text style={{fontSize:FS.xl,fontWeight:FW.bold,color:theme.text}}>{tt('labdash.ba058e12')}</Text>
 </View>
 <FlatList data={items} keyExtractor={(i: any) => i.id} contentContainerStyle={{padding:SP.lg,paddingBottom:100}} onRefresh={load} refreshing={false}
 ListEmptyComponent={<NEmpty title={tt('labdash.3602265c')} icon="document" />}
 renderItem={({item})=>{
 const sc=SAMPLE_STAGES.find(st=>st.key===item.stage);
 return (
 <NCard style={{marginBottom:SP.md}} accent={sc?.color}
 onPress={()=>{if(item.stage==='analyzing'||item.stage==='result_ready')onNav('result_review',item);}}>
 <View style={{flexDirection:AR?'row-reverse':'row',alignItems:'center',gap:SP.md}}>
 <NAvatar name={item.patient} size={42} />
 <View style={{flex:1}}>
 <Text style={{fontSize:FS.md,fontWeight:FW.bold,color:theme.text,textAlign:AR?'right':'left'}}>{item.patient}</Text>
 <Text style={{fontSize:FS.xs,color:theme.textSub}}>{item.barcode} | {item.tests.length} {tt('qqbm.55edd5a8')}</Text>
 </View>
 <NBadge label={sc?(AR?sc.ar:sc.en):''} variant={item.stage==='sent'?'primary':item.stage==='result_ready'?'success':'warning'} size="xs" />
 </View>
 </NCard>
 );
 }} />
 </View>
 );
}


// ══════════════════════════════════════════════════════════════════
// RADIOLOGY HOME TAB
// ─── Styles ─────────────────────────────────────────────────────
const s = StyleSheet.create({
 topBar:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:SP.xl,paddingVertical:SP.md,borderBottomWidth:StyleSheet.hairlineWidth},
 iconBtn:{width:38,height:38,borderRadius:19,alignItems:'center',justifyContent:'center',position:'relative'},
 quickAction:{width:76,alignItems:'center',justifyContent:'center',borderRadius:R.xl,borderWidth:1,padding:SP.md},
 chip:{paddingHorizontal:SP.lg,paddingVertical:SP.sm,borderRadius:R.full,borderWidth:1.5},
 bottomNavWrap:{flexDirection:'row',borderTopWidth:StyleSheet.hairlineWidth,paddingBottom:28,paddingTop:SP.sm},
 navTab:{flex:1,alignItems:'center',gap:2},
 navIconWrap:{width:40,height:40,borderRadius:20,alignItems:'center',justifyContent:'center',position:'relative'},
 navBadge:{position:'absolute',top:-2,right:-2,backgroundColor:tokens.error,width:16,height:16,borderRadius:8,alignItems:'center',justifyContent:'center'},
 navBadgeText:{color:'#FFF',fontSize:9,fontWeight:'700'},
 navLabel:{fontSize:10},
});


// ══════════════════════════════════════════════════════════════════
// LAB TEST MENU (Settings & Pricing)
// ══════════════════════════════════════════════════════════════════
// A lab test's preparation is written per test in the six patient-app languages (decision of 2026-10-15);
// the patient app shows the one for its language, and with none only says the lab will confirm any preparation.

function LabTestMenuScreen({ onBack }: { onBack: () => void }) {
  const { lang, t, t: tt } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [newTitleAr, setNewTitleAr] = useState('');
  const [newTitleEn, setNewTitleEn] = useState('');
  const [newPrice, setNewPrice] = useState('');

  const handleAddService = async () => {
    if (!newPrice || !newTitleEn) {
      show(tt('labdash.cf8d628a'), 'error');
      return;
    }
    try {
      await client.post('/approval-workflow/requests', {
        entity_type: 'service',
        change_data: { type: 'lab', name_ar: newTitleAr, name_en: newTitleEn, price: parseFloat(newPrice) || 0 },
      });
      show(tt('labdash.202d1617'), 'success');
      setShowAddSheet(false);
      setNewTitleAr(''); setNewTitleEn(''); setNewPrice('');
    } catch (e) {
      show(tt('labdash.529d0961'), 'error');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <MyServicesScreen vertical="lab" onBack={onBack}
        footer={<NBtn label={tt('labdash.dedacd60')} variant="outline" onPress={() => setShowAddSheet(true)} />} />
      <NSheet visible={showAddSheet} onClose={() => setShowAddSheet(false)} title={tt('labdash.7015666b')}>
        <NInput label={tt('labdash.a7540872')} value={newTitleEn} onChange={setNewTitleEn} />
        <NInput label={tt('labdash.db5759a0')} value={newTitleAr} onChange={setNewTitleAr} />
        <NPriceInput label={tt('labdash.f996d67f')} value={newPrice} onChange={setNewPrice} />
        <NBtn label={tt('labdash.3ae3dbd7')} onPress={handleAddService} style={{ marginTop: SP.xl }} />
      </NSheet>
    </View>
  );
}
