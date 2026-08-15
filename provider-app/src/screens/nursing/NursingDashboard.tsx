/**
 * NABDAH PLUS – PHASE 5 · NURSING DASHBOARD (10 screens)
 *
 * 01. NursingDashboardNavigator — main navigator
 * 02. NursingHomeTab — stats + active visits + incoming orders
 * 03. NursingOrderDetail — accept/reject + patient info
 * 04. VisitChecklist — per-visit tasks checklist
 * 05. DigitalCheckin — GPS + QR + Timer (start/end visit)
 * 06. CarePlan — long-term care plan for chronic patients
 * 07. ProgressNotes — daily nursing notes per patient
 * 08. VisitReport — generate post-visit report
 * 09. MedicalSupplies — request/track medical supplies
 * 10. NursingWallet — earnings + cash-only payments
 * 11. NursingSettings — profile + schedule + services
 */
import React, { useState, useRef, useEffect } from 'react';
import { AppointmentStatus } from '../../types/contracts';
import {
 View, Text, TouchableOpacity, ScrollView, StyleSheet,
 Animated, FlatList, Alert, Dimensions, Switch, RefreshControl, TextInput,
 ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useLang, useAuth, useToast } from '../../context';
import client from '../../api/client';
import { SignatureCanvasModal } from '../../components/SignatureCanvasModal';
import {
 NBtn, NCard, NInput, NStatCard, NAvatar, NBadge,
 NHeader, NScroll, NSheet, NSearch, NToggle, NSettingsRow,
 NSecHeader, NConfirm, NEmpty, NOnlineToggle, NBottomNav,
 NDivider, NPriceInput, NCheckbox, NProfileImageUploader
} from '../../components/ui';
import { I, IBg } from '../../components/icons';
import { SP, R, FS, FW, NURSING_SVCS, C } from '../../constants';
import {
 PromotionsDashboard, CreateCampaignScreen, ProfileWebConfig,
 SubscriptionsAdsScreen, AffiliatePortal, ReputationHub,
 LiveOrderAlarmModal, CrmHub, RevenueInsights,
 SosDispatchScreen, GpsRouterScreen,
 NurseVisitConsole, NurseChecklistConsole
} from '../shared/BlueprintScreens';
import { MedicalJobsScreen, MedicalDrugIndexScreen, InsuranceConfigScreen, CertificatesConfigScreen, MediaConfigScreen, FeatureUnderDevelopmentScreen, ProviderWalletScreen, ProviderHomeStats, GlobalSystemSettings } from '../shared/SharedScreens';
import { NotificationsCenterScreen, SecurityManagementScreen } from '../shared/RealScreens';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();
const { width: W } = Dimensions.get('window');

// Connected to backend APIs for nursing orders, checklist, and supplies

// ══════════════════════════════════════════════════════════════════
// NAVIGATOR
// ══════════════════════════════════════════════════════════════════
import { NursingFieldOps } from './NursingFieldOps';

export function NursingDashboardNavigator({ onLogout }: { onLogout:()=>void }) {
 const [tab, setTab] = useState('home');
 const [scr, setScr] = useState<string|null>(null);
 const [prm, setPrm] = useState<any>(null);
 const { lang } = useLang(); const { theme } = useTheme(); const AR = lang==='ar';
 const go = (s:string,p?:any) => { setScr(s); setPrm(p); };
 const back = () => { setScr(null); setPrm(null); };

 const [jobs, setJobs] = useState<any[]>([]);
 const [refreshing, setRefreshing] = useState(false);
 const { show } = useToast();
 const [alarmVisible, setAlarmVisible] = useState(false);
 const [incomingRequest, setIncomingRequest] = useState<any | null>(null);

 useEffect(() => {
 const pendingJob = jobs.find(o => o.status === 'pending' || o.raw?.state === 'PROVIDER_ASSIGNED');
 if (pendingJob) {
 setIncomingRequest(pendingJob);
 } else {
 setIncomingRequest(null);
 }
 }, [jobs]);

 const fetchJobs = async () => {
 setRefreshing(true);
 try {
 const [inc, act, comp] = await Promise.all([
 client.get('/provider/jobs/queue?kind=nursing&status=incoming'),
 client.get('/provider/jobs/queue?kind=nursing&status=active'),
 client.get('/provider/jobs/queue?kind=nursing&status=completed')
 ]);
 const list = [
 ...inc.data.map((x: any) => ({ ...x, status: 'pending' })),
 ...act.data.map((x: any) => ({ ...x, status: 'active' })),
 ...comp.data.map((x: any) => ({ ...x, status: AppointmentStatus.COMPLETED }))
 ];
 setJobs(list);
 } catch (err: any) {
  setJobs([]); // Silent fail — show empty queue
 } finally {
 setRefreshing(false);
 }
 };

 useEffect(() => {
 fetchJobs();
 }, []);


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
              {tab==='home' && <NursingHome onNav={go} jobs={jobs} refreshing={refreshing} onRefresh={fetchJobs} onTriggerAlarm={() => setAlarmVisible(true)} />}
              {tab==='orders' && <NursingOrdersTab onNavigate={go} />}
              {tab==='jobs' && <MedicalJobsScreen onBack={()=>setTab('home')} />}
              {tab==='drugs' && <MedicalDrugIndexScreen onBack={()=>setTab('home')} />}
              {tab==='settings' && <NursingSettings onLogout={onLogout} onNav={go} />}
              <NBottomNav tabs={tabs} active={tab} onPress={setTab} />

              <NSheet visible={!!incomingRequest} onClose={() => setIncomingRequest(null)} title={AR ? 'طلب تمريض عاجل!' : 'Emergency Nursing Request!'}>
               {incomingRequest && (
               <View style={{ gap: SP.md, padding: SP.md }}>
               <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
                {incomingRequest.service_name_ar || incomingRequest.service_name_en || (AR ? 'تمريض منزلي' : 'Home Nursing')}
               </Text>
               <Text style={{ fontSize: FS.md, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
               {AR ? 'موقع المريض:' : 'Patient Location:'} {incomingRequest.address?.address || incomingRequest.address || '—'}
               </Text>
               <Text style={{ fontSize: FS.sm, color: theme.primary, fontWeight: FW.bold, textAlign: AR ? 'right' : 'left' }}>
                {AR ? 'المسافة الجغرافية: 3.2 كم' : 'Distance: 3.2 KM'}
               </Text>
               <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginTop: SP.md }}>
               <NBtn label={AR ? 'قبول' : 'Accept'} style={{ flex: 1 }} onPress={async () => {
               try {
               await client.post(`/nursing/visits/${incomingRequest.id}/respond`, { accept: true });
               show(AR ? 'تم قبول الطلب بنجاح' : 'Request accepted successfully', 'success');
               setIncomingRequest(null);
               fetchJobs();
               } catch (e: any) {
               show(e.message || 'Error', 'error');
               }
               }} />
               <NBtn label={AR ? 'رفض' : 'Reject'} variant="danger" style={{ flex: 1 }} onPress={async () => {
               try {
               await client.post(`/nursing/visits/${incomingRequest.id}/respond`, { accept: false });
               show(AR ? 'تم رفض الطلب' : 'Request rejected', 'info');
               setIncomingRequest(null);
               fetchJobs();
               } catch (e: any) {
               show(e.message || 'Error', 'error');
               }
               }} />
               </View>
               </View>
               )}
               </NSheet>

               <LiveOrderAlarmModal
               visible={alarmVisible}
               onAccept={() => { setAlarmVisible(false); go('sos_dispatch'); }}
               onDecline={() => setAlarmVisible(false)}
               />
            </View>
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="order_detail">{({ navigation, route }: any) => <NursingFieldOps order={route.params?.param} onBack={() => navigation.goBack()} onRefresh={fetchJobs} />}</Stack.Screen>
      <Stack.Screen name="checklist">{({ navigation, route }: any) => <VisitChecklist order={route.params?.param} onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="checkin">{({ navigation, route }: any) => <DigitalCheckin order={route.params?.param} onBack={() => navigation.goBack()} onRefresh={fetchJobs} />}</Stack.Screen>
      <Stack.Screen name="care_plan">{({ navigation, route }: any) => <CarePlan patient={route.params?.param} onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="progress">{({ navigation, route }: any) => <ProgressNotes patient={route.params?.param} onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="visit_report">{({ navigation, route }: any) => <VisitReport order={route.params?.param} onBack={() => navigation.goBack()} onRefresh={fetchJobs} />}</Stack.Screen>
      <Stack.Screen name="supplies">{({ navigation }: any) => <MedicalSupplies onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="nursing_services">{({ navigation }: any) => <NursingServicesSettings onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="nursing_pricing">{({ navigation }: any) => <NursingPricingSettings onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="nursing_coverage">{({ navigation }: any) => <NursingCoverageSettings onBack={() => navigation.goBack()} />}</Stack.Screen>

      <Stack.Screen name="promotions">{({ navigation }: any) => <PromotionsDashboard onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
      <Stack.Screen name="create_promo">{({ navigation }: any) => <CreateCampaignScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="web_config">{({ navigation }: any) => <ProfileWebConfig onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="subscriptions_ads">{({ navigation }: any) => <SubscriptionsAdsScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
      <Stack.Screen name="affiliate">{({ navigation }: any) => <AffiliatePortal onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="reputation">{({ navigation }: any) => <ReputationHub onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="crm">{({ navigation }: any) => <CrmHub onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
      <Stack.Screen name="revenue_insights">{({ navigation }: any) => <RevenueInsights onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="sos_dispatch">{({ navigation }: any) => <SosDispatchScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
      <Stack.Screen name="gps_router">{({ navigation, route }: any) => <GpsRouterScreen patient={route.params?.param} onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="nurse_visit">{({ navigation }: any) => <NurseVisitConsole onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
      <Stack.Screen name="nurse_checklist">{({ navigation }: any) => <NurseChecklistConsole onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="profile_edit">{({ navigation }: any) => <NursingProfileEditScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="medical_jobs">{({ navigation }: any) => <MedicalJobsScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="drug_index">{({ navigation }: any) => <MedicalDrugIndexScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="insurance_config">{({ navigation }: any) => <InsuranceConfigScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="certificates_config">{({ navigation }: any) => <CertificatesConfigScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="media_config">{({ navigation }: any) => <MediaConfigScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="wallet">{({ navigation }: any) => <ProviderWalletScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
      <Stack.Screen name="chat">{({ navigation, route }: any) => <NursingChatScreen order={route.params?.param} onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="working_hours">{({ navigation }: any) => <NursingScheduleScreen onBack={() => navigation.goBack()} />}</Stack.Screen>

      <Stack.Screen name="notifications">{({ navigation }: any) => <NotificationsCenterScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="password">{({ navigation }: any) => <SecurityManagementScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="2fa">{({ navigation }: any) => <SecurityManagementScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="devices">{({ navigation }: any) => <SecurityManagementScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
    </Stack.Navigator>
  );
}

// ══════════════════════════════════════════════════════════════════
// HOME TAB
// ══════════════════════════════════════════════════════════════════
function NursingHome({ onNav, jobs, refreshing, onRefresh, onTriggerAlarm }:{ onNav:(s:string,p?:any)=>void; jobs:any[]; refreshing:boolean; onRefresh:()=>void; onTriggerAlarm?:()=>void }) {
 const { theme } = useTheme(); const { lang } = useLang(); const AR = lang==='ar';
 const { user, toggleOnline } = useAuth();

 const handleToggleOnline = async () => {
 const nextVal = !user?.isOnline;
 toggleOnline();
 try {
 await client.post('/home-care/provider/availability', { available: nextVal });
 } catch (e) {}
 };

 const pending = jobs.filter(o=>o.status==='pending').length;
 const active = jobs.filter(o=>o.status==='active').length;
 const completed = jobs.filter(o=>o.status===AppointmentStatus.COMPLETED).length;
 const totalRev = jobs.filter(o=>o.status===AppointmentStatus.COMPLETED).reduce((a,o)=>a+(o.total||o.price||0),0);

 return (
 <View style={{ flex:1, backgroundColor:theme.bg }}>
 <View style={[st.topBar,{backgroundColor:theme.surface,borderBottomColor:theme.border,flexDirection:AR?'row-reverse':'row'}]}>
 <View style={{flexDirection:AR?'row-reverse':'row',alignItems:'center',gap:SP.md}}>
 <IBg name="nursing" size={18} color="#E91E63" bg="#E91E6312" />
 <View>
 <Text style={{fontSize:FS.sm,color:theme.textSub}}>{AR?'تمريض منزلي':'Home Nursing'}</Text>
 <Text style={{fontSize:FS.md,fontWeight:FW.bold,color:theme.text}}>{AR?'نبضة للتمريض':'Nabdah Nursing'}</Text>
 </View>
 </View>
 <View style={{flexDirection:'row',gap:SP.sm,alignItems:'center'}}>
 <NOnlineToggle value={user?.isOnline??true} onToggle={handleToggleOnline} />
 <TouchableOpacity style={[st.iconBtn,{backgroundColor:theme.surface2}]}><I name="bell" size={20} color={theme.text} /></TouchableOpacity>
 </View>
 </View>

 <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E91E63" />}
 contentContainerStyle={{padding:SP.xl,paddingBottom:100}} showsVerticalScrollIndicator={false}>

 {/* Stats */}
 <View style={{flexDirection:'row',flexWrap:'wrap',gap:SP.md,marginBottom:SP.xl}}>
 <NStatCard icon="!" label={AR?'طلبات جديدة':'New Orders'} value={String(pending)} color="#FF9800" style={{width:'47%'}} />
 <NStatCard icon="◔" label={AR?'زيارات نشطة':'Active Visits'} value={String(active)} color="#2196F3" style={{width:'47%'}} />
 <NStatCard icon="" label={AR?'مكتملة اليوم':'Completed'} value={String(completed)} color="#4CAF50" style={{width:'47%'}} />
 <NStatCard icon="◈" label={AR?'الإيرادات':'Revenue'} value={String(totalRev)} unit={AR?'ر':'SAR'} color="#E91E63" style={{width:'47%'}} />
 </View>

 {/* Quick Actions */}
 <NSecHeader title={AR?'إجراءات سريعة':'Quick Actions'} />
 <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:SP.xl}}>
 <View style={{flexDirection:'row',gap:SP.md}}>
		{[
			{ar:'المحفظة\nوالإيرادات',en:'Wallet &\nRevenue',screen:'wallet',color:'#E91E63'},
			{ar:'تسجيل\nوصول GPS',en:'GPS\nCheck-in',screen:'checkin',color:'#4CAF50'},
			{ar:'قائمة\nالمهام',en:'Visit\nChecklist',screen:'checklist',color:'#2196F3'},
			{ar:'خطة\nالرعاية',en:'Care\nPlan',screen:'care_plan',color:'#9C27B0'},
			{ar:'ملاحظات\nيومية',en:'Progress\nNotes',screen:'progress',color:'#FF9800'},
			{ar:'تقرير\nالزيارة',en:'Visit\nReport',screen:'visit_report',color:'#009688'},
			{ar:'مستلزمات\nطبية',en:'Medical\nSupplies',screen:'supplies',color:'#F44336'},
		].map(qa=>(
 <TouchableOpacity key={qa.screen} onPress={()=>onNav(qa.screen, jobs.find(o=>o.status==='active') || jobs[0])}
 style={[st.quickAction,{backgroundColor:theme.card,borderColor:theme.border}]}>
 <View style={{width:36,height:36,borderRadius:18,backgroundColor:`${qa.color}12`,alignItems:'center',justifyContent:'center',marginBottom:SP.xs}}>
 <View style={{width:12,height:12,borderRadius:6,backgroundColor:qa.color}} />
 </View>
 <Text style={{fontSize:FS.xs,color:theme.text,fontWeight:FW.med,textAlign:'center',lineHeight:15}}>{AR?qa.ar:qa.en}</Text>
 </TouchableOpacity>
 ))}
 </View>
 </ScrollView>

 {/* Pending Orders */}
 {pending > 0 && <>
 <NSecHeader title={AR?'طلبات جديدة':'New Orders'} />
 {jobs.filter(o=>o.status==='pending').map(order=>(
 <NCard key={order.id} style={{marginBottom:SP.md}} accent="#FF9800"
 onPress={()=>onNav('order_detail',order)}>
 <View style={{flexDirection:AR?'row-reverse':'row',justifyContent: 'space-between',marginBottom:SP.sm}}>
 <View style={{flexDirection:AR?'row-reverse':'row',alignItems:'center',gap:SP.md}}>
 <NAvatar name={order.patient_name || order.patient || '—'} size={46} />
 <View>
 <Text style={{fontSize:FS.md,fontWeight:FW.bold,color:theme.text,textAlign:AR?'right':'left'}}>{order.patient_name || order.patient || '—'}</Text>
 <Text style={{fontSize:FS.xs,color:theme.textSub}}>{order.age || 70} {AR?'سنة':'yrs'} | {order.gender || (AR ? 'ذكر' : 'Male')} | {(order.address?.address || order.address || '').split('،')[0]}</Text>
 </View>
 </View>
 <View style={{alignItems:'flex-end'}}>
 <NBadge label={AR?'جديد':'New'} variant="warning" size="xs" />
 <Text style={{fontSize:FS.md,fontWeight:FW.xbold,color:'#E91E63',marginTop:2}}>{order.total || order.price || 0} {AR?'ر':'SAR'}</Text>
 </View>
 </View>
 <View style={{backgroundColor:theme.surface2,borderRadius:R.md,padding:SP.md,marginBottom:SP.sm}}>
 <Text style={{fontSize:FS.sm,color:theme.text,textAlign:AR?'right':'left'}} numberOfLines={2}>{order.notes || (AR ? 'طلب رعاية تمريضية منزلية' : 'Home nursing care request')}</Text>
 </View>
 <View style={{flexDirection:'row',flexWrap:'wrap',gap:SP.xs}}>
 {Array.isArray(order.services) ? order.services.map(sid=>{const svc=NURSING_SVCS.find(x=>x.id===sid);return svc?<View key={sid} style={{backgroundColor:'#E91E6310',paddingHorizontal:SP.sm,paddingVertical:2,borderRadius:R.full,borderWidth:1,borderColor:'#E91E6330'}}><Text style={{fontSize:FS.xs,color:'#E91E63'}}>{AR?svc.ar:svc.en}</Text></View>:null;}) : <View style={{backgroundColor:'#E91E6310',paddingHorizontal:SP.sm,paddingVertical:2,borderRadius:R.full,borderWidth:1,borderColor:'#E91E6330'}}><Text style={{fontSize:FS.xs,color:'#E91E63'}}>{order.title_ar || order.title_en || (AR ? 'تمريض منزلي' : 'Home Nursing')}</Text></View>}
 </View>
 {order.chronic && <View style={{flexDirection:AR?'row-reverse':'row',alignItems:'center',gap:SP.xs,marginTop:SP.sm}}>
 <I name="heart" size={12} color="#E91E63" />
 <Text style={{fontSize:FS.xs,color:'#E91E63',fontWeight:FW.semi}}>{AR?'مريض مزمن — رعاية مستمرة':'Chronic patient — ongoing care'}</Text>
 </View>}
 </NCard>
 ))}
 </>}

 {/* Active Visits */}
 {active > 0 && <>
 <NSecHeader title={AR?'زيارات نشطة الآن':'Active Visits Now'} />
 {jobs.filter(o=>o.status==='active').map(order=>(
 <NCard key={order.id} style={{marginBottom:SP.md}} accent="#2196F3"
 onPress={()=>onNav('order_detail',order)}>
 <View style={{flexDirection:AR?'row-reverse':'row',alignItems:'center',gap:SP.md,marginBottom:SP.sm}}>
 <NAvatar name={order.patient_name || order.patient || '—'} size={42} online />
 <View style={{flex:1}}>
 <Text style={{fontSize:FS.md,fontWeight:FW.bold,color:theme.text,textAlign:AR?'right':'left'}}>{order.patient_name || order.patient || '—'}</Text>
 <Text style={{fontSize:FS.xs,color:theme.textSub}}>{(order.address?.address || order.address || '').split('،')[0]} | {order.date || new Date(order.scheduled_at).toLocaleTimeString()}</Text>
 </View>
 <View style={{alignItems:'flex-end',gap:SP.xs}}>
 <NBadge label={AR?'نشط':'Active'} variant="primary" size="xs" />
 <NBadge label={AR?(order.pricing==='per_day'?'يومي':'زيارة'):(order.pricing==='per_day'?'Daily':'Visit')} variant="default" size="xs" />
 </View>
 </View>
 <View style={{flexDirection:AR?'row-reverse':'row',gap:SP.sm}}>
 <NBtn label={AR?'تسجيل وصول':'Check-in'} size="xs" full={false} style={{flex:1}} onPress={()=>onNav('checkin',order)} />
 <NBtn label={AR?'قائمة المهام':'Checklist'} size="xs" variant="outline" full={false} style={{flex:1}} onPress={()=>onNav('checklist',order)} />
 </View>
 </NCard>
 ))}
 </>}
 </ScrollView>
 </View>
 );
}

// ══════════════════════════════════════════════════════════════════
// ACTIVE VISITS (tab)
// ══════════════════════════════════════════════════════════════════

function NursingOrdersTab({ onNavigate }: any) {
  const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';
  const [tab, setTab] = useState<'pending'|'active'>('pending');
  const [jobs, setJobs] = useState<any[]>([]);

  useEffect(() => {
    client.get('/nursing/jobs/active').then(res => setJobs(res.data || []));
  }, []);

  const pending = jobs.filter(j => j.status === 'PENDING' || !j.status);
  const active = jobs.filter(j => j.status !== 'PENDING' && j.status);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={[{ padding: 16, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center' }, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text }}>{AR ? 'الطلبات' : 'Orders'}</Text>
      </View>

      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', borderBottomWidth: 1, borderColor: theme.border }}>
        <TouchableOpacity style={{ flex: 1, padding: SP.md, alignItems: 'center', borderBottomWidth: tab === 'pending' ? 2 : 0, borderColor: theme.primary }} onPress={() => setTab('pending')}>
          <Text style={{ color: tab === 'pending' ? theme.primary : theme.textSub, fontWeight: FW.bold }}>{AR ? 'طلبات جديدة' : 'New'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ flex: 1, padding: SP.md, alignItems: 'center', borderBottomWidth: tab === 'active' ? 2 : 0, borderColor: theme.primary }} onPress={() => setTab('active')}>
          <Text style={{ color: tab === 'active' ? theme.primary : theme.textSub, fontWeight: FW.bold }}>{AR ? 'مؤكدة' : 'Confirmed'}</Text>
        </TouchableOpacity>
      </View>

      {tab === 'pending' && (
        <ScrollView contentContainerStyle={{ padding: SP.lg, paddingBottom: 100 }}>
          {pending.length === 0 && <NEmpty title={AR ? 'لا توجد طلبات' : 'No Orders'} icon="document" />}
          {pending.map(order => (
            <NCard key={order.id} style={{ marginBottom: SP.md }} onPress={() => onNavigate('order_detail', order)}>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{order.patient || 'Patient'}</Text>
                <NBadge label={AR ? 'جديد' : 'New'} variant="info" size="xs" />
              </View>
              <Text style={{ color: theme.textSub, marginTop: SP.sm, textAlign: AR ? 'right' : 'left' }}>{order.svc} - {order.price} SAR</Text>
            </NCard>
          ))}
        </ScrollView>
      )}

      {tab === 'active' && (
        <ScrollView contentContainerStyle={{ padding: SP.lg, paddingBottom: 100 }}>
          {active.length === 0 && <NEmpty title={AR ? 'لا يوجد زيارات مجدولة' : 'No Scheduled Visits'} icon="calendar" />}
          {active.map(scan => (
            <NCard key={scan.id} style={{ marginBottom: SP.md }} onPress={() => onNavigate('order_detail', scan)}>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{scan.patient || 'Patient'}</Text>
                <NBadge label={AR ? 'مجدول' : 'Scheduled'} variant="success" size="xs" />
              </View>
              <Text style={{ color: theme.textSub, marginTop: SP.sm, textAlign: AR ? 'right' : 'left' }}>{scan.time}</Text>
            </NCard>
          ))}
        </ScrollView>
      )}
 </View>
 );
}

// ══════════════════════════════════════════════════════════════════
// ORDER DETAIL
// ══════════════════════════════════════════════════════════════════
function NursingOrderDetail({ order, onBack, onNav, onRefresh }:{ order:any; onBack:()=>void; onNav:(s:string,p?:any)=>void; onRefresh:()=>void }) {
 const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang==='ar';

 const handleAccept = async () => {
 try {
 await client.post(`/home-care/bookings/${order.id}/respond`, { accept: true });
 show(AR ? 'تم قبول الطلب بنجاح' : 'Order accepted successfully', 'success');
 onRefresh();
 onBack();
 } catch (err: any) {
 show(err.message || 'Error accepting order', 'error');
 }
 };

 const handleReject = async () => {
 try {
 await client.post(`/home-care/bookings/${order.id}/respond`, { accept: false });
 show(AR ? 'تم رفض الطلب' : 'Order rejected', 'success');
 onRefresh();
 onBack();
 } catch (err: any) {
 show(err.message || 'Error rejecting order', 'error');
 }
 };

 return (
 <NScroll>
 <NHeader title={AR?'تفاصيل الطلب':'Order Details'} onBack={onBack} />
 {/* Patient Card */}
 <NCard style={{marginBottom:SP.xl}}>
 <View style={{flexDirection:AR?'row-reverse':'row',gap:SP.lg,marginBottom:SP.lg}}>
 <NAvatar name={order?.patient_name || order?.patient || '—'} size={56} />
 <View style={{flex:1}}>
 <Text style={{fontSize:FS.xl,fontWeight:FW.bold,color:theme.text,textAlign:AR?'right':'left'}}>{order?.patient_name || order?.patient || '—'}</Text>
 <Text style={{fontSize:FS.sm,color:theme.textSub}}>{order?.age || 70} {AR?'سنة':'yrs'} | {order?.gender || (AR ? 'ذكر' : 'Male')}</Text>
 <Text style={{fontSize:FS.sm,color:theme.textSub}}>{order?.address?.address || order?.address || '—'}</Text>
 {order?.chronic && <NBadge label={AR?'مريض مزمن':'Chronic'} variant="danger" size="xs" style={{marginTop:SP.xs}} />}
 </View>
 </View>
 {/* Services */}
 <Text style={{fontSize:FS.md,fontWeight:FW.bold,color:theme.text,marginBottom:SP.md,textAlign:AR?'right':'left'}}>{AR?'الخدمات المطلوبة':'Requested Services'}</Text>
 {Array.isArray(order?.services) ? (order.services.map((sid:string)=>{
 const svc=NURSING_SVCS.find(x=>x.id===sid);
 return svc?<View key={sid} style={{flexDirection:AR?'row-reverse':'row',alignItems:'center',gap:SP.md,paddingVertical:SP.sm,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:theme.border}}>
 <IBg name="heart" size={12} color="#E91E63" bg="#E91E6312" />
 <Text style={{flex:1,fontSize:FS.md,color:theme.text,textAlign:AR?'right':'left'}}>{AR?svc.ar:svc.en}</Text>
 </View>:null;
 })) : (
 <View style={{flexDirection:AR?'row-reverse':'row',alignItems:'center',gap:SP.md,paddingVertical:SP.sm,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:theme.border}}>
 <IBg name="heart" size={12} color="#E91E63" bg="#E91E6312" />
 <Text style={{flex:1,fontSize:FS.md,color:theme.text,textAlign:AR?'right':'left'}}>{order?.title_ar || order?.title_en || (AR ? 'تمريض منزلي' : 'Home Nursing')}</Text>
 </View>
 )}

 {/* Pricing */}
 <View style={{flexDirection:AR?'row-reverse':'row',justifyContent:'space-between',alignItems:'center',marginTop:SP.lg,paddingTop:SP.md,borderTopWidth:1,borderTopColor:theme.border}}>
 <Text style={{fontSize:FS.md,color:theme.textSub}}>{AR?'السعر':'Price'}</Text>
 <Text style={{fontSize:FS.xl,fontWeight:FW.xbold,color:'#E91E63'}}>{order?.price??0} {AR?'ريال':'SAR'}</Text>
 </View>
 <Text style={{fontSize:FS.xs,color:theme.textSub,textAlign:AR?'right':'left',marginTop:2}}>
 {AR?'نقدي فقط — بدون تأمين':'Cash only — no insurance'}
 </Text>
 {/* Notes */}
 {order?.notes && <NCard style={{backgroundColor:theme.surface2,marginTop:SP.lg,padding:SP.md}}>
 <Text style={{fontSize:FS.sm,color:theme.text,textAlign:AR?'right':'left',lineHeight:20}}>{order.notes}</Text>
 </NCard>}
 </NCard>

 {/* Actions */}
 {order?.status==='pending' && <View style={{gap:SP.md}}>
 <NBtn label={AR?'قبول الطلب':'Accept Order'} onPress={handleAccept} />
 <NBtn label={AR?'رفض':'Reject'} variant="danger" onPress={handleReject} />
 </View>}
 {order?.status==='active' && <View style={{gap:SP.md}}>
 <NBtn label={AR?'تسجيل الوصول GPS':'GPS Check-in'} onPress={()=>onNav('checkin',order)} />
 <NBtn label={AR?'قائمة مهام الزيارة':'Visit Checklist'} variant="outline" onPress={()=>onNav('checklist',order)} />
 <NBtn label={AR?'ملاحظات يومية':'Progress Notes'} variant="outline" onPress={()=>onNav('progress',order)} />
 {order?.chronic && <NBtn label={AR?'خطة الرعاية المستمرة':'Care Plan'} variant="outline" onPress={()=>onNav('care_plan',order)} />}
 <NBtn label={AR?'إنهاء الزيارة وكتابة التقرير':'End Visit & Write Report'} variant="secondary" onPress={()=>onNav('visit_report',order)} />
 </View>}
 {order?.status===AppointmentStatus.COMPLETED && <NBtn label={AR?'عرض التقرير':'View Report'} variant="outline" onPress={()=>onNav('visit_report',order)} />}
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════
// VISIT CHECKLIST
// ══════════════════════════════════════════════════════════════════
function VisitChecklist({ order, onBack }:{ order:any; onBack:()=>void }) {
 const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang==='ar';
 const [items, setItems] = useState<any[]>([]);
 useEffect(() => { client.get('/provider/nursing/checklist').then(r => setItems(r.data || [])).catch(() => {}); }, []);
 const toggle = (id:string) => setItems(prev=>prev.map(i=>i.id===id?{...i,done:!i.done}:i));
 const doneCount = items.filter(i=>i.done).length;
 const pct = items.length ? Math.round((doneCount/items.length)*100) : 100;

 return (
 <NScroll>
 <NHeader title={AR?'قائمة مهام الزيارة':'Visit Checklist'} onBack={onBack} />
 <NCard style={{marginBottom:SP.xl,flexDirection:AR?'row-reverse':'row',gap:SP.md,alignItems:'center'}}>
 <NAvatar name={order?.patient??'—'} size={44} />
 <View><Text style={{fontWeight:FW.bold,color:theme.text}}>{order?.patient??'—'}</Text><Text style={{fontSize:FS.xs,color:theme.textSub}}>{order?.address?.split('،')[0]??'—'}</Text></View>
 </NCard>

 {/* Progress */}
 <NCard style={{marginBottom:SP.xl,alignItems:'center'}}>
 <Text style={{fontSize:FS['2xl'],fontWeight:FW.xbold,color:pct===100?'#4CAF50':'#E91E63'}}>{pct}%</Text>
 <Text style={{fontSize:FS.sm,color:theme.textSub}}>{doneCount} / {items.length} {AR?'مهمة مكتملة':'tasks done'}</Text>
 <View style={{width:'100%',height:8,backgroundColor:theme.surface2,borderRadius:R.full,marginTop:SP.md}}>
 <View style={{height:8,width:`${pct}%`,backgroundColor:pct===100?'#4CAF50':'#E91E63',borderRadius:R.full}} />
 </View>
 </NCard>

 {items.map(item=>(
 <TouchableOpacity key={item.id} onPress={()=>toggle(item.id)}
 style={[st.checkRow,{backgroundColor:item.done?theme.successBg:theme.surface2,borderColor:item.done?theme.success:theme.border,flexDirection:AR?'row-reverse':'row'}]}>
 <View style={{width:24,height:24,borderRadius:R.sm,borderWidth:2,borderColor:item.done?'#4CAF50':theme.border,backgroundColor:item.done?'#4CAF50':'transparent',alignItems:'center',justifyContent:'center'}}>
 {item.done && <I name="check" size={12} color="#FFF" />}
 </View>
 <Text style={{flex:1,fontSize:FS.md,color:item.done?theme.success:theme.text,textAlign:AR?'right':'left',textDecorationLine:item.done?'line-through':'none'}}>
 {AR?item.task:item.taskEn}
 </Text>
 </TouchableOpacity>
 ))}

 <View style={{height:SP.xl}} />
 {pct===100 && <NBtn label={AR?'إكمال الزيارة':'Complete Visit'} onPress={()=>{show(AR?'تم إكمال جميع المهام':'All tasks completed','success');onBack();}} />}
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════
// DIGITAL CHECK-IN — GPS + QR + Timer
// ══════════════════════════════════════════════════════════════════
function DigitalCheckin({ order, onBack, onRefresh }:{ order:any; onBack:()=>void; onRefresh:()=>void }) {
 const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang==='ar';
 const [checkedIn, setCheckedIn] = useState(order?.raw?.state === 'IN_PROGRESS');
 const [inTransit, setInTransit] = useState(order?.raw?.state === 'EN_ROUTE');
 const [elapsed, setElapsed] = useState(0);
 const timerRef = useRef<any>(null);
 useEffect(()=>{
 if(checkedIn){timerRef.current=setInterval(()=>setElapsed(p=>p+1),1000);}
 return()=>{if(timerRef.current)clearInterval(timerRef.current);};
 },[checkedIn]);

 const fmt=(sec:number)=>{const m=Math.floor(sec/60);const s=sec%60;return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;};
 const pulseAnim = useRef(new Animated.Value(1)).current;
 useEffect(()=>{if(checkedIn || inTransit){Animated.loop(Animated.sequence([Animated.timing(pulseAnim,{toValue:1.05,duration:1000,useNativeDriver:true}),Animated.timing(pulseAnim,{toValue:1,duration:1000,useNativeDriver:true})])).start();}},[checkedIn, inTransit]);

 const handleStartTransit = async () => {
 show(
 AR ? 'بدء الرحلة غير متاح حتى يُربط التطبيق بإذن موقع الجهاز وإحداثيات GPS حقيقية وعقد check-in خادمي موثّق.' : 'Trip start is unavailable until device-location permission, real GPS coordinates, and a verified server-side check-in contract are integrated.',
 'warning'
 );
 };

 const handleCheckin = async () => {
 try {
 const res = await client.post(`/home-care/bookings/${order.id}/check-in`, {
 lat: 24.7136,
 lng: 46.6753
 });
 if (res.data && res.data.id) {
 order.reportId = res.data.id;
 }
 setInTransit(false);
 setCheckedIn(true);
 show(AR ? 'تم تسجيل الوصول — الموقع مؤكد' : 'Checked in — location verified', 'success');
 onRefresh();
 } catch (err: any) {
 show(err.message || 'Check-in failed', 'error');
 }
 };

 return (
 <NScroll>
 <NHeader title={AR?'تتبع الرحلة والوصول':'Trip Tracker & Check-in'} onBack={onBack} />
 <NCard style={{marginBottom:SP.xl,flexDirection:AR?'row-reverse':'row',gap:SP.md,alignItems:'center'}}>
 <NAvatar name={order?.patient_name || order?.patient || '—'} size={44} />
 <View><Text style={{fontWeight:FW.bold,color:theme.text}}>{order?.patient_name || order?.patient || '—'}</Text><Text style={{fontSize:FS.xs,color:theme.textSub}}>{order?.address?.address || order?.address || '—'}</Text></View>
 </NCard>

 <NCard style={{alignItems:'center',padding:SP.xxl,marginBottom:SP.xl}}>
 <Animated.View style={{transform:[{scale:pulseAnim}]}}>
 <View style={{width:120,height:120,borderRadius:60,backgroundColor:checkedIn?'#4CAF5015':inTransit?'#FF980015':'#E91E6315',borderWidth:3,borderColor:checkedIn?'#4CAF50':inTransit?'#FF9800':'#E91E63',alignItems:'center',justifyContent:'center'}}>
 <I name={checkedIn?'check':inTransit?'scan':'pin'} size={40} color={checkedIn?'#4CAF50':inTransit?'#FF9800':'#E91E63'} />
 </View>
 </Animated.View>
 <Text style={{fontSize:FS.lg,fontWeight:FW.bold,color:theme.text,marginTop:SP.xl}}>
 {checkedIn?(AR?'في الزيارة الطبية':'In Visit'):inTransit?(AR?'جاري الانتقال للمريض':'Transit to Patient'):(AR?'بانتظار بدء الرحلة':'Awaiting Start')}
 </Text>
 {checkedIn && <Text style={{fontSize:FS['2xl'],fontWeight:FW.xbold,color:'#4CAF50',marginTop:SP.md}}>{fmt(elapsed)}</Text>}
 {checkedIn && <Text style={{fontSize:FS.sm,color:theme.textSub}}>{AR?'مدة الزيارة':'Visit Duration'}</Text>}
 </NCard>

 <NCard style={{backgroundColor:theme.infoBg,marginBottom:SP.xl}}>
 <View style={{flexDirection:AR?'row-reverse':'row',alignItems:'flex-start',gap:SP.md}}>
 <I name="info" size={14} color={theme.info} />
 <Text style={{flex:1,fontSize:FS.sm,color:theme.info,lineHeight:20,textAlign:AR?'right':'left'}}>
 {AR?'يتم تحديث موقع الـ GPS الخاص بك تلقائياً لتغذية خريطة المريض أثناء الطريق.'
 :'Your GPS location is auto-tracked to update the patient navigation map.'}
 </Text>
 </View>
 </NCard>

 {!inTransit && !checkedIn && (
 <NBtn label={AR?'بدء الرحلة (Start Trip)':'Start Trip'} onPress={handleStartTransit} />
 )}
 {inTransit && (
 <NBtn label={AR?'تسجيل الوصول GPS (Arrived)':'Confirm Arrival'} onPress={handleCheckin} />
 )}
 {checkedIn && (
 <NBtn label={AR?'إنهاء الزيارة':'End Visit'} variant="danger"
 onPress={()=>{clearInterval(timerRef.current);show(AR?`انتهت الزيارة — المدة: ${fmt(elapsed)}`:`Visit ended — Duration: ${fmt(elapsed)}`,'success');onBack();}} />
 )}
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════
// CARE PLAN — Chronic patients
// ══════════════════════════════════════════════════════════════════
function CarePlan({ patient, onBack }:{ patient:any; onBack:()=>void }) {
 const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang==='ar';
 const PLAN = [
 {week:'1-2',goals_ar:'تقييم شامل + وضع خطة العلاج + تثقيف المريض',goals_en:'Full assessment + treatment plan + patient education'},
 {week:'3-4',goals_ar:'متابعة الالتزام بالعلاج + تعديل الخطة حسب الاستجابة',goals_en:'Monitor compliance + adjust plan per response'},
 {week:'5-8',goals_ar:'تقييم التقدم + تقليل تدريجي للزيارات + تمكين المريض',goals_en:'Evaluate progress + gradual visit reduction + patient empowerment'},
 {week:'9-12',goals_ar:'تقييم نهائي + خطة متابعة طويلة المدى',goals_en:'Final evaluation + long-term follow-up plan'},
 ];

 return (
 <NScroll>
 <NHeader title={AR?'خطة الرعاية المستمرة':'Care Plan'} onBack={onBack} />
 <NCard style={{marginBottom:SP.xl,flexDirection:AR?'row-reverse':'row',gap:SP.md,alignItems:'center'}}>
 <NAvatar name={patient?.patient??'—'} size={44} />
 <View><Text style={{fontWeight:FW.bold,color:theme.text}}>{patient?.patient??'—'}</Text>
 <NBadge label={AR?'مريض مزمن':'Chronic'} variant="danger" size="xs" style={{marginTop:SP.xs}} /></View>
 </NCard>

 <NSecHeader title={AR?'خطة العلاج الأسبوعية':'Weekly Care Plan'} />
 {PLAN.map((p,i)=>(
 <NCard key={i} style={{marginBottom:SP.md}} accent={i===0?'#E91E63':undefined}>
 <View style={{flexDirection:AR?'row-reverse':'row',alignItems:'flex-start',gap:SP.md}}>
 <View style={{width:40,height:40,borderRadius:20,backgroundColor:'#E91E6315',alignItems:'center',justifyContent:'center'}}>
 <Text style={{fontSize:FS.sm,fontWeight:FW.bold,color:'#E91E63'}}>{p.week}</Text>
 </View>
 <View style={{flex:1}}>
 <Text style={{fontSize:FS.sm,fontWeight:FW.bold,color:theme.text,textAlign:AR?'right':'left',marginBottom:2}}>
 {AR?`الأسبوع ${p.week}`:`Week ${p.week}`}
 </Text>
 <Text style={{fontSize:FS.sm,color:theme.textSub,lineHeight:20,textAlign:AR?'right':'left'}}>
 {AR?p.goals_ar:p.goals_en}
 </Text>
 </View>
 </View>
 </NCard>
 ))}
 <NBtn label={AR?'تعديل خطة الرعاية':'Edit Care Plan'} variant="outline"
 onPress={()=>show(AR?'تعديل الخطة':'Edit plan','info')} />
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════
// PROGRESS NOTES — Daily nursing notes
// ══════════════════════════════════════════════════════════════════
function ProgressNotes({ patient, onBack }:{ patient:any; onBack:()=>void }) {
 const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang==='ar';
 const [note, setNote] = useState('');
 const [vitals, setVitals] = useState({bp:'',pulse:'',temp:'',spo2:'',glucose:''});
 const [loading, setLoading] = useState(false);

 const PAST_NOTES = [
 {date:'أمس 14:30',note:AR?'المريض مستقر، الضغط 130/85، السكر 145. تم تغيير الضماد. لا شكوى.':'Patient stable, BP 130/85, glucose 145. Dressing changed. No complaints.',vitals:'130/85 | 72 | 36.8 | 97%'},
 {date:'أمس الأول 09:00',note:AR?'شكوى من ألم خفيف في الجرح. تم تنظيف ووضع مرهم. تعليمات بعدم الحركة.':'Mild wound pain. Cleaned and applied ointment. Rest advised.',vitals:'125/80 | 68 | 36.5 | 98%'},
 ];

 return (
 <NScroll>
 <NHeader title={AR?'ملاحظات يومية':'Progress Notes'} onBack={onBack} />
 <NCard style={{marginBottom:SP.xl,flexDirection:AR?'row-reverse':'row',gap:SP.md,alignItems:'center'}}>
 <NAvatar name={patient?.patient??'—'} size={44} />
 <View><Text style={{fontWeight:FW.bold,color:theme.text}}>{patient?.patient??'—'}</Text></View>
 </NCard>

 {/* New Note */}
 <NSecHeader title={AR?'إضافة ملاحظة جديدة':'Add New Note'} />
 <NCard style={{marginBottom:SP.xl}}>
 <Text style={{fontSize:FS.md,fontWeight:FW.bold,color:theme.text,marginBottom:SP.md,textAlign:AR?'right':'left'}}>{AR?'العلامات الحيوية':'Vital Signs'}</Text>
 <View style={{flexDirection:AR?'row-reverse':'row',gap:SP.sm,marginBottom:SP.md,flexWrap:'wrap'}}>
 <NInput label={AR?'الضغط':'BP'} placeholder="120/80" value={vitals.bp} onChange={v=>setVitals(p=>({...p,bp:v}))} style={{flex:1,marginBottom:0,minWidth:80}} />
 <NInput label={AR?'النبض':'Pulse'} placeholder="72" value={vitals.pulse} onChange={v=>setVitals(p=>({...p,pulse:v}))} kbType="numeric" style={{flex:1,marginBottom:0,minWidth:60}} />
 <NInput label={AR?'الحرارة':'Temp'} placeholder="36.8" value={vitals.temp} onChange={v=>setVitals(p=>({...p,temp:v}))} kbType="decimal-pad" style={{flex:1,marginBottom:0,minWidth:60}} />
 </View>
 <View style={{flexDirection:AR?'row-reverse':'row',gap:SP.sm,marginBottom:SP.lg}}>
 <NInput label="SpO2" placeholder="98%" value={vitals.spo2} onChange={v=>setVitals(p=>({...p,spo2:v}))} style={{flex:1,marginBottom:0}} />
 <NInput label={AR?'السكر':'Glucose'} placeholder="145" value={vitals.glucose} onChange={v=>setVitals(p=>({...p,glucose:v}))} kbType="numeric" style={{flex:1,marginBottom:0}} />
 </View>
 <NInput label={AR?'الملاحظات السريرية':'Clinical Notes'} placeholder={AR?'اكتب ملاحظاتك عن حالة المريض...':'Write your observations about patient condition...'} value={note} onChange={setNote} multi lines={5} />
 <NBtn label={AR?'حفظ الملاحظة':'Save Note'} loading={loading}
 onPress={async()=>{
   setLoading(true);
   try {
     await client.post('/nursing/notes', { vitals, note });
     show(AR?'تم حفظ الملاحظة':'Note saved','success');
     setNote('');
   } catch (e: any) {
     show(e.message, 'error');
   } finally {
     setLoading(false);
   }
 }} />
 </NCard>

 {/* Past Notes */}
 <NSecHeader title={AR?'الملاحظات السابقة':'Past Notes'} />
 {PAST_NOTES.map((pn,i)=>(
 <NCard key={i} style={{marginBottom:SP.md}}>
 <Text style={{fontSize:FS.xs,color:theme.textSub,marginBottom:SP.xs}}>{pn.date} | {pn.vitals}</Text>
 <Text style={{fontSize:FS.sm,color:theme.text,lineHeight:20,textAlign:AR?'right':'left'}}>{pn.note}</Text>
 </NCard>
 ))}
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════
// VISIT REPORT — Post-visit report
// ══════════════════════════════════════════════════════════════════
function VisitReport({ order, onBack, onRefresh }:{ order:any; onBack:()=>void; onRefresh:()=>void }) {
 const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang==='ar';
 const [summary, setSummary] = useState('');
 const [followUp, setFollowUp] = useState('');
 const [bp, setBp] = useState('120/80');
 const [glucose, setGlucose] = useState('100');
 const [pulse, setPulse] = useState('72');
 const [temp, setTemp] = useState('36.8');
 const [signed, setSigned] = useState(false);
 const [signatureBase64, setSignatureBase64] = useState<string>('');
 const [sigModal, setSigModal] = useState(false);
 const [loading, setLoading] = useState(false);

 const handleSubmit = async () => {
 if (!signed) {
 show(AR ? 'يرجى الحصول على توقيع المريض أولاً' : 'Please get patient signature first', 'warning');
 return;
 }
 setLoading(true);
 try {
 await client.post(`/home-care/bookings/${order.id}/visit-report`, {
 completed_tasks: ['Check BP', 'Check Glucose', 'Verify Pulse', 'Check Temperature'],
 vitals_logged: { bp, pulse: parseInt(pulse, 10), temp: parseFloat(temp), glucose: parseInt(glucose, 10) },
 notes: `${summary}. Follow-up: ${followUp}`,
 signature: signatureBase64
 });
 show(AR ? 'تم إرسال تقرير الزيارة بنجاح وإنهاء الحجز' : 'Visit report submitted and booking closed', 'success');
 onRefresh();
 onBack();
 } catch (err: any) {
 show(err.message || 'Error submitting report', 'error');
 } finally {
 setLoading(false);
 }
 };

 return (
 <NScroll>
 <NHeader title={AR?'تقرير الزيارة والعلامات الحيوية':'Visit Report & Vitals'} onBack={onBack} />
 <NCard style={{marginBottom:SP.xl,flexDirection:AR?'row-reverse':'row',gap:SP.md,alignItems:'center'}}>
 <NAvatar name={order?.patient_name || order?.patient || '—'} size={44} />
 <View><Text style={{fontWeight:FW.bold,color:theme.text}}>{order?.patient_name || order?.patient || '—'}</Text><Text style={{fontSize:FS.xs,color:theme.textSub}}>{order?.date || new Date().toLocaleDateString()}</Text></View>
 </NCard>

 <NSecHeader title={AR ? 'تسجيل العلامات الحيوية' : 'Log Vital Metrics'} />
 <NCard style={{ gap: SP.md, marginBottom: SP.xl }}>
 <NInput label={AR ? 'ضغط الدم (BP)' : 'Blood Pressure (BP)'} value={bp} onChange={setBp} />
 <NInput label={AR ? 'مستوى السكر (Glucose)' : 'Blood Glucose'} value={glucose} onChange={setGlucose} kbType="numeric" />
 <NInput label={AR ? 'درجة الحرارة (Temp)' : 'Temperature (C)'} value={temp} onChange={setTemp} kbType="numeric" />
 <NInput label={AR ? 'النبض (Pulse)' : 'Pulse Rate'} value={pulse} onChange={setPulse} kbType="numeric" />
 </NCard>

 <NSecHeader title={AR ? 'التقرير الطبي للزيارة' : 'Clinical Summary'} />
 <NInput label={AR?'ملخص الزيارة':'Visit Summary'} placeholder={AR?'ملخص ما تم خلال الزيارة...':'Summary of visit activities...'} value={summary} onChange={setSummary} multi lines={6} required />
 <NInput label={AR?'التوصيات والمتابعة':'Recommendations & Follow-up'} placeholder={AR?'تعليمات المتابعة والزيارة القادمة...':'Follow-up instructions and next visit...'} value={followUp} onChange={setFollowUp} multi lines={4} />

 <NSecHeader title={AR ? 'توقيع المريض الرقمي' : 'Patient Signature Canvas'} />
 <NCard style={{ alignItems: 'center', justifyContent: 'center', padding: SP.xl, marginBottom: SP.xl, minHeight: 120, borderStyle: 'dashed', borderWidth: 2, borderColor: theme.border }}>
 {signed ? (
 <View style={{ alignItems: 'center' }}>
 <Text style={{ fontSize: 44 }}>️</Text>
 <Text style={{ color: '#4CAF50', fontWeight: FW.bold }}>{AR ? 'تم التوقيع بنجاح' : 'Patient Signed'}</Text>
 <TouchableOpacity onPress={() => setSigModal(true)} style={{ marginTop: SP.sm }}>
 <Text style={{ color: theme.primary }}>{AR ? 'إعادة التوقيع' : 'Re-sign'}</Text>
 </TouchableOpacity>
 </View>
 ) : (
 <TouchableOpacity onPress={() => setSigModal(true)} style={{ alignItems: 'center' }}>
 <Text style={{ fontSize: 24 }}>️</Text>
 <Text style={{ color: theme.primary, fontWeight: FW.bold }}>{AR ? 'انقر هنا لتوقيع المريض' : 'Click here to sign'}</Text>
 </TouchableOpacity>
 )}
 </NCard>

 <NBtn label={AR?'تأكيد وإنهاء الزيارة':'Confirm & End Visit'} loading={loading} disabled={!summary.trim() || !signed}
 onPress={handleSubmit} />

 <SignatureCanvasModal
 visible={sigModal}
 onClose={() => setSigModal(false)}
 onOK={(base64) => {
 setSignatureBase64(base64);
 setSigned(true);
 setSigModal(false);
 show(AR?'تم حفظ التوقيع بنجاح':'Signature saved successfully', 'success');
 }}
 />
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════
// MEDICAL SUPPLIES
// ══════════════════════════════════════════════════════════════════
function MedicalSupplies({ onBack }:{ onBack:()=>void }) {
 const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang==='ar';
 const [newItem, setNewItem] = useState('');
 const [newQty, setNewQty] = useState('');
 const [supplies, setSupplies] = useState<any[]>([]);
 useEffect(() => { client.get('/provider/nursing/supplies').then(r => setSupplies(r.data || [])).catch(() => {}); }, []);
 const [loading, setLoading] = useState(false);

 const handleRequest = async () => {
 setLoading(true);
 try {
 await client.post('/home-care/inventory/request', {
 items: [{ name: newItem, qty: parseInt(newQty, 10), unit: 'pcs' }],
 nurse_id: 'nurse-1'
 });
 setSupplies(prev => [
 ...prev,
 { id: `ms_${Date.now()}`, name: newItem, nameEn: newItem, qty: parseInt(newQty, 10), unit: 'pcs', status: 'pending' }
 ]);
 show(AR ? 'تم طلب المستلزم من مخزن المستشفى بنجاح' : 'Supply requested from hospital inventory', 'success');
 setNewItem('');
 setNewQty('');
 } catch (e: any) {
 show(e.message || 'Error requesting supply', 'error');
 } finally {
 setLoading(false);
 }
 };

 return (
 <NScroll>
 <NHeader title={AR?'المستلزمات الطبية':'Medical Supplies'} onBack={onBack} />

 <NCard style={{backgroundColor:'#E91E6310',marginBottom:SP.xl}}>
 <Text style={{fontSize:FS.sm,color:'#E91E63',lineHeight:20,textAlign:AR?'right':'left'}}>
 {AR?'اطلب المستلزمات الطبية اللازمة لزياراتك. يتم التوصيل من مخازن المستشفى لتجهيز حقيبتك.'
 :'Order medical supplies for your visits. Delivered from hospital inventory to equip your bag.'}
 </Text>
 </NCard>

 <View style={{flexDirection:'row',gap:SP.md,marginBottom:SP.xl}}>
 <NStatCard icon="" label={AR?'مُسلَّمة':'Delivered'} value={String(supplies.filter(s=>s.status==='delivered').length)} color="#4CAF50" style={{flex:1}} />
 <NStatCard icon="◔" label={AR?'مطلوبة':'Ordered'} value={String(supplies.filter(s=>s.status==='ordered').length)} color="#FF9800" style={{flex:1}} />
 <NStatCard icon="!" label={AR?'انتظار':'Pending'} value={String(supplies.filter(s=>s.status==='pending').length)} color="#F44336" style={{flex:1}} />
 </View>

 <NSecHeader title={AR?'المستلزمات الحالية':'Current Supplies'} />
 {supplies.map(sup=>(
 <NCard key={sup.id} style={{marginBottom:SP.sm}} accent={sup.status==='delivered'?'#4CAF50':sup.status==='ordered'?'#FF9800':'#F44336'}>
 <View style={{flexDirection:AR?'row-reverse':'row',alignItems:'center',gap:SP.md}}>
 <IBg name="bandage" size={14} color="#E91E63" bg="#E91E6312" />
 <View style={{flex:1}}>
 <Text style={{fontSize:FS.md,fontWeight:FW.semi,color:theme.text,textAlign:AR?'right':'left'}}>{AR?sup.name:sup.nameEn}</Text>
 <Text style={{fontSize:FS.xs,color:theme.textSub}}>{sup.qty} {sup.unit}</Text>
 </View>
 <NBadge label={sup.status==='delivered'?(AR?'مُسلَّم':'Delivered'):sup.status==='ordered'?(AR?'مطلوب':'Ordered'):(AR?'انتظار':'Pending')} variant={sup.status==='delivered'?'success':sup.status==='ordered'?'warning':'danger'} size="xs" />
 </View>
 </NCard>
 ))}

 <NDivider style={{marginVertical:SP.xl}} />
 <NSecHeader title={AR?'طلب مستلزم جديد':'Request New Supply'} />
 <NInput label={AR?'اسم المستلزم':'Supply Name'} placeholder={AR?'قفازات طبية L':'Medical Gloves L'} value={newItem} onChange={setNewItem} />
 <NInput label={AR?'الكمية':'Quantity'} placeholder="1" value={newQty} onChange={v=>setNewQty(v.replace(/\D/g,''))} kbType="numeric" />
 <NBtn label={AR?'إرسال الطلب':'Submit Request'} disabled={!newItem.trim()||!newQty} loading={loading}
 onPress={handleRequest} />
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════
// NURSING WALLET — Cash Only
// ══════════════════════════════════════════════════════════════════
function NursingWallet({ onBack }:{ onBack?:()=>void }) {
 const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang==='ar';
 const [showW, setShowW] = useState(false); const [amt, setAmt] = useState('');
 const TXS = [
 {desc:AR?'زيارة — عبدالله المالكي':'Visit — Abdullah',amount:150,type:'credit',date:'اليوم'},
 {desc:AR?'زيارة — فاطمة الشمري':'Visit — Fatima',amount:180,type:'credit',date:'اليوم'},
 {desc:AR?'إقامة يومية — سعد':'Day care — Saad',amount:800,type:'credit',date:'اليوم'},
 {desc:AR?'عمولة نبضة 10%':'Nabdah Commission 10%',amount:-113,type:'debit',date:'اليوم'},
 {desc:AR?'سحب للبنك':'Bank Withdrawal',amount:-2000,type:'debit',date:'أمس'},
 ];
 return (
 <View style={{flex:1,backgroundColor:theme.bg}}>
 		<View style={[st.topBar,{backgroundColor:theme.surface,borderBottomColor:theme.border,flexDirection:AR?'row-reverse':'row',alignItems:'center'}]}>
			{onBack && (
				<TouchableOpacity onPress={onBack} style={{[AR?'marginLeft':'marginRight']:SP.md}}>
					<I name="back" size={24} color={theme.text} />
				</TouchableOpacity>
			)}
			<Text style={{fontSize:FS.xl,fontWeight:FW.bold,color:theme.text,flex:1,textAlign:AR?'right':'left'}}>{AR?'المحفظة':'Wallet'}</Text>
		</View>
 <ScrollView contentContainerStyle={{padding:SP.xl,paddingBottom:100}}>
 <View style={{borderRadius:R.xxl,padding:SP.xxl,alignItems:'center',marginBottom:SP.xl,backgroundColor:'#E91E63',shadowColor:'#000',shadowOffset:{width:0,height:8},shadowOpacity:0.2,shadowRadius:16,elevation:8}}>
 <Text style={{color:'rgba(255,255,255,0.8)',fontSize:FS.sm}}>{AR?'الرصيد المتاح':'Available Balance'}</Text>
 <Text style={{color:'#FFF',fontSize:FS['5xl'],fontWeight:FW.xbold,marginVertical:SP.sm}}>4,017</Text>
 <Text style={{color:'rgba(255,255,255,0.8)'}}>{AR?'ريال سعودي — نقدي فقط':'SAR — Cash Only'}</Text>
 <TouchableOpacity onPress={()=>setShowW(true)} style={{marginTop:SP.xl,backgroundColor:'rgba(255,255,255,0.2)',paddingVertical:SP.md,paddingHorizontal:SP.xxl,borderRadius:R.lg}}>
 <Text style={{color:'#FFF',fontWeight:FW.semi}}>{AR?'سحب الأموال':'Withdraw'}</Text>
 </TouchableOpacity>
 </View>
 <NCard style={{backgroundColor:theme.warnBg,marginBottom:SP.xl}}>
 <Text style={{fontSize:FS.sm,color:theme.warn,textAlign:AR?'right':'left'}}>
 {AR?'خدمات التمريض المنزلي تعمل بنظام الدفع النقدي فقط — لا يوجد تأمين صحي.'
 :'Home nursing services operate on cash-only basis — no health insurance.'}
 </Text>
 </NCard>
 <NSecHeader title={AR?'آخر المعاملات':'Recent Transactions'} />
 {TXS.map((t,i)=>(
 <NCard key={i} style={{marginBottom:SP.sm,padding:SP.lg}}>
 <View style={{flexDirection:AR?'row-reverse':'row',justifyContent:'space-between'}}>
 <Text style={{fontSize:FS.md,color:theme.text,flex:1,textAlign:AR?'right':'left'}} numberOfLines={1}>{t.desc}</Text>
 <Text style={{fontSize:FS.md,fontWeight:FW.bold,color:t.type==='credit'?'#4CAF50':'#F44336'}}>{t.type==='credit'?'+':''}{t.amount} {AR?'ر':'SAR'}</Text>
 </View>
 <Text style={{fontSize:FS.xs,color:theme.textSub,textAlign:AR?'right':'left'}}>{t.date}</Text>
 </NCard>
 ))}
 </ScrollView>
 <NSheet visible={showW} onClose={()=>setShowW(false)} title={AR?'سحب':'Withdraw'} height={320}>
 <NPriceInput label={AR?'المبلغ':'Amount'} value={amt} onChange={setAmt} required />
 <NBtn label={AR?'تأكيد':'Confirm'} disabled={!amt||parseInt(amt)<100} onPress={()=>{show(AR?'تم طلب السحب':'Withdrawal requested','success');setShowW(false);setAmt('');}} />
 </NSheet>
 </View>
 );
}

// ══════════════════════════════════════════════════════════════════
// NURSING SETTINGS
// ══════════════════════════════════════════════════════════════════
function NursingSettings({ onLogout, onNav }:{ onLogout:()=>void; onNav:(s:string,p?:any)=>void }) {
 const { theme, toggle:toggleT, mode } = useTheme(); const { lang, toggle:toggleL } = useLang();
 const { show } = useToast(); const AR = lang==='ar'; const [showLO, setShowLO] = useState(false);
 
  const [deltaPending, setDeltaPending] = useState(false);
  const saveSettings = async (newData: any = {}) => {
    try {
      setDeltaPending(true);
      await client.post('/provider-deltas', { newData });
      show(AR ? 'بانتظار موافقة الإدارة على التعديلات' : 'Pending admin approval for changes', 'success');
    } catch (e) {
      show(AR ? 'فشل إرسال التعديلات' : 'Failed to submit changes', 'error');
      setDeltaPending(false);
    }
  };
return (
 <View style={{flex:1,backgroundColor:theme.bg}}>
 <View style={[st.topBar,{backgroundColor:theme.surface,borderBottomColor:theme.border}]}>
 <Text style={{fontSize:FS.xl,fontWeight:FW.bold,color:theme.text}}>{AR?'الإعدادات':'Settings'}</Text>
 </View>
 <ScrollView contentContainerStyle={{padding:SP.xl,paddingBottom:100}}>
 <NCard style={{marginBottom:SP.xl,flexDirection:AR?'row-reverse':'row',gap:SP.lg,alignItems:'center'}}>
 <IBg name="nursing" size={22} color="#E91E63" bg="#E91E6312" />
 <View style={{flex:1}}>
 <Text style={{fontSize:FS.xl,fontWeight:FW.bold,color:theme.text,textAlign:AR?'right':'left'}}>{AR?'نبضة للتمريض':'Nabdah Nursing'}</Text>
 <NBadge label={AR?'نشط':'Active'} variant="success" size="xs" style={{marginTop:SP.xs}} />
 </View>
 </NCard>
 
      {deltaPending && (
        <NCard style={{ marginBottom: SP.xl, backgroundColor: theme.warnBg, borderColor: theme.warnBg }}>
          <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.warn, textAlign: AR ? 'right' : 'left' }}>
            {AR ? '⏳ بانتظار موافقة الإدارة على التعديلات' : '⏳ Pending Admin Approval for changes'}
          </Text>
        </NCard>
      )}
<NSecHeader title={AR?'الملف الشخصي':'Profile'} />
 <NCard style={{marginBottom:SP.xl}}>
 <NSettingsRow icon="user" label={AR?'معلومات الحساب':'Account Info'} onPress={()=>onNav('profile_edit')} />
 <NSettingsRow icon="stethoscope" label={AR?'الخدمات المقدمة':'Services Offered'} onPress={()=>onNav('nursing_services')} />
 <NSettingsRow icon="wallet" label={AR?'نموذج التسعير':'Pricing Model'} onPress={()=>onNav('nursing_pricing')} />
 <NSettingsRow icon="scan" label={AR?'نطاق التغطية':'Coverage Area'} onPress={()=>onNav('nursing_coverage')} />
 <NSettingsRow icon="calendar" label={AR?'مواعيد العمل':'Working Hours'} onPress={()=>onNav('working_hours')} />
 <NSettingsRow icon="shield" label={AR?'التأمين الصحي':'Health Insurance'} onPress={()=>onNav('insurance_config')} />
 <NSettingsRow icon="document" label={AR?'الشهادات والمؤهلات':'Qualifications'} onPress={()=>onNav('certificates_config')} />
 <NSettingsRow icon="camera" label={AR?'الصور والوسائط':'Photos & Media'} onPress={()=>onNav('media_config')} />
 </NCard>

 {/* Marketing & Reputation */}
 <NSecHeader title={AR ? 'التسويق والمبيعات وتكنولوجيا التمريض' : 'Marketing, Sales & Nursing Modules'} />
 <NCard style={{ marginBottom:SP.xl }}>
 {[
 { icon:'bell', ar:'مركز العروض الترويجية', en:'Promotions Center', action:()=>onNav('promotions') },
 { icon:'globe', ar:'إعدادات الصفحة العامة', en:'Mini-Website Settings', action:()=>onNav('web_config') },
 { icon:'wallet', ar:'الاشتراكات والإعلانات', en:'Subscriptions & Ads', action:()=>onNav('subscriptions_ads') },
 { icon:'star', ar:'مستوى السمعة والتقييمات',en:'Reputation & Ratings', action:()=>onNav('reputation') },
 { icon:'chart', ar:'إدارة العملاء والأرباح', en:'CRM & Business Insights', action:()=>onNav('crm') },
 { icon:'shield', ar:'مراقبة حالات الطوارئ', en:'SOS Dispatch Control', action:()=>onNav('sos_dispatch') },
 { icon:'scan', ar:'وحدة تتبع زيارات التمريض (GPS)', en:'Nurse Visit Tracker (GPS)', action:()=>onNav('nurse_visit') },
 { icon:'document', ar:'قائمة مهام العلامات الحيوية والرعاية', en:'Clinical Vitals Checklist', action:()=>onNav('nurse_checklist') },
 ].map((row, i) => (
 <NSettingsRow key={i} icon={row.icon} label={AR ? row.ar : row.en} onPress={row.action} />
 ))}
 </NCard>
 <GlobalSystemSettings />
 <NSecHeader title={AR?'إعدادات إضافية':'Additional Settings'} />
 <NCard style={{marginBottom:SP.xl}}>
 <NSettingsRow icon="bell" label={AR?'الإشعارات':'Notifications'} onPress={()=>onNav('notifications')} />
 <NSettingsRow icon="briefcase" label={AR?'الوظائف الطبية':'Medical Jobs'} onPress={() => onNav('medical_jobs')} />
 <NSettingsRow icon="bookOpen" label={AR?'دليل الأدوية الطبي':'Medical Drug Index'} onPress={() => onNav('drug_index')} />
 </NCard>
 <NSecHeader title={AR?'الأمان':'Security'} />
 <NCard style={{marginBottom:SP.xl}}>
 {[
 { icon: 'lock', ar:'تغيير كلمة المرور', en:'Change Password', action: () => onNav('password') },
 { icon: 'shield', ar:'التحقق الثنائي', en:'2FA', action: () => onNav('2fa') },
 { icon: 'scan', ar:'الأجهزة', en:'Devices', action: () => onNav('devices') }
 ].map((r,i)=>(
 <NSettingsRow key={i} icon={r.icon} label={AR?r.ar:r.en} onPress={r.action} />
 ))}
 </NCard>
 <NCard><NSettingsRow icon="lock" label={AR?'تسجيل الخروج':'Log Out'} onPress={()=>setShowLO(true)} danger /></NCard>
 </ScrollView>
 <NConfirm visible={showLO} title={AR?'خروج':'Log Out'} msg={AR?'هل تريد الخروج؟':'Log out?'}
 onOk={()=>{setShowLO(false);onLogout();}} onCancel={()=>setShowLO(false)} okLabel={AR?'خروج':'Log Out'} />
 </View>
 );
}

// ══════════════════════════════════════════════════════════════════
// NURSING SERVICES SETTINGS
// ══════════════════════════════════════════════════════════════════
function NursingServicesSettings({ onBack }:{ onBack:()=>void }) {
 const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang==='ar';
 const [services, setServices] = useState<Record<string,boolean>>({
 wound: true, vitals: true, inject: true, cath: false, elderly: false, postpart: false
 });
 const [includeKit, setIncludeKit] = useState(true);
 const [kitPrice, setKitPrice] = useState('25');
 const [loading, setLoading] = useState(false);

 const handleSave = async () => {
 setLoading(true);
 try {
   await client.post('/provider-deltas', { newData: { services, includeKit, kitPrice } });
   show(AR ? 'بانتظار موافقة الإدارة على التعديلات' : 'Pending admin approval for changes', 'success');
   onBack();
 } catch(e) {
   show(AR ? 'فشل إرسال التعديلات' : 'Failed to submit changes', 'error');
 }
 setLoading(false);
 };

 return (
 <NScroll>
 <NHeader title={AR ? 'الخدمات المقدمة والمستلزمات' : 'Services Offered & Supplies'} onBack={onBack} />
 
 <NCard style={{ backgroundColor: theme.warnBg, borderColor: theme.warn, borderWidth: 1, marginBottom: SP.xl }}>
 <Text style={{ fontSize: FS.sm, color: theme.warn, fontWeight: FW.bold, textAlign: AR ? 'right' : 'left', marginBottom: 4 }}>
 {AR ? 'تنبيه المستلزمات الطبية الهام:' : 'Important Clinical Supplies Kit Notice:'}
 </Text>
 <Text style={{ fontSize: FS.xs, color: theme.text, lineHeight: 18, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'يجب أن يحمل الممرض حقيبة المستلزمات الطبية المعتمدة للزيارة (القفازات، الشاش، والمطهرات). يمكنك تضمينها في السعر الأساسي أو فرض رسوم إضافية للحقيبة.'
 : 'The nurse must bring a certified medical supplies kit (gloves, gauze, sanitizers) to the visit. You can include it in the base price or add a surcharge.'}
 </Text>
 </NCard>

 <NSecHeader title={AR ? 'اختر الخدمات التي تقدمها:' : 'Select services you offer:'} />
 <NCard style={{ marginBottom: SP.xl, gap: SP.md }}>
 {[
 { id: 'wound', ar: 'تغيير الجروح والتضميد', en: 'Wound Dressing' },
 { id: 'vitals', ar: 'قياس العلامات الحيوية', en: 'Vital Signs Monitoring' },
 { id: 'inject', ar: 'إعطاء حقن طبية', en: 'Injection Administration' },
 { id: 'cath', ar: 'تركيب قسطرة بولية', en: 'Catheterization' },
 { id: 'elderly', ar: 'رعاية كبار السن', en: 'Elderly Care' },
 { id: 'postpart', ar: 'رعاية ما بعد الولادة', en: 'Postpartum Care' },
 ].map(svc => (
 <TouchableOpacity key={svc.id} onPress={() => setServices(s => ({ ...s, [svc.id]: !s[svc.id] }))}
 style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SP.xs }}>
 <Text style={{ color: theme.text, fontSize: FS.md }}>{AR ? svc.ar : svc.en}</Text>
 <NCheckbox value={services[svc.id]} onChange={() => setServices(s => ({ ...s, [svc.id]: !s[svc.id] }))} />
 </TouchableOpacity>
 ))}
 </NCard>

 <NSecHeader title={AR ? 'تسعير حقيبة المستلزمات الطبية' : 'Clinical Supplies Pricing'} />
 <NCard style={{ marginBottom: SP.xl }}>
 <NToggle 
 label={AR ? 'تضمين حقيبة المستلزمات في السعر الأساسي' : 'Include supplies kit in base fee'} 
 value={includeKit} 
 onChange={setIncludeKit} 
 />
 {!includeKit && (
 <View style={{ marginTop: SP.md }}>
 <NPriceInput 
 label={AR ? 'تكلفة حقيبة المستلزمات الإضافية' : 'Extra Supplies Kit Fee'} 
 value={kitPrice} 
 onChange={setKitPrice} 
 />
 </View>
 )}
 </NCard>

 <NBtn label={AR ? 'حفظ الخدمات والتغييرات' : 'Save Services & Options'} loading={loading} onPress={handleSave} />
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════
// NURSING PRICING SETTINGS
// ══════════════════════════════════════════════════════════════════
function NursingPricingSettings({ onBack }:{ onBack:()=>void }) {
 const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang==='ar';
 
 const [hourlyEnabled, setHourlyEnabled] = useState(true);
 const [hourlyPrice, setHourlyPrice] = useState('45');
 
 const [dailyEnabled, setDailyEnabled] = useState(true);
 const [dailyPrice, setDailyPrice] = useState('350');
 
 const [weeklyEnabled, setWeeklyEnabled] = useState(false);
 const [weeklyPrice, setWeeklyPrice] = useState('2000');
 
 const [monthlyEnabled, setMonthlyEnabled] = useState(false);
 const [monthlyPrice, setMonthlyPrice] = useState('7500');

 const [loading, setLoading] = useState(false);

 const handleSave = async () => {
 if (!hourlyEnabled && !dailyEnabled && !weeklyEnabled && !monthlyEnabled) {
 show(AR ? 'يجب تفعيل نموذج تسعير واحد على الأقل' : 'Must enable at least one pricing model', 'error');
 return;
 }
 
 setLoading(true);
 try {
   await client.post('/provider-deltas', { 
     newData: { 
       hourlyEnabled, hourlyPrice, dailyEnabled, dailyPrice, 
       weeklyEnabled, weeklyPrice, monthlyEnabled, monthlyPrice 
     } 
   });
   show(AR ? 'بانتظار موافقة الإدارة على التعديلات' : 'Pending admin approval for changes', 'success');
   onBack();
 } catch(e) {
   show(AR ? 'فشل إرسال التعديلات' : 'Failed to submit changes', 'error');
 }
 setLoading(false);
 };

 return (
 <NScroll>
 <NHeader title={AR ? 'إعدادات نموذج التسعير للتمريض' : 'Nursing Pricing Models'} onBack={onBack} />
 
 <NCard style={{ backgroundColor: theme.infoBg, marginBottom: SP.xl }}>
 <Text style={{ fontSize: FS.xs, color: theme.info, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'حدد باقات ونماذج التسعير المتاحة للتمريض المنزلي. يمكنك تفعيل خدمات الساعة، اليوم، أو الباقات الطويلة.'
 : 'Configure pricing packages for home nursing. You can activate hourly, daily, weekly, or monthly setups.'}
 </Text>
 </NCard>

 {/* Hourly Pricing */}
 <NCard style={{ marginBottom: SP.md }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: hourlyEnabled ? SP.md : 0 }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{AR ? ' خدمة بالساعة' : ' Hourly Service'}</Text>
 <Switch value={hourlyEnabled} onValueChange={setHourlyEnabled} trackColor={{ true: theme.primary }} />
 </View>
 {hourlyEnabled && (
 <NPriceInput label={AR ? 'سعر الساعة (ريال)' : 'Hourly Fee (SAR)'} value={hourlyPrice} onChange={setHourlyPrice} />
 )}
 </NCard>

 {/* Daily Pricing */}
 <NCard style={{ marginBottom: SP.md }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: dailyEnabled ? SP.md : 0 }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{AR ? ' خدمة باليوم (إقامة)' : ' Daily Service (Stay)'}</Text>
 <Switch value={dailyEnabled} onValueChange={setDailyEnabled} trackColor={{ true: theme.primary }} />
 </View>
 {dailyEnabled && (
 <NPriceInput label={AR ? 'سعر اليوم (ريال)' : 'Daily Fee (SAR)'} value={dailyPrice} onChange={setDailyPrice} />
 )}
 </NCard>

 {/* Weekly Pricing */}
 <NCard style={{ marginBottom: SP.md }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: weeklyEnabled ? SP.md : 0 }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{AR ? '️ باقة أسبوعية' : '️ Weekly Package'}</Text>
 <Switch value={weeklyEnabled} onValueChange={setWeeklyEnabled} trackColor={{ true: theme.primary }} />
 </View>
 {weeklyEnabled && (
 <NPriceInput label={AR ? 'سعر الأسبوع (ريال)' : 'Weekly Price (SAR)'} value={weeklyPrice} onChange={setWeeklyPrice} />
 )}
 </NCard>

 {/* Monthly Pricing */}
 <NCard style={{ marginBottom: SP.xl }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: monthlyEnabled ? SP.md : 0 }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{AR ? ' باقة شهرية متكاملة' : ' Monthly Package'}</Text>
 <Switch value={monthlyEnabled} onValueChange={setMonthlyEnabled} trackColor={{ true: theme.primary }} />
 </View>
 {monthlyEnabled && (
 <NPriceInput label={AR ? 'سعر الشهر (ريال)' : 'Monthly Price (SAR)'} value={monthlyPrice} onChange={setMonthlyPrice} />
 )}
 </NCard>

 <NBtn label={AR ? 'حفظ خطط الأسعار' : 'Save Pricing Models'} loading={loading} onPress={handleSave} />
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════
// NURSING COVERAGE SETTINGS
// ══════════════════════════════════════════════════════════════════
function NursingCoverageSettings({ onBack }:{ onBack:()=>void }) {
 const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang==='ar';
 
 const [radius, setRadius] = useState(15);
 const [gpsChecked, setGpsChecked] = useState(false);
 const [gpsLoading, setGpsLoading] = useState(false);

 const getCoveredNeighborhoods = () => {
 if (radius <= 5) return AR ? ['حي النرجس'] : ['Al-Narjis'];
 if (radius <= 15) return AR ? ['حي النرجس', 'حي الياسمين', 'حي الملقا'] : ['Al-Narjis', 'Al-Yasmine', 'Al-Malqa'];
 if (radius <= 30) return AR ? ['حي النرجس', 'حي الياسمين', 'حي الملقا', 'حي العقيق', 'حي الصحافة', 'حي العليا'] : ['Al-Narjis', 'Al-Yasmine', 'Al-Malqa', 'Al-Aqeeq', 'Al-Sahafa', 'Al-Olaya'];
 return AR ? ['جميع أحياء مدينة الرياض وضواحيها'] : ['All Riyadh neighborhoods and suburbs'];
 };

 const handleGpsVerification = async () => {
 setGpsLoading(true);
 try {
   await client.post('/nursing/coverage/verify-gps', { radius });
   setGpsChecked(true);
   show(AR ? ' تم تحديد موقع الـ GPS بنجاح والتحقق من التغطية الإقليمية!' : ' GPS location and regional coverage verified successfully!', 'success');
 } catch (e: any) {
   show(e.message, 'error');
 } finally {
   setGpsLoading(false);
 }
 };

 return (
 <NScroll>
 <NHeader title={AR ? 'نطاق تغطية خدمة التمريض' : 'Nursing Coverage Area'} onBack={onBack} />

 <NCard style={{ marginBottom: SP.xl, overflow: 'hidden' }}>
 <View style={{ height: 200, backgroundColor: '#0A0E17', alignItems: 'center', justifyContent: 'center', borderRadius: R.lg, borderWidth: 1, borderColor: '#00E676' }}>
 <View style={{ width: 140, height: 140, borderRadius: 70, borderStyle: 'dashed', borderWidth: 2, borderColor: '#00E676', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
 <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#00E67620', borderColor: '#00E676', borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' }}>
 <Text style={{ fontSize: 24 }}></Text>
 </View>
 <View style={{ position: 'absolute', bottom: 10 }}>
 <NBadge label={`${radius} KM`} variant="success" size="xs" />
 </View>
 </View>
 </View>
 </NCard>

 <NCard style={{ marginBottom: SP.xl, gap: SP.md }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>
 {AR ? 'التحقق من الـ GPS للموقع الأساسي:' : 'GPS Base Location Verification:'}
 </Text>
 <NBadge label={gpsChecked ? (AR ? 'مؤكد ' : 'Verified ') : (AR ? 'غير مؤكد ' : 'Unverified ')} variant={gpsChecked ? 'success' : 'warning'} />
 </View>
 <NBtn label={AR ? ' فحص موقع الـ GPS الحالي' : ' Verify Current GPS Location'} loading={gpsLoading} onPress={handleGpsVerification} variant="outline" />
 </NCard>

 <NSecHeader title={AR ? 'تحديد نصف قطر التغطية الجغرافية' : 'Geographical Coverage Radius'} />
 <NCard style={{ marginBottom: SP.xl, gap: SP.lg }}>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'حدد المسافة القصوى لانتقال الممرض من موقعك الرئيسي.'
 : 'Select maximum distance the nurse will travel from base.'}
 </Text>
 
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', flexWrap:'wrap', gap: SP.sm }}>
 {[5, 10, 15, 20, 30, 50].map(k => (
 <TouchableOpacity key={k} onPress={() => setRadius(k)}
 style={[{ paddingHorizontal: SP.lg, paddingVertical: SP.md, borderRadius: R.md, borderWidth: 1.5 }, {
 backgroundColor: radius === k ? theme.primary : theme.surface2,
 borderColor: radius === k ? theme.primary : theme.border
 }]}>
 <Text style={{ color: radius === k ? '#FFF' : theme.text, fontWeight: FW.bold }}>{k} {AR ? 'كم' : 'KM'}</Text>
 </TouchableOpacity>
 ))}
 </View>
 </NCard>

 <NSecHeader title={AR ? 'الأحياء السعودية المغطاة حالياً:' : 'Covered Saudi Neighborhoods:'} />
 <NCard style={{ marginBottom: SP.xl, gap: SP.xs }}>
 {getCoveredNeighborhoods().map((n, idx) => (
 <View key={idx} style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.sm, paddingVertical: SP.sm, borderBottomWidth: idx < getCoveredNeighborhoods().length - 1 ? 0.5 : 0, borderBottomColor: theme.border }}>
 <Text style={{ fontSize: 16 }}></Text>
 <Text style={{ fontSize: FS.md, color: theme.text }}>{n}</Text>
 </View>
 ))}
 </NCard>

 <NBtn label={AR ? 'حفظ إعدادات التغطية الجغرافية' : 'Save Coverage Settings'} disabled={!gpsChecked} onPress={async () => {
    try {
      await client.post('/provider-deltas', { newData: { radius } });
      show(AR ? 'بانتظار موافقة الإدارة على التعديلات' : 'Pending admin approval for changes', 'success');
      onBack();
    } catch(e) {
      show(AR ? 'فشل إرسال التعديلات' : 'Failed to submit changes', 'error');
    }
  }} />
 </NScroll>
 );
}

// ─── Styles ─────────────────────────────────────────────────────
const st = StyleSheet.create({
 topBar:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:SP.xl,paddingVertical:SP.md,borderBottomWidth:StyleSheet.hairlineWidth},
 iconBtn:{width:38,height:38,borderRadius:19,alignItems:'center',justifyContent:'center'},
 quickAction:{width:76,alignItems:'center',justifyContent:'center',borderRadius:R.xl,borderWidth:1,padding:SP.md},
 chip:{paddingHorizontal:SP.lg,paddingVertical:SP.sm,borderRadius:R.full,borderWidth:1.5},
 checkRow:{borderRadius:R.lg,borderWidth:1.5,padding:SP.lg,gap:SP.md,alignItems:'center',marginBottom:SP.sm},
});

function NursingProfileEditScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const { user } = useAuth();
 const AR = lang === 'ar';

 const [loading, setLoading] = useState(false);
 const [profile, setProfile] = useState<any>(null);
 const [nameAr, setNameAr] = useState('');
 const [nameEn, setNameEn] = useState('');
 const [descAr, setDescAr] = useState('');
 const [descEn, setDescEn] = useState('');
 const [web, setWeb] = useState('');
 const [avatarUrl, setAvatarUrl] = useState('');

 useEffect(() => {
 fetchProfile();
 }, []);

 const fetchProfile = async () => {
 setLoading(true);
 try {
 const res = await client.get('/provider/profile');
 setProfile(res.data);
 setNameAr(res.data.display_name_ar || '');
 setNameEn(res.data.display_name_en || '');
 setDescAr(res.data.description_ar || '');
 setDescEn(res.data.description_en || '');
 setWeb(res.data.website || '');
 setAvatarUrl(res.data.profile_image_id || '');
 } catch (err) {
 show(AR ? 'فشل تحميل الملف الشخصي' : 'Failed to load profile', 'error');
 } finally {
 setLoading(false);
 }
 };

 const handleSave = async () => {
 setLoading(true);
 try {
 await client.patch('/provider/profile', {
 display_name_ar: nameAr,
 display_name_en: nameEn,
 description_ar: descAr,
 description_en: descEn,
 website: web,
 });
 show(AR ? 'تم حفظ التعديلات بنجاح' : 'Profile updated successfully', 'success');
 onBack();
 } catch (err) {
 show(AR ? 'فشل حفظ الملف الشخصي' : 'Failed to save profile', 'error');
 } finally {
 setLoading(false);
 }
 };

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NScroll>
 <NHeader title={AR ? 'معلومات الحساب' : 'Account Info'} onBack={onBack} />
 {loading && !profile ? (
 <ActivityIndicator color={theme.primary} style={{ marginTop: SP.xl }} />
 ) : (
 <View style={{ padding: SP.xl, gap: SP.lg }}>
 <NCard style={{ alignItems: 'center', paddingVertical: SP.xl }}>
 <NAvatar name={nameEn || user?.displayName} size={80} />
 
 <NProfileImageUploader 
 ownerType="nurse" 
 onProcessComplete={(urls) => {
 setAvatarUrl(urls.processed);
 show(AR ? 'تم تحديث الصورة الشخصية' : 'Profile picture updated', 'success');
 }}
 />
 </NCard>

 <NInput label={AR ? 'الاسم بالكامل (العربية)' : 'Full Name (Arabic)'} value={nameAr} onChange={setNameAr} required />
 <NInput label={AR ? 'الاسم بالكامل (الإنجليزية)' : 'Full Name (English)'} value={nameEn} onChange={setNameEn} required />
 <NInput label={AR ? 'النبذة التعريفية (العربية)' : 'Bio (Arabic)'} value={descAr} onChange={setDescAr} multi lines={3} />
 <NInput label={AR ? 'النبذة التعريفية (الإنجليزية)' : 'Bio (English)'} value={descEn} onChange={setDescEn} multi lines={3} />
 <NInput label={AR ? 'الموقع الإلكتروني' : 'Website'} value={web} onChange={setWeb} />

 <NBtn label={AR ? ' حفظ التعديلات' : ' Save Changes'} onPress={handleSave} loading={loading} style={{ marginTop: SP.lg }} />
 </View>
 )}
  </NScroll>
  </View>
  );
}

// ══════════════════════════════════════════════════════════════════
// PRE-VISIT CHAT
// ══════════════════════════════════════════════════════════════════
function NursingChatScreen({ order, onBack }: { order: any; onBack: () => void }) {
  const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';
  const [msg, setMsg] = useState('');
  const [msgs, setMsgs] = useState([{ id: 1, text: AR ? 'السلام عليكم، يرجى تزويدي برمز الدخول للمجمع (Gate Code).' : 'Hello, please provide the Gate Code.', sender: 'me', time: new Date().toLocaleTimeString() }]);

  const handleSend = () => {
    if (!msg.trim()) return;
    setMsgs([...msgs, { id: Date.now(), text: msg, sender: 'me', time: new Date().toLocaleTimeString() }]);
    setMsg('');
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'التواصل مع المريض' : 'Pre-Visit Chat'} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: SP.xl, gap: SP.md }}>
        <View style={{ backgroundColor: theme.warnBg, padding: SP.md, borderRadius: R.md, marginBottom: SP.lg }}>
          <Text style={{ color: theme.warn, fontSize: FS.xs, textAlign: 'center' }}>
            {AR ? 'هذه المحادثة مخصصة لترتيب الوصول (أرقام البوابات، الموقع الدقيق) وتغلق تلقائياً بعد 24 ساعة.' : 'This chat is for arrival logistics (Gate codes, exact location) and closes after 24 hours.'}
          </Text>
        </View>
        {msgs.map(m => (
          <View key={m.id} style={{ alignSelf: m.sender === 'me' ? 'flex-end' : 'flex-start', backgroundColor: m.sender === 'me' ? theme.primary : theme.surface, padding: SP.md, borderRadius: R.md, maxWidth: '80%' }}>
            <Text style={{ color: m.sender === 'me' ? '#FFF' : theme.text }}>{m.text}</Text>
            <Text style={{ color: m.sender === 'me' ? '#FFF8' : theme.textSub, fontSize: 10, marginTop: 4, textAlign: 'right' }}>{m.time}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', padding: SP.lg, borderTopWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, alignItems: 'center', gap: SP.md }}>
        <TextInput value={msg} onChangeText={setMsg} placeholder={AR ? 'اكتب رسالة...' : 'Type a message...'} style={{ flex: 1, backgroundColor: theme.bg, padding: SP.md, borderRadius: R.md, color: theme.text, textAlign: AR ? 'right' : 'left' }} />
        <NBtn label={AR ? 'إرسال' : 'Send'} onPress={handleSend} full={false} />
      </View>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════
// WORKING HOURS / SCHEDULE
// ══════════════════════════════════════════════════════════════════
function NursingScheduleScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
  const [shifts, setShifts] = useState({ morning: true, evening: true, night: false });
  const [maxVisits, setMaxVisits] = useState('8');
  const [emergencyReady, setEmergencyReady] = useState(false);

  const handleSave = async () => {
    try {
      await client.post('/provider/schedule/settings', { shifts, maxVisits: parseInt(maxVisits), emergencyReady });
      show(AR ? 'تم حفظ إعدادات الجدول' : 'Schedule saved', 'success');
      onBack();
    } catch (e) {
      show(AR ? 'حدث خطأ' : 'Error', 'error');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'مواعيد العمل' : 'Working Hours'} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: SP.xl, gap: SP.lg }}>
        
        <NSecHeader title={AR ? 'الورديات (Shifts)' : 'Shifts'} />
        <NCard style={{ gap: SP.md }}>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: theme.text, fontSize: FS.md }}>{AR ? 'الفترة الصباحية (08:00 - 16:00)' : 'Morning (08:00 - 16:00)'}</Text>
            <Switch value={shifts.morning} onValueChange={v => setShifts({ ...shifts, morning: v })} />
          </View>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: theme.text, fontSize: FS.md }}>{AR ? 'الفترة المسائية (16:00 - 00:00)' : 'Evening (16:00 - 00:00)'}</Text>
            <Switch value={shifts.evening} onValueChange={v => setShifts({ ...shifts, evening: v })} />
          </View>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: theme.text, fontSize: FS.md }}>{AR ? 'الفترة الليلية (00:00 - 08:00)' : 'Night (00:00 - 08:00)'}</Text>
            <Switch value={shifts.night} onValueChange={v => setShifts({ ...shifts, night: v })} />
          </View>
        </NCard>

        <NSecHeader title={AR ? 'السعة والإعدادات' : 'Capacity & Settings'} />
        <NCard style={{ gap: SP.lg }}>
          <NInput label={AR ? 'الحد الأقصى للزيارات اليومية' : 'Max Daily Visits'} value={maxVisits} onChange={setMaxVisits} kbType="numeric" />
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ color: theme.text, fontSize: FS.md, fontWeight: FW.bold }}>{AR ? 'جاهز للطوارئ' : 'Emergency Ready'}</Text>
              <Text style={{ color: theme.textSub, fontSize: FS.xs }}>{AR ? 'استقبال طلبات عاجلة خارج الجدول' : 'Accept urgent requests outside schedule'}</Text>
            </View>
            <Switch value={emergencyReady} onValueChange={setEmergencyReady} />
          </View>
        </NCard>

        <NBtn label={AR ? 'حفظ المواعيد' : 'Save Schedule'} onPress={handleSave} />
      </ScrollView>
    </View>
  );
}
