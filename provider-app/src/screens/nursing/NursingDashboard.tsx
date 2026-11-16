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
import { runOnce, serverMessage } from '../../utils/singleFlight';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AppointmentStatus } from '../../types/contracts';
import {
 View, Text, TouchableOpacity, ScrollView, StyleSheet,
 Animated, FlatList, Alert, Dimensions, Switch, RefreshControl, TextInput,
 ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useLang, useAuth, useToast } from '../../context';
import { localeTag } from '../../i18n';
import client from '../../api/client';
import { InsuranceRequestsScreen } from '../shared/InsuranceRequestsScreen';
import { orderingStackScreens, ORDERING_ENTRY } from '../ordering';
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
 
 NurseVisitConsole, NurseChecklistConsole
} from '../shared/BlueprintScreens';
import { MedicalJobsScreen, MedicalDrugIndexScreen, InsuranceConfigScreen, CertificatesConfigScreen, MediaConfigScreen, ProviderWalletScreen, ProviderProfileEditor, WithdrawalWorkflow, ProviderHomeStats, GlobalSystemSettings } from '../shared/SharedScreens';
import { NotificationsCenterScreen, SecurityManagementScreen } from '../shared/RealScreens';
import { MyServicesScreen } from '../shared/MyServicesScreen';
import { bookingChoiceLine } from './bookingChoice';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();
const { width: W } = Dimensions.get('window');

// Connected to backend APIs for nursing orders, checklist, and supplies

// ══════════════════════════════════════════════════════════════════
// NAVIGATOR
// ══════════════════════════════════════════════════════════════════
import { NursingFieldOps } from './NursingFieldOps';
import { tokens, withAlpha } from '../../theme/tokens';
import { fmtTime } from '../../utils/dates';
import { addressLine, addressShort, patientMeta } from '../../utils/address';

export function NursingDashboardNavigator({ onLogout }: { onLogout:()=>void }) {
 const [tab, setTab] = useState('home');
 const [scr, setScr] = useState<string|null>(null);
 const [prm, setPrm] = useState<any>(null);
 const { lang, t: tt } = useLang(); const { theme } = useTheme(); const AR = lang==='ar';
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
 { key: 'home', icon: 'home', label: tt('nurdash.17c4ca45') },
 { key: 'orders', icon: 'document', label: tt('nurdash.68fdab11') },
 { key: 'jobs', icon: 'profile', label: tt('nurdash.ca8089ed') },
 { key: 'drugs', icon: 'activity', label: tt('nurdash.61bcd49d') },
 { key: 'settings', icon: 'settings', label: tt('nurdash.5766fe8f') },
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

              <NSheet visible={!!incomingRequest} onClose={() => setIncomingRequest(null)} title={tt('nurdash.e21fc7c2')}>
               {incomingRequest && (
               <View style={{ gap: SP.md, padding: SP.md }}>
               <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
                {incomingRequest.service_name_ar || incomingRequest.service_name_en || (tt('nurdash.ddde19a9'))}
               </Text>
               <Text style={{ fontSize: FS.md, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
               {tt('nurdash.c8b718f1')} {addressLine(incomingRequest.address) || '—'}
               </Text>
               {bookingChoiceLine(incomingRequest, AR) ? (
               <Text style={{ fontSize: FS.sm, color: theme.text, fontWeight: FW.bold, textAlign: AR ? 'right' : 'left' }}>{bookingChoiceLine(incomingRequest, AR)}</Text>
               ) : null}
               {incomingRequest.scheduled_at ? (
               <Text style={{ fontSize: FS.sm, color: theme.primary, fontWeight: FW.bold, textAlign: AR ? 'right' : 'left' }}>
                {tt('nurdash.9d7eb96c')}{new Date(incomingRequest.scheduled_at).toLocaleString(AR ? 'ar-SA-u-ca-gregory' : 'en-GB')}
               </Text>
               ) : null}
               <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginTop: SP.md }}>
               <NBtn label={tt('nurdash.e3b60bcd')} style={{ flex: 1 }} onPress={() => runOnce(`accept:${incomingRequest.id}`, async () => {
               try {
               // governed accept (workflow engine; a card visit must be paid first)
               await client.post(`/provider/jobs/nursing/${incomingRequest.id}/accept`, {});
               show(tt('nurdash.af4287cf'), 'success');
               setIncomingRequest(null);
               fetchJobs();
               } catch (e: any) {
               show(serverMessage(e, 'Error'), 'error');
               fetchJobs();
               }
               })} />
               <NBtn label={tt('nurdash.8a223f36')} variant="danger" style={{ flex: 1 }} onPress={async () => {
               try {
               await client.post(`/provider/jobs/nursing/${incomingRequest.id}/reject`, { reason: 'provider_declined' });
               show(tt('nurdash.91447f9b'), 'info');
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
               onAccept={() => { setAlarmVisible(false); setTab('orders'); }}
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
      <Stack.Screen name="nursing_services">{({ navigation }: any) => <MyServicesScreen vertical="nursing" onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="nursing_coverage">{({ navigation }: any) => <NursingCoverageSettings onBack={() => navigation.goBack()} />}</Stack.Screen>

      <Stack.Screen name="promotions">{({ navigation }: any) => <PromotionsDashboard onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
      <Stack.Screen name="create_promo">{({ navigation }: any) => <CreateCampaignScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="web_config">{({ navigation }: any) => <ProviderProfileEditor role="nursing" initialSection="public" onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="subscriptions_ads">{({ navigation }: any) => <SubscriptionsAdsScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
      <Stack.Screen name="affiliate">{({ navigation }: any) => <AffiliatePortal onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="reputation">{({ navigation }: any) => <ReputationHub onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="crm">{({ navigation }: any) => <CrmHub onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
      <Stack.Screen name="revenue_insights">{({ navigation }: any) => <RevenueInsights onBack={() => navigation.goBack()} />}</Stack.Screen>
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
      {orderingStackScreens(Stack, 'nursing')}
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
 const { theme } = useTheme(); const { lang, t: tt } = useLang(); const AR = lang==='ar';
 const nursingSvcs = useServicesCatalog('nursing');
 const { user, toggleOnline } = useAuth(); const { show } = useToast();

 const handleToggleOnline = async () => {
 const nextVal = !user?.isOnline;
 toggleOnline();
 try {
 await client.post('/home-care/provider/availability', { available: nextVal });
 } catch (e: any) {
 // the server refused: put the switch back and say why (it used to stay flipped)
 toggleOnline();
 show(e?.response?.data?.message || (tt('nurdash.b72fec11')), 'error');
 }
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
 <Text style={{fontSize:FS.sm,color:theme.textSub}}>{tt('nurdash.ddde19a9')}</Text>
 <Text style={{fontSize:FS.md,fontWeight:FW.bold,color:theme.text}}>{tt('nurdash.4ec2f38c')}</Text>
 </View>
 </View>
 <View style={{flexDirection:'row',gap:SP.sm,alignItems:'center'}}>
 <NOnlineToggle value={user?.isOnline??true} onToggle={handleToggleOnline} />
 {/* Needs-review issue 1190: the bell opens the notifications center */}
 <TouchableOpacity onPress={()=>onNav('notifications')} accessibilityRole="button" accessibilityLabel={tt('nurdash.5e885201')} style={[st.iconBtn,{backgroundColor:theme.surface2}]}><I name="bell" size={20} color={theme.text} /></TouchableOpacity>
 </View>
 </View>

 <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.pink} />}
 contentContainerStyle={{padding:SP.xl,paddingBottom:100}} showsVerticalScrollIndicator={false}>

 {/* Stats */}
 <View style={{flexDirection:'row',flexWrap:'wrap',gap:SP.md,marginBottom:SP.xl}}>
 <NStatCard icon="!" label={tt('nurdash.7c466262')} value={String(pending)} color={tokens.warning} style={{width:'47%'}} />
 <NStatCard icon="◔" label={tt('nurdash.cd9e7601')} value={String(active)} color={tokens.info} style={{width:'47%'}} />
 <NStatCard icon="" label={tt('nurdash.4c43edff')} value={String(completed)} color={tokens.success} style={{width:'47%'}} />
 <NStatCard icon="◈" label={tt('nurdash.625c26e2')} value={String(totalRev)} unit={tt('nurdash.a629499b')} color={tokens.pink} style={{width:'47%'}} />
 </View>

 {/* Quick Actions */}
 <NSecHeader title={tt('nurdash.88717c98')} />
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
 <NSecHeader title={tt('nurdash.7c466262')} />
 {jobs.filter(o=>o.status==='pending').map(order=>(
 <NCard key={order.id} style={{marginBottom:SP.md}} accent={tokens.warning}
 onPress={()=>onNav('order_detail',order)}>
 <View style={{flexDirection:AR?'row-reverse':'row',justifyContent: 'space-between',marginBottom:SP.sm}}>
 <View style={{flexDirection:AR?'row-reverse':'row',alignItems:'center',gap:SP.md}}>
 <NAvatar name={order.patient_name || order.patient || '—'} size={46} />
 <View>
 <Text style={{fontSize:FS.md,fontWeight:FW.bold,color:theme.text,textAlign:AR?'right':'left'}}>{order.patient_name || order.patient || '—'}</Text>
 <Text style={{fontSize:FS.xs,color:theme.textSub}}>{[...patientMeta(order, AR), addressShort(order.address)].filter(Boolean).join(' | ')}</Text>
 </View>
 </View>
 <View style={{alignItems:'flex-end'}}>
 <NBadge label={tt('nurdash.7a64641b')} variant="warning" size="xs" />
 <Text style={{fontSize:FS.md,fontWeight:FW.xbold,color:tokens.pink,marginTop:2}}>{order.total || order.price || 0} {tt('nurdash.a629499b')}</Text>
 </View>
 </View>
 <View style={{backgroundColor:theme.surface2,borderRadius:R.md,padding:SP.md,marginBottom:SP.sm}}>
 <Text style={{fontSize:FS.sm,color:theme.text,textAlign:AR?'right':'left'}} numberOfLines={2}>{order.notes || (tt('nurdash.0678a60c'))}</Text>
 </View>
 <View style={{flexDirection:'row',flexWrap:'wrap',gap:SP.xs}}>
 {Array.isArray(order.services) ? order.services.map(sid=>{const svc=nursingSvcs.find(x=>x.id===sid);return svc?<View key={sid} style={{backgroundColor:withAlpha(tokens.pink, 0.10),paddingHorizontal:SP.sm,paddingVertical:2,borderRadius:R.full,borderWidth:1,borderColor:withAlpha(tokens.pink, 0.30)}}><Text style={{fontSize:FS.xs,color:tokens.pink}}>{AR?svc.ar:svc.en}</Text></View>:null;}) : <View style={{backgroundColor:withAlpha(tokens.pink, 0.10),paddingHorizontal:SP.sm,paddingVertical:2,borderRadius:R.full,borderWidth:1,borderColor:withAlpha(tokens.pink, 0.30)}}><Text style={{fontSize:FS.xs,color:tokens.pink}}>{order.title_ar || order.title_en || (tt('nurdash.ddde19a9'))}</Text></View>}
 </View>
 {order.chronic && <View style={{flexDirection:AR?'row-reverse':'row',alignItems:'center',gap:SP.xs,marginTop:SP.sm}}>
 <I name="heart" size={12} color={tokens.pink} />
 <Text style={{fontSize:FS.xs,color:tokens.pink,fontWeight:FW.semi}}>{tt('nurdash.44785b58')}</Text>
 </View>}
 </NCard>
 ))}
 </>}

 {/* Active Visits */}
 {active > 0 && <>
 <NSecHeader title={tt('nurdash.de16177e')} />
 {jobs.filter(o=>o.status==='active').map(order=>(
 <NCard key={order.id} style={{marginBottom:SP.md}} accent={tokens.info}
 onPress={()=>onNav('order_detail',order)}>
 <View style={{flexDirection:AR?'row-reverse':'row',alignItems:'center',gap:SP.md,marginBottom:SP.sm}}>
 <NAvatar name={order.patient_name || order.patient || '—'} size={42} online />
 <View style={{flex:1}}>
 <Text style={{fontSize:FS.md,fontWeight:FW.bold,color:theme.text,textAlign:AR?'right':'left'}}>{order.patient_name || order.patient || '—'}</Text>
 <Text style={{fontSize:FS.xs,color:theme.textSub}}>{addressShort(order.address)} | {order.date || new Date(order.scheduled_at).toLocaleTimeString()}</Text>
 {bookingChoiceLine(order, AR) ? <Text style={{fontSize:FS.xs,color:theme.text,fontWeight:FW.bold}}>{bookingChoiceLine(order, AR)}</Text> : null}
 </View>
 <View style={{alignItems:'flex-end',gap:SP.xs}}>
 <NBadge label={tt('nurdash.03886b8f')} variant="primary" size="xs" />
 <NBadge label={AR?(order.pricing==='per_day'?'يومي':'زيارة'):(order.pricing==='per_day'?'Daily':'Visit')} variant="default" size="xs" />
 </View>
 </View>
 <View style={{flexDirection:AR?'row-reverse':'row',gap:SP.sm}}>
 <NBtn label={tt('nurdash.477419b3')} size="xs" full={false} style={{flex:1}} onPress={()=>onNav('order_detail',order)} />
 <NBtn label={tt('nurdash.fe2d9ea6')} size="xs" variant="outline" full={false} style={{flex:1}} onPress={()=>onNav('checklist',order)} />
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
  const { theme } = useTheme(); const { lang, t: tt } = useLang(); const AR = lang === 'ar';
  const [tab, setTab] = useState<'pending'|'active'>('pending');
  const [jobs, setJobs] = useState<any[]>([]);
  // Needs-review issue 1165: a failed load says so and offers a retry instead of an empty list.
  const [failed, setFailed] = useState(false);
  const load = () => {
    setFailed(false);
    client.get('/nursing/jobs/active').then(res => setJobs(res.data || [])).catch(() => setFailed(true));
  };

  useEffect(load, []);

  // the server returns `state`: a visit just assigned waits for the nurse to accept; the others are already confirmed or under way
  const stateOf = (j: any) => String(j.state ?? j.status ?? '').toUpperCase();
  const isNew = (j: any) => ['PROVIDER_ASSIGNED', 'ASSIGNED', 'NEW_REQUEST', 'PENDING', ''].includes(stateOf(j));
  const pending = jobs.filter(isNew);
  const active = jobs.filter(j => !isNew(j));

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={[{ padding: 16, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center' }, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text }}>{tt('nurdash.68fdab11')}</Text>
      </View>

      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', borderBottomWidth: 1, borderColor: theme.border }}>
        <TouchableOpacity style={{ flex: 1, padding: SP.md, alignItems: 'center', borderBottomWidth: tab === 'pending' ? 2 : 0, borderColor: theme.primary }} onPress={() => setTab('pending')}>
          <Text style={{ color: tab === 'pending' ? theme.primary : theme.textSub, fontWeight: FW.bold }}>{tt('nurdash.6687d155')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ flex: 1, padding: SP.md, alignItems: 'center', borderBottomWidth: tab === 'active' ? 2 : 0, borderColor: theme.primary }} onPress={() => setTab('active')}>
          <Text style={{ color: tab === 'active' ? theme.primary : theme.textSub, fontWeight: FW.bold }}>{tt('nurdash.5f8c3e6b')}</Text>
        </TouchableOpacity>
      </View>

      {failed && (
        <NCard style={{ margin: SP.lg, alignItems: 'center', gap: SP.sm }}>
          <Text style={{ color: theme.text, textAlign: 'center' }}>{tt('nurdash.ddbce7b1')}</Text>
          <NBtn label={tt('nurdash.cf333076')} size="sm" variant="outline" full={false} onPress={load} />
        </NCard>
      )}

      {tab === 'pending' && (
        <ScrollView contentContainerStyle={{ padding: SP.lg, paddingBottom: 100 }}>
          {pending.length === 0 && <NEmpty title={tt('nurdash.9e10b89c')} icon="document" />}
          {pending.map(order => (
            <NCard key={order.id} style={{ marginBottom: SP.md }} onPress={() => onNavigate('order_detail', order)}>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{order.patient || 'Patient'}</Text>
                <NBadge label={tt('nurdash.7a64641b')} variant="info" size="xs" />
              </View>
              <Text style={{ color: theme.textSub, marginTop: SP.sm, textAlign: AR ? 'right' : 'left' }}>{order.svc} - {order.price} SAR</Text>
            </NCard>
          ))}
        </ScrollView>
      )}

      {tab === 'active' && (
        <ScrollView contentContainerStyle={{ padding: SP.lg, paddingBottom: 100 }}>
          {active.length === 0 && <NEmpty title={tt('nurdash.9bdacc44')} icon="calendar" />}
          {active.map(scan => (
            <NCard key={scan.id} style={{ marginBottom: SP.md }} onPress={() => onNavigate('order_detail', scan)}>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{scan.patient || 'Patient'}</Text>
                <NBadge label={tt('nurdash.29e17b4a')} variant="success" size="xs" />
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
 const { theme } = useTheme(); const { lang, t: tt } = useLang(); const { show } = useToast(); const AR = lang==='ar';
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
       show(tt('nurdash.d4ae1cf7'), 'error');
     });
   }
 };
 const doneCount = items.filter(i=>i.done).length;
 const pct = items.length ? Math.round((doneCount/items.length)*100) : 100;

 return (
 <NScroll>
 <NHeader title={tt('nurdash.68fa2878')} onBack={onBack} />
 <NCard style={{marginBottom:SP.xl,flexDirection:AR?'row-reverse':'row',gap:SP.md,alignItems:'center'}}>
 <NAvatar name={order?.patient??'—'} size={44} />
 <View><Text style={{fontWeight:FW.bold,color:theme.text}}>{order?.patient??'—'}</Text><Text style={{fontSize:FS.xs,color:theme.textSub}}>{addressShort(order?.address) || '—'}</Text></View>
 </NCard>

 {/* Progress */}
 <NCard style={{marginBottom:SP.xl,alignItems:'center'}}>
 <Text style={{fontSize:FS['2xl'],fontWeight:FW.xbold,color:pct===100?tokens.success:tokens.pink}}>{pct}%</Text>
 <Text style={{fontSize:FS.sm,color:theme.textSub}}>{doneCount} / {items.length} {tt('nurdash.5ab3fc09')}</Text>
 <View style={{width:'100%',height:8,backgroundColor:theme.surface2,borderRadius:R.full,marginTop:SP.md}}>
 <View style={{height:8,width:`${pct}%`,backgroundColor:pct===100?tokens.success:tokens.pink,borderRadius:R.full}} />
 </View>
 </NCard>

 {items.map(item=>(
 <TouchableOpacity key={item.id} onPress={()=>toggle(item.id)}
 style={[st.checkRow,{backgroundColor:item.done?theme.successBg:theme.surface2,borderColor:item.done?theme.success:theme.border,flexDirection:AR?'row-reverse':'row'}]}>
 <View style={{width:24,height:24,borderRadius:R.sm,borderWidth:2,borderColor:item.done?tokens.success:theme.border,backgroundColor:item.done?tokens.success:'transparent',alignItems:'center',justifyContent:'center'}}>
 {item.done && <I name="check" size={12} color={C.white} />}
 </View>
 <Text style={{flex:1,fontSize:FS.md,color:item.done?theme.success:theme.text,textAlign:AR?'right':'left',textDecorationLine:item.done?'line-through':'none'}}>
 {AR?item.task:item.taskEn}
 </Text>
 </TouchableOpacity>
 ))}

 <View style={{height:SP.xl}} />
 {pct===100 && <NBtn label={tt('nurdash.2b338b45')} onPress={()=>{
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
 const { theme } = useTheme(); const { lang, t: tt } = useLang(); const { show } = useToast(); const AR = lang==='ar';
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
 if (!title.trim()) { show(tt('nurdash.beb5cad4'), 'error'); return; }
 setSaving(true);
 try {
 await client.post(`/home-care/care-plans/${patientId}`, {
 title: title.trim(),
 tasks: taskText.split('\n').map(t => t.trim()).filter(Boolean),
 });
 show(tt('nurdash.7a973adc'), 'success');
 setTitle(''); setTaskText('');
 fetchPlans();
 } catch (err: any) {
 show(err?.response?.data?.message || (tt('nurdash.46e1b018')), 'error');
 } finally { setSaving(false); }
 };

 return (
 <NScroll>
 <NHeader title={tt('nurdash.bc1b0149')} onBack={onBack} />
 <NCard style={{marginBottom:SP.xl,flexDirection:AR?'row-reverse':'row',gap:SP.md,alignItems:'center'}}>
 <NAvatar name={patient?.patient_name || patient?.patient || '—'} size={44} />
 <View><Text style={{fontWeight:FW.bold,color:theme.text}}>{patient?.patient_name || patient?.patient || '—'}</Text>
 <NBadge label={tt('nurdash.e6035471')} variant="danger" size="xs" style={{marginTop:SP.xs}} /></View>
 </NCard>

 <NSecHeader title={tt('nurdash.9564716e')} />
 {loading ? <ActivityIndicator color={theme.primary} style={{ marginVertical: SP.xl }} /> :
 plans.length === 0 ? <NEmpty title={tt('nurdash.2f17fd06')} subtitle={tt('nurdash.59692e1b')} /> :
 plans.map((p:any, i:number)=>(
 <NCard key={p.id || i} style={{marginBottom:SP.md}} accent={p.status==='active'?tokens.pink:undefined}>
 <View style={{flexDirection:AR?'row-reverse':'row',alignItems:'center',justifyContent:'space-between',marginBottom:SP.xs}}>
 <Text style={{fontSize:FS.sm,fontWeight:FW.bold,color:theme.text,textAlign:AR?'right':'left',flex:1}}>{p.title}</Text>
 <NBadge label={p.status==='active'?(tt('nurdash.f9ffe17e')):(tt('nurdash.b1133f99'))} variant={p.status==='active'?'success':'default'} size="xs" />
 </View>
 {(p.tasks||[]).map((t:string, ti:number)=>(
 <View key={ti} style={{flexDirection:AR?'row-reverse':'row',alignItems:'flex-start',gap:SP.sm,marginTop:4}}>
 <I name="check" size={12} color={theme.textSub} style={{marginTop:3}} />
 <Text style={{flex:1,fontSize:FS.sm,color:theme.textSub,lineHeight:20,textAlign:AR?'right':'left'}}>{t}</Text>
 </View>
 ))}
 </NCard>
 ))}

 <NSecHeader title={tt('nurdash.e3fa5a7d')} />
 <NCard style={{marginBottom:SP.xl}}>
 <NInput label={tt('nurdash.0c75bc36')} placeholder={tt('nurdash.c0b2c42a')} value={title} onChange={setTitle} icon="edit" />
 <NInput label={tt('nurdash.ace623a2')} placeholder={tt('nurdash.37fef521')} value={taskText} onChange={setTaskText} multi lines={4} icon="list" />
 <NBtn label={tt('nurdash.887cd657')} loading={saving} onPress={handleCreate} style={{marginTop:SP.md}} />
 </NCard>
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════
// PROGRESS NOTES — Daily nursing notes
// ══════════════════════════════════════════════════════════════════
function ProgressNotes({ patient, onBack }:{ patient:any; onBack:()=>void }) {
 const { theme } = useTheme(); const { lang, t: tt } = useLang(); const { show } = useToast(); const AR = lang==='ar';
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
 <NHeader title={tt('nurdash.332831f9')} onBack={onBack} />
 <NCard style={{marginBottom:SP.xl,flexDirection:AR?'row-reverse':'row',gap:SP.md,alignItems:'center'}}>
 <NAvatar name={patient?.patient??'—'} size={44} />
 <View><Text style={{fontWeight:FW.bold,color:theme.text}}>{patient?.patient??'—'}</Text></View>
 </NCard>

 {/* New Note */}
 <NSecHeader title={tt('nurdash.fddfdb7a')} />
 <NCard style={{marginBottom:SP.xl}}>
 <Text style={{fontSize:FS.md,fontWeight:FW.bold,color:theme.text,marginBottom:SP.md,textAlign:AR?'right':'left'}}>{tt('nurdash.7bdaa8db')}</Text>
 <View style={{flexDirection:AR?'row-reverse':'row',gap:SP.sm,marginBottom:SP.md,flexWrap:'wrap'}}>
 <NInput label={tt('nurdash.01506d73')} placeholder="120/80" value={vitals.bp} onChange={v=>setVitals(p=>({...p,bp:v}))} style={{flex:1,marginBottom:0,minWidth:80}} />
 <NInput label={tt('nurdash.b9e70fa1')} placeholder="72" value={vitals.pulse} onChange={v=>setVitals(p=>({...p,pulse:v}))} kbType="numeric" style={{flex:1,marginBottom:0,minWidth:60}} />
 <NInput label={tt('nurdash.30ada89d')} placeholder="36.8" value={vitals.temp} onChange={v=>setVitals(p=>({...p,temp:v}))} kbType="decimal-pad" style={{flex:1,marginBottom:0,minWidth:60}} />
 </View>
 <View style={{flexDirection:AR?'row-reverse':'row',gap:SP.sm,marginBottom:SP.lg}}>
 <NInput label="SpO2" placeholder="98%" value={vitals.spo2} onChange={v=>setVitals(p=>({...p,spo2:v}))} style={{flex:1,marginBottom:0}} />
 <NInput label={tt('nurdash.bc6a278e')} placeholder="145" value={vitals.glucose} onChange={v=>setVitals(p=>({...p,glucose:v}))} kbType="numeric" style={{flex:1,marginBottom:0}} />
 </View>
 <NInput label={tt('nurdash.691e0d25')} placeholder={tt('nurdash.233e89bf')} value={note} onChange={setNote} multi lines={5} />
 <NBtn label={tt('nurdash.a9e7da12')} loading={loading}
 onPress={async()=>{
   setLoading(true);
   try {
     if (!patientId) { show(tt('nurdash.8e84d457'),'error'); setLoading(false); return; }
     await client.post('/nursing/notes', { patient_id: patientId, booking_id: patient?.id, vitals, note });
     show(tt('nurdash.334e5399'),'success');
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
 <NSecHeader title={tt('nurdash.9c46df69')} />
 {loadingNotes ? <ActivityIndicator color={theme.primary} style={{marginVertical:SP.lg}} /> :
 pastNotes.length === 0 ? <NEmpty title={tt('nurdash.df2ccffc')} /> :
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
 const { theme } = useTheme(); const { lang, t, t: tt } = useLang(); const { show } = useToast(); const AR = lang==='ar';
 const [visits, setVisits] = useState<any[]>([]);
 const [visitId, setVisitId] = useState<string | null>(null);
 useEffect(() => { client.get('/nursing/jobs/active').then(r => {
   const list: any[] = Array.isArray(r.data) ? r.data : [];
   // The API returns only this nurse's active visits (the ones that can take a supply request).
   setVisits(list); setVisitId(list[0]?.id ?? null);
 }).catch(() => {}); }, []);
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
 booking_id: visitId,
 items: [{ name: newItem, qty: parseInt(newQty, 10), unit: 'pcs' }],
 });
 show(t('supplies.requested'), 'success');
 setNewItem('');
 setNewQty('');
 } catch (e: any) {
 show(e?.message || t('supplies.failed'), 'error');
 } finally {
 setLoading(false);
 }
 };

 return (
 <NScroll>
 <NHeader title={tt('nurdash.d36546d1')} onBack={onBack} />

 <NCard style={{backgroundColor:withAlpha(tokens.pink, 0.10),marginBottom:SP.xl}}>
 <Text style={{fontSize:FS.sm,color:tokens.pink,lineHeight:20,textAlign:AR?'right':'left'}}>
 {tt('nurdash.cb346eb2')}
 </Text>
 </NCard>

 <View style={{flexDirection:'row',gap:SP.md,marginBottom:SP.xl}}>
 <NStatCard icon="" label={tt('nurdash.40efd0af')} value={String(supplies.filter(s=>s.status==='delivered').length)} color={tokens.success} style={{flex:1}} />
 <NStatCard icon="◔" label={tt('nurdash.f2a13c93')} value={String(supplies.filter(s=>s.status==='ordered').length)} color={tokens.warning} style={{flex:1}} />
 <NStatCard icon="!" label={tt('nurdash.94139241')} value={String(supplies.filter(s=>s.status==='pending').length)} color={tokens.error} style={{flex:1}} />
 </View>

 <NSecHeader title={tt('nurdash.7ce47c94')} />
 {supplies.map(sup=>(
 <NCard key={sup.id} style={{marginBottom:SP.sm}} accent={sup.status==='delivered'?tokens.success:sup.status==='ordered'?tokens.warning:tokens.error}>
 <View style={{flexDirection:AR?'row-reverse':'row',alignItems:'center',gap:SP.md}}>
 <IBg name="bandage" size={14} color={tokens.pink} bg={withAlpha(tokens.pink, 0.12)} />
 <View style={{flex:1}}>
 <Text style={{fontSize:FS.md,fontWeight:FW.semi,color:theme.text,textAlign:AR?'right':'left'}}>{AR?sup.name:sup.nameEn}</Text>
 <Text style={{fontSize:FS.xs,color:theme.textSub}}>{sup.qty} {sup.unit}</Text>
 </View>
 <NBadge label={sup.status==='delivered'?(tt('nurdash.dda56bde')):sup.status==='ordered'?(tt('nurdash.496cc501')):(tt('nurdash.94139241'))} variant={sup.status==='delivered'?'success':sup.status==='ordered'?'warning':'danger'} size="xs" />
 </View>
 </NCard>
 ))}

 <NDivider style={{marginVertical:SP.xl}} />
 <NSecHeader title={tt('nurdash.0fbe6b64')} />
 <NSecHeader title={t('supplies.forVisit')} />
 {visits.length === 0 ? (
 <NCard style={{marginBottom:SP.md}}><Text style={{fontSize:FS.sm,color:theme.textSub,textAlign:AR?'right':'left'}}>{t('supplies.noVisit')}</Text></NCard>
 ) : (
 <View style={{flexDirection:AR?'row-reverse':'row',flexWrap:'wrap',gap:SP.sm,marginBottom:SP.md}}>
 {visits.map(v => (
 <NBtn key={v.id} size="sm" full={false} variant={visitId===v.id?'primary':'outline'} onPress={() => setVisitId(v.id)}
 label={[v.service, v.scheduled_at ? new Date(v.scheduled_at).toLocaleDateString(localeTag(lang)) : null].filter(Boolean).join(' · ') || String(v.id)} />
 ))}
 </View>
 )}
 <NInput label={tt('nurdash.68a59079')} placeholder={tt('nurdash.4d5b3798')} value={newItem} onChange={setNewItem} />
 <NInput label={tt('nurdash.d6e33524')} placeholder="1" value={newQty} onChange={v=>setNewQty(v.replace(/\D/g,''))} kbType="numeric" />
 <NBtn label={tt('nurdash.1a0e168c')} disabled={!visitId||!newItem.trim()||!newQty} loading={loading}
 onPress={handleRequest} />
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════
// NURSING SETTINGS
// ══════════════════════════════════════════════════════════════════
function NursingSettings({ onLogout, onNav }:{ onLogout:()=>void; onNav:(s:string,p?:any)=>void }) {
 const insets = useSafeAreaInsets();
 const { theme, toggle:toggleT, mode } = useTheme(); const { lang, toggle:toggleL, t: tt } = useLang();
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
      show(tt('nurdash.44bd2050'), 'success');
    } catch (e) {
      show(tt('nurdash.117075fa'), 'error');
      setDeltaPending(false);
    }
  };
return (
 <View style={{flex:1,backgroundColor:theme.bg}}>
 <View style={[st.topBar,{backgroundColor:theme.surface,borderBottomColor:theme.border, paddingTop: Math.max(insets.top, 16) }]}>
 <Text style={{fontSize:FS.xl,fontWeight:FW.bold,color:theme.text}}>{tt('nurdash.5766fe8f')}</Text>
 </View>
 <ScrollView contentContainerStyle={{padding:SP.xl,paddingBottom:100}}>
 <NCard style={{marginBottom:SP.xl,flexDirection:AR?'row-reverse':'row',gap:SP.lg,alignItems:'center'}}>
 <IBg name="nursing" size={22} color={tokens.pink} bg={withAlpha(tokens.pink, 0.12)} />
 <View style={{flex:1}}>
 <Text style={{fontSize:FS.xl,fontWeight:FW.bold,color:theme.text,textAlign:AR?'right':'left'}}>{tt('nurdash.4ec2f38c')}</Text>
 <NBadge label={tt('nurdash.03886b8f')} variant="success" size="xs" style={{marginTop:SP.xs}} />
 </View>
 </NCard>
 
      {deltaPending && (
        <NCard style={{ marginBottom: SP.xl, backgroundColor: theme.warnBg, borderColor: theme.warnBg }}>
          <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.warn, textAlign: AR ? 'right' : 'left' }}>
            {tt('nurdash.47e8b69c')}
          </Text>
        </NCard>
      )}
<NSecHeader title={tt('nurdash.59a58272')} />
 <NCard style={{marginBottom:SP.xl}}>
 <NSettingsRow icon="user" label={tt('nurdash.98b10900')} onPress={()=>onNav('profile_edit')} />
 <NSettingsRow icon="stethoscope" label={tt('nurdash.bc5efe82')} onPress={()=>onNav('nursing_services')} />
 <NSettingsRow icon="scan" label={tt('nurdash.fd221036')} onPress={()=>onNav('nursing_coverage')} />
 <NSettingsRow icon="calendar" label={tt('nurdash.82f7fda8')} onPress={()=>onNav('working_hours')} />
 <NSettingsRow icon="shield" label={tt('nurdash.2eb56936')} onPress={()=>onNav('insurance_config')} />
<NSettingsRow icon="shield" label={tt('nurdash.679ae00d')} onPress={()=>onNav('insurance_requests')} />
<NSettingsRow icon="document" label={tt('nurdash.7a80399f')} onPress={()=>onNav(ORDERING_ENTRY)} />
 <NSettingsRow icon="document" label={tt('nurdash.52c41d52')} onPress={()=>onNav('certificates_config')} />
 <NSettingsRow icon="camera" label={tt('nurdash.07de3762')} onPress={()=>onNav('media_config')} />
 </NCard>

 {/* Marketing & Reputation */}
 <NSecHeader title={tt('nurdash.1dd2aaf8')} />
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
 { icon:'scan', ar:'وحدة تتبع زيارات التمريض (GPS)', en:'Nurse Visit Tracker (GPS)', action:()=>onNav('nurse_visit') },
 { icon:'document', ar:'قائمة مهام العلامات الحيوية والرعاية', en:'Clinical Vitals Checklist', action:()=>onNav('nurse_checklist') },
 ].map((row, i) => (
 <NSettingsRow key={i} icon={row.icon} label={AR ? row.ar : row.en} onPress={row.action} />
 ))}
 </NCard>
 <GlobalSystemSettings />
 <NSecHeader title={tt('nurdash.a668a3ad')} />
 <NCard style={{marginBottom:SP.xl}}>
 <NSettingsRow icon="bell" label={tt('nurdash.5e885201')} onPress={()=>onNav('notifications')} />
 <NSettingsRow icon="briefcase" label={tt('nurdash.ebb9f1de')} onPress={() => onNav('medical_jobs')} />
 <NSettingsRow icon="bookOpen" label={tt('nurdash.0e14b12f')} onPress={() => onNav('drug_index')} />
 </NCard>
 <NSecHeader title={tt('nurdash.b42c5798')} />
 <NCard style={{marginBottom:SP.xl}}>
 {[
 { icon: 'lock', ar:'تغيير كلمة المرور', en:'Change Password', action: () => onNav('password') },
 { icon: 'shield', ar:'التحقق الثنائي', en:'2FA', action: () => onNav('2fa') },
 { icon: 'scan', ar:'الأجهزة', en:'Devices', action: () => onNav('devices') }
 ].map((r,i)=>(
 <NSettingsRow key={i} icon={r.icon} label={AR?r.ar:r.en} onPress={r.action} />
 ))}
 </NCard>
 <NCard><NSettingsRow icon="lock" label={tt('nurdash.d56d4be0')} onPress={()=>setShowLO(true)} danger /></NCard>
 </ScrollView>
 <NConfirm visible={showLO} title={tt('nurdash.d6c04a80')} msg={tt('nurdash.2c77c9c9')}
 onOk={()=>{setShowLO(false);onLogout();}} onCancel={()=>setShowLO(false)} okLabel={tt('nurdash.d6c04a80')} />
 </View>
 );
}

// ══════════════════════════════════════════════════════════════════
// NURSING COVERAGE SETTINGS
// ══════════════════════════════════════════════════════════════════
function NursingCoverageSettings({ onBack }:{ onBack:()=>void }) {
 const { theme } = useTheme(); const { lang, t, t: tt } = useLang(); const { show } = useToast(); const AR = lang==='ar';
 
 const [radius, setRadius] = useState(15);
 const [gpsChecked, setGpsChecked] = useState(false);
 const [gpsLoading, setGpsLoading] = useState(false);
 const [gpsResult, setGpsResult] = useState<{ covered: boolean; distance_km?: number; radius_km?: number; reason?: string } | null>(null);

 const handleGpsVerification = async () => {
 setGpsLoading(true);
 try {
   const { requestForegroundPermissionsAsync, getCurrentPositionAsync } = await import('expo-location');
   const perm = await requestForegroundPermissionsAsync();
   if (perm.status !== 'granted') { show(t('coverage.permission'), 'error'); return; }
   const pos = await getCurrentPositionAsync({});
   const r: any = await client.post('/nursing/coverage/verify-gps', { lat: pos.coords.latitude, lng: pos.coords.longitude });
   const data = r?.data?.data ?? r?.data ?? r;
   setGpsResult({ covered: !!data?.covered, distance_km: data?.distance_km, radius_km: data?.radius_km, reason: data?.reason });
   setGpsChecked(true);
 } catch (e: any) {
   show(e?.message || t('coverage.failed'), 'error');
 } finally {
   setGpsLoading(false);
 }
 };

 return (
 <NScroll>
 <NHeader title={tt('nurdash.a18eef8e')} onBack={onBack} />

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
 {tt('nurdash.c520796e')}
 </Text>
 <NBadge label={gpsChecked ? (tt('nurdash.5d8ab30f')) : (tt('nurdash.28e860d9'))} variant={gpsChecked ? 'success' : 'warning'} />
 </View>
 <NBtn label={tt('nurdash.4658d917')} loading={gpsLoading} onPress={handleGpsVerification} variant="outline" />
 </NCard>

 <NSecHeader title={tt('nurdash.a1e4d3bf')} />
 <NCard style={{ marginBottom: SP.xl, gap: SP.lg }}>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
 {tt('nurdash.52ad58d1')}
 </Text>
 
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', flexWrap:'wrap', gap: SP.sm }}>
 {[5, 10, 15, 20, 30, 50].map(k => (
 <TouchableOpacity key={k} onPress={() => setRadius(k)}
 style={[{ paddingHorizontal: SP.lg, paddingVertical: SP.md, borderRadius: R.md, borderWidth: 1.5 }, {
 backgroundColor: radius === k ? theme.primary : theme.surface2,
 borderColor: radius === k ? theme.primary : theme.border
 }]}>
 <Text style={{ color: radius === k ? '#FFF' : theme.text, fontWeight: FW.bold }}>{k} {tt('nurdash.17e9ee72')}</Text>
 </TouchableOpacity>
 ))}
 </View>
 </NCard>

 {gpsResult ? (
 <NCard style={{ marginBottom: SP.xl, gap: SP.xs }}>
 <NBadge label={gpsResult.reason === 'no_geofence' ? t('coverage.noGeofence') : gpsResult.covered ? t('coverage.inside') : t('coverage.outside')} variant={gpsResult.covered ? 'success' : 'warning'} />
 {gpsResult.distance_km != null && gpsResult.radius_km != null ? (
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>{t('coverage.distance', { distance: gpsResult.distance_km, radius: gpsResult.radius_km })}</Text>
 ) : null}
 </NCard>
 ) : null}

 <NBtn label={tt('nurdash.b9c1f9fd')} disabled={!gpsChecked} onPress={async () => {
    try {
      await client.post('/provider/settings/delta', { newData: { radius } });
      show(tt('nurdash.44bd2050'), 'success');
      onBack();
    } catch(e) {
      show(tt('nurdash.117075fa'), 'error');
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
  const { theme } = useTheme(); const { lang, t: tt } = useLang(); const AR = lang === 'ar';
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
      } catch { if (alive) show(tt('nurdash.81ac88f4'), 'error'); }
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
    } catch { show(tt('nurdash.21dc28bc'), 'error'); }
    finally { setSending(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={tt('nurdash.192d2a37')} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: SP.xl, gap: SP.md }}>
        <View style={{ backgroundColor: theme.warnBg, padding: SP.md, borderRadius: R.md, marginBottom: SP.lg }}>
          <Text style={{ color: theme.warn, fontSize: FS.xs, textAlign: 'center' }}>
            {tt('nurdash.6a655386')}
          </Text>
        </View>
        {loading && <Text style={{ color: theme.textSub, textAlign: 'center' }}>{tt('nurdash.be1256ed')}</Text>}
        {!loading && msgs.length === 0 && <Text style={{ color: theme.textSub, textAlign: 'center' }}>{tt('nurdash.7c5a0646')}</Text>}
        {msgs.map(m => {
          const mine = m.sender_id === (user as any)?.id;
          const time = m.createdAt ? fmtTime(m.createdAt, AR) : '';
          return (
          <View key={m.id || m._id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', backgroundColor: mine ? theme.primary : theme.surface, padding: SP.md, borderRadius: R.md, maxWidth: '80%' }}>
            <Text style={{ color: mine ? '#FFF' : theme.text }}>{m.body}</Text>
            <Text style={{ color: mine ? '#FFF8' : theme.textSub, fontSize: 10, marginTop: 4, textAlign: 'right' }}>{time}</Text>
          </View>
          );
        })}
      </ScrollView>
      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', padding: SP.lg, borderTopWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, alignItems: 'center', gap: SP.md }}>
        <TextInput value={msg} onChangeText={setMsg} placeholder={tt('nurdash.ae9e7693')} style={{ flex: 1, backgroundColor: theme.bg, padding: SP.md, borderRadius: R.md, color: theme.text, textAlign: AR ? 'right' : 'left' }} />
        <NBtn label={sending ? '...' : (tt('nurdash.ad89df6b'))} onPress={handleSend} full={false} />
      </View>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════
// WORKING HOURS / SCHEDULE
// ══════════════════════════════════════════════════════════════════
function NursingScheduleScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme(); const { lang, t: tt } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
  const [shifts, setShifts] = useState({ morning: true, evening: true, night: false });
  const [maxVisits, setMaxVisits] = useState('8');
  const [emergencyReady, setEmergencyReady] = useState(false);

  // start from what the server holds (the last approved settings), not from invented defaults
  useEffect(() => {
    client.get('/provider/schedule/settings').then((res: any) => {
      const d = res?.data;
      if (!d || typeof d !== 'object') return;
      if (d.shifts && typeof d.shifts === 'object') setShifts({ morning: !!d.shifts.morning, evening: !!d.shifts.evening, night: !!d.shifts.night });
      if (Number.isFinite(Number(d.maxVisits))) setMaxVisits(String(d.maxVisits));
      if (typeof d.emergencyReady === 'boolean') setEmergencyReady(d.emergencyReady);
    }).catch(() => undefined);
  }, []);

  const handleSave = async () => {
    const visits = parseInt(maxVisits, 10);
    if (!Number.isInteger(visits) || visits < 1 || visits > 50) { show(tt('nurdash.7f7be476'), 'error'); return; }
    try {
      await client.post('/provider/schedule/settings', { shifts, maxVisits: visits, emergencyReady });
      // the server files the change for the review team
      show(tt('nurdash.61d37192'), 'success');
      onBack();
    } catch (e: any) {
      show(e?.response?.data?.message || (tt('nurdash.3ce5c75c')), 'error');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={tt('nurdash.82f7fda8')} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: SP.xl, gap: SP.lg }}>
        
        <NSecHeader title={tt('nurdash.dbdef8f7')} />
        <NCard style={{ gap: SP.md }}>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: theme.text, fontSize: FS.md }}>{tt('nurdash.e6b287f3')}</Text>
            <Switch value={shifts.morning} onValueChange={v => setShifts({ ...shifts, morning: v })} />
          </View>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: theme.text, fontSize: FS.md }}>{tt('nurdash.07bd0cb8')}</Text>
            <Switch value={shifts.evening} onValueChange={v => setShifts({ ...shifts, evening: v })} />
          </View>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: theme.text, fontSize: FS.md }}>{tt('nurdash.6782fc12')}</Text>
            <Switch value={shifts.night} onValueChange={v => setShifts({ ...shifts, night: v })} />
          </View>
        </NCard>

        <NSecHeader title={tt('nurdash.a292bf0f')} />
        <NCard style={{ gap: SP.lg }}>
          <NInput label={tt('nurdash.a8bf6096')} value={maxVisits} onChange={setMaxVisits} kbType="numeric" />
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ color: theme.text, fontSize: FS.md, fontWeight: FW.bold }}>{tt('nurdash.aa246d76')}</Text>
              <Text style={{ color: theme.textSub, fontSize: FS.xs }}>{tt('nurdash.f08eb3d6')}</Text>
            </View>
            <Switch value={emergencyReady} onValueChange={setEmergencyReady} />
          </View>
        </NCard>

        <NBtn label={tt('nurdash.009b3141')} onPress={handleSave} />
      </ScrollView>
    </View>
  );
}