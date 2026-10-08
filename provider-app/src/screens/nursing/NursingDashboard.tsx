/**
 * NABDAH PLUS – PHASE 5 · NURSING DASHBOARD (10 screens)
 *
 * 01. NursingDashboardNavigator — main navigator
 * 02. NursingHomeTab — stats + active visits + incoming orders
 * 03. NursingFieldOps (own file) — THE single home-visit flow: accept, transit, arrive, care, sign, complete
 * 04. VisitChecklist — per-visit tasks checklist
 * 06. CarePlan — long-term care plan for chronic patients
 * 07. ProgressNotes — daily nursing notes per patient
 * 09. MedicalSupplies — request/track medical supplies
 * 10. Wallet via shared ProviderWalletScreen (governed withdrawals)
 * 11. NursingSettings — profile + schedule + services
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AppointmentStatus } from '../../types/contracts';
import {
 View, Text, TouchableOpacity, ScrollView, StyleSheet,
 Animated, FlatList, Alert, Dimensions, Switch, RefreshControl, TextInput,
 ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useLang, useAuth, useToast } from '../../context';
import client from '../../api/client';
import { InsuranceRequestsScreen } from '../shared/InsuranceRequestsScreen';
import { SignatureCanvasModal } from '../../components/SignatureCanvasModal';
import {
 NBtn, NCard, NInput, NStatCard, NAvatar, NBadge,
 NHeader, NScroll, NSheet, NSearch, NToggle, NSettingsRow,
 NSecHeader, NConfirm, NEmpty, NOnlineToggle, NBottomNav,
 NDivider, NPriceInput, NCheckbox, NProfileImageUploader
} from '../../components/ui';
import { I, IBg } from '../../components/icons';
import { SP, R, FS, FW, C } from '../../constants';
import { useServicesCatalog } from '../../api/catalogs';

import {
 PromotionsDashboard, CreateCampaignScreen, 
 SubscriptionsAdsScreen, AffiliatePortal, ReputationHub,
 LiveOrderAlarmModal, CrmHub, RevenueInsights,
 SosDispatchScreen, GpsRouterScreen,
 NurseVisitConsole, NurseChecklistConsole
} from '../shared/BlueprintScreens';
import { MedicalJobsScreen, MedicalDrugIndexScreen, InsuranceConfigScreen, CertificatesConfigScreen, MediaConfigScreen, ProviderWalletScreen, ProviderProfileEditor, WithdrawalWorkflow, ProviderHomeStats, GlobalSystemSettings } from '../shared/SharedScreens';
import { NotificationsCenterScreen, SecurityManagementScreen } from '../shared/RealScreens';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();
const { width: W } = Dimensions.get('window');

// Connected to backend APIs for nursing orders, checklist, and supplies

// ══════════════════════════════════════════════════════════════════
// NAVIGATOR
// ══════════════════════════════════════════════════════════════════
import { NursingFieldOps } from './NursingFieldOps';
import { tokens, withAlpha } from '../../theme/tokens';

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
               {incomingRequest.scheduled_at ? (
               <Text style={{ fontSize: FS.sm, color: theme.primary, fontWeight: FW.bold, textAlign: AR ? 'right' : 'left' }}>
                {AR ? 'الموعد: ' : 'Scheduled: '}{new Date(incomingRequest.scheduled_at).toLocaleString(AR ? 'ar-SA-u-ca-gregory' : 'en-GB')}
               </Text>
               ) : null}
               <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginTop: SP.md }}>
               <NBtn label={AR ? 'قبول' : 'Accept'} style={{ flex: 1 }} onPress={async () => {
               try {
               // governed accept (workflow engine; a card visit must be paid first)
               await client.post(`/provider/jobs/nursing/${incomingRequest.id}/accept`, {});
               show(AR ? 'تم قبول الطلب بنجاح' : 'Request accepted successfully', 'success');
               setIncomingRequest(null);
               fetchJobs();
               } catch (e: any) {
               show(e.message || 'Error', 'error');
               }
               }} />
               <NBtn label={AR ? 'رفض' : 'Reject'} variant="danger" style={{ flex: 1 }} onPress={async () => {
               try {
               await client.post(`/provider/jobs/nursing/${incomingRequest.id}/reject`, { reason: 'provider_declined' });
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

      <Stack.Screen name="order_detail">{({ navigation, route }: any) => <NursingFieldOps order={route.params?.param} onBack={() => navigation.goBack()} onRefresh={fetchJobs} onNavigate={(s: string, p?: unknown) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
      <Stack.Screen name="checklist">{({ navigation, route }: any) => <VisitChecklist order={route.params?.param} onBack={() => navigation.goBack()} onNav={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
      <Stack.Screen name="care_plan">{({ navigation, route }: any) => <CarePlan patient={route.params?.param} onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="progress">{({ navigation, route }: any) => <ProgressNotes patient={route.params?.param} onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="supplies">{({ navigation }: any) => <MedicalSupplies onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="nursing_services">{({ navigation }: any) => <NursingServicesSettings onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="nursing_pricing">{({ navigation }: any) => <NursingPricingSettings onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="nursing_coverage">{({ navigation }: any) => <NursingCoverageSettings onBack={() => navigation.goBack()} />}</Stack.Screen>

      <Stack.Screen name="promotions">{({ navigation }: any) => <PromotionsDashboard onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
      <Stack.Screen name="create_promo">{({ navigation }: any) => <CreateCampaignScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="web_config">{({ navigation }: any) => <ProviderProfileEditor role="nursing" initialSection="public" onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="subscriptions_ads">{({ navigation }: any) => <SubscriptionsAdsScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
      <Stack.Screen name="affiliate">{({ navigation }: any) => <AffiliatePortal onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="reputation">{({ navigation }: any) => <ReputationHub onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="crm">{({ navigation }: any) => <CrmHub onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
      <Stack.Screen name="revenue_insights">{({ navigation }: any) => <RevenueInsights onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="sos_dispatch">{({ navigation }: any) => <SosDispatchScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
      <Stack.Screen name="gps_router">{({ navigation, route }: any) => <GpsRouterScreen patient={route.params?.param} onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="nurse_visit">{({ navigation }: any) => <NurseVisitConsole onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
      <Stack.Screen name="nurse_checklist">{({ navigation }: any) => <NurseChecklistConsole onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="profile_edit">{({ navigation }: any) => <ProviderProfileEditor role="nursing" onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="medical_jobs">{({ navigation }: any) => <MedicalJobsScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="drug_index">{({ navigation }: any) => <MedicalDrugIndexScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="insurance_config">{({ navigation }: any) => <InsuranceConfigScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="certificates_config">{({ navigation }: any) => <CertificatesConfigScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="media_config">{({ navigation }: any) => <MediaConfigScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="wallet">{({ navigation }: any) => <ProviderWalletScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
      <Stack.Screen name="withdrawal_workflow">{({ navigation }: any) => <WithdrawalWorkflow onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="chat">{({ navigation, route }: any) => <NursingChatScreen order={route.params?.param} onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="insurance_requests">{({ navigation }: any) => <InsuranceRequestsScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
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
 const insets = useSafeAreaInsets();
 const { theme } = useTheme(); const { lang } = useLang(); const AR = lang==='ar';
 const nursingSvcs = useServicesCatalog('nursing');
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
 <View style={[st.topBar,{backgroundColor:theme.surface,borderBottomColor:theme.border,flexDirection:AR?'row-reverse':'row', paddingTop: Math.max(insets.top, 16) }]}>
 <View style={{flexDirection:AR?'row-reverse':'row',alignItems:'center',gap:SP.md}}>
 <IBg name="nursing" size={18} color={tokens.pink} bg={withAlpha(tokens.pink, 0.12)} />
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

 <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.pink} />}
 contentContainerStyle={{padding:SP.xl,paddingBottom:100}} showsVerticalScrollIndicator={false}>

 {/* Stats */}
 <View style={{flexDirection:'row',flexWrap:'wrap',gap:SP.md,marginBottom:SP.xl}}>
 <NStatCard icon="!" label={AR?'طلبات جديدة':'New Orders'} value={String(pending)} color={tokens.warning} style={{width:'47%'}} />
 <NStatCard icon="◔" label={AR?'زيارات نشطة':'Active Visits'} value={String(active)} color={tokens.info} style={{width:'47%'}} />
 <NStatCard icon="" label={AR?'مكتملة اليوم':'Completed'} value={String(completed)} color={tokens.success} style={{width:'47%'}} />
 <NStatCard icon="◈" label={AR?'الإيرادات':'Revenue'} value={String(totalRev)} unit={AR?'ر':'SAR'} color={tokens.pink} style={{width:'47%'}} />
 </View>

 {/* Quick Actions */}
 <NSecHeader title={AR?'إجراءات سريعة':'Quick Actions'} />
 <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:SP.xl}}>
 <View style={{flexDirection:'row',gap:SP.md}}>
		{[
			{ar:'المحفظة\nوالإيرادات',en:'Wallet &\nRevenue',screen:'wallet',color:tokens.pink},
			{ar:'الزيارة\nالحالية',en:'Current\nVisit',screen:'order_detail',color:tokens.success},
			{ar:'قائمة\nالمهام',en:'Visit\nChecklist',screen:'checklist',color:tokens.info},
			{ar:'خطة\nالرعاية',en:'Care\nPlan',screen:'care_plan',color:tokens.purple},
			{ar:'ملاحظات\nيومية',en:'Progress\nNotes',screen:'progress',color:tokens.warning},
			{ar:'مستلزمات\nطبية',en:'Medical\nSupplies',screen:'supplies',color:tokens.error},
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
 <NCard key={order.id} style={{marginBottom:SP.md}} accent={tokens.warning}
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
 <Text style={{fontSize:FS.md,fontWeight:FW.xbold,color:tokens.pink,marginTop:2}}>{order.total || order.price || 0} {AR?'ر':'SAR'}</Text>
 </View>
 </View>
 <View style={{backgroundColor:theme.surface2,borderRadius:R.md,padding:SP.md,marginBottom:SP.sm}}>
 <Text style={{fontSize:FS.sm,color:theme.text,textAlign:AR?'right':'left'}} numberOfLines={2}>{order.notes || (AR ? 'طلب رعاية تمريضية منزلية' : 'Home nursing care request')}</Text>
 </View>
 <View style={{flexDirection:'row',flexWrap:'wrap',gap:SP.xs}}>
 {Array.isArray(order.services) ? order.services.map(sid=>{const svc=nursingSvcs.find(x=>x.id===sid);return svc?<View key={sid} style={{backgroundColor:withAlpha(tokens.pink, 0.10),paddingHorizontal:SP.sm,paddingVertical:2,borderRadius:R.full,borderWidth:1,borderColor:withAlpha(tokens.pink, 0.30)}}><Text style={{fontSize:FS.xs,color:tokens.pink}}>{AR?svc.ar:svc.en}</Text></View>:null;}) : <View style={{backgroundColor:withAlpha(tokens.pink, 0.10),paddingHorizontal:SP.sm,paddingVertical:2,borderRadius:R.full,borderWidth:1,borderColor:withAlpha(tokens.pink, 0.30)}}><Text style={{fontSize:FS.xs,color:tokens.pink}}>{order.title_ar || order.title_en || (AR ? 'تمريض منزلي' : 'Home Nursing')}</Text></View>}
 </View>
 {order.chronic && <View style={{flexDirection:AR?'row-reverse':'row',alignItems:'center',gap:SP.xs,marginTop:SP.sm}}>
 <I name="heart" size={12} color={tokens.pink} />
 <Text style={{fontSize:FS.xs,color:tokens.pink,fontWeight:FW.semi}}>{AR?'مريض مزمن — رعاية مستمرة':'Chronic patient — ongoing care'}</Text>
 </View>}
 </NCard>
 ))}
 </>}

 {/* Active Visits */}
 {active > 0 && <>
 <NSecHeader title={AR?'زيارات نشطة الآن':'Active Visits Now'} />
 {jobs.filter(o=>o.status==='active').map(order=>(
 <NCard key={order.id} style={{marginBottom:SP.md}} accent={tokens.info}
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
 <NBtn label={AR?'فتح الزيارة':'Open visit'} size="xs" full={false} style={{flex:1}} onPress={()=>onNav('order_detail',order)} />
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
// VISIT CHECKLIST
// ══════════════════════════════════════════════════════════════════
function VisitChecklist({ order, onBack, onNav }:{ order:any; onBack:()=>void; onNav?:(s:string,p?:any)=>void }) {
 const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang==='ar';
 const [items, setItems] = useState<any[]>([]);
 useEffect(() => { client.get('/provider/nursing/checklist').then(r => {
   // The API answers { category, items: [{ key, title_ar, title_en?, required }] } (an object: .filter crashed).
   const list: any[] = Array.isArray(r.data) ? r.data : (Array.isArray(r.data?.items) ? r.data.items : []);
   setItems(list.map((i: any) => ({ ...i, id: i.id ?? i.key, task: i.task ?? i.title_ar, taskEn: i.taskEn ?? i.title_en ?? i.title_ar })));
 }).catch(() => {}); }, []);
 const toggle = (id:string) => {
   const next = items.map(i=>i.id===id?{...i,done:!i.done}:i);
   setItems(next);
   const bookingId = order?.id || order?.booking_id;
   if (bookingId) {
     const map: Record<string, boolean> = {};
     next.forEach((i) => { map[String(i.id)] = !!i.done; });
     client.post(`/provider/ops/nursing/bookings/${encodeURIComponent(String(bookingId))}/checklist/before`, { items: map }).catch(() => {
       show(AR ? 'تعذر حفظ القائمة' : 'Could not save checklist', 'error');
     });
   }
 };
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
 <Text style={{fontSize:FS['2xl'],fontWeight:FW.xbold,color:pct===100?tokens.success:tokens.pink}}>{pct}%</Text>
 <Text style={{fontSize:FS.sm,color:theme.textSub}}>{doneCount} / {items.length} {AR?'مهمة مكتملة':'tasks done'}</Text>
 <View style={{width:'100%',height:8,backgroundColor:theme.surface2,borderRadius:R.full,marginTop:SP.md}}>
 <View style={{height:8,width:`${pct}%`,backgroundColor:pct===100?tokens.success:tokens.pink,borderRadius:R.full}} />
 </View>
 </NCard>

 {items.map(item=>(
 <TouchableOpacity key={item.id} onPress={()=>toggle(item.id)}
 style={[st.checkRow,{backgroundColor:item.done?theme.successBg:theme.surface2,borderColor:item.done?theme.success:theme.border,flexDirection:AR?'row-reverse':'row'}]}>
 <View style={{width:24,height:24,borderRadius:R.sm,borderWidth:2,borderColor:item.done?tokens.success:theme.border,backgroundColor:item.done?tokens.success:'transparent',alignItems:'center',justifyContent:'center'}}>
 {item.done && <I name="check" size={12} color="#FFF" />}
 </View>
 <Text style={{flex:1,fontSize:FS.md,color:item.done?theme.success:theme.text,textAlign:AR?'right':'left',textDecorationLine:item.done?'line-through':'none'}}>
 {AR?item.task:item.taskEn}
 </Text>
 </TouchableOpacity>
 ))}

 <View style={{height:SP.xl}} />
 {pct===100 && <NBtn label={AR?'إكمال الزيارة':'Complete Visit'} onPress={()=>{
 const doneTasks = items.filter(i=>i.done).map(i=>i.title_ar || i.title || i.name_ar || i.id);
 onNav ? onNav('order_detail', order) : onBack();
 }} />}
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════
// CARE PLAN — Chronic patients
// ══════════════════════════════════════════════════════════════════
function CarePlan({ patient, onBack }:{ patient:any; onBack:()=>void }) {
 const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang==='ar';
 const patientId = patient?.patient_id || patient?.raw?.patient_id || patient?.id;
 const [plans, setPlans] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [title, setTitle] = useState('');
 const [taskText, setTaskText] = useState('');

 const fetchPlans = useCallback(async () => {
 if (!patientId) { setLoading(false); return; }
 try {
 const res = await client.get(`/home-care/care-plans/${patientId}`);
 setPlans(Array.isArray(res.data) ? res.data : []);
 } catch { setPlans([]); } finally { setLoading(false); }
 }, [patientId]);

 useEffect(() => { fetchPlans(); }, [fetchPlans]);

 const handleCreate = async () => {
 if (!title.trim()) { show(AR ? 'أدخل عنوان الخطة' : 'Enter plan title', 'error'); return; }
 setSaving(true);
 try {
 await client.post(`/home-care/care-plans/${patientId}`, {
 title: title.trim(),
 tasks: taskText.split('\n').map(t => t.trim()).filter(Boolean),
 });
 show(AR ? 'تم إنشاء خطة الرعاية' : 'Care plan created', 'success');
 setTitle(''); setTaskText('');
 fetchPlans();
 } catch (err: any) {
 show(err?.response?.data?.message || (AR ? 'فشل إنشاء الخطة' : 'Failed to create plan'), 'error');
 } finally { setSaving(false); }
 };

 return (
 <NScroll>
 <NHeader title={AR?'خطة الرعاية المستمرة':'Care Plan'} onBack={onBack} />
 <NCard style={{marginBottom:SP.xl,flexDirection:AR?'row-reverse':'row',gap:SP.md,alignItems:'center'}}>
 <NAvatar name={patient?.patient_name || patient?.patient || '—'} size={44} />
 <View><Text style={{fontWeight:FW.bold,color:theme.text}}>{patient?.patient_name || patient?.patient || '—'}</Text>
 <NBadge label={AR?'مريض مزمن':'Chronic'} variant="danger" size="xs" style={{marginTop:SP.xs}} /></View>
 </NCard>

 <NSecHeader title={AR?'خطط الرعاية':'Care Plans'} />
 {loading ? <ActivityIndicator color={theme.primary} style={{ marginVertical: SP.xl }} /> :
 plans.length === 0 ? <NEmpty title={AR?'لا توجد خطط رعاية بعد':'No care plans yet'} subtitle={AR?'أنشئ خطة رعاية لهذا المريض من الأسفل':'Create a care plan for this patient below'} /> :
 plans.map((p:any, i:number)=>(
 <NCard key={p.id || i} style={{marginBottom:SP.md}} accent={p.status==='active'?tokens.pink:undefined}>
 <View style={{flexDirection:AR?'row-reverse':'row',alignItems:'center',justifyContent:'space-between',marginBottom:SP.xs}}>
 <Text style={{fontSize:FS.sm,fontWeight:FW.bold,color:theme.text,textAlign:AR?'right':'left',flex:1}}>{p.title}</Text>
 <NBadge label={p.status==='active'?(AR?'نشطة':'Active'):(AR?'منتهية':'Done')} variant={p.status==='active'?'success':'default'} size="xs" />
 </View>
 {(p.tasks||[]).map((t:string, ti:number)=>(
 <View key={ti} style={{flexDirection:AR?'row-reverse':'row',alignItems:'flex-start',gap:SP.sm,marginTop:4}}>
 <I name="check" size={12} color={theme.textSub} style={{marginTop:3}} />
 <Text style={{flex:1,fontSize:FS.sm,color:theme.textSub,lineHeight:20,textAlign:AR?'right':'left'}}>{t}</Text>
 </View>
 ))}
 </NCard>
 ))}

 <NSecHeader title={AR?'خطة جديدة':'New Plan'} />
 <NCard style={{marginBottom:SP.xl}}>
 <NInput label={AR?'عنوان الخطة':'Plan title'} placeholder={AR?'مثال: خطة ما بعد الجراحة':'e.g. Post-surgery plan'} value={title} onChange={setTitle} icon="edit" />
 <NInput label={AR?'المهام (سطر لكل مهمة)':'Tasks (one per line)'} placeholder={AR?'قياس العلامات الحيوية يومياً / تغيير الضماد':'e.g. Measure vitals daily / change dressing'} value={taskText} onChange={setTaskText} multi lines={4} icon="list" />
 <NBtn label={AR?'إنشاء الخطة':'Create Plan'} loading={saving} onPress={handleCreate} style={{marginTop:SP.md}} />
 </NCard>
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
 const [pastNotes, setPastNotes] = useState<any[]>([]);
 const [loadingNotes, setLoadingNotes] = useState(true);
 const patientId = patient?.patient_id || patient?.raw?.patient_id || patient?.id;

 const fetchNotes = useCallback(async () => {
 if (!patientId) { setLoadingNotes(false); return; }
 try {
 const res = await client.get(`/nursing/notes/${patientId}`);
 setPastNotes(Array.isArray(res.data) ? res.data : []);
 } catch { setPastNotes([]); } finally { setLoadingNotes(false); }
 }, [patientId]);

 useEffect(() => { fetchNotes(); }, [fetchNotes]);

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
     if (!patientId) { show(AR?'معرّف المريض غير متوفر':'Patient ID unavailable','error'); setLoading(false); return; }
     await client.post('/nursing/notes', { patient_id: patientId, booking_id: patient?.id, vitals, note });
     show(AR?'تم حفظ الملاحظة':'Note saved','success');
     setNote('');
     setVitals({bp:'',pulse:'',temp:'',spo2:'',glucose:''});
     fetchNotes();
   } catch (e: any) {
     show(e.message, 'error');
   } finally {
     setLoading(false);
   }
 }} />
 </NCard>

 {/* Past Notes */}
 <NSecHeader title={AR?'الملاحظات السابقة':'Past Notes'} />
 {loadingNotes ? <ActivityIndicator color={theme.primary} style={{marginVertical:SP.lg}} /> :
 pastNotes.length === 0 ? <NEmpty title={AR?'لا توجد ملاحظات سابقة':'No past notes'} /> :
 pastNotes.map((pn:any,i:number)=>{
 const v = pn.vitals || {};
 const vitalsStr = [v.bp, v.pulse, v.temp, v.spo2, v.glucose].filter(Boolean).join(' | ');
 const dateStr = (pn.createdAt || '').toString().slice(0, 16).replace('T', ' ');
 return (
 <NCard key={pn.id || i} style={{marginBottom:SP.md}}>
 <Text style={{fontSize:FS.xs,color:theme.textSub,marginBottom:SP.xs}}>{dateStr}{vitalsStr ? ' | ' + vitalsStr : ''}</Text>
 <Text style={{fontSize:FS.sm,color:theme.text,lineHeight:20,textAlign:AR?'right':'left'}}>{pn.note}</Text>
 </NCard>
 );
 })}
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
 useEffect(() => { client.get('/provider/nursing/supplies').then(r => {
   // The API answers { items: [{ id, name_ar, name_en?, category, unit }] } (an object: .filter crashed).
   const list: any[] = Array.isArray(r.data) ? r.data : (Array.isArray(r.data?.items) ? r.data.items : []);
   setSupplies(list.map((i: any) => ({ ...i, name: i.name ?? i.name_ar, nameEn: i.nameEn ?? i.name_en ?? i.name_ar })));
 }).catch(() => {}); }, []);
 const [loading, setLoading] = useState(false);

 const handleRequest = async () => {
 setLoading(true);
 try {
 await client.post('/home-care/inventory/request', {
 items: [{ name: newItem, qty: parseInt(newQty, 10), unit: 'pcs' }],
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

 <NCard style={{backgroundColor:withAlpha(tokens.pink, 0.10),marginBottom:SP.xl}}>
 <Text style={{fontSize:FS.sm,color:tokens.pink,lineHeight:20,textAlign:AR?'right':'left'}}>
 {AR?'اطلب المستلزمات الطبية اللازمة لزياراتك. يتم التوصيل من مخازن المستشفى لتجهيز حقيبتك.'
 :'Order medical supplies for your visits. Delivered from hospital inventory to equip your bag.'}
 </Text>
 </NCard>

 <View style={{flexDirection:'row',gap:SP.md,marginBottom:SP.xl}}>
 <NStatCard icon="" label={AR?'مُسلَّمة':'Delivered'} value={String(supplies.filter(s=>s.status==='delivered').length)} color={tokens.success} style={{flex:1}} />
 <NStatCard icon="◔" label={AR?'مطلوبة':'Ordered'} value={String(supplies.filter(s=>s.status==='ordered').length)} color={tokens.warning} style={{flex:1}} />
 <NStatCard icon="!" label={AR?'انتظار':'Pending'} value={String(supplies.filter(s=>s.status==='pending').length)} color={tokens.error} style={{flex:1}} />
 </View>

 <NSecHeader title={AR?'المستلزمات الحالية':'Current Supplies'} />
 {supplies.map(sup=>(
 <NCard key={sup.id} style={{marginBottom:SP.sm}} accent={sup.status==='delivered'?tokens.success:sup.status==='ordered'?tokens.warning:tokens.error}>
 <View style={{flexDirection:AR?'row-reverse':'row',alignItems:'center',gap:SP.md}}>
 <IBg name="bandage" size={14} color={tokens.pink} bg={withAlpha(tokens.pink, 0.12)} />
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
// NURSING SETTINGS
// ══════════════════════════════════════════════════════════════════
function NursingSettings({ onLogout, onNav }:{ onLogout:()=>void; onNav:(s:string,p?:any)=>void }) {
 const insets = useSafeAreaInsets();
 const { theme, toggle:toggleT, mode } = useTheme(); const { lang, toggle:toggleL } = useLang();
 const { show } = useToast(); const AR = lang==='ar'; const [showLO, setShowLO] = useState(false);
 // F53: promotions/CRM are business-type entries — hidden unless /provider/me allows (fail-open).
 const [caps, setCaps] = useState<any>(null);
 useEffect(() => {
 client.get('/provider/me').then((r: any) => setCaps((r?.data || r)?.capabilities || null)).catch(() => setCaps(null));
 }, []);

  const [deltaPending, setDeltaPending] = useState(false);
  const saveSettings = async (newData: any = {}) => {
    try {
      setDeltaPending(true);
      await client.post('/provider/settings/delta', { newData });
      show(AR ? 'بانتظار موافقة الإدارة على التعديلات' : 'Pending admin approval for changes', 'success');
    } catch (e) {
      show(AR ? 'فشل إرسال التعديلات' : 'Failed to submit changes', 'error');
      setDeltaPending(false);
    }
  };
return (
 <View style={{flex:1,backgroundColor:theme.bg}}>
 <View style={[st.topBar,{backgroundColor:theme.surface,borderBottomColor:theme.border, paddingTop: Math.max(insets.top, 16) }]}>
 <Text style={{fontSize:FS.xl,fontWeight:FW.bold,color:theme.text}}>{AR?'الإعدادات':'Settings'}</Text>
 </View>
 <ScrollView contentContainerStyle={{padding:SP.xl,paddingBottom:100}}>
 <NCard style={{marginBottom:SP.xl,flexDirection:AR?'row-reverse':'row',gap:SP.lg,alignItems:'center'}}>
 <IBg name="nursing" size={22} color={tokens.pink} bg={withAlpha(tokens.pink, 0.12)} />
 <View style={{flex:1}}>
 <Text style={{fontSize:FS.xl,fontWeight:FW.bold,color:theme.text,textAlign:AR?'right':'left'}}>{AR?'نبضة للتمريض':'Nabdah Nursing'}</Text>
 <NBadge label={AR?'نشط':'Active'} variant="success" size="xs" style={{marginTop:SP.xs}} />
 </View>
 </NCard>
 
      {deltaPending && (
        <NCard style={{ marginBottom: SP.xl, backgroundColor: theme.warnBg, borderColor: theme.warnBg }}>
          <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.warn, textAlign: AR ? 'right' : 'left' }}>
            {AR?' بانتظار موافقة الإدارة على التعديلات':' Pending Admin Approval for changes'}
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
<NSettingsRow icon="shield" label={AR?'طلبات التأمين الواردة':'Insurance Requests'} onPress={()=>onNav('insurance_requests')} />
 <NSettingsRow icon="document" label={AR?'الشهادات والمؤهلات':'Qualifications'} onPress={()=>onNav('certificates_config')} />
 <NSettingsRow icon="camera" label={AR?'الصور والوسائط':'Photos & Media'} onPress={()=>onNav('media_config')} />
 </NCard>

 {/* Marketing & Reputation */}
 <NSecHeader title={AR ? 'التسويق والمبيعات وتكنولوجيا التمريض' : 'Marketing, Sales & Nursing Modules'} />
 <NCard style={{ marginBottom:SP.xl }}>
 {[
 ...((caps && caps.promotions === false) ? [] : [
 { icon:'bell', ar:'مركز العروض الترويجية', en:'Promotions Center', action:()=>onNav('promotions') },
 ]),
 { icon:'globe', ar:'إعدادات الصفحة العامة', en:'Mini-Website Settings', action:()=>onNav('web_config') },
 { icon:'wallet', ar:'الاشتراكات والإعلانات', en:'Subscriptions & Ads', action:()=>onNav('subscriptions_ads') },
 { icon:'star', ar:'مستوى السمعة والتقييمات',en:'Reputation & Ratings', action:()=>onNav('reputation') },
 ...((caps && caps.crm === false) ? [] : [
 { icon:'chart', ar:'إدارة العملاء والأرباح', en:'CRM & Business Insights', action:()=>onNav('crm') },
 ]),
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
 const [covered, setCovered] = useState<Record<string,boolean>>({});
 const [loading, setLoading] = useState(false);

 const handleSave = async () => {
 setLoading(true);
 try {
   await client.post('/provider/settings/delta', { newData: { services, includeKit, kitPrice, insurance_covered_services: covered } });
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
 <View key={svc.id} style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SP.xs }}>
 <TouchableOpacity style={{ flex: 1 }} onPress={() => setServices(s => ({ ...s, [svc.id]: !s[svc.id] }))}>
 <Text style={{ color: theme.text, fontSize: FS.md }}>{AR ? svc.ar : svc.en}</Text>
 </TouchableOpacity>
 <TouchableOpacity onPress={() => setCovered(c => ({ ...c, [svc.id]: !c[svc.id] }))} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginHorizontal: SP.sm }}>
 <View style={{ width: 16, height: 16, borderRadius: 4, borderWidth: 2, borderColor: covered[svc.id] ? theme.success : theme.border, backgroundColor: covered[svc.id] ? theme.success : 'transparent' }} />
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{AR ? 'تأمين' : 'Ins.'}</Text>
 </TouchableOpacity>
 <NCheckbox value={services[svc.id]} onChange={() => setServices(s => ({ ...s, [svc.id]: !s[svc.id] }))} />
 </View>
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
   await client.post('/provider/settings/delta', { 
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
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{AR?' باقة أسبوعية':' Weekly Package'}</Text>
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
 <View style={{ height: 200, backgroundColor: '#0A0E17', alignItems: 'center', justifyContent: 'center', borderRadius: R.lg, borderWidth: 1, borderColor: tokens.success }}>
 <View style={{ width: 140, height: 140, borderRadius: 70, borderStyle: 'dashed', borderWidth: 2, borderColor: tokens.success, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
 <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: withAlpha(tokens.success, 0.20), borderColor: tokens.success, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' }}>
<I name="pin" size={24} color={tokens.success} />
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
 <I name="pin" size={16} color={theme.primary} />
 <Text style={{ fontSize: FS.md, color: theme.text }}>{n}</Text>
 </View>
 ))}
 </NCard>

 <NBtn label={AR ? 'حفظ إعدادات التغطية الجغرافية' : 'Save Coverage Settings'} disabled={!gpsChecked} onPress={async () => {
    try {
      await client.post('/provider/settings/delta', { newData: { radius } });
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

// ══════════════════════════════════════════════════════════════════
// PRE-VISIT CHAT
// ══════════════════════════════════════════════════════════════════
function NursingChatScreen({ order, onBack }: { order: any; onBack: () => void }) {
  const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';
  const { user } = useAuth();
  const { show } = useToast();
  const [msg, setMsg] = useState('');
  const [msgs, setMsgs] = useState<any[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Real booking thread: get-or-create on the backend, then poll messages.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await client.post('/chats/threads/booking', { booking_kind: 'nursing', booking_id: order?.id || order?.raw?.id });
        if (alive) setThreadId(res.data?.id || res.data?.thread?.id || null);
      } catch { if (alive) show(AR ? 'تعذر فتح المحادثة' : 'Could not open chat', 'error'); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [order?.id]);

  useEffect(() => {
    if (!threadId) return;
    let alive = true;
    const load = async () => {
      try {
        const res = await client.get(`/chats/threads/${threadId}/messages`);
        const list = (res.data?.messages || []).slice().reverse();
        if (alive) setMsgs(list);
      } catch { /* keep last known messages */ }
    };
    load();
    const t = setInterval(load, 5000);
    return () => { alive = false; clearInterval(t); };
  }, [threadId]);

  const handleSend = async () => {
    const txt = msg.trim();
    if (!txt || !threadId || sending) return;
    setSending(true);
    try {
      await client.post(`/chats/threads/${threadId}/messages`, { body: txt, client_message_id: `n_${Date.now()}` });
      const res = await client.get(`/chats/threads/${threadId}/messages`);
      setMsgs((res.data?.messages || []).slice().reverse());
      setMsg('');
    } catch { show(AR ? 'فشل إرسال الرسالة' : 'Failed to send', 'error'); }
    finally { setSending(false); }
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
        {loading && <Text style={{ color: theme.textSub, textAlign: 'center' }}>{AR ? 'جاري تحميل المحادثة...' : 'Loading chat...'}</Text>}
        {!loading && msgs.length === 0 && <Text style={{ color: theme.textSub, textAlign: 'center' }}>{AR ? 'لا رسائل بعد — ابدأ المحادثة' : 'No messages yet — start the conversation'}</Text>}
        {msgs.map(m => {
          const mine = m.sender_id === (user as any)?.id;
          const time = m.createdAt ? new Date(m.createdAt).toLocaleTimeString('ar-SA-u-ca-gregory', { hour: '2-digit', minute: '2-digit' }) : '';
          return (
          <View key={m.id || m._id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', backgroundColor: mine ? theme.primary : theme.surface, padding: SP.md, borderRadius: R.md, maxWidth: '80%' }}>
            <Text style={{ color: mine ? '#FFF' : theme.text }}>{m.body}</Text>
            <Text style={{ color: mine ? '#FFF8' : theme.textSub, fontSize: 10, marginTop: 4, textAlign: 'right' }}>{time}</Text>
          </View>
          );
        })}
      </ScrollView>
      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', padding: SP.lg, borderTopWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, alignItems: 'center', gap: SP.md }}>
        <TextInput value={msg} onChangeText={setMsg} placeholder={AR ? 'اكتب رسالة...' : 'Type a message...'} style={{ flex: 1, backgroundColor: theme.bg, padding: SP.md, borderRadius: R.md, color: theme.text, textAlign: AR ? 'right' : 'left' }} />
        <NBtn label={sending ? '...' : (AR ? 'إرسال' : 'Send')} onPress={handleSend} full={false} />
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