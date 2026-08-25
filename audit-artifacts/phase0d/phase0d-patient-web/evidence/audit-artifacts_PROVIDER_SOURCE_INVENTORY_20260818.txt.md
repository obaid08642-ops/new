# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PROVIDER_SOURCE_INVENTORY_20260818.txt`
- **Member SHA-256:** `b3a6a5e839858fbcc84208d3b3bb47cb673190ef483e663c4ec899f902fc1332`
- **Line count:** 428
- **Read range:** `1-428`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `23: src/components/SuccessScreen.tsx`
- `29: src/screens/ambulance/AmbulanceDashboard.tsx`
- `30: src/screens/ambulance/AmbulanceRegistration.tsx`
- `31: src/screens/auth/AuthScreens.tsx`
- `32: src/screens/auth/PendingDashboard.tsx`
- `33: src/screens/doctor/DoctorDashboard.tsx`
- `34: src/screens/doctor/DoctorOpsScreens.tsx`
- `35: src/screens/doctor/DoctorRegistration.tsx`
- `36: src/screens/doctor/FacilityInvitationsScreen.tsx`
- `37: src/screens/doctor/components/DoctorHeader.tsx`
- `38: src/screens/doctor/components/DoctorQueueList.tsx`
- `39: src/screens/doctor/components/DoctorStatsRow.tsx`
### backend_consumers_or_contracts
- `15: src/api/catalogs.ts`
- `16: src/api/client.ts`
- `17: src/api/otp.ts`
- `18: src/api/provider.ts`
- `31: src/screens/auth/AuthScreens.tsx`
- `32: src/screens/auth/PendingDashboard.tsx`
- `56: src/screens/nursing/NursingDashboard.tsx`
- `57: src/screens/nursing/NursingFieldOps.tsx`
- `58: src/screens/nursing/NursingRegistration.tsx`
- `59: src/screens/pharmacy/PharmacyDashboard.tsx`
- `60: src/screens/pharmacy/PharmacyRegistration.tsx`
- `61: src/screens/radiology/RadiologyDashboard.tsx`
### auth_ownership
- `17: src/api/otp.ts`
- `21: src/components/OtpModal.tsx`
- `123: /home/ubuntu/nabdah-live-work/provider-app/src/screens/facility/FacilityDashboard.tsx:203:      <Stack.Screen name="add_subaccount">{({ navigation, route }: any) => <FacilityInvitationScreen onBack={() => navigation.goBack()} preRole={route`
- `129: /home/ubuntu/nabdah-live-work/provider-app/src/screens/facility/FacilityDashboard.tsx:209:      <Stack.Screen name="beds">{({ navigation }: any) => <BedManagementScreen onBack={() => navigation.goBack()} wards={wards} onRefresh={fetchWardsA`
- `139: /home/ubuntu/nabdah-live-work/provider-app/src/screens/facility/FacilityDashboard.tsx:219:      <Stack.Screen name="surgery_sched">{({ navigation }: any) => <SurgeryScheduleScreen onBack={() => navigation.goBack()} surgeries={surgeries} onR`
- `212: /home/ubuntu/nabdah-live-work/provider-app/src/screens/nursing/NursingDashboard.tsx:176:      <Stack.Screen name="order_detail">{({ navigation, route }: any) => <NursingFieldOps order={route.params?.param} onBack={() => navigation.goBack()}`
- `214: /home/ubuntu/nabdah-live-work/provider-app/src/screens/nursing/NursingDashboard.tsx:178:      <Stack.Screen name="checkin">{({ navigation, route }: any) => <DigitalCheckin order={route.params?.param} onBack={() => navigation.goBack()} onRef`
- `217: /home/ubuntu/nabdah-live-work/provider-app/src/screens/nursing/NursingDashboard.tsx:181:      <Stack.Screen name="visit_report">{({ navigation, route }: any) => <VisitReport order={route.params?.param} onBack={() => navigation.goBack()} onR`
- `297: '/auth/login'`
- `298: '/auth/send-otp'`
- `299: '/auth/verify-otp'`
- `356: '/provider/auth/send-otp'`
### state_transitions
- `23: src/components/SuccessScreen.tsx`
- `32: src/screens/auth/PendingDashboard.tsx`
- `68: src/screens/shared/RegistrationSuccess.tsx`
- `94: /home/ubuntu/nabdah-live-work/provider-app/src/screens/doctor/DoctorDashboard.tsx:99:     <Stack.Screen name="no_show">{({ navigation }: any) => <NoShowManagementScreen onBack={() => navigation.goBack()} />}</Stack.Screen>`
- `377: '/provider/jobs/queue?kind=nursing&status=active'`
- `378: '/provider/jobs/queue?kind=nursing&status=completed'`
- `379: '/provider/jobs/queue?kind=nursing&status=incoming'`
- `380: '/provider/jobs/queue?status=active&kind=appointment&today=true'`
- `381: '/provider/jobs/queue?status=active&kind=consultation'`
- `382: '/provider/jobs/queue?status=active'`
- `383: '/provider/jobs/queue?status=incoming&kind=consultation'`
- `404: '/provider/profile/image/status'`
### payment_insurance_relevance
- `65: src/screens/shared/InsuranceRequestsScreen.tsx`
- `111: /home/ubuntu/nabdah-live-work/provider-app/src/screens/doctor/DoctorDashboard.tsx:116:     <Stack.Screen name="insurance_config">{({ navigation }: any) => <InsuranceConfigScreen onBack={() => navigation.goBack()} />}</Stack.Screen>`
- `131: /home/ubuntu/nabdah-live-work/provider-app/src/screens/facility/FacilityDashboard.tsx:211:      <Stack.Screen name="insurance_hub">{({ navigation }: any) => <InsuranceClaimsHubScreen onBack={() => navigation.goBack()} />}</Stack.Screen>`
- `147: /home/ubuntu/nabdah-live-work/provider-app/src/screens/facility/FacilityDashboard.tsx:227:      <Stack.Screen name="wallet">{({ navigation }: any) => <ProviderWalletScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) `
- `161: /home/ubuntu/nabdah-live-work/provider-app/src/screens/facility/FacilityDashboard.tsx:241:      <Stack.Screen name="insurance_requests">{({ navigation }: any) => <InsuranceRequestsScreen onBack={() => navigation.goBack()} />}</Stack.Screen>`
- `162: /home/ubuntu/nabdah-live-work/provider-app/src/screens/facility/FacilityDashboard.tsx:242:      <Stack.Screen name="insurance_config">{({ navigation }: any) => <InsuranceConfigScreen onBack={() => navigation.goBack()} />}</Stack.Screen>`
- `175: /home/ubuntu/nabdah-live-work/provider-app/src/screens/lab/LabDashboard.tsx:181:     <Stack.Screen name="wallet">{({ navigation }: any) => <ProviderWalletScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigati`
- `178: /home/ubuntu/nabdah-live-work/provider-app/src/screens/lab/LabDashboard.tsx:184:     <Stack.Screen name="insurance">{({ navigation }: any) => <LabInsurance onBack={() => navigation.goBack()} />}</Stack.Screen>`
- `188: /home/ubuntu/nabdah-live-work/provider-app/src/screens/lab/LabDashboard.tsx:195:     <Stack.Screen name="insurance_config">{({ navigation }: any) => <InsuranceConfigScreen onBack={() => navigation.goBack()} />}</Stack.Screen>`
- `193: /home/ubuntu/nabdah-live-work/provider-app/src/screens/lab/LabDashboard.tsx:201:     <Stack.Screen name="insurance_requests">{({ navigation }: any) => <InsuranceRequestsScreen onBack={() => navigation.goBack()} />}</Stack.Screen>`
- `221: /home/ubuntu/nabdah-live-work/provider-app/src/screens/nursing/NursingDashboard.tsx:185:      <Stack.Screen name="nursing_coverage">{({ navigation }: any) => <NursingCoverageSettings onBack={() => navigation.goBack()} />}</Stack.Screen>`
- `237: /home/ubuntu/nabdah-live-work/provider-app/src/screens/nursing/NursingDashboard.tsx:202:      <Stack.Screen name="insurance_config">{({ navigation }: any) => <InsuranceConfigScreen onBack={() => navigation.goBack()} />}</Stack.Screen>`
### error_empty_loading_retry_cancel
- `32: src/screens/auth/PendingDashboard.tsx`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
