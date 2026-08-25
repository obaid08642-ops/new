# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PROVIDER_INTAKE_CONSUMER_MAP_20260818.txt`
- **Member SHA-256:** `41d878bb727c843d6cfac27f9b38e8d9aa42401d5b8ee290831d3a7d3136cca6`
- **Line count:** 507
- **Read range:** `1-507`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `2: src/screens/ambulance/AmbulanceDashboard.tsx`
- `3: src/screens/ambulance/AmbulanceRegistration.tsx`
- `4: src/screens/auth/AuthScreens.tsx`
- `5: src/screens/auth/PendingDashboard.tsx`
- `6: src/screens/doctor/DoctorDashboard.tsx`
- `7: src/screens/doctor/DoctorOpsScreens.tsx`
- `8: src/screens/doctor/DoctorRegistration.tsx`
- `9: src/screens/doctor/FacilityInvitationsScreen.tsx`
- `10: src/screens/doctor/components/DoctorHeader.tsx`
- `11: src/screens/doctor/components/DoctorQueueList.tsx`
- `12: src/screens/doctor/components/DoctorStatsRow.tsx`
- `13: src/screens/doctor/components/DoctorUrgentRequests.tsx`
### backend_consumers_or_contracts
- `4: src/screens/auth/AuthScreens.tsx`
- `5: src/screens/auth/PendingDashboard.tsx`
- `29: src/screens/nursing/NursingDashboard.tsx`
- `30: src/screens/nursing/NursingFieldOps.tsx`
- `31: src/screens/nursing/NursingRegistration.tsx`
- `32: src/screens/pharmacy/PharmacyDashboard.tsx`
- `33: src/screens/pharmacy/PharmacyRegistration.tsx`
- `34: src/screens/radiology/RadiologyDashboard.tsx`
- `35: src/screens/radiology/RadiologyRegistration.tsx`
- `38: src/screens/shared/InsuranceRequestsScreen.tsx`
- `71: provider-app/src/screens/doctor/DoctorDashboard.tsx:2472:    client.get('/provider/notifications').then(res => {`
- `82: provider-app/src/screens/doctor/DoctorDashboard.tsx:4082:      const res = await fetch(`${API_BASE}/calls/provider/waiting-room`, { headers });`
### auth_ownership
- `53: provider-app/src/screens/doctor/DoctorDashboard.tsx:220: const onRefresh = async () => { setRefreshing(true); await fetchQueue(); setRefreshing(false); };`
- `89: provider-app/src/screens/doctor/DoctorRegistration.tsx:77:  cashOnly:false, acceptedInsurance:[], city:'', location: {lat: 24.7, lng: 46.7}, address:'', clinicName:'', signatureData:'', signerName:'', signerRole:''`
- `117: provider-app/src/screens/facility/FacilityRegistration.tsx:75:  city: '', fullAddress: '', location: {lat: 0, lng: 0}, subProviders: [], cashOnly: false, acceptedInsurance: [], hasInsuranceCoordinator: false, signatureData: '', signerName: `
- `150: provider-app/src/screens/facility/FacilityInvitationScreen.tsx:84:              : `A notification has been sent to (${identifier}). Once accepted, they will join the facility staff with the specified permissions.`}`
- `156: provider-app/src/screens/facility/FacilityDashboard.tsx:187:              {activeTab === 'orders' && <FacilityOrdersTab onNavigate={go} surgeries={surgeries} wards={wards} onRefresh={fetchWardsAndSurgeries} />}`
- `157: provider-app/src/screens/facility/FacilityDashboard.tsx:209:      <Stack.Screen name="beds">{({ navigation }: any) => <BedManagementScreen onBack={() => navigation.goBack()} wards={wards} onRefresh={fetchWardsAndSurgeries} />}</Stack.Screen`
- `158: provider-app/src/screens/facility/FacilityDashboard.tsx:219:      <Stack.Screen name="surgery_sched">{({ navigation }: any) => <SurgeryScheduleScreen onBack={() => navigation.goBack()} surgeries={surgeries} onRefresh={fetchWardsAndSurgeries`
- `188: provider-app/src/screens/facility/FacilityDashboard.tsx:2377: onRefresh={fetchData}`
- `213: provider-app/src/screens/lab/LabDashboard.tsx:660: onRefresh={fetchSamples}`
- `302: provider-app/src/screens/shared/SharedScreens.tsx:1223:                {h.status === 'rejected' && !!h.admin_note && (`
- `308: provider-app/src/screens/shared/SharedScreens.tsx:2181:       {/* Suggest edit — proposals go to the admin review queue (approve/reject) */}`
- `321: provider-app/src/screens/shared/FleetScreen.tsx:127:              {v.status === 'rejected' && !!v.admin_notes && (`
### state_transitions
- `5: src/screens/auth/PendingDashboard.tsx`
- `41: src/screens/shared/RegistrationSuccess.tsx`
- `48: provider-app/src/screens/doctor/DoctorDashboard.tsx:192:	const resIncoming = await client.get('/provider/jobs/queue?status=incoming&kind=consultation');`
- `49: provider-app/src/screens/doctor/DoctorDashboard.tsx:202: const resToday = await client.get('/provider/jobs/queue?status=active');`
- `50: provider-app/src/screens/doctor/DoctorDashboard.tsx:213:  // Production: Error should be shown to user if fetch fails`
- `51: provider-app/src/screens/doctor/DoctorDashboard.tsx:214:  show(AR ? 'تعذر جلب البيانات. يرجى التأكد من اتصالك بالإنترنت.' : 'Failed to fetch data.', 'error');`
- `55: provider-app/src/screens/doctor/DoctorDashboard.tsx:226: show(AR ? 'تم قبول الطلب بنجاح' : 'Request accepted successfully', 'success');`
- `57: provider-app/src/screens/doctor/DoctorDashboard.tsx:229: } catch (e) { show(AR ? 'حدث خطأ أثناء القبول' : 'Error accepting request', 'error'); }`
- `59: provider-app/src/screens/doctor/DoctorDashboard.tsx:236: show(AR ? 'تم رفض الطلب' : 'Request rejected', 'info');`
- `61: provider-app/src/screens/doctor/DoctorDashboard.tsx:280:     <NBtn label={AR ? 'إعادة المحاولة' : 'Retry'} onPress={fetchQueue} size="sm" />`
- `62: provider-app/src/screens/doctor/DoctorDashboard.tsx:450: client.get('/provider/jobs/queue?status=active&kind=consultation')`
- `63: provider-app/src/screens/doctor/DoctorDashboard.tsx:1247:  { id: 'ref2', patientName: apt?.patient || (AR ? 'سارة خالد العتيبي' : 'Sara Al-Otaibi'), date: '2026-06-18', target: AR ? 'مستشفى دله' : 'Dallah Hospital', type: 'Hospital', test: `
### payment_insurance_relevance
- `38: src/screens/shared/InsuranceRequestsScreen.tsx`
- `63: provider-app/src/screens/doctor/DoctorDashboard.tsx:1247:  { id: 'ref2', patientName: apt?.patient || (AR ? 'سارة خالد العتيبي' : 'Sara Al-Otaibi'), date: '2026-06-18', target: AR ? 'مستشفى دله' : 'Dallah Hospital', type: 'Hospital', test: `
- `65: provider-app/src/screens/doctor/DoctorDashboard.tsx:1839:    const fetchWallet = async () => {`
- `66: provider-app/src/screens/doctor/DoctorDashboard.tsx:1854:    fetchWallet();`
- `72: provider-app/src/screens/doctor/DoctorDashboard.tsx:2476:        icon: n.type?.toLowerCase().includes('radiology') ? 'document-text' : n.type?.toLowerCase().includes('payment') ? 'cash' : 'notifications',`
- `79: provider-app/src/screens/doctor/DoctorDashboard.tsx:3829: {AR ? 'حدد شركات التأمين المقبولة لديك ونسب التحمل لكل شركة:' : 'Select which insurance providers you accept and specify copay percentages:'}`
- `88: provider-app/src/screens/doctor/DoctorRegistration.tsx:57:  acceptedInsurance: { companyId: string; plans: string[] }[];`
- `89: provider-app/src/screens/doctor/DoctorRegistration.tsx:77:  cashOnly:false, acceptedInsurance:[], city:'', location: {lat: 24.7, lng: 46.7}, address:'', clinicName:'', signatureData:'', signerName:'', signerRole:''`
- `90: provider-app/src/screens/doctor/DoctorRegistration.tsx:686:    const current = data.acceptedInsurance || [];`
- `91: provider-app/src/screens/doctor/DoctorRegistration.tsx:689:      update({ acceptedInsurance: current.filter(c => c.companyId !== coId) });`
- `92: provider-app/src/screens/doctor/DoctorRegistration.tsx:691:      update({ acceptedInsurance: [...current, { companyId: coId, plans: [] }] });`
- `93: provider-app/src/screens/doctor/DoctorRegistration.tsx:696:    const current = data.acceptedInsurance || [];`
### error_empty_loading_retry_cancel
- `5: src/screens/auth/PendingDashboard.tsx`
- `50: provider-app/src/screens/doctor/DoctorDashboard.tsx:213:  // Production: Error should be shown to user if fetch fails`
- `51: provider-app/src/screens/doctor/DoctorDashboard.tsx:214:  show(AR ? 'تعذر جلب البيانات. يرجى التأكد من اتصالك بالإنترنت.' : 'Failed to fetch data.', 'error');`
- `57: provider-app/src/screens/doctor/DoctorDashboard.tsx:229: } catch (e) { show(AR ? 'حدث خطأ أثناء القبول' : 'Error accepting request', 'error'); }`
- `61: provider-app/src/screens/doctor/DoctorDashboard.tsx:280:     <NBtn label={AR ? 'إعادة المحاولة' : 'Retry'} onPress={fetchQueue} size="sm" />`
- `83: provider-app/src/screens/doctor/DoctorDashboard.tsx:4087:        throw new Error('Failed to fetch waiting room');`
- `114: provider-app/src/screens/doctor/FacilityInvitationsScreen.tsx:100:                  label={inv.status === 'pending' ? (AR ? 'قيد الانتظار' : 'Pending') : inv.status === 'accepted' ? (AR ? 'مقبولة' : 'Accepted') : (AR ? 'مرفوضة' : 'Rejected'`
- `115: provider-app/src/screens/doctor/FacilityInvitationsScreen.tsx:101:                  variant={inv.status === 'pending' ? 'primary' : inv.status === 'accepted' ? 'success' : 'danger'}`
- `117: provider-app/src/screens/facility/FacilityRegistration.tsx:75:  city: '', fullAddress: '', location: {lat: 0, lng: 0}, subProviders: [], cashOnly: false, acceptedInsurance: [], hasInsuranceCoordinator: false, signatureData: '', signerName: `
- `138: provider-app/src/screens/facility/FacilityLeaveRequestsScreen.tsx:16:  status: 'pending' | 'approved' | 'rejected';`
- `141: provider-app/src/screens/facility/FacilityLeaveRequestsScreen.tsx:36:      console.warn('Failed to fetch leave requests', e);`
- `160: provider-app/src/screens/facility/FacilityDashboard.tsx:263:   client.get('/provider/jobs/queue?status=active&kind=appointment&today=true').then(r => setTodayApts(r.data || [])).catch(() => {});`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
