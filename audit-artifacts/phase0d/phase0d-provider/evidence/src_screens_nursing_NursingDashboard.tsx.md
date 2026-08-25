# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/screens/nursing/NursingDashboard.tsx`
- **Member SHA-256:** `0a11beb69e3d47f5cecf65095aabd329d5c66315ba66f865cfb22c997e72194d`
- **Line count:** 1722
- **Read range:** `1-1722`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `2: * NABDAH PLUS – PHASE 5 · NURSING DASHBOARD (10 screens)`
- `26: import { InsuranceRequestsScreen } from '../shared/InsuranceRequestsScreen';`
- `32: NDivider, NPriceInput, NCheckbox, NProfileImageUploader`
- `37: PromotionsDashboard, CreateCampaignScreen, ProfileWebConfig,`
- `38: SubscriptionsAdsScreen, AffiliatePortal, ReputationHub,`
- `40: SosDispatchScreen, GpsRouterScreen,`
- `42: } from '../shared/BlueprintScreens';`
- `43: import { MedicalJobsScreen, MedicalDrugIndexScreen, InsuranceConfigScreen, CertificatesConfigScreen, MediaConfigScreen, ProviderWalletScreen, ProviderHomeStats, GlobalSystemSettings } from '../shared/SharedScreens';`
- `44: import { NotificationsCenterScreen, SecurityManagementScreen } from '../shared/RealScreens';`
- `57: export function NursingDashboardNavigator({ onLogout }: { onLogout:()=>void }) {`
- `115: <Stack.Navigator id={undefined as any} screenOptions={{ headerShown: false }}>`
- `116: <Stack.Screen name="MainTabs">`
### backend_consumers_or_contracts
- `25: import client from '../../api/client';`
- `26: import { InsuranceRequestsScreen } from '../shared/InsuranceRequestsScreen';`
- `55: import { NursingFieldOps } from './NursingFieldOps';`
- `143: await client.post(`/nursing/visits/${incomingRequest.id}/respond`, { accept: true });`
- `153: await client.post(`/nursing/visits/${incomingRequest.id}/respond`, { accept: false });`
- `230: await client.post('/home-care/provider/availability', { available: nextVal });`
- `362: client.get('/nursing/jobs/active').then(res => setJobs(res.data || []));`
- `424: await client.post(`/home-care/bookings/${order.id}/respond`, { accept: true });`
- `435: await client.post(`/home-care/bookings/${order.id}/respond`, { accept: false });`
- `510: useEffect(() => { client.get('/provider/nursing/checklist').then(r => setItems(r.data || [])).catch(() => {}); }, []);`
- `580: if (p) await client.post(`/home-care/bookings/${order.id}/gps`, p);`
- `602: await client.post(`/home-care/bookings/${order.id}/gps`, p);`
### auth_ownership
- `20: Animated, FlatList, Alert, Dimensions, Switch, RefreshControl, TextInput,`
- `57: export function NursingDashboardNavigator({ onLogout }: { onLogout:()=>void }) {`
- `66: const [refreshing, setRefreshing] = useState(false);`
- `81: setRefreshing(true);`
- `97: setRefreshing(false);`
- `121: {tab==='home' && <NursingHome onNav={go} jobs={jobs} refreshing={refreshing} onRefresh={fetchJobs} onTriggerAlarm={() => setAlarmVisible(true)} />}`
- `125: {tab==='settings' && <NursingSettings onLogout={onLogout} onNav={go} />}`
- `176: <Stack.Screen name="order_detail">{({ navigation, route }: any) => <NursingFieldOps order={route.params?.param} onBack={() => navigation.goBack()} onRefresh={fetchJobs} />}</Stack.Screen>`
- `178: <Stack.Screen name="checkin">{({ navigation, route }: any) => <DigitalCheckin order={route.params?.param} onBack={() => navigation.goBack()} onRefresh={fetchJobs} />}</Stack.Screen>`
- `181: <Stack.Screen name="visit_report">{({ navigation, route }: any) => <VisitReport order={route.params?.param} onBack={() => navigation.goBack()} onRefresh={fetchJobs} />}</Stack.Screen>`
- `221: function NursingHome({ onNav, jobs, refreshing, onRefresh, onTriggerAlarm }:{ onNav:(s:string,p?:any)=>void; jobs:any[]; refreshing:boolean; onRefresh:()=>void; onTriggerAlarm?:()=>void }) {`
- `255: <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E91E63" />}`
### state_transitions
- `16: import React, { useState, useRef, useEffect, useCallback } from 'react';`
- `17: import { AppointmentStatus } from '../../types/contracts';`
- `31: NSecHeader, NConfirm, NEmpty, NOnlineToggle, NBottomNav,`
- `58: const [tab, setTab] = useState('home');`
- `59: const [scr, setScr] = useState<string|null>(null);`
- `60: const [prm, setPrm] = useState<any>(null);`
- `65: const [jobs, setJobs] = useState<any[]>([]);`
- `66: const [refreshing, setRefreshing] = useState(false);`
- `68: const [alarmVisible, setAlarmVisible] = useState(false);`
- `69: const [incomingRequest, setIncomingRequest] = useState<any | null>(null);`
- `72: const pendingJob = jobs.find(o => o.status === 'pending' || o.raw?.state === 'PROVIDER_ASSIGNED');`
- `73: if (pendingJob) {`
### payment_insurance_relevance
- `13: * 10. NursingWallet — earnings + cash-only payments`
- `26: import { InsuranceRequestsScreen } from '../shared/InsuranceRequestsScreen';`
- `29: NBtn, NCard, NInput, NStatCard, NAvatar, NBadge,`
- `32: NDivider, NPriceInput, NCheckbox, NProfileImageUploader`
- `43: import { MedicalJobsScreen, MedicalDrugIndexScreen, InsuranceConfigScreen, CertificatesConfigScreen, MediaConfigScreen, ProviderWalletScreen, ProviderHomeStats, GlobalSystemSettings } from '../shared/SharedScreens';`
- `185: <Stack.Screen name="nursing_coverage">{({ navigation }: any) => <NursingCoverageSettings onBack={() => navigation.goBack()} />}</Stack.Screen>`
- `202: <Stack.Screen name="insurance_config">{({ navigation }: any) => <InsuranceConfigScreen onBack={() => navigation.goBack()} />}</Stack.Screen>`
- `205: <Stack.Screen name="wallet">{({ navigation }: any) => <ProviderWalletScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>`
- `207: <Stack.Screen name="insurance_requests">{({ navigation }: any) => <InsuranceRequestsScreen onBack={() => navigation.goBack()} />}</Stack.Screen>`
- `237: const totalRev = jobs.filter(o=>o.status===AppointmentStatus.COMPLETED).reduce((a,o)=>a+(o.total||o.price||0),0);`
- `260: <NStatCard icon="!" label={AR?'طلبات جديدة':'New Orders'} value={String(pending)} color="#FF9800" style={{width:'47%'}} />`
- `261: <NStatCard icon="◔" label={AR?'زيارات نشطة':'Active Visits'} value={String(active)} color="#2196F3" style={{width:'47%'}} />`
### error_empty_loading_retry_cancel
- `31: NSecHeader, NConfirm, NEmpty, NOnlineToggle, NBottomNav,`
- `72: const pendingJob = jobs.find(o => o.status === 'pending' || o.raw?.state === 'PROVIDER_ASSIGNED');`
- `73: if (pendingJob) {`
- `74: setIncomingRequest(pendingJob);`
- `89: ...inc.data.map((x: any) => ({ ...x, status: 'pending' })),`
- `94: } catch (err: any) {`
- `95: setJobs([]); // Silent fail — show empty queue`
- `147: } catch (e: any) {`
- `148: show(e.message || 'Error', 'error');`
- `157: } catch (e: any) {`
- `158: show(e.message || 'Error', 'error');`
- `231: } catch (e) {}`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
