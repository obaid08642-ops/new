# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/screens/doctor/DoctorDashboard.tsx`
- **Member SHA-256:** `2ed3b2b33a3cde7d365561778436b84abe237a5daccf5ca1a0c59335815944b0`
- **Line count:** 4322
- **Read range:** `1-4322`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: * ║ NABDAH PLUS – PHASE 1 · DOCTOR DASHBOARD & ALL SCREENS ║`
- `22: NBottomNav, NDivider, NPriceInput, NProfileImageUploader`
- `28: import { WithdrawalWorkflow, MedicalJobsScreen, MedicalDrugIndexScreen, StatisticsReports, GlobalSystemSettings, ChatSystem } from '../shared/SharedScreens';`
- `33: import { FacilityInvitationsScreen } from './FacilityInvitationsScreen';`
- `35: PromotionsDashboard, CreateCampaignScreen, ProfileWebConfig,`
- `36: SubscriptionsAdsScreen, AffiliatePortal, ReputationHub,`
- `38: SmartOutboundReferralNetwork, SosDispatchScreen, GpsRouterScreen`
- `39: } from '../shared/BlueprintScreens';`
- `51: export function DoctorDashboardNavigator({ onLogout }: { onLogout: () => void }) {`
- `67: <Stack.Navigator id={undefined as any} screenOptions={{ headerShown: false }}>`
- `68: <Stack.Screen name="MainTabs">`
- `70: const navigateTo = (s: string, param?: any) => navigation.navigate(s, { param });`
### backend_consumers_or_contracts
- `9: import { io } from 'socket.io-client';`
- `27: import client from '../../api/client';`
- `172: let socketInstance: any = null;`
- `175: socketInstance = io(cleanUrl, {`
- `176: transports: ['websocket'],`
- `179: socketInstance.on('connect', () => socketInstance?.emit('joinProviderRoom', user.id));`
- `180: socketInstance.on('incoming_urgent_request', (payload: any) => {`
- `186: return () => { if (socketInstance) socketInstance.disconnect(); };`
- `248: await client.post(`/provider/jobs/consultation/${insuranceModalReq.id}/insurance`, {`
- `1438: const endpoint = type === 'lab' ? '/labs/bookings' : type === 'radiology' ? '/radiology/bookings' : '/home-care/bookings';`
- `1838: const res = await client.get('/provider/wallet');`
- `1840: const txRes = await client.get('/provider/wallet/transactions');`
### auth_ownership
- `13: RefreshControl, Switch, ActivityIndicator, KeyboardAvoidingView, Linking } from 'react-native';`
- `51: export function DoctorDashboardNavigator({ onLogout }: { onLogout: () => void }) {`
- `77: {activeTab === 'settings' && <DoctorSettingsTab onLogout={onLogout} onNavigate={navigateTo} />}`
- `138: const [refreshing, setRefreshing] = useState(false);`
- `177: auth: { token: (user as any)?.token || '' }`
- `221: const onRefresh = async () => { setRefreshing(true); await fetchQueue(); setRefreshing(false); };`
- `270: <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}`
- `1433: const patientId = apt?.patient_id;`
- `1434: if (!patientId) {`
- `1442: patient_id: patientId`
- `2085: function DoctorSettingsTab({ onLogout, onNavigate }: { onLogout: () => void, onNavigate: (s: string) => void }) {`
- `2104: // Mock facility permissions locking`
### state_transitions
- `8: import React, { useState, useRef, useEffect, useCallback } from 'react';`
- `10: import { AppointmentStatus } from '../../types/contracts';`
- `21: NSecHeader, NConfirm, NEmpty, NSkeleton, NOnlineToggle,`
- `52: const [activeTab, setActiveTab] = useState('home');`
- `56: const [alarmVisible, setAlarmVisible] = useState(false);`
- `99: <Stack.Screen name="no_show">{({ navigation }: any) => <NoShowManagementScreen onBack={() => navigation.goBack()} />}</Stack.Screen>`
- `138: const [refreshing, setRefreshing] = useState(false);`
- `139: const [requests, setRequests] = useState<any[]>([]);`
- `140: const [todayApts, setTodayApts] = useState<any[]>([]);`
- `141: const [stats, setStats] = useState({ todayCount: 0, revenue: 0, pendingCount: 0 });`
- `142: const [error, setError] = useState(false);`
- `145: const [sound, setSound] = useState<any | null>(null);`
### payment_insurance_relevance
- `5: * ║ Referral · Sick Leave · Patient File · Settings · Wallet ║`
- `19: NBtn, NCard, NInput, NStatCard, NAvatar, NBadge,`
- `22: NBottomNav, NDivider, NPriceInput, NProfileImageUploader`
- `62: { key: 'wallet', icon: 'wallet', label: AR ? 'المحفظة' : 'Wallet' },`
- `76: {activeTab === 'wallet' && <DoctorWalletTab onNavigate={navigateTo} />}`
- `116: <Stack.Screen name="insurance_config">{({ navigation }: any) => <InsuranceConfigScreen onBack={() => navigation.goBack()} />}</Stack.Screen>`
- `146: const [insuranceModalReq, setInsuranceModalReq] = useState<any>(null);`
- `148: const [patientCopay, setPatientCopay] = useState('');`
- `149: const [insuranceCoverage, setInsuranceCoverage] = useState('');`
- `180: socketInstance.on('incoming_urgent_request', (payload: any) => {`
- `181: setRequests(prev => [payload, ...prev]);`
- `195: age: x.age ?? null, type: x.service_type || 'video', price: x.total ?? x.price ?? 0,`
### error_empty_loading_retry_cancel
- `21: NSecHeader, NConfirm, NEmpty, NSkeleton, NOnlineToggle,`
- `141: const [stats, setStats] = useState({ todayCount: 0, revenue: 0, pendingCount: 0 });`
- `142: const [error, setError] = useState(false);`
- `157: setTimeout(() => { s.stopAsync(); }, 45000);`
- `158: } catch (e) {`
- `190: setError(false);`
- `212: } catch (err) {`
- `213: // Keep the prior data out of the way and expose a retryable error state.`
- `214: setError(true);`
- `215: show(AR ? 'تعذر جلب البيانات. يرجى التأكد من اتصالك بالإنترنت.' : 'Failed to fetch data.', 'error');`
- `230: } catch (e) { show(AR ? 'حدث خطأ أثناء القبول' : 'Error accepting request', 'error'); }`
- `239: } catch (e) { show(AR ? 'حدث خطأ' : 'Error', 'error'); }`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
