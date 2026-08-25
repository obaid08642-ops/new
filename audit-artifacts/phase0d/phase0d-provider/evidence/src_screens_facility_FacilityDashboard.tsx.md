# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/screens/facility/FacilityDashboard.tsx`
- **Member SHA-256:** `2393908aee819d18dd0c62a0b1a6adf5f34383c4a966e6a143aa734ca71a12fb`
- **Line count:** 2472
- **Read range:** `1-2472`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `7: * ║ SubAccountsScreen — manage doctors / staff sub-accounts ║`
- `8: * ║ AddSubAccountScreen — add new doctor/staff with Credential Card ║`
- `9: * ║ DepartmentManagementScreen — manage departments + assigned doctors ║`
- `10: * ║ ShiftManagementScreen — shift scheduling + substitutes ║`
- `11: * ║ BedManagementScreen — bed availability + ICU + admissions ║`
- `12: * ║ UnifiedScheduleScreen — facility-wide appointment calendar ║`
- `13: * ║ QRCheckinScreen — patient QR check-in system ║`
- `14: * ║ InsuranceClaimsHubScreen — all insurance claims management ║`
- `15: * ║ FacilityFinancialScreen — unified financial reports ║`
- `16: * ║ StaffAttendanceScreen — staff check-in/out attendance ║`
- `17: * ║ SurgeryScheduleScreen — OT/Surgery room scheduling ║`
- `18: * ║ CredentialingScreen — doctor credential verification workflow ║`
### backend_consumers_or_contracts
- `40: import client from '../../api/client';`
- `41: import { InsuranceRequestsScreen } from '../shared/InsuranceRequestsScreen';`
- `344: // revenue/appointments from /provider/stats/today, staff from subaccounts.`
- `1440: await client.patch(`/care/appointments/${encodeURIComponent(apptId)}/check-in`);`
- `1593: client.get('/insurance/requests/provider/queue')`
- `1691: client.get('/provider/ops/wallet/ledger')`
- `2335: const resBookings = await client.get('/home-care/bookings/nursing/all');`
- `2338: const resNurses = await client.get('/home-care/providers?availability=now');`
- `2355: await client.post(`/home-care/bookings/${selectedBooking.id}/assign`, {`
### auth_ownership
- `26: RefreshControl, ActivityIndicator, Modal`
- `28: import { CameraView, useCameraPermissions } from 'expo-camera';`
- `70: function FacilityOrdersTab({ onNavigate, onRefresh }: any) {`
- `125: export function FacilityDashboardNavigator({ onLogout }: { onLogout: () => void }) {`
- `187: {activeTab === 'orders' && <FacilityOrdersTab onNavigate={go} surgeries={surgeries} wards={wards} onRefresh={fetchWardsAndSurgeries} />}`
- `190: {activeTab === 'settings' && <FacilitySettingsScreen onLogout={onLogout} onNavigate={go} />}`
- `203: <Stack.Screen name="add_subaccount">{({ navigation, route }: any) => <FacilityInvitationScreen onBack={() => navigation.goBack()} preRole={route.params?.param} />}</Stack.Screen>`
- `209: <Stack.Screen name="beds">{({ navigation }: any) => <BedManagementScreen onBack={() => navigation.goBack()} wards={wards} onRefresh={fetchWardsAndSurgeries} />}</Stack.Screen>`
- `219: <Stack.Screen name="surgery_sched">{({ navigation }: any) => <SurgeryScheduleScreen onBack={() => navigation.goBack()} surgeries={surgeries} onRefresh={fetchWardsAndSurgeries} />}</Stack.Screen>`
- `258: const [refreshing, setRefreshing] = useState(false);`
- `268: const onRefresh = async () => {`
- `269: setRefreshing(true);`
### state_transitions
- `22: import React, { useState, useRef, useEffect } from 'react';`
- `34: NSettingsRow, NSecHeader, NConfirm, NEmpty, NSkeleton,`
- `73: const [tab, setTab] = useState<'pending'|'active'>('pending');`
- `74: const [orders, setOrders] = useState<any[]>([]);`
- `87: <TouchableOpacity style={{ flex: 1, padding: SP.md, alignItems: 'center', borderBottomWidth: tab === 'pending' ? 2 : 0, borderColor: theme.primary }} onPress={() => setTab('pending')}>`
- `88: <Text style={{ color: tab === 'pending' ? theme.primary : theme.textSub, fontWeight: FW.bold }}>{AR ? 'طلبات جديدة' : 'New'}</Text>`
- `91: <Text style={{ color: tab === 'active' ? theme.primary : theme.textSub, fontWeight: FW.bold }}>{AR ? 'مؤكدة' : 'Confirmed'}</Text>`
- `95: {tab === 'pending' && (`
- `97: {orders.length === 0 && <NEmpty title={AR ? 'لا توجد طلبات' : 'No Orders'} icon="document" />}`
- `112: <NEmpty title={AR ? 'لا توجد مواعيد' : 'No Appointments'} icon="calendar" />`
- `126: const [activeTab, setActiveTab] = useState('home');`
- `130: const [wards, setWards] = useState<any[]>([]);`
### payment_insurance_relevance
- `8: * ║ AddSubAccountScreen — add new doctor/staff with Credential Card ║`
- `14: * ║ InsuranceClaimsHubScreen — all insurance claims management ║`
- `32: NBtn, NCard, NInput, NPhoneInput, NStatCard, NAvatar,`
- `35: NOnlineToggle, NBottomNav, NDivider, NPriceInput, NRadio`
- `41: import { InsuranceRequestsScreen } from '../shared/InsuranceRequestsScreen';`
- `59: import { MedicalJobsScreen, MedicalDrugIndexScreen, InsuranceConfigScreen, CertificatesConfigScreen, MediaConfigScreen, ProviderWalletScreen, ProviderHomeStats, GlobalSystemSettings, StatisticsReports } from '../shared/SharedScreens';`
- `99: <NCard key={order.id} style={{ marginBottom: SP.md }} onPress={() => onNavigate('order_detail', order)}>`
- `104: <Text style={{ color: theme.textSub, marginTop: SP.sm, textAlign: AR ? 'right' : 'left' }}>{order.svc} - {order.total} SAR</Text>`
- `105: </NCard>`
- `211: <Stack.Screen name="insurance_hub">{({ navigation }: any) => <InsuranceClaimsHubScreen onBack={() => navigation.goBack()} />}</Stack.Screen>`
- `227: <Stack.Screen name="wallet">{({ navigation }: any) => <ProviderWalletScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>`
- `241: <Stack.Screen name="insurance_requests">{({ navigation }: any) => <InsuranceRequestsScreen onBack={() => navigation.goBack()} />}</Stack.Screen>`
### error_empty_loading_retry_cancel
- `34: NSettingsRow, NSecHeader, NConfirm, NEmpty, NSkeleton,`
- `73: const [tab, setTab] = useState<'pending'|'active'>('pending');`
- `87: <TouchableOpacity style={{ flex: 1, padding: SP.md, alignItems: 'center', borderBottomWidth: tab === 'pending' ? 2 : 0, borderColor: theme.primary }} onPress={() => setTab('pending')}>`
- `88: <Text style={{ color: tab === 'pending' ? theme.primary : theme.textSub, fontWeight: FW.bold }}>{AR ? 'طلبات جديدة' : 'New'}</Text>`
- `95: {tab === 'pending' && (`
- `97: {orders.length === 0 && <NEmpty title={AR ? 'لا توجد طلبات' : 'No Orders'} icon="document" />}`
- `112: <NEmpty title={AR ? 'لا توجد مواعيد' : 'No Appointments'} icon="calendar" />`
- `132: const [loading, setLoading] = useState(false);`
- `137: setLoading(true);`
- `145: } catch (e: any) {`
- `148: setLoading(false);`
- `168: }).catch(() => setBranches([]));`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
