/**
 * NABDAH PLUS – PHASE 4 · LAB & RADIOLOGY DASHBOARD (18 screens)
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
 View, Text, TouchableOpacity, ScrollView, StyleSheet,
 Animated, FlatList, Alert, Dimensions, Switch, RefreshControl, TextInput
, ActivityIndicator, Modal } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useLang, useAuth, useToast } from '../../context';
import client from '../../api/client';
import { InsuranceRequestsScreen } from '../shared/InsuranceRequestsScreen';
import { LabQcActions } from './LabQcActions';
import {
 NBtn, NCard, NInput, NStatCard, NAvatar, NBadge,
 NHeader, NScroll, NSheet, NSearch, NToggle, NSettingsRow,
 NSecHeader, NConfirm, NEmpty, NOnlineToggle, NBottomNav,
 NDivider, NPriceInput
} from '../../components/ui';
import { I, IBg, RatingStars } from '../../components/icons';
import { SP, R, FS, FW, LAB_TESTS, RAD_SCANS, C } from '../../constants';
import {
 PromotionsDashboard, CreateCampaignScreen, ProfileWebConfig,
 ReputationHub, LiveOrderAlarmModal, CrmHub, RevenueInsights,
 LabSampleScannerScreen
} from '../shared/BlueprintScreens';
import { MedicalJobsScreen, MedicalDrugIndexScreen, InsuranceConfigScreen, CertificatesConfigScreen, MediaConfigScreen, ProviderWalletScreen, ProviderHomeStats, GlobalSystemSettings, ChatSystem } from '../shared/SharedScreens';
import { WorkingHoursEditorScreen, SecurityManagementScreen } from '../shared/RealScreens';
import { LabBundlesScreen, LabHomeServiceScreen } from '../shared/RealScreensExtended';

const { width: W } = Dimensions.get('window');

// Connected to backend APIs for lab orders and samples
const STAGES = [
  { key: 'PENDING', ar: 'قيد الانتظار', en: 'Pending', color: '#FF9800' },
  { key: 'SAMPLE_COLLECTED', ar: 'تم سحب العينة', en: 'Sample Collected', color: '#2196F3' },
  { key: 'PROCESSING', ar: 'قيد التحليل', en: 'Processing', color: '#9C27B0' },
  { key: 'RESULTS_READY', ar: 'النتائج جاهزة', en: 'Results Ready', color: '#4CAF50' },
  { key: 'COMPLETED', ar: 'مكتمل', en: 'Completed', color: '#4CAF50' },
  { key: 'SAMPLE_REJECTED', ar: 'عينة مرفوضة', en: 'Sample Rejected', color: '#F44336' },
];


// ══════════════════════════════════════════════════════════════════
// LAB ORDERS SUB-TABS COMPONENT
// ══════════════════════════════════════════════════════════════════

function LabOrdersTab({ onNav }: { onNav: (s: string, p?: any) => void }) {
  const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';
  const [subTab, setSubTab] = useState<'incoming' | 'scheduled' | 'processing' | 'results'>('incoming');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get('/labs/provider/inbox')
      .then(res => setOrders(res.data || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  const getFilteredOrders = () => {
    if (subTab === 'incoming') return orders.filter(o => ['NEW_REQUEST', 'PENDING_INSURANCE', 'WAITING_COPAY'].includes(o.status));
    if (subTab === 'scheduled') return orders.filter(o => ['CONFIRMED', 'ASSIGNED', 'IN_TRANSIT'].includes(o.status));
    if (subTab === 'processing') return orders.filter(o => ['SAMPLE_COLLECTED', 'PROCESSING', 'SAMPLE_REJECTED'].includes(o.status));
    if (subTab === 'results') return orders.filter(o => ['RESULT_UPLOADED'].includes(o.status));
    return [];
  };

  const filtered = getFilteredOrders();

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={[s.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text }}>{AR ? 'الطلبات والمختبر' : 'Lab Orders'}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.surface, maxHeight: 60 }}>
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', paddingHorizontal: SP.md, gap: SP.md, alignItems: 'center' }}>
          <TouchableOpacity onPress={() => setSubTab('incoming')} style={{ paddingVertical: SP.md, borderBottomWidth: 2, borderBottomColor: subTab === 'incoming' ? theme.primary : 'transparent' }}>
            <Text style={{ fontWeight: subTab === 'incoming' ? 'bold' : 'normal', color: subTab === 'incoming' ? theme.primary : theme.textSub }}>{AR ? 'الواردة' : 'Incoming'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSubTab('scheduled')} style={{ paddingVertical: SP.md, borderBottomWidth: 2, borderBottomColor: subTab === 'scheduled' ? theme.primary : 'transparent' }}>
            <Text style={{ fontWeight: subTab === 'scheduled' ? 'bold' : 'normal', color: subTab === 'scheduled' ? theme.primary : theme.textSub }}>{AR ? 'الجدولة والسحب' : 'Scheduled & Draw'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSubTab('processing')} style={{ paddingVertical: SP.md, borderBottomWidth: 2, borderBottomColor: subTab === 'processing' ? theme.primary : 'transparent' }}>
            <Text style={{ fontWeight: subTab === 'processing' ? 'bold' : 'normal', color: subTab === 'processing' ? theme.primary : theme.textSub }}>{AR ? 'التحليل والعينات' : 'Processing'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSubTab('results')} style={{ paddingVertical: SP.md, borderBottomWidth: 2, borderBottomColor: subTab === 'results' ? theme.primary : 'transparent' }}>
            <Text style={{ fontWeight: subTab === 'results' ? 'bold' : 'normal', color: subTab === 'results' ? theme.primary : theme.textSub }}>{AR ? 'النتائج' : 'Results'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      <ScrollView contentContainerStyle={{ padding: SP.lg, paddingBottom: 100 }}>
        {filtered.length === 0 && <NEmpty title={AR ? 'لا توجد طلبات هنا' : 'No Orders Here'} icon="document" />}
        {filtered.map(order => {
          const st = STAGES.find(s => s.key === order.status) || STAGES[0];
          return (
            <NCard key={order.id} style={{ marginBottom: SP.md, borderColor: order.status === 'SAMPLE_REJECTED' ? theme.danger : theme.border, borderWidth: 1 }} onPress={() => onNav('order_detail', order)}>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{order.patient_name || 'Patient'}</Text>
                  <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <Text style={{ fontSize: FS.sm, color: theme.textSub, fontWeight:'bold' }}>{order.is_insurance?' NPHIES':' Cash'}</Text>
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
const Stack = createNativeStackNavigator();

export function LabDashboardNavigator({ onLogout }: { onLogout:()=>void }) {
 const [tab, setTab] = useState('home');
 const { lang } = useLang(); const AR = lang==='ar';
 const [alarmVisible, setAlarmVisible] = useState(false);

  const tabs = [
 { key: 'home', icon: 'home', label: AR ? 'الرئيسية' : 'Home' },
 { key: 'orders', icon: 'document', label: AR ? 'الطلبات' : 'Orders' },
 { key: 'jobs', icon: 'profile', label: AR ? 'الوظائف' : 'Jobs' },
 { key: 'drugs', icon: 'activity', label: AR ? 'الأدوية' : 'Drugs' },
 { key: 'settings', icon: 'settings', label: AR ? 'الإعدادات' : 'Settings' },
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
     <Stack.Screen name="sample_tracking">{({ navigation }: any) => <SampleTracking onBack={() => navigation.goBack()} onNav={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
     <Stack.Screen name="result_review">{({ navigation, route }: any) => <ResultReview sample={route.params?.param} onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="bundles">{({ navigation }: any) => <LabBundlesScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="add_test">{({ navigation }: any) => <AddCustomTest onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="home_collection">{({ navigation, route }: any) => <HomeCollection order={route.params?.param} onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="qr_label">{({ navigation, route }: any) => <QRSampleLabel sample={route.params?.param} onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="wallet">{({ navigation }: any) => <ProviderWalletScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
     <Stack.Screen name="chat">{({ navigation }: any) => <ChatSystem onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="tat_tracker">{({ navigation }: any) => <TATTracker onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="insurance">{({ navigation }: any) => <LabInsurance onBack={() => navigation.goBack()} />}</Stack.Screen>

     <Stack.Screen name="promotions">{({ navigation }: any) => <PromotionsDashboard onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
     <Stack.Screen name="create_promo">{({ navigation }: any) => <CreateCampaignScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="web_config">{({ navigation }: any) => <ProfileWebConfig onBack={() => navigation.goBack()} />}</Stack.Screen>
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
     <Stack.Screen name="working_hours">{({ navigation }: any) => <WorkingHoursEditorScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="password">{({ navigation }: any) => <SecurityManagementScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="2fa">{({ navigation }: any) => <SecurityManagementScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="devices">{({ navigation }: any) => <SecurityManagementScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
   </Stack.Navigator>
 );
}

// ══════════════════════════════════════════════════════════════════
// HOME TAB
// ══════════════════════════════════════════════════════════════════
function LabHome({ onNav, onTriggerAlarm }:{ onNav:(s:string,p?:any)=>void; onTriggerAlarm?:()=>void }) {
 const insets = useSafeAreaInsets();
 const { theme } = useTheme(); const { lang } = useLang(); const AR = lang==='ar';
 const { user, toggleOnline } = useAuth();
 const [refreshing, setR] = useState(false);
 const [orders, setOrders] = useState<any[]>([]);
 const [samples, setSamples] = useState<any[]>([]);
 const [stats, setStats] = useState({ todayCount: 0, analyzingCount: 0, readyCount: 0, revenue: 0 });

 const fetchLabData = useCallback(async () => {
 try {
 const inboxRes = await client.get('/labs/provider/inbox');
 const combined = inboxRes.data || [];
 
 setOrders(combined.map((x: any) => ({
 id: x.id,
 patient: x.patient_name || (AR ? 'مريض نبض' : 'Nabdah Patient'),
 doctor: x.doctor_name || '—',
 tests: x.tests || ['cbc'],
 insurance: x.insurance_provider || 'Cash',
 total: x.total || 150,
 status: x.state === 'SAMPLE_COLLECTED' ? 'analyzing' : x.state === 'REPORTED' ? 'ready' : 'pending',
 date: x.scheduled_at ? new Date(x.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (AR ? 'قريباً' : 'Soon'),
 homeCollection: x.service_type === 'home' || false,
 collectorName: x.technician_name || '',
 raw: x
 })));

 const resSamples = await client.get('/labs/samples');
 setSamples(resSamples.data || []);

 setStats({
 todayCount: combined.length,
 analyzingCount: combined.filter(o => o.state === 'SAMPLE_COLLECTED').length,
 readyCount: combined.filter(o => o.state === 'REPORTED').length,
 revenue: combined.reduce((acc: number, cur: any) => acc + (cur.total || 0), 0)
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
 <IBg name="lab" size={18} color="#9C27B0" bg="#9C27B012" />
 <View>
 <Text style={{fontSize:FS.sm,color:theme.textSub}}>{AR?'معمل تحاليل':'Laboratory'}</Text>
 <Text style={{fontSize:FS.md,fontWeight:FW.bold,color:theme.text}}>{AR?'معمل نبضة الطبي':'Nabdah Medical Lab'}</Text>
 </View>
 </View>
 <View style={{flexDirection:'row',gap:SP.sm,alignItems:'center'}}>
 <NOnlineToggle value={user?.isOnline??true} onToggle={toggleOnline} />
 <TouchableOpacity style={[s.iconBtn,{backgroundColor:theme.surface2}]}><I name="bell" size={20} color={theme.text} /></TouchableOpacity>
 </View>
 </View>

 <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#9C27B0" />}
 contentContainerStyle={{padding:SP.xl,paddingBottom:100}} showsVerticalScrollIndicator={false}>
 {/* Stats */}
 <View style={{flexDirection:'row',flexWrap:'wrap',gap:SP.md,marginBottom:SP.xl}}>
 <NStatCard icon="⊥" label={AR?'طلبات اليوم':"Today's Orders"} value={String(stats.todayCount)} color="#2196F3" style={{width:'47%'}} />
 <NStatCard icon="◔" label={AR?'تحت التحليل':'Analyzing'} value={String(stats.analyzingCount)} color="#FF9800" style={{width:'47%'}} />
 <NStatCard icon="◈" label={AR?'إيرادات اليوم':'Revenue'} value={String(stats.revenue)} unit={AR?'ر':'SAR'} color="#4CAF50" style={{width:'47%'}} />
 <NStatCard icon="" label={AR?'نتائج جاهزة':'Ready'} value={String(stats.readyCount)} color="#9C27B0" style={{width:'47%'}} />
 </View>

 {/* Quick Actions */}
 <NSecHeader title={AR?'إجراءات سريعة':'Quick Actions'} />
 <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:SP.xl}}>
 <View style={{flexDirection:'row',gap:SP.md}}>
 {[
 {ar:'المحفظة والإيرادات',en:'Wallet & Revenue',screen:'wallet',color:'#9C27B0'},
 {ar:'تتبع العينات',en:'Track Samples',screen:'sample_tracking',color:'#2196F3'},
 {ar:'إدخال نتائج',en:'Enter Results',screen:'result_entry',color:'#4CAF50'},
 {ar:'وقت النتائج',en:'TAT Tracker',screen:'tat_tracker',color:'#FF9800'},
 {ar:'سحب منزلي',en:'Home Collection',screen:'home_collection',color:'#E91E63'},
 {ar:'ملصق QR',en:'QR Label',screen:'qr_label',color:'#9C27B0'},
 {ar:'إدارة الحزم',en:'Bundles',screen:'bundles',color:'#009688'},
 {ar:'فحص مخصص',en:'Custom Test',screen:'add_test',color:'#FF5722'},
 {ar:'مطالبات تأمين',en:'Insurance',screen:'insurance',color:'#3F51B5'},
 {ar:'لوحة الأشعة',en:'Radiology',screen:'rad_home',color:'#009688'},
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
 <NSecHeader title={AR?'خط أنابيب العينات':'Sample Pipeline'} action={AR?'الكل':'All'} onAction={()=>onNav('sample_tracking')} />
 <View style={{flexDirection:AR?'row-reverse':'row',gap:SP.sm,marginBottom:SP.xl}}>
 {STAGES.map(st=>{
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
 const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang==='ar';
  const [showRegister, setShowRegister] = useState(false);
  const [showNphies, setShowNphies] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [barcode, setBarcode] = useState('');
  const [notes, setNotes] = useState('');
  const [nphiesCode, setNphiesCode] = useState('');
  const [copay, setCopay] = useState('');
  const [techName, setTechName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [showCam, setShowCam] = useState(false);
  const [camPerm, requestCamPerm] = useCameraPermissions();

  const openScanner = async () => {
    try {
      if (!camPerm?.granted) {
        const r = await requestCamPerm();
        if (!r?.granted) { show(AR ? 'صلاحية الكاميرا مرفوضة' : 'Camera permission denied', 'error'); return; }
      }
      setShowCam(true);
    } catch { show(AR ? 'الكاميرا غير متاحة على هذا الجهاز' : 'Camera unavailable on this device', 'error'); }
  };

 
  const handleReject = () => {
    show(AR ? 'رفض الحجز يحتاج سبباً مسجلاً عبر أمر التغطية الخادمي؛ لا يمكن تغيير الحالة مباشرةً.' : 'Booking rejection requires a recorded reason through the server coverage command; direct state changes are disabled.', 'info');
  };

  const handleNphiesApproval = async () => {
    if (!nphiesCode) return show(AR ? 'الرجاء إدخال مرجع القرار الداخلي' : 'Enter the internal decision reference', 'warning');
    setLoading(true);
    try {
      const copayPercent = Math.max(0, Math.min(99, Number(copay)));
      const decision = copayPercent > 0 ? 'APPROVED_PARTIAL' : 'APPROVED_FULL';
      await client.post(`/labs/bookings/${order.id}/coverage-decision`, {
        decision,
        decision_reference: nphiesCode,
        ...(decision === 'APPROVED_PARTIAL' ? { copay_percent: copayPercent } : {}),
      });
      show(AR ? 'سُجل قرار التغطية الداخلي من الخادم' : 'The server recorded the internal coverage decision', 'success');
      setShowNphies(false);
      onBack();
    } catch (e: any) {
      show(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCashConfirm = async () => {
    setLoading(true);
    try {
      show(AR ? 'لا يمكن تأكيد طلب نقدي من التطبيق قبل وصول حالة الدفع الحاكمة من الخادم.' : 'A cash booking cannot be confirmed from the app before the server payment state is authoritative.', 'info');
    } catch (e: any) {
      show(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTech = async () => {
    setLoading(true);
    try {
      await client.post(`/labs/bookings/${order.id}/assign-technician`, { technician_id: techName });
      show(AR ? `تم تعيين ${techName}` : `Assigned ${techName}`, 'success');
      setShowAssign(false);
      onBack();
    } catch (e: any) {
      show(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleDate) return show(AR ? 'الرجاء اختيار الموعد الجديد' : 'Please select a new date', 'warning');
    setLoading(true);
    try {
      await client.patch(`/labs/bookings/${order.id}/reschedule`, { new_date: rescheduleDate, reason: 'Provider Reschedule' });
      show(AR ? 'تم إعادة الجدولة بنجاح' : 'Rescheduled successfully', 'success');
      setShowReschedule(false);
      onBack();
    } catch (e: any) {
      show(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSample = async () => {
    if (!barcode) return show(AR ? 'الرجاء إدخال الباركود' : 'Please enter barcode', 'warning');
    setLoading(true);
    try {
      await client.post('/labs/samples/register', {
        lab_order_id: order.id,
        barcode: barcode.trim(),
        tests: Array.isArray(order.tests) ? order.tests : [],
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      show(AR ? 'سُجلت العينة في سجل الحيازة الخادمي' : 'The sample was registered in the server custody record', 'success');
      setShowRegister(false);
      onBack();
    } catch (e: any) {
      show(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const anyRequiresFasting = (order?.tests || []).some((tid: string) => LAB_TESTS.find(x => x.id === tid)?.fasting);

 return (
 <NScroll>
 <NHeader title={AR?'تفاصيل الطلب':'Order Details'} onBack={onBack} />
 <NCard style={{marginBottom:SP.xl}}>
 <View style={{flexDirection:AR?'row-reverse':'row',gap:SP.lg,marginBottom:SP.lg}}>
 <NAvatar name={order?.patient??'مريض'} size={56} />
 <View style={{flex:1}}>
 <Text style={{fontSize:FS.xl,fontWeight:FW.bold,color:theme.text,textAlign:AR?'right':'left'}}>{order?.patient??'—'}</Text>
 <Text style={{fontSize:FS.sm,color:theme.textSub}}>{order?.doctor??'—'} | {order?.insurance??'Cash'}</Text>
 <NBadge label={order?.homeCollection?(AR?'سحب منزلي':'Home'):(AR?'حضور':'Walk-in')} variant={order?.homeCollection?'warning':'primary'} size="xs" style={{marginTop:SP.xs}} />
 </View>
 </View>

 {anyRequiresFasting && (
 <NCard style={{ backgroundColor: theme.warnBg, padding: SP.md, marginBottom: SP.lg, borderColor: theme.warn, borderWidth: 1 }}>
 <Text style={{ fontSize: FS.xs, color: theme.warn, textAlign: AR ? 'right' : 'left', fontWeight: FW.bold }}>
 {AR ? 'تنبيه صيام: هذا الطلب يحتوي على تحاليل تتطلب صيام المريض (8 إلى 12 ساعة).'
 : 'Fasting Warning: This order contains tests that require the patient to fast (8 to 12 hours).'}
 </Text>
 </NCard>
 )}

 <Text style={{fontSize:FS.md,fontWeight:FW.bold,color:theme.text,marginBottom:SP.md,textAlign:AR?'right':'left'}}>{AR?'التحاليل المطلوبة':'Requested Tests'}</Text>
 {(order?.tests??[]).map((tid:string)=>{
 const t=LAB_TESTS.find(x=>x.id===tid);
 return t ? <View key={tid} style={{flexDirection:AR?'row-reverse':'row',alignItems:'center',gap:SP.md,paddingVertical:SP.sm,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:theme.border}}>
 <IBg name="testTube" size={12} color="#9C27B0" bg="#9C27B012" />
 <View style={{flex:1}}>
 <Text style={{fontSize:FS.md,color:theme.text,textAlign:AR?'right':'left'}}>{AR?t.ar:t.en}</Text>
 <Text style={{fontSize:FS.xs,color:theme.textSub}}>{t.hours<1?`${t.hours*60}min`:`${t.hours}h`}{t.fasting?` | ${AR?'صيام':'Fasting'}`:''}</Text>
 </View>
 </View> : null;
 })}
 <NDivider style={{marginVertical:SP.lg}} />
        <View style={{flexDirection:AR?'row-reverse':'row',justifyContent:'space-between'}}>
          <Text style={{fontSize:FS.md,color:theme.textSub}}>{AR?'الإجمالي':'Total'}</Text>
          <Text style={{fontSize:FS.xl,fontWeight:FW.xbold,color:'#9C27B0'}}>{order?.total??0} {AR?'ريال':'SAR'}</Text>
        </View>
      </NCard>

      {order?.status === 'NEW_REQUEST' && (
        <View style={{gap:SP.md}}>
          {order?.is_insurance ? (
            <NBtn label={AR ? 'طلب موافقة NPHIES' : 'Request NPHIES Approval'} onPress={() => setShowNphies(true)} />
          ) : (
            <NBtn label={AR ? 'تأكيد الطلب المباشر (كاش)' : 'Confirm Direct Order (Cash)'} onPress={handleCashConfirm} />
          )}
          <NBtn label={AR?'رفض الطلب':'Reject Order'} variant="danger" onPress={handleReject} />
        </View>
      )}

      {order?.status === 'WAITING_COPAY' && (
        <NCard style={{ backgroundColor: theme.warnBg, borderColor: theme.warn, borderWidth: 1, alignItems: 'center' }}>
          <Text style={{ color: theme.warn, fontWeight: 'bold' }}>{AR ? 'بانتظار دفع المريض لنسبة التحمل...' : 'Waiting for Patient Co-Pay...'}</Text>
        </NCard>
      )}

      {order?.status === 'CONFIRMED' && (
        <View style={{gap:SP.md}}>
          {order?.homeCollection ? (
            <NBtn label={AR ? 'تعيين فني سحب منزلي' : 'Assign Phlebotomist'} onPress={() => setShowAssign(true)} />
          ) : (
            <NBtn label={AR ? 'حضور المريض - تسجيل عينة' : 'Patient Arrived - Register Sample'} onPress={() => setShowRegister(true)} />
          )}
          <NBtn label={AR ? 'إعادة جدولة الموعد' : 'Reschedule Appointment'} variant="outline" onPress={() => setShowReschedule(true)} />
        </View>
      )}

      {order?.status === 'ASSIGNED' && (
        <View style={{gap:SP.md}}>
          <NBtn label={AR ? 'بدء التحرك (تتبع GPS)' : 'Start Trip (GPS)'} onPress={() => onNav('home_collection', order)} />
        </View>
      )}

      {order?.status === 'IN_TRANSIT' && (
        <View style={{gap:SP.md}}>
          <NBtn label={AR ? 'تسجيل العينة وإتمام الزيارة' : 'Register Sample & Complete'} onPress={() => setShowRegister(true)} />
        </View>
      )}

      {order?.status === 'SAMPLE_COLLECTED' && (
        <View style={{gap:SP.md}}>
          <NBtn label={AR ? 'بدء الفحص وإدخال النتائج' : 'Process & Enter Results'} onPress={() => onNav('result_review', order)} />
        </View>
      )}

      {/* QC actions: urgent/STAT/critical/verify/double-verify/reject (Phase-1 APIs) */}
      {['CONFIRMED','IN_TRANSIT','SAMPLE_COLLECTED','PROCESSING'].includes(order?.status || order?.state) && (
        <LabQcActions booking={{ ...order, id: order.id, state: order.state || order.status }} onDone={() => onBack()} />
      )}

      {/* MODALS */}
      {/* Reschedule Sheet */}
      <NSheet visible={showReschedule} onClose={()=>setShowReschedule(false)} title={AR ? 'إعادة جدولة الموعد' : 'Reschedule Appointment'} height={350}>
        <View style={{ padding: SP.md }}>
          <Text style={{ fontSize: FS.sm, color: theme.textSub, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
            {AR ? 'الرجاء تحديد الموعد الجديد لزيارة المريض أو السحب المنزلي:' : 'Please specify the new date/time for the patient visit or home collection:'}
          </Text>
          <NInput label={AR ? 'الموعد الجديد' : 'New Date/Time'} placeholder="YYYY-MM-DD HH:MM" value={rescheduleDate} onChange={setRescheduleDate} icon="event" />
          <NBtn label={AR ? 'تأكيد وإشعار المريض' : 'Confirm & Notify Patient'} loading={loading} onPress={handleReschedule} style={{ marginTop: SP.md }} />
        </View>
      </NSheet>

      {/* NPHIES Approval Sheet */}
      <NSheet visible={showNphies} onClose={()=>setShowNphies(false)} title={AR ? 'موافقة التأمين NPHIES' : 'NPHIES Approval'} height={400}>
        <View style={{ padding: SP.md }}>
          <NInput label={AR ? 'مرجع القرار الداخلي' : 'Internal decision reference'} placeholder="REF-12345" value={nphiesCode} onChange={setNphiesCode} icon="verified" />
          <NInput label={AR ? 'نسبة تحمل المريض (0–99%)' : 'Patient co-pay percentage (0–99%)'} placeholder="0" value={copay} onChange={setCopay} icon="payments" kbType="numeric" />
          <NBtn label={AR ? 'تسجيل قرار التغطية' : 'Record coverage decision'} onPress={handleNphiesApproval} style={{ marginTop: SP.md }} />
        </View>
      </NSheet>

      {/* Tech Assignment Sheet */}
      <NSheet visible={showAssign} onClose={()=>setShowAssign(false)} title={AR ? 'تعيين فني سحب' : 'Assign Technician'} height={400}>
        <View style={{ padding: SP.md }}>
          <NInput label={AR ? 'ابحث عن فني' : 'Search Technician'} placeholder={AR ? 'مثال: أحمد' : 'e.g. Ahmed'} value={techName} onChange={setTechName} icon="search" />
          <NBtn label={AR ? 'تأكيد التعيين' : 'Confirm Assignment'} onPress={handleAssignTech} style={{ marginTop: SP.md }} />
        </View>
      </NSheet>

      {/* Register Sample Sheet */}
      <NSheet visible={showRegister} onClose={()=>setShowRegister(false)} title={AR ? 'تسجيل العينة (Accessioning)' : 'Register Sample'} height={400}>
        <View style={{ padding: SP.md }}>
          <NInput label={AR ? 'باركود العينة' : 'Sample Barcode'} placeholder="SMP-XXXXXXXX" value={barcode} onChange={setBarcode} icon="qr-code-scanner" />
          <NBtn label={AR ? 'فتح الكاميرا للمسح' : 'Open Camera Scanner'} variant="outline" onPress={openScanner} style={{ marginBottom: SP.sm }} />
          <NInput label={AR ? 'ملاحظات' : 'Notes'} placeholder={AR ? 'ملاحظات اختيارية...' : 'Optional notes...'} value={notes} onChange={setNotes} icon="edit" />
          <NBtn label={AR ? 'تأكيد وتسجيل العينة' : 'Confirm & Register'} loading={loading} onPress={handleRegisterSample} style={{ marginTop: SP.md }} />
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
            <Text style={{ color: '#fff', fontWeight: FW.bold, fontSize: FS.md }}>{AR ? 'إلغاء' : 'Cancel'}</Text>
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
 const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang==='ar';
 const [filter, setFilter] = useState('all');
 const [samples, setSamples] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);

 const fetchSamples = useCallback(async () => {
 try {
 const res = await client.get('/labs/samples');
 setSamples(res.data || []);
 } catch (err) {
  setSamples([]); // Silent fail — show empty state
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
 show(AR ? 'بدأ التحليل ' : 'Analysis started ', 'success');
 fetchSamples();
 } catch (err: any) {
 show(err.message || (AR ? 'فشل تحديث الحالة' : 'Failed to update stage'), 'error');
 }
 };

 const filtered = filter==='all' ? samples : samples.filter(sm=>sm.stage===filter);

 return (
 <View style={{flex:1,backgroundColor:theme.bg}}>
 <View style={[s.topBar,{backgroundColor:theme.surface,borderBottomColor:theme.border, paddingTop: Math.max(insets.top, 16) }]}>
 <TouchableOpacity onPress={onBack}><I name="back" size={20} color={theme.primary} /></TouchableOpacity>
 <Text style={{fontSize:FS.xl,fontWeight:FW.bold,color:theme.text}}>{AR?'تتبع العينات':'Sample Tracking'}</Text>
 <View style={{width:30}} />
 </View>
 {/* Stage filter */}
 <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal:SP.lg,paddingVertical:SP.md,gap:SP.sm}}>
 <TouchableOpacity onPress={()=>setFilter('all')} style={[s.chip,{backgroundColor:filter==='all'?'#9C27B0':theme.surface2,borderColor:filter==='all'?'#9C27B0':theme.border}]}>
 <Text style={{color:filter==='all'?'#FFF':theme.text,fontSize:FS.xs,fontWeight:FW.semi}}>{AR?'الكل':'All'} ({samples.length})</Text>
 </TouchableOpacity>
 {STAGES.map(st=>{
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
 const si=STAGES.findIndex(st=>st.key===sam.stage); const sc=STAGES[si];
 return (
 <NCard style={{marginBottom:SP.md}} accent={sc?.color}>
 <View style={{flexDirection:AR?'row-reverse':'row',justifyContent:'space-between',marginBottom:SP.md}}>
 <View style={{flexDirection:AR?'row-reverse':'row',alignItems:'center',gap:SP.md}}>
 <NAvatar name={sam.patient_name || (AR ? 'مريض نبض' : 'Nabdah Patient')} size={42} />
 <View>
 <Text style={{fontSize:FS.md,fontWeight:FW.bold,color:theme.text}}>{sam.patient_name || (AR ? 'مريض نبض' : 'Nabdah Patient')}</Text>
 <Text style={{fontSize:FS.xs,color:theme.textSub}}>{sam.barcode}</Text>
 </View>
 </View>
 <NBadge label={AR?sc.ar:sc.en} variant={si>=2?'success':si===1?'warning':'info'} size="xs" />
 </View>
 {/* Progress dots */}
 <View style={{flexDirection:AR?'row-reverse':'row',alignItems:'center',gap:SP.xs,marginBottom:SP.md}}>
 {STAGES.map((st2,i)=>(
 <React.Fragment key={st2.key}>
 <View style={{width:22,height:22,borderRadius:11,backgroundColor:i<=si?st2.color:theme.surface2,alignItems:'center',justifyContent:'center'}}>
 {i<=si && <I name="check" size={10} color="#FFF" />}
 </View>
 {i<STAGES.length-1 && <View style={{flex:1,height:2,backgroundColor:i<si?STAGES[i+1].color:theme.border}} />}
 </React.Fragment>
 ))}
 </View>
 <View style={{flexDirection:'row',flexWrap:'wrap',gap:SP.xs,marginBottom:SP.sm}}>
 {(sam.tests || []).map(tid=>{const t=LAB_TESTS.find(x=>x.id===tid);return <View key={tid} style={{backgroundColor:theme.surface2,paddingHorizontal:SP.sm,paddingVertical:2,borderRadius:R.full,borderWidth:1,borderColor:theme.border}}><Text style={{fontSize:FS.xs,color:theme.text}}>{t?(AR?t.ar:t.en):tid}</Text></View>;})}
 </View>
 <Text style={{fontSize:FS.xs,color:theme.textSub}}>{AR?`استلام: ${sam.createdAt ? new Date(sam.createdAt).toLocaleTimeString() : '—'} | الباركود: ${sam.barcode}`:`Received: ${sam.createdAt ? new Date(sam.createdAt).toLocaleTimeString() : '—'} | Barcode: ${sam.barcode}`}</Text>
 <View style={{flexDirection:AR?'row-reverse':'row',gap:SP.sm,marginTop:SP.md}}>
 {sam.stage==='received' && <NBtn label={AR?'بدء التحليل':'Start Analysis'} size="sm" full={false} style={{flex:1}} onPress={()=>handleStartAnalysis(sam)} />}
 {sam.stage==='analyzing' && <NBtn label={AR?'إدخال النتائج':'Enter Results'} size="sm" full={false} style={{flex:1}} onPress={()=>onNav('result_review',sam)} />}
 {sam.stage==='result_ready' && <NBtn label={AR?'مراجعة وإرسال':'Review & Send'} size="sm" full={false} style={{flex:1}} onPress={()=>onNav('result_review',sam)} />}
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
 const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang==='ar';
  const [sendTo, setSendTo] = useState<'patient'|'both'>('both');
 const [loading, setLoading] = useState(false);
 const [resultRows, setResultRows] = useState<any[]>(Array.isArray(sample?.structured_results) ? sample.structured_results : []);
 const [analyte, setAnalyte] = useState('');
 const [value, setValue] = useState('');
 const [unit, setUnit] = useState('');
 const [range, setRange] = useState('');
 const [isCritical, setIsCritical] = useState(false);
 const addResultRow = () => {
   if (!analyte.trim() || !value.trim()) {
     show(AR ? 'أدخل اسم الفحص والنتيجة قبل الإضافة' : 'Enter an analyte and result before adding it', 'error');
     return;
   }
   setResultRows((rows) => [...rows, { analyte: analyte.trim(), value: value.trim(), unit: unit.trim(), range: range.trim(), isCritical }]);
   setAnalyte(''); setValue(''); setUnit(''); setRange(''); setIsCritical(false);
 };
 const handleConfirmSend = async () => {
 if (!resultRows.length) {
   show(AR ? 'أضف نتيجة واحدة على الأقل قبل الإرسال' : 'Add at least one result before sending', 'error');
   return;
 }
 setLoading(true);
 try {
 await client.post(`/labs/bookings/${sample.lab_order_id || sample.id}/upload-report`, { structuredData: resultRows, send_to: sendTo });
 await client.patch(`/labs/samples/${sample.id}/stage`, { stage: 'sent' });
 show(AR ? 'تم إرسال النتيجة' : 'Result sent', 'success');
 onBack();
 } catch (err: any) {
 show(err.message || (AR ? 'فشل إرسال النتيجة' : 'Failed to send result'), 'error');
 } finally {
 setLoading(false);
 }
 };

 return (
 <NScroll>
 <NHeader title={AR?'مراجعة النتيجة':'Review Result'} onBack={onBack} />
 <NCard style={{marginBottom:SP.xl}}>
 <View style={{flexDirection:AR?'row-reverse':'row',gap:SP.md,alignItems:'center',marginBottom:SP.lg}}>
 <NAvatar name={sample?.patient_name || (AR ? 'مريض نبض' : 'Nabdah Patient')} size={48} />
 <View><Text style={{fontSize:FS.lg,fontWeight:FW.bold,color:theme.text}}>{sample?.patient_name || (AR ? 'مريض نبض' : 'Nabdah Patient')}</Text><Text style={{fontSize:FS.xs,color:theme.textSub}}>{sample?.barcode??'—'}</Text></View>
 </View>
 <NCard style={{ marginBottom: SP.lg }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>{AR ? 'إضافة نتيجة مخبرية' : 'Add laboratory result'}</Text>
 <NInput label={AR ? 'اسم الفحص' : 'Analyte'} value={analyte} onChange={setAnalyte} required />
 <NInput label={AR ? 'النتيجة' : 'Result'} value={value} onChange={setValue} required />
 <NInput label={AR ? 'الوحدة' : 'Unit'} value={unit} onChange={setUnit} />
 <NInput label={AR ? 'المدى المرجعي' : 'Reference range'} value={range} onChange={setRange} />
 <NToggle label={AR ? 'نتيجة حرجة' : 'Critical result'} value={isCritical} onChange={setIsCritical} />
 <NBtn label={AR ? 'إضافة النتيجة' : 'Add result'} variant="outline" onPress={addResultRow} style={{ marginTop: SP.sm }} />
 </NCard>
 {/* Table header */}
 <View style={{flexDirection:'row',backgroundColor:'#9C27B010',borderRadius:R.sm,padding:SP.sm,marginBottom:SP.sm}}>
 <Text style={{flex:3,fontSize:FS.xs,fontWeight:FW.bold,color:'#9C27B0'}}>{AR?'الفحص':'Test'}</Text>
 <Text style={{flex:2,fontSize:FS.xs,fontWeight:FW.bold,color:'#9C27B0'}}>{AR?'النتيجة':'Result'}</Text>
 <Text style={{flex:2,fontSize:FS.xs,fontWeight:FW.bold,color:'#9C27B0'}}>{AR?'الطبيعي':'Ref'}</Text>
 <View style={{flex:1,alignItems:'center'}}><I name="alert" size={12} color="#9C27B0" /></View>
 </View>
 {resultRows.length === 0 ? <NEmpty title={AR ? 'لا توجد نتائج مدخلة' : 'No results entered'} sub={AR ? 'أضف نتائج العينة أعلاه قبل إصدار التقرير.' : 'Add sample results above before issuing the report.'} icon="flask" /> : resultRows.map((r,i)=>(
 <View key={`${r.analyte}-${i}`} style={{flexDirection:'row',paddingVertical:SP.sm,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:theme.border,alignItems:'center'}}>
 <Text style={{flex:3,fontSize:FS.sm,color:theme.text}}>{r.analyte}</Text>
 <Text style={{flex:2,fontSize:FS.sm,fontWeight:FW.bold,color:r.isCritical?'#F44336':theme.text}}>{r.value}{r.unit ? ` ${r.unit}` : ''}</Text>
 <Text style={{flex:2,fontSize:FS.xs,color:theme.textSub}}>{r.range}</Text>
 <View style={{flex:1,alignItems:'center'}}><View style={{width:8,height:8,borderRadius:4,backgroundColor:r.isCritical?'#F44336':'#4CAF50'}} /></View>
 </View>
 ))}
 </NCard>
 {/* Send to */}
 <NCard style={{marginBottom:SP.xl}}>
 <Text style={{fontSize:FS.md,fontWeight:FW.bold,color:theme.text,marginBottom:SP.md,textAlign:AR?'right':'left'}}>{AR?'إرسال إلى':'Send to'}</Text>
 {([{v:'patient' as const,ar:'المريض فقط',en:'Patient Only'},{v:'both' as const,ar:'المريض + الطبيب',en:'Patient + Doctor'}]).map(opt=>(
 <TouchableOpacity key={opt.v} onPress={()=>setSendTo(opt.v)}
 style={{flexDirection:AR?'row-reverse':'row',alignItems:'center',gap:SP.md,paddingVertical:SP.md,paddingHorizontal:SP.lg,borderRadius:R.lg,borderWidth:1.5,
 backgroundColor:sendTo===opt.v?'#9C27B010':theme.surface2,borderColor:sendTo===opt.v?'#9C27B0':theme.border,marginBottom:SP.sm}}>
 <View style={{width:20,height:20,borderRadius:10,borderWidth:2,borderColor:sendTo===opt.v?'#9C27B0':theme.border,alignItems:'center',justifyContent:'center'}}>
 {sendTo===opt.v && <View style={{width:10,height:10,borderRadius:5,backgroundColor:'#9C27B0'}} />}
 </View>
 <Text style={{fontSize:FS.md,color:sendTo===opt.v?'#9C27B0':theme.text,fontWeight:sendTo===opt.v?FW.bold:FW.reg}}>{AR?opt.ar:opt.en}</Text>
 </TouchableOpacity>
 ))}
 </NCard>
 <NBtn label={AR?'تأكيد وإرسال النتيجة':'Confirm & Send Result'} loading={loading} onPress={handleConfirmSend} />
 </NScroll>
 );
}


// ══════════════════════════════════════════════════════════════════
// BUNDLE MANAGEMENT
// ══════════════════════════════════════════════════════════════════
function BundleMgmt({ onBack }:{ onBack:()=>void }) {
 const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang==='ar';
 const [bundlesList, setBundlesList] = useState<any[]>([]);
 useEffect(() => { client.get('/labs/packages').then(r => setBundlesList(r.data || [])).catch(() => {}); }, []);
 return (
 <NScroll>
 <NHeader title={AR?'إدارة الحزم المخفّضة':'Bundle Management'} onBack={onBack} />
 <View style={{flexDirection:'row',gap:SP.md,marginBottom:SP.xl}}>
 <NStatCard icon="◈" label={AR?'إجمالي':'Total'} value={String(bundlesList.length)} color="#9C27B0" style={{flex:1}} />
 <NStatCard icon="" label={AR?'نشطة':'Active'} value={String(bundlesList.filter(b=>b.active).length)} color="#4CAF50" style={{flex:1}} />
 </View>
 {bundlesList.map(b=>(
 <NCard key={b.id} style={{marginBottom:SP.md}} accent={b.active?'#9C27B0':undefined}>
 <View style={{flexDirection:AR?'row-reverse':'row',justifyContent:'space-between',marginBottom:SP.md}}>
 <Text style={{fontSize:FS.md,fontWeight:FW.bold,color:theme.text}}>{AR?b.nameAr:b.nameEn}</Text>
 <Switch value={b.active} onValueChange={()=>show(AR?'تم التحديث':'Updated','success')} trackColor={{false:theme.border,true:'#9C27B0'}} thumbColor="#FFF" />
 </View>
 <View style={{flexDirection:'row',flexWrap:'wrap',gap:SP.xs,marginBottom:SP.md}}>
 {b.tests.map(tid=>{const t=LAB_TESTS.find(x=>x.id===tid);return <View key={tid} style={{backgroundColor:theme.surface2,paddingHorizontal:SP.sm,paddingVertical:2,borderRadius:R.full,borderWidth:1,borderColor:theme.border}}><Text style={{fontSize:FS.xs,color:theme.text}}>{t?(AR?t.ar:t.en):tid}</Text></View>;})}
 </View>
 <View style={{flexDirection:AR?'row-reverse':'row',justifyContent:'space-between',alignItems:'center'}}>
 <View style={{flexDirection:'row',alignItems:'baseline',gap:SP.sm}}>
 <Text style={{fontSize:FS.xl,fontWeight:FW.xbold,color:'#9C27B0'}}>{b.price}</Text>
 <Text style={{fontSize:FS.sm,color:theme.textSub,textDecorationLine:'line-through'}}>{b.orig}</Text>
 <Text style={{fontSize:FS.sm,color:theme.textSub}}>{AR?'ريال':'SAR'}</Text>
 </View>
 <NBadge label={`${Math.round((1-b.price/b.orig)*100)}% ${AR?'خصم':'off'}`} variant="success" size="sm" />
 </View>
 </NCard>
 ))}
 <NBtn label={AR?'+ إنشاء حزمة جديدة':'+ Create Bundle'} variant="outline" onPress={()=>show(AR?'إنشاء حزمة':'Create bundle','info')} />
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════
// ADD CUSTOM TEST → Admin Approval
// ══════════════════════════════════════════════════════════════════
function AddCustomTest({ onBack }:{ onBack:()=>void }) {
 const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang==='ar';
 const [nameAr,setNameAr]=useState(''); const [nameEn,setNameEn]=useState(''); const [price,setPrice]=useState('');
 const [hours,setHours]=useState(''); const [fasting,setFasting]=useState(false); const [refLow,setRefLow]=useState('');
 const [refHigh,setRefHigh]=useState(''); const [unit,setUnit]=useState(''); const [loading,setLoading]=useState(false);

 return (
 <NScroll>
 <NHeader title={AR?'إضافة فحص مخصص':'Add Custom Test'} onBack={onBack} />
 <NCard style={{backgroundColor:theme.warnBg,marginBottom:SP.xl}}>
 <Text style={{fontSize:FS.sm,color:theme.warn,lineHeight:20,textAlign:AR?'right':'left'}}>
 {AR?'الفحوصات المخصصة تنتظر موافقة إدارة نبضة بلس قبل ظهورها للمرضى (24 ساعة).'
 :'Custom tests await Nabdah admin approval before visible to patients (24h).'}
 </Text>
 </NCard>
 <NInput label={AR?'اسم الفحص بالعربي':'Name (Arabic)'} placeholder={AR?'فحص الفيريتين المتقدم':'Advanced Ferritin'} value={nameAr} onChange={setNameAr} required />
 <NInput label={AR?'اسم الفحص بالإنجليزي':'Name (English)'} placeholder="Advanced Ferritin" value={nameEn} onChange={setNameEn} required />
 <View style={{flexDirection:AR?'row-reverse':'row',gap:SP.md}}>
 <View style={{flex:1}}><NPriceInput label={AR?'السعر':'Price'} value={price} onChange={setPrice} required /></View>
 <View style={{flex:1}}><NInput label={AR?'وقت النتيجة (ساعة)':'Turnaround (h)'} placeholder="2" value={hours} onChange={v=>setHours(v.replace(/\D/g,''))} kbType="numeric" maxLen={3} /></View>
 </View>
 <View style={{flexDirection:AR?'row-reverse':'row',gap:SP.md}}>
 <View style={{flex:1}}><NInput label={AR?'الحد الأدنى':'Ref Low'} placeholder="0" value={refLow} onChange={setRefLow} kbType="decimal-pad" /></View>
 <View style={{flex:1}}><NInput label={AR?'الحد الأعلى':'Ref High'} placeholder="100" value={refHigh} onChange={setRefHigh} kbType="decimal-pad" /></View>
 <View style={{flex:1}}><NInput label={AR?'الوحدة':'Unit'} placeholder="mg/dL" value={unit} onChange={setUnit} /></View>
 </View>
 <NCard style={{marginBottom:SP.xl}}><NToggle label={AR?'يتطلب صيام':'Requires Fasting'} value={fasting} onChange={setFasting} /></NCard>
 <NBtn label={AR?'إرسال للمراجعة والموافقة':'Submit for Review'} disabled={!nameAr.trim()||!price} loading={loading}
 onPress={async()=>{
  setLoading(true);
  try {
    await client.post('/approval-workflow/requests', {
      entity_type: 'lab_test',
      change_data: { nameAr, nameEn, price, hours, refLow, refHigh, unit, fasting }
    });
    show(AR?'تم الإرسال للمراجعة':'Submitted for review','success');
    onBack();
  } catch(e) {
    show(AR?'فشل الإرسال':'Failed to submit','error');
  }
  setLoading(false);
 }} />
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════
// HOME COLLECTION — Dispatch Phlebotomists
// ══════════════════════════════════════════════════════════════════
function HomeCollection({ order, onBack }:{ order:any; onBack:()=>void }) {
 const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang==='ar';
 const COLLECTORS = [
 {id:'c1',name:'خالد المالكي',status:'available',orders:3,loc:'حي النرجس'},
 {id:'c2',name:'سعد الغامدي',status:'busy',orders:5,loc:'حي الورود'},
 {id:'c3',name:'ريم القحطاني',status:'available',orders:2,loc:'حي الروضة'},
 ];
  const [tracking, setTracking] = useState(false);
  const [eta, setEta] = useState(15);
  const [distance, setDistance] = useState(4.2);

  useEffect(() => {
    let int: any;
    if (tracking) {
      int = setInterval(async () => {
        setEta(prev => Math.max(0, prev - 1));
        setDistance(prev => Math.max(0, parseFloat((prev - 0.2).toFixed(1))));
        try {
          await client.post(`/labs/bookings/${order.id}/gps`, { eta, distance });
        } catch (e) {
          // Silent fail for backend sync
        }
      }, 5000);
    }
    return () => clearInterval(int);
  }, [tracking, eta, distance, order.id]);

  if (order?.status === 'ASSIGNED' || tracking) {
    return (
      <NScroll>
        <NHeader title={AR ? 'تتبع مسار الفني' : 'Track Technician'} onBack={onBack} />
        
        {/* Map View */}
        <View style={{ height: 250, backgroundColor: '#E3F2FD', borderRadius: R.xl, marginBottom: SP.lg, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderColor: theme.border, borderWidth: 1 }}>
          <Text style={{ fontSize: FS.xl, color:'#1976D2', fontWeight: FW.bold }}> GPS TRACKING ACTIVE</Text>
          <Text style={{ fontSize: FS.md, color: '#1565C0', marginTop: SP.md }}>{AR ? 'الرجاء الانتظار، يتم إرسال الموقع...' : 'Sending location...'}</Text>
        </View>

        <NCard style={{ marginBottom: SP.md }}>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ alignItems: AR ? 'flex-start' : 'flex-end' }}>
              <Text style={{ fontSize: FS.sm, color: theme.textSub }}>{AR ? 'الوقت المتبقي' : 'ETA'}</Text>
              <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.primary }}>{eta} {AR ? 'دقيقة' : 'min'}</Text>
            </View>
            <View style={{ alignItems: AR ? 'flex-start' : 'flex-end' }}>
              <Text style={{ fontSize: FS.sm, color: theme.textSub }}>{AR ? 'المسافة' : 'Distance'}</Text>
              <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.primary }}>{distance} {AR ? 'كم' : 'km'}</Text>
            </View>
          </View>
        </NCard>

        {distance === 0 ? (
          <NBtn label={AR ? 'الفني وصل (تم الوصول)' : 'Technician Arrived'} variant="primary" onPress={async () => {
            try {
              await client.patch(`/labs/bookings/${order?.id}/state`, { state: 'IN_LAB', note: 'ARRIVED at location' });
              show(AR ? 'تم الوصول بنجاح' : 'Arrived successfully', 'success');
              onBack();
            } catch (err: any) {
              show(err.message, 'error');
            }
          }} />
        ) : (
          <NBtn label={AR ? 'بدء رحلة الفني' : 'Start Trip'} onPress={async () => {
            try {
              await client.patch(`/labs/bookings/${order?.id}/state`, { state: 'IN_TRANSIT' });
              setTracking(true);
            } catch (err: any) {
              show(err.message, 'error');
            }
          }} disabled={tracking} />
        )}

        <View style={{ marginTop: SP.xl, gap: SP.md }}>
          <NSecHeader title={AR ? 'إدارة الطوارئ' : 'Emergency Management'} />
          <NBtn label={AR ? 'المريض لم يحضر' : 'Patient Absent'} variant="outline" onPress={async () => {
            await client.post(`/labs/bookings/${order?.id}/emergency`, { reason: 'PATIENT_ABSENT' });
            show(AR ? 'تم تسجيل الحالة' : 'Status logged', 'info');
            onBack();
          }} />
          <NBtn label={AR ? 'موقع خاطئ' : 'Wrong Location'} variant="outline" onPress={async () => {
            await client.post(`/labs/bookings/${order?.id}/emergency`, { reason: 'WRONG_LOCATION' });
            show(AR ? 'تم تسجيل الحالة' : 'Status logged', 'info');
            onBack();
          }} />
          <NBtn label={AR ? 'إلغاء وتعيين فني آخر' : 'Cancel & Reassign'} variant="danger" onPress={async () => {
            await client.post(`/labs/bookings/${order?.id}/reassign`);
            setTracking(false);
            show(AR ? 'تم الإلغاء وجاري التعيين' : 'Cancelled & Reassigning', 'success');
          }} />
        </View>

      </NScroll>
    );
  }

  return (
    <NScroll>
      <NHeader title={AR ? 'خدمة السحب المنزلي (تعيين فني)' : 'Home Collection (Assign)'} onBack={onBack} />
      <NSecHeader title={AR ? 'مندوبو السحب المتاحين' : 'Available Phlebotomists'} />
      {COLLECTORS.map(col=>(
        <NCard key={col.id} style={{marginBottom:SP.sm}}>
          <View style={{flexDirection:AR?'row-reverse':'row',alignItems:'center',gap:SP.md}}>
            <NAvatar name={col.name} size={44} online={col.status==='available'} />
            <View style={{flex:1}}>
              <Text style={{fontSize:FS.md,fontWeight:FW.bold,color:theme.text,textAlign:AR?'right':'left'}}>{col.name}</Text>
              <Text style={{fontSize:FS.xs,color:theme.textSub}}>{col.loc} | {col.orders} {AR?'طلب':'orders'}</Text>
            </View>
            <View style={{alignItems:'flex-end',gap:SP.xs}}>
              <NBadge label={col.status==='available'?(AR?'متاح':'Available'):(AR?'مشغول':'Busy')} variant={col.status==='available'?'success':'warning'} size="xs" />
              {col.status==='available' && (
                <NBtn label={AR?'تعيين كفني':'Assign Tech'} size="xs" full={false} style={{paddingHorizontal:SP.md}} onPress={async () => {
                  if (!order?.id) { show(AR ? 'لا يوجد طلب محدد للتعيين' : 'No order selected to assign', 'error'); return; }
                  try {
                    await client.post(`/labs/bookings/${order.id}/assign-technician`, { technician_id: col.id });
                    show(AR ? `تم تعيين ${col.name}` : `${col.name} assigned`, 'success');
                    onBack();
                  } catch(err: any) {
                    show(err.message || 'Error', 'error');
                  }
                }} />
              )}
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
 const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang==='ar';
 return (
 <NScroll>
 <NHeader title={AR?'ملصق QR للعينة':'QR Sample Label'} onBack={onBack} />
 <NCard style={{alignItems:'center',padding:SP.xxl,marginBottom:SP.xl}}>
 <View style={{width:160,height:160,borderRadius:R.xl,borderWidth:3,borderColor:'#9C27B0',alignItems:'center',justifyContent:'center'}}>
 <I name="qr" size={60} color="#9C27B0" />
 </View>
 <Text style={{fontSize:FS.lg,fontWeight:FW.bold,color:theme.text,marginTop:SP.xl}}>{sample?.barcode??'SMP-2025-XXX'}</Text>
 <Text style={{fontSize:FS.sm,color:theme.textSub,marginTop:SP.xs}}>{sample?.patient??'—'}</Text>
 <View style={{flexDirection:'row',flexWrap:'wrap',gap:SP.xs,justifyContent:'center',marginTop:SP.md}}>
 {(sample?.tests??['cbc']).map((tid:string)=>{const t=LAB_TESTS.find(x=>x.id===tid);return <View key={tid} style={{backgroundColor:'#9C27B010',paddingHorizontal:SP.sm,paddingVertical:2,borderRadius:R.full,borderWidth:1,borderColor:'#9C27B030'}}><Text style={{fontSize:FS.xs,color:'#9C27B0'}}>{t?(AR?t.ar:t.en):tid}</Text></View>;})}
 </View>
 </NCard>
 <View style={{gap:SP.md}}>
 <NBtn label={AR?'طباعة الملصق':'Print Label'} onPress={()=>show(AR?'جاري الطباعة...':'Printing...','info')} />
 <NBtn label={AR?'حفظ كصورة':'Save as Image'} variant="outline" onPress={()=>show(AR?'تم الحفظ':'Saved','success')} />
 </View>
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════
// TURNAROUND TIME TRACKER
// ══════════════════════════════════════════════════════════════════
function TATTracker({ onBack }:{ onBack:()=>void }) {
 const { theme } = useTheme(); const { lang } = useLang(); const AR = lang==='ar';
 const DATA = [
 {test:'CBC',promised:0.5,actual:0.4,st:'ok'},{test:'Lipid Profile',promised:2,actual:1.8,st:'ok'},
 {test:'HbA1c',promised:1,actual:1.2,st:'late'},{test:'Vitamin D',promised:2,actual:2.5,st:'late'},
 {test:'Liver Function',promised:2,actual:1.5,st:'ok'},{test:'TSH',promised:2,actual:1.9,st:'ok'},
 {test:'Culture',promised:48,actual:50,st:'late'},
 ];
 const onTime=DATA.filter(d=>d.st==='ok').length; const delayed=DATA.filter(d=>d.st==='late').length;
 const pct=Math.round((onTime/DATA.length)*100);

 return (
 <NScroll>
 <NHeader title={AR?'مراقبة وقت النتائج TAT':'Turnaround Tracker'} onBack={onBack} />
 <View style={{flexDirection:'row',gap:SP.md,marginBottom:SP.xl}}>
 <NStatCard icon="" label={AR?'في الوقت':'On Time'} value={String(onTime)} color="#4CAF50" style={{flex:1}} />
 <NStatCard icon="!" label={AR?'متأخر':'Delayed'} value={String(delayed)} color="#F44336" style={{flex:1}} />
 <NStatCard icon="◔" label={AR?'الالتزام':'Compliance'} value={`${pct}%`} color="#9C27B0" style={{flex:1}} />
 </View>
 <NCard style={{marginBottom:SP.xl}}>
 <View style={{flexDirection:'row',backgroundColor:'#9C27B010',borderRadius:R.sm,padding:SP.sm,marginBottom:SP.sm}}>
 <Text style={{flex:3,fontSize:FS.xs,fontWeight:FW.bold,color:'#9C27B0'}}>{AR?'الفحص':'Test'}</Text>
 <Text style={{flex:2,fontSize:FS.xs,fontWeight:FW.bold,color:'#9C27B0'}}>{AR?'المحدد':'Target'}</Text>
 <Text style={{flex:2,fontSize:FS.xs,fontWeight:FW.bold,color:'#9C27B0'}}>{AR?'الفعلي':'Actual'}</Text>
 <View style={{flex:1,alignItems:'center'}}><I name="alert" size={12} color="#9C27B0" /></View>
 </View>
 {DATA.map((r,i)=>(
 <View key={i} style={{flexDirection:'row',paddingVertical:SP.sm,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:theme.border,alignItems:'center'}}>
 <Text style={{flex:3,fontSize:FS.sm,color:theme.text}}>{r.test}</Text>
 <Text style={{flex:2,fontSize:FS.sm,color:theme.textSub}}>{r.promised}h</Text>
 <Text style={{flex:2,fontSize:FS.sm,fontWeight:FW.bold,color:r.st==='ok'?'#4CAF50':'#F44336'}}>{r.actual}h</Text>
 <View style={{flex:1,alignItems:'center'}}><View style={{width:8,height:8,borderRadius:4,backgroundColor:r.st==='ok'?'#4CAF50':'#F44336'}} /></View>
 </View>
 ))}
 </NCard>
 <NCard style={{backgroundColor:pct>=80?theme.successBg:theme.warnBg}}>
 <Text style={{fontSize:FS.sm,color:pct>=80?theme.success:theme.warn,textAlign:AR?'right':'left',lineHeight:20}}>
 {pct>=80?(AR?'أداء ممتاز! نسبة الالتزام أعلى من 80%.':'Excellent! TAT compliance above 80%.')
 :(AR?'تحذير: نسبة التأخير مرتفعة — راجع سير العمل.':'Warning: High delay rate — review workflow.')}
 </Text>
 </NCard>
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════
// LAB INSURANCE CLAIMS
// ══════════════════════════════════════════════════════════════════
function LabInsurance({ onBack }:{ onBack:()=>void }) {
 const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang==='ar';
 const [orders, setOrders] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [selectedOrder, setSelectedOrder] = useState<any>(null);

 const fetchOrders = async () => {
 try {
 setLoading(true);
 const res = await client.get('/labs/provider/inbox');
 // filter insurance orders
 setOrders(res.data.filter((o:any) => o.payment_method === 'insurance'));
 } catch (e) {
 show(AR ? 'خطأ في جلب الطلبات' : 'Error fetching orders', 'error');
 } finally {
 setLoading(false);
 }
 };
 
 useEffect(() => { fetchOrders(); }, []);

 const handleUpdateInsurance = async (status: string) => {
 try {
 await client.patch(`/labs/bookings/${selectedOrder.id}/insurance`, {
 status,
 totalCopay: selectedOrder.insurance_copay || 0,
 items: selectedOrder.items
 });
 show(AR ? 'تم التحديث بنجاح' : 'Updated successfully', 'success');
 setSelectedOrder(null);
 fetchOrders();
 } catch(e) {
 show(AR ? 'خطأ في التحديث' : 'Error updating', 'error');
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
 <NHeader title={AR ? 'معالجة التأمين' : 'Process Insurance'} onBack={() => setSelectedOrder(null)} />
 <NCard style={{marginBottom: SP.xl}}>
 <Text style={{fontSize: FS.lg, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left'}}>
 {selectedOrder.patient_name} - {selectedOrder.insurance_provider}
 </Text>
 <Text style={{fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left', marginTop: SP.xs}}>
 {AR ? 'المبلغ الإجمالي' : 'Total Amount'}: {selectedOrder.total} {AR ? 'ر' : 'SAR'}
 </Text>
 </NCard>
 
 <NSecHeader title={AR ? 'نسبة التحمل / الدفع المشترك' : 'Co-Pay Amount'} />
 <NCard style={{marginBottom: SP.xl}}>
 <NPriceInput label={AR ? 'مبلغ التحمل (ريال)' : 'Co-Pay (SAR)'} value={String(selectedOrder.insurance_copay || '')} onChange={setTotalCopay} />
 </NCard>

 <NSecHeader title={AR ? 'الفحوصات المطلوبة' : 'Requested Tests'} />
 {selectedOrder.items.map((item:any, idx:number) => (
 <NCard key={item.service_id} style={{marginBottom: SP.sm}}>
 <View style={{flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center'}}>
 <Text style={{fontSize: FS.md, fontWeight: FW.semi, color: theme.text}}>{AR ? item.name_ar : item.name_en}</Text>
 <NToggle label={AR ? 'مغطى؟' : 'Covered?'} value={item.isCovered ?? true} onChange={(v) => toggleItemCovered(idx, v)} />
 </View>
 {!(item.isCovered ?? true) && (
 <View style={{marginTop: SP.md}}>
 <NInput label={AR ? 'سبب الرفض' : 'Rejection Reason'} value={item.rejectReason || ''} onChange={(v) => setItemRejectReason(idx, v)} />
 <NPriceInput label={AR ? 'سعر الكاش البديل' : 'Alternative Cash Price'} value={String(item.cashPrice || '')} onChange={(v) => setItemCashPrice(idx, v)} />
 </View>
 )}
 </NCard>
 ))}

 <View style={{flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginTop: SP.xl, marginBottom: SP.xxl}}>
 <NBtn label={AR ? 'رفض' : 'Reject'} variant="danger" onPress={() => handleUpdateInsurance('rejected')} style={{flex: 1}} />
 <NBtn label={AR ? 'اعتماد' : 'Approve'} onPress={() => handleUpdateInsurance('partial_approval')} style={{flex: 1}} />
 </View>
 </NScroll>
 );
 }

 return (
 <NScroll>
 <NHeader title={AR?'مطالبات التأمين':'Insurance Claims'} onBack={onBack} />
 {loading ? <Text style={{textAlign: 'center', color: theme.textSub, marginTop: 50}}>{AR ? 'جاري التحميل...' : 'Loading...'}</Text> : (
 <>
 <View style={{flexDirection:'row',gap:SP.md,marginBottom:SP.xl}}>
 <NStatCard icon="◔" label={AR?'انتظار':'Pending'} value={String(orders.filter(c=>c.insurance_status==='pending').length)} color="#FF9800" style={{flex:1}} />
 <NStatCard icon="" label={AR?'معالجة':'Processed'} value={String(orders.filter(c=>c.insurance_status!=='pending'&&c.insurance_status!=='none').length)} color="#4CAF50" style={{flex:1}} />
 </View>
 {orders.map(cl=>(
 <TouchableOpacity key={cl.id} onPress={() => setSelectedOrder(cl)}>
 <NCard style={{marginBottom:SP.md}} accent={cl.insurance_status==='approved'||cl.insurance_status==='partial_approval'?'#4CAF50':cl.insurance_status==='rejected'?'#F44336':'#FF9800'}>
 <View style={{flexDirection:AR?'row-reverse':'row',justifyContent:'space-between',marginBottom:SP.sm}}>
 <Text style={{fontSize:FS.md,fontWeight:FW.bold,color:theme.text}}>{cl.patient_name}</Text>
 <NBadge label={cl.insurance_status==='approved'||cl.insurance_status==='partial_approval'?(AR?'مقبولة':'Approved'):cl.insurance_status==='rejected'?(AR?'مرفوضة':'Rejected'):(AR?'انتظار':'Pending')} variant={cl.insurance_status==='approved'||cl.insurance_status==='partial_approval'?'success':cl.insurance_status==='rejected'?'danger':'warning'} size="xs" />
 </View>
 <Text style={{fontSize:FS.sm,color:theme.textSub}}>{cl.insurance_provider} | {cl.items?.length} {AR?'فحص':'tests'} | {cl.total} {AR?'ر':'SAR'}</Text>
 </NCard>
 </TouchableOpacity>
 ))}
 {orders.length === 0 && (
 <Text style={{textAlign: 'center', color: theme.textSub, marginTop: 50}}>
 {AR ? 'لا توجد مطالبات تأمين' : 'No insurance claims'}
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
 const { theme, toggle:toggleT, mode } = useTheme(); const { lang, toggle:toggleL } = useLang();
 const { show } = useToast(); const AR = lang==='ar'; const [showLO, setShowLO] = useState(false);
 return (
 <View style={{flex:1,backgroundColor:theme.bg}}>
 <View style={[s.topBar,{backgroundColor:theme.surface,borderBottomColor:theme.border, paddingTop: Math.max(insets.top, 16) }]}>
 <Text style={{fontSize:FS.xl,fontWeight:FW.bold,color:theme.text}}>{AR?'الإعدادات':'Settings'}</Text>
 </View>
 <ScrollView contentContainerStyle={{padding:SP.xl,paddingBottom:100}}>
 <NCard style={{marginBottom:SP.xl,flexDirection:AR?'row-reverse':'row',gap:SP.lg,alignItems:'center'}}>
 <IBg name="lab" size={22} color="#9C27B0" bg="#9C27B012" />
 <View style={{flex:1}}>
 <Text style={{fontSize:FS.xl,fontWeight:FW.bold,color:theme.text,textAlign:AR?'right':'left'}}>{AR?'معمل نبضة الطبي':'Nabdah Medical Lab'}</Text>
 <NBadge label={AR?'نشط':'Active'} variant="success" size="xs" style={{marginTop:SP.xs}} />
 </View>
 </NCard>
 <NSecHeader title={AR?'إدارة المختبر':'Lab Management'} />
 <NCard style={{marginBottom:SP.xl}}>
 <NSettingsRow icon="document" label={AR?'قائمة التحاليل والأسعار':'Test Menu & Pricing'} onPress={()=>onNavigate('test_menu')} />
 <NSettingsRow icon="scan" label={AR?'إدارة الحزم':'Bundles'} onPress={()=>onNavigate('bundles')} />
 <NSettingsRow icon="home" label={AR?'إعدادات الخدمة المنزلية':'Home Service'} onPress={()=>onNavigate('home_service')} />
 <NSettingsRow icon="calendar" label={AR?'مواعيد العمل':'Working Hours'} onPress={()=>onNavigate('working_hours')} />
 <NSettingsRow icon="shield" label={AR?'إعدادات التأمين':'Insurance Settings'} onPress={()=>onNavigate('insurance_config')} />
<NSettingsRow icon="shield" label={AR?'طلبات التأمين الواردة':'Insurance Requests'} onPress={()=>onNavigate('insurance_requests')} />
 <NSettingsRow icon="document" label={AR?'الرخص والمستندات الرسمية':'Licenses & Documents'} onPress={()=>onNavigate('certificates_config')} />
 <NSettingsRow icon="camera" label={AR?'الصور والوسائط':'Photos & Media'} onPress={()=>onNavigate('media_config')} />
 </NCard>

 {/* Marketing & Reputation */}
 <NSecHeader title={AR ? 'التسويق والمبيعات وتكنولوجيا المختبر' : 'Marketing, Sales & Lab Modules'} />
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
 <NSecHeader title={AR?'إعدادات إضافية':'Additional Settings'} />
 <NCard style={{marginBottom:SP.xl}}>
 <NSettingsRow icon="briefcase" label={AR?'الوظائف الطبية':'Medical Jobs'} onPress={() => onNavigate('medical_jobs')} />
 <NSettingsRow icon="bookOpen" label={AR?'دليل الأدوية الطبي':'Medical Drug Index'} onPress={() => onNavigate('drug_index')} />
 </NCard>
 <NSecHeader title={AR?'الأمان':'Security'} />
 <NCard style={{marginBottom:SP.xl}}>
 {[
 { icon: 'lock', ar:'تغيير كلمة المرور', en:'Change Password', action: () => onNavigate('password') },
 { icon: 'shield', ar:'التحقق الثنائي', en:'Two-Factor Auth', action: () => onNavigate('2fa') },
 { icon: 'scan', ar:'الأجهزة', en:'Devices', action: () => onNavigate('devices') }
 ].map((r,i)=>(
 <NSettingsRow key={i} icon={r.icon} label={AR?r.ar:r.en} onPress={r.action} />
 ))}
 </NCard>
 <NCard><NSettingsRow icon="lock" label={AR?'تسجيل الخروج':'Log Out'} onPress={()=>setShowLO(true)} danger /></NCard>
 </ScrollView>
 <NConfirm visible={showLO} title={AR?'تسجيل الخروج':'Log Out'} msg={AR?'هل تريد الخروج؟':'Log out?'}
 onOk={()=>{setShowLO(false);onLogout();}} onCancel={()=>setShowLO(false)} okLabel={AR?'خروج':'Log Out'} />
 </View>
 );
}

// ══════════════════════════════════════════════════════════════════
// RESULTS LIST (tab view)
// ══════════════════════════════════════════════════════════════════
function ResultsList({ onNav }:{ onNav:(s:string,p?:any)=>void }) {
 const insets = useSafeAreaInsets();
 const { theme } = useTheme(); const { lang } = useLang(); const AR = lang==='ar';
 return (
 <View style={{flex:1,backgroundColor:theme.bg}}>
 <View style={[s.topBar,{backgroundColor:theme.surface,borderBottomColor:theme.border, paddingTop: Math.max(insets.top, 16) }]}>
 <Text style={{fontSize:FS.xl,fontWeight:FW.bold,color:theme.text}}>{AR?'النتائج':'Results'}</Text>
 </View>
 <FlatList data={[]} keyExtractor={(i: any) => i.id} contentContainerStyle={{padding:SP.lg,paddingBottom:100}}
 renderItem={({item})=>{
 const sc=STAGES.find(st=>st.key===item.stage);
 return (
 <NCard style={{marginBottom:SP.md}} accent={sc?.color}
 onPress={()=>{if(item.stage==='analyzing'||item.stage==='result_ready')onNav('result_review',item);}}>
 <View style={{flexDirection:AR?'row-reverse':'row',alignItems:'center',gap:SP.md}}>
 <NAvatar name={item.patient} size={42} />
 <View style={{flex:1}}>
 <Text style={{fontSize:FS.md,fontWeight:FW.bold,color:theme.text,textAlign:AR?'right':'left'}}>{item.patient}</Text>
 <Text style={{fontSize:FS.xs,color:theme.textSub}}>{item.barcode} | {item.tests.length} {AR?'فحص':'tests'}</Text>
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
 navBadge:{position:'absolute',top:-2,right:-2,backgroundColor:'#F44336',width:16,height:16,borderRadius:8,alignItems:'center',justifyContent:'center'},
 navBadgeText:{color:'#FFF',fontSize:9,fontWeight:'700'},
 navLabel:{fontSize:10},
});


// ══════════════════════════════════════════════════════════════════
// LAB TEST MENU (Settings & Pricing)
// ══════════════════════════════════════════════════════════════════
function LabTestMenuScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<any[]>([]);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [newTitleAr, setNewTitleAr] = useState('');
  const [newTitleEn, setNewTitleEn] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newHomeFee, setNewHomeFee] = useState('');

  const [editingService, setEditingService] = useState<any | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editHomeFee, setEditHomeFee] = useState('');

  useEffect(() => { fetchServices(); }, []);

  const fetchServices = async () => {
    try {
      const res = await client.get('/provider/capabilities/lab-services');
      setServices(res.data || []);
    } catch (e) {
      show(AR ? 'فشل تحميل التحاليل' : 'Failed to load tests', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingService) return;
    try {
      await client.post('/approval-workflow/requests', {
        entity_type: 'service',
        entity_id: editingService.id,
        change_data: {
          price: parseFloat(editPrice) || 0,
          home_drawing_fee: parseFloat(editHomeFee) || 0
        }
      });
      show(AR ? 'تم إرسال التعديلات للمراجعة' : 'Changes sent for review', 'success');
      setEditingService(null);
    } catch (e) {
      show(AR ? 'فشل إرسال التعديلات' : 'Failed to send changes', 'error');
    }
  };

  const handleAddService = async () => {
    if (!newPrice || !newTitleEn) {
      show(AR ? 'يرجى إدخال البيانات المطلوبة' : 'Please fill required fields', 'error');
      return;
    }
    try {
      await client.post('/approval-workflow/requests', {
        entity_type: 'service',
        change_data: {
          type: 'lab',
          name_ar: newTitleAr,
          name_en: newTitleEn,
          price: parseFloat(newPrice) || 0,
          home_drawing_fee: parseFloat(newHomeFee) || 0,
          available: true
        }
      });
      show(AR ? 'تم إرسال طلب الإضافة للمراجعة' : 'Add request sent for review', 'success');
      setShowAddSheet(false);
      setNewTitleAr(''); setNewTitleEn(''); setNewPrice(''); setNewHomeFee('');
    } catch (e) {
      show(AR ? 'فشل إرسال طلب الإضافة' : 'Failed to send add request', 'error');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'التحاليل والأسعار' : 'Test Menu & Pricing'} onBack={onBack} />
      {loading ? <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: SP.xxl }} /> : (
        <ScrollView contentContainerStyle={{ padding: SP.xl, paddingBottom: 100 }}>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.xl }}>
            <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.textSub }}>
              {AR ? 'التحاليل المتاحة' : 'Available Tests'}
            </Text>
            <NBtn label={AR ? '+ إضافة تحليل' : '+ Add Test'} size="sm" onPress={() => setShowAddSheet(true)} full={false} />
          </View>
          
          {services.map(srv => (
            <NCard key={srv.id} style={{ marginBottom: SP.md }}>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
                    {AR ? (srv.name_ar || srv.name_en) : srv.name_en}
                  </Text>
                  <Text style={{ fontSize: FS.sm, color: theme.primary, textAlign: AR ? 'right' : 'left', marginTop: 4 }}>
                    {srv.price} {AR ? 'ر' : 'SAR'}
                  </Text>
                </View>
                <NBtn label={AR ? 'تعديل السعر' : 'Edit Price'} size="xs" variant="outline" full={false} onPress={() => {
                  setEditingService(srv);
                  setEditPrice(String(srv.price || ''));
                  setEditHomeFee(String(srv.home_drawing_fee || ''));
                }} />
              </View>
            </NCard>
          ))}
        </ScrollView>
      )}

      {/* Edit Sheet */}
      <NSheet visible={!!editingService} onClose={() => setEditingService(null)} title={AR ? 'تعديل السعر' : 'Edit Price'}>
        <NPriceInput label={AR ? 'السعر داخل المختبر' : 'Lab Price'} value={editPrice} onChange={setEditPrice} />
        <NPriceInput label={AR ? 'رسوم السحب المنزلي (اختياري)' : 'Home Drawing Fee (Optional)'} value={editHomeFee} onChange={setEditHomeFee} />
        <NBtn label={AR ? 'إرسال التعديل للمراجعة' : 'Send for Review'} onPress={handleSaveEdit} style={{ marginTop: SP.xl }} />
      </NSheet>

      {/* Add Sheet */}
      <NSheet visible={showAddSheet} onClose={() => setShowAddSheet(false)} title={AR ? 'إضافة تحليل جديد' : 'Add New Test'}>
        <NInput label={AR ? 'اسم التحليل (إنجليزي)' : 'Test Name (English)'} value={newTitleEn} onChange={setNewTitleEn} />
        <NInput label={AR ? 'اسم التحليل (عربي)' : 'Test Name (Arabic)'} value={newTitleAr} onChange={setNewTitleAr} />
        <NPriceInput label={AR ? 'السعر داخل المختبر' : 'Lab Price'} value={newPrice} onChange={setNewPrice} />
        <NPriceInput label={AR ? 'رسوم السحب المنزلي (اختياري)' : 'Home Drawing Fee (Optional)'} value={newHomeFee} onChange={setNewHomeFee} />
        <NBtn label={AR ? 'إرسال طلب الإضافة للمراجعة' : 'Send Add Request for Review'} onPress={handleAddService} style={{ marginTop: SP.xl }} />
      </NSheet>
    </View>
  );
}
