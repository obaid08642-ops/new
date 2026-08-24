# Raw route/contract index — main baseline

هذا فهرس آلي أولي؛ لا يحل محل القراءة الدلالية ولا يصنف الفجوات نهائيًا.

## NabdProvider-provider
audit-work/source/NabdProvider-provider/src/screens/lab/LabDashboard.tsx:153:         const go = (s: string, param?: any) => navigation.navigate(s, { param });
audit-work/source/NabdProvider-provider/src/screens/lab/LabDashboard.tsx:173:     <Stack.Screen name="order_detail">{({ navigation, route }: any) => <LabOrderDetail order={route.params?.param} onBack={() => navigation.goBack()} onNav={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
audit-work/source/NabdProvider-provider/src/screens/lab/LabDashboard.tsx:174:     <Stack.Screen name="sample_tracking">{({ navigation }: any) => <SampleTracking onBack={() => navigation.goBack()} onNav={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
audit-work/source/NabdProvider-provider/src/screens/lab/LabDashboard.tsx:181:     <Stack.Screen name="wallet">{({ navigation }: any) => <ProviderWalletScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
audit-work/source/NabdProvider-provider/src/screens/lab/LabDashboard.tsx:186:     <Stack.Screen name="promotions">{({ navigation }: any) => <PromotionsDashboard onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
audit-work/source/NabdProvider-provider/src/screens/lab/LabDashboard.tsx:190:     <Stack.Screen name="crm">{({ navigation }: any) => <CrmHub onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
audit-work/source/NabdProvider-provider/src/screens/lab/LabDashboard.tsx:192:     <Stack.Screen name="lab_scanner">{({ navigation }: any) => <LabSampleScannerScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
audit-work/source/NabdProvider-provider/src/screens/auth/AuthScreens.tsx:609: const res = await fetch(`${API_BASE}/provider/auth/forgot-password`, {
audit-work/source/NabdProvider-provider/src/screens/auth/AuthScreens.tsx:631: const res = await fetch(`${API_BASE}/provider/auth/verify-reset-code`, {
audit-work/source/NabdProvider-provider/src/screens/auth/AuthScreens.tsx:653: const res = await fetch(`${API_BASE}/provider/auth/reset-password`, {
audit-work/source/NabdProvider-provider/src/screens/facility/FacilityDashboard.tsx:183:          const go = (s: string, param?: any) => navigation.navigate(s, { param });
audit-work/source/NabdProvider-provider/src/screens/facility/FacilityDashboard.tsx:202:      <Stack.Screen name="subaccounts">{({ navigation }: any) => <SubAccountsScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
audit-work/source/NabdProvider-provider/src/screens/facility/FacilityDashboard.tsx:226:      <Stack.Screen name="order_detail">{({ navigation, route }: any) => <FacilityOrderDetail order={route.params?.param} onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
audit-work/source/NabdProvider-provider/src/screens/facility/FacilityDashboard.tsx:227:      <Stack.Screen name="wallet">{({ navigation }: any) => <ProviderWalletScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
audit-work/source/NabdProvider-provider/src/screens/facility/FacilityDashboard.tsx:228:      <Stack.Screen name="promotions">{({ navigation }: any) => <PromotionsDashboard onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
audit-work/source/NabdProvider-provider/src/screens/facility/FacilityDashboard.tsx:231:      <Stack.Screen name="subscriptions_ads">{({ navigation }: any) => <SubscriptionsAdsScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
audit-work/source/NabdProvider-provider/src/screens/facility/FacilityDashboard.tsx:234:      <Stack.Screen name="crm">{({ navigation }: any) => <CrmHub onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
audit-work/source/NabdProvider-provider/src/screens/facility/FacilityDashboard.tsx:236:      <Stack.Screen name="sos_dispatch">{({ navigation }: any) => <SosDispatchScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
audit-work/source/NabdProvider-provider/src/screens/facility/FacilityDashboard.tsx:238:      <Stack.Screen name="gps_router">{({ navigation, route }: any) => <GpsRouterScreen patient={route.params?.param} onBack={() => navigation.goBack()} />}</Stack.Screen>
audit-work/source/NabdProvider-provider/src/screens/ambulance/AmbulanceDashboard.tsx:420:      onNavigate={(s, p) => navigation.navigate(s, { param: p })}
audit-work/source/NabdProvider-provider/src/screens/ambulance/AmbulanceDashboard.tsx:430:          <AmbulanceHomeScreen onNavigate={(s, p) => navigation.navigate(s, { param: p })} />
audit-work/source/NabdProvider-provider/src/screens/shared/BlueprintScreens.tsx:1131:     onNavigate('gps_router', { emergency: sos });
audit-work/source/NabdProvider-provider/src/screens/shared/ProviderHome.tsx:35:      navigation.navigate('LiveKitRoomProvider', { roomId: item.roomId });
audit-work/source/NabdProvider-provider/src/screens/shared/ProviderHome.tsx:37:      navigation.navigate('PharmacyChatResponder', { threadId: item.threadId, patientName: item.name });
audit-work/source/NabdProvider-provider/src/screens/shared/SharedScreens.tsx:2004:       const res = await fetch(`${API_BASE}/drugs/categories`, { headers });
audit-work/source/NabdProvider-provider/src/screens/shared/SharedScreens.tsx:2024:       const res = await fetch(`${API_BASE}/drugs?${q.toString()}`, { headers });
audit-work/source/NabdProvider-provider/src/screens/shared/SharedScreens.tsx:2044:       const res = await fetch(`${API_BASE}/drugs/${selectedDrug.id}`, { headers });
audit-work/source/NabdProvider-provider/src/screens/nursing/NursingDashboard.tsx:118:          const go = (s: string, param?: any) => navigation.navigate(s, { param });
audit-work/source/NabdProvider-provider/src/screens/nursing/NursingDashboard.tsx:177:      <Stack.Screen name="checklist">{({ navigation, route }: any) => <VisitChecklist order={route.params?.param} onBack={() => navigation.goBack()} onNav={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
audit-work/source/NabdProvider-provider/src/screens/nursing/NursingDashboard.tsx:187:      <Stack.Screen name="promotions">{({ navigation }: any) => <PromotionsDashboard onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
audit-work/source/NabdProvider-provider/src/screens/nursing/NursingDashboard.tsx:190:      <Stack.Screen name="subscriptions_ads">{({ navigation }: any) => <SubscriptionsAdsScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
audit-work/source/NabdProvider-provider/src/screens/nursing/NursingDashboard.tsx:193:      <Stack.Screen name="crm">{({ navigation }: any) => <CrmHub onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
audit-work/source/NabdProvider-provider/src/screens/nursing/NursingDashboard.tsx:195:      <Stack.Screen name="sos_dispatch">{({ navigation }: any) => <SosDispatchScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
audit-work/source/NabdProvider-provider/src/screens/nursing/NursingDashboard.tsx:196:      <Stack.Screen name="gps_router">{({ navigation, route }: any) => <GpsRouterScreen patient={route.params?.param} onBack={() => navigation.goBack()} />}</Stack.Screen>
audit-work/source/NabdProvider-provider/src/screens/nursing/NursingDashboard.tsx:197:      <Stack.Screen name="nurse_visit">{({ navigation }: any) => <NurseVisitConsole onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
audit-work/source/NabdProvider-provider/src/screens/nursing/NursingDashboard.tsx:205:      <Stack.Screen name="wallet">{({ navigation }: any) => <ProviderWalletScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
audit-work/source/NabdProvider-provider/src/screens/nursing/NursingFieldOps.tsx:281:          { key: 'map', icon: 'navigate', label: AR ? 'التتبع' : 'Map' },
audit-work/source/NabdProvider-provider/src/screens/doctor/DoctorDashboard.tsx:70:         const navigateTo = (s: string, param?: any) => navigation.navigate(s, { param });
audit-work/source/NabdProvider-provider/src/screens/doctor/DoctorDashboard.tsx:73:             {activeTab === 'home' && <DoctorHomeTab onNavigate={navigateTo} onTriggerAlarm={() => setAlarmVisible(true)} />}
audit-work/source/NabdProvider-provider/src/screens/doctor/DoctorDashboard.tsx:74:             {activeTab === 'schedule' && <DoctorScheduleTab onNavigate={navigateTo} />}
audit-work/source/NabdProvider-provider/src/screens/doctor/DoctorDashboard.tsx:76:             {activeTab === 'wallet' && <DoctorWalletTab onNavigate={navigateTo} />}
audit-work/source/NabdProvider-provider/src/screens/doctor/DoctorDashboard.tsx:77:             {activeTab === 'settings' && <DoctorSettingsTab onLogout={onLogout} onNavigate={navigateTo} />}
audit-work/source/NabdProvider-provider/src/screens/doctor/DoctorDashboard.tsx:83:               onAccept={() => { setAlarmVisible(false); navigateTo('sos_dispatch'); }}
audit-work/source/NabdProvider-provider/src/screens/doctor/DoctorDashboard.tsx:91:     <Stack.Screen name="appointment_detail">{({ navigation, route }: any) => <AppointmentDetailScreen apt={route.params?.param} onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
audit-work/source/NabdProvider-provider/src/screens/doctor/DoctorDashboard.tsx:92:     <Stack.Screen name="consultation">{({ navigation, route }: any) => <LiveConsultationScreen apt={route.params?.param} onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
audit-work/source/NabdProvider-provider/src/screens/doctor/DoctorDashboard.tsx:104:     <Stack.Screen name="promotions">{({ navigation }: any) => <PromotionsDashboard onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
audit-work/source/NabdProvider-provider/src/screens/doctor/DoctorDashboard.tsx:107:     <Stack.Screen name="subscriptions_ads">{({ navigation }: any) => <SubscriptionsAdsScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
audit-work/source/NabdProvider-provider/src/screens/doctor/DoctorDashboard.tsx:110:     <Stack.Screen name="crm">{({ navigation }: any) => <CrmHub onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
audit-work/source/NabdProvider-provider/src/screens/doctor/DoctorDashboard.tsx:113:     <Stack.Screen name="sos_dispatch">{({ navigation }: any) => <SosDispatchScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
audit-work/source/NabdProvider-provider/src/screens/doctor/DoctorDashboard.tsx:114:     <Stack.Screen name="gps_router">{({ navigation, route }: any) => <GpsRouterScreen patient={route.params?.param} onBack={() => navigation.goBack()} />}</Stack.Screen>
audit-work/source/NabdProvider-provider/src/screens/doctor/DoctorDashboard.tsx:119:     <Stack.Screen name="virtual_waiting_room">{({ navigation }: any) => <VirtualWaitingRoomScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
audit-work/source/NabdProvider-provider/src/screens/doctor/DoctorDashboard.tsx:120:     <Stack.Screen name="pre_visit_chat">{({ navigation, route }: any) => <PreVisitChatScreen apt={route.params?.param} onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
audit-work/source/NabdProvider-provider/src/screens/doctor/DoctorDashboard.tsx:4079:      const res = await fetch(`${API_BASE}/calls/provider/waiting-room`, { headers });
audit-work/source/NabdProvider-provider/src/screens/doctor/DoctorDashboard.tsx:4096:      await fetch(`${API_BASE}/calls/provider/ping-patient`, {
audit-work/source/NabdProvider-provider/src/screens/doctor/DoctorDashboard.tsx:4110:      await fetch(`${API_BASE}/calls/provider/no-show`, {
audit-work/source/NabdProvider-provider/src/screens/radiology/RadiologyDashboard.tsx:58:          const go = (s: string, param?: any) => navigation.navigate(s, { param });
audit-work/source/NabdProvider-provider/src/screens/radiology/RadiologyDashboard.tsx:72:      <Stack.Screen name="order_detail">{({ navigation, route }: any) => <OrderDetailScreen order={route.params?.param} onBack={() => navigation.goBack()} onNav={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
audit-work/source/NabdProvider-provider/src/screens/radiology/RadiologyDashboard.tsx:75:      <Stack.Screen name="wallet">{({ navigation }: any) => <ProviderWalletScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
audit-work/source/NabdProvider-provider/src/screens/radiology/RadiologyDashboard.tsx:142:  useEffect(() => { fetch(); }, [fetch]);
audit-work/source/NabdProvider-provider/src/screens/pharmacy/PharmacyDashboard.tsx:109:         const go = (s: string, param?: any) => navigation.navigate(s, { param });
audit-work/source/NabdProvider-provider/src/screens/pharmacy/PharmacyDashboard.tsx:141:     <Stack.Screen name="wallet">{({ navigation }: any) => <PharmacyWalletScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
audit-work/source/NabdProvider-provider/src/screens/pharmacy/PharmacyDashboard.tsx:142:     <Stack.Screen name="order_history">{({ navigation }: any) => <OrderHistoryScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
audit-work/source/NabdProvider-provider/src/screens/pharmacy/PharmacyDashboard.tsx:148:     <Stack.Screen name="promotions">{({ navigation }: any) => <PromotionsDashboard onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
audit-work/source/NabdProvider-provider/src/screens/pharmacy/PharmacyDashboard.tsx:151:     <Stack.Screen name="subscriptions_ads">{({ navigation }: any) => <SubscriptionsAdsScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
audit-work/source/NabdProvider-provider/src/screens/pharmacy/PharmacyDashboard.tsx:154:     <Stack.Screen name="crm">{({ navigation }: any) => <CrmHub onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
audit-work/source/NabdProvider-provider/src/api/client.ts:1:import axios from 'axios';
audit-work/source/NabdProvider-provider/src/api/client.ts:5:const client = axios.create({
audit-work/source/NabdProvider-provider/src/services/HttpClient.ts:1:import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
audit-work/source/NabdProvider-provider/src/services/HttpClient.ts:3:export const HttpClient = axios.create({
audit-work/source/NabdProvider-provider/src/utils/api.ts:2: * apiFetch — thin fetch-style wrapper over the shared axios client.
audit-work/source/NabdProvider-provider/src/context/index.tsx:215:      const isOnline = await fetch('https://1.1.1.1', { method: 'HEAD' }).then(() => true).catch(() => false);
audit-work/source/NabdProvider-provider/src/context/index.tsx:273:      const res = await fetch(`${baseUrl}/provider/auth/refresh`, {
audit-work/source/NabdProvider-provider/src/context/index.tsx:301:      const res = await fetch(`${baseUrl}/provider/auth/login`, {
audit-work/source/NabdProvider-provider/src/context/index.tsx:361:        await fetch(`${API_BASE}/provider/auth/logout`, { method: 'POST', headers, body: JSON.stringify({ session_id: sessionId }) });
audit-work/source/NabdProvider-provider/src/context/index.tsx:386: const res = await fetch(`${API_BASE}/provider/ops/availability/toggle-instant`, {

## nabd-patient-web
audit-work/source/nabd-patient-web/app/[locale]/appointments/[appointmentId]/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/appointments/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/articles/[slug]/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/articles/bookmarks/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/articles/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/cart/checkout/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/cart/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/cart/prescription/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/chat/[threadId]/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/chat/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/consultations/doctors/[doctorId]/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/consultations/doctors/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/consultations/specialties/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/dashboard/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/diagnostics/[domain]/[bookingId]/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/diagnostics/labs/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/diagnostics/packages/[packageId]/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/diagnostics/packages/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/diagnostics/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/diagnostics/radiology/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/family/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/health/chronic-diseases/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/health/chronic-medications/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/health/emergency-contacts/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/health/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/health/reports/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/health/score/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/health/sleep/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/health/trends/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/health/vitals/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/home-care/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/home-care/services/[serviceId]/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/home-care/services/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/insurance/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/login/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/medicine-catalog/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/medicines/[medicineId]/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/medicines/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/mental-health/breathing/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/mental-health/crisis-contacts/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/mental-health/meditation/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/mental-health/mood/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/mental-health/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/notifications/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/notifications/settings/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/orders/[orderId]/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/orders/[orderId]/tracking/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/orders/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/prescriptions/[prescriptionId]/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/prescriptions/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/profile/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/reminders/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/settings/page.tsx
audit-work/source/nabd-patient-web/app/[locale]/wishlist/page.tsx
audit-work/source/nabd-patient-web/app/api/appointments/[appointmentId]/call-token/route.ts
audit-work/source/nabd-patient-web/app/api/appointments/[appointmentId]/cancel/route.ts
audit-work/source/nabd-patient-web/app/api/appointments/[appointmentId]/payment-intent/route.ts
audit-work/source/nabd-patient-web/app/api/appointments/[appointmentId]/reschedule/route.ts
audit-work/source/nabd-patient-web/app/api/appointments/book/route.ts
audit-work/source/nabd-patient-web/app/api/auth/login/route.ts
audit-work/source/nabd-patient-web/app/api/auth/logout/route.ts
audit-work/source/nabd-patient-web/app/api/auth/otp/request/route.ts
audit-work/source/nabd-patient-web/app/api/auth/otp/verify/route.ts
audit-work/source/nabd-patient-web/app/api/auth/session/exchange/route.ts
audit-work/source/nabd-patient-web/app/api/auth/session/route.ts
audit-work/source/nabd-patient-web/app/api/auth/verify-2fa/route.ts
audit-work/source/nabd-patient-web/app/api/patient/[...path]/route.ts
audit-work/source/nabd-patient-web/app/favicon.ico/route.ts
audit-work/source/nabd-patient-web/app/llms.txt/route.ts
audit-work/source/nabd-patient-web/components-next/appointment-actions.tsx
audit-work/source/nabd-patient-web/components-next/appointment-booking-form.tsx
audit-work/source/nabd-patient-web/components-next/appointment-reschedule-form.tsx
audit-work/source/nabd-patient-web/components-next/call-token-launcher.tsx
audit-work/source/nabd-patient-web/components-next/json-ld.tsx
audit-work/source/nabd-patient-web/components-next/locale-selector.test.tsx
audit-work/source/nabd-patient-web/components-next/locale-selector.tsx
audit-work/source/nabd-patient-web/components-next/login-form.tsx
audit-work/source/nabd-patient-web/components-next/premium-health-illustration.tsx
audit-work/source/nabd-patient-web/components-next/pulse-shield-mark.tsx
audit-work/source/nabd-patient-web/components-next/retry-button.test.tsx
audit-work/source/nabd-patient-web/components-next/retry-button.tsx
audit-work/source/nabd-patient-web/components-next/session-actions.tsx
audit-work/source/nabd-patient-web/components-next/vital-glyph.tsx
audit-work/source/nabd-patient-web/app/robots.ts:7:  const privatePaths = ["/api/", ...locales.flatMap((locale) => privateRouteFamilies.map((route) => `/${locale}/${route}`))];
audit-work/source/nabd-patient-web/app/seo.test.ts:10:    expect(rules?.disallow).toEqual(expect.arrayContaining(["/api/", "/ar/dashboard", "/en/profile", "/ur/orders", "/hi/health", "/bn/reminders", "/fil/medicines"]));
audit-work/source/nabd-patient-web/app/global-not-found.tsx:7:  return <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}><body><main className="main auth-wrap"><section className="auth-card"><div className="eyebrow">404</div><h1>{copy.title}</h1><p>{copy.body}</p><a className="button button-primary" href={`/${locale}`}>{copy.returnHome}</a></section></main></body></html>;
audit-work/source/nabd-patient-web/app/api/auth/login/route.ts:1:import { NextResponse } from "next/server";
audit-work/source/nabd-patient-web/app/api/auth/login/route.ts:4:import { callPatientApi } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/app/api/auth/login/route.ts:10:  if (!input.success) return NextResponse.json({ message: "invalid_login_payload" }, { status: 400 });
audit-work/source/nabd-patient-web/app/api/auth/login/route.ts:13:  if (!upstream.ok) return NextResponse.json(data || { message: "login_failed" }, { status: upstream.status });
audit-work/source/nabd-patient-web/app/api/auth/login/route.ts:14:  if (z.object({ requires_2fa: z.literal(true) }).safeParse(data).success) return NextResponse.json({ requires2fa: true }, { status: 200 });
audit-work/source/nabd-patient-web/app/api/auth/login/route.ts:16:  if (!tokens) return NextResponse.json({ message: "unexpected_auth_response" }, { status: 502 });
audit-work/source/nabd-patient-web/app/api/auth/login/route.ts:17:  const response = NextResponse.json({ authenticated: true });
audit-work/source/nabd-patient-web/app/api/auth/otp/otp-routes.test.ts:4:vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));
audit-work/source/nabd-patient-web/app/api/auth/otp/otp-routes.test.ts:15:    const response = await requestOtp(jsonRequest("/api/auth/otp/request", { identifier: "patient@example.com" }));
audit-work/source/nabd-patient-web/app/api/auth/otp/otp-routes.test.ts:17:    expect((await requestOtp(jsonRequest("/api/auth/otp/request", { identifier: "x" }))).status).toBe(400);
audit-work/source/nabd-patient-web/app/api/auth/otp/otp-routes.test.ts:20:    state.callPatientApi.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, expires_in: 60, exchangeToken: "must-not-leak" }), { status: 201, headers: { "set-cookie": "nabd_otp_exchange=secret; Path=/api/v1/auth/session/exchange; HttpOnly; Secure; SameSite=Strict" } }));
audit-work/source/nabd-patient-web/app/api/auth/otp/otp-routes.test.ts:21:    const response = await verifyOtp(jsonRequest("/api/auth/otp/verify", { identifier: "patient@example.com", code: "123456" }));
audit-work/source/nabd-patient-web/app/api/auth/otp/otp-routes.test.ts:23:    expect(response.headers.get("set-cookie")).toContain("Path=/api/auth/session/exchange");
audit-work/source/nabd-patient-web/app/api/auth/otp/otp-routes.test.ts:27:    state.callPatientApi.mockResolvedValueOnce(new Response(JSON.stringify({ authenticated: true, token: "must-not-leak" }), { status: 201, headers: { "set-cookie": "nabd_admin_token=secret; Path=/api/v1; HttpOnly; Secure" } }));
audit-work/source/nabd-patient-web/app/api/auth/otp/otp-routes.test.ts:28:    const response = await exchangeSession(new Request("https://web.test/api/auth/session/exchange", { method: "POST", headers: { cookie: "nabd_otp_exchange=secret; unrelated=drop", "x-nabd-device-id": "device-test" } }));
audit-work/source/nabd-patient-web/app/api/auth/otp/otp-routes.test.ts:34:    expect((await exchangeSession(new Request("https://web.test/api/auth/session/exchange", { method: "POST" }))).status).toBe(400);
audit-work/source/nabd-patient-web/app/api/auth/otp/request/route.ts:1:import { NextResponse } from "next/server";
audit-work/source/nabd-patient-web/app/api/auth/otp/request/route.ts:3:import { callPatientApi } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/app/api/auth/otp/request/route.ts:9:  if (!input.success) return NextResponse.json({ message: "invalid_otp_request" }, { status: 400 });
audit-work/source/nabd-patient-web/app/api/auth/otp/request/route.ts:12:  return NextResponse.json(data || { message: "otp_request_failed" }, { status: upstream.status });
audit-work/source/nabd-patient-web/app/api/auth/otp/verify/route.ts:1:import { NextResponse } from "next/server";
audit-work/source/nabd-patient-web/app/api/auth/otp/verify/route.ts:3:import { callPatientApi } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/app/api/auth/otp/verify/route.ts:9:  if (!input.success) return NextResponse.json({ message: "invalid_otp_verify" }, { status: 400 });
audit-work/source/nabd-patient-web/app/api/auth/otp/verify/route.ts:12:  if (!upstream.ok) return NextResponse.json(data || { message: "otp_verify_failed" }, { status: upstream.status });
audit-work/source/nabd-patient-web/app/api/auth/otp/verify/route.ts:14:  if (!expires.success) return NextResponse.json({ message: "unexpected_otp_response" }, { status: 502 });
audit-work/source/nabd-patient-web/app/api/auth/otp/verify/route.ts:15:  const response = NextResponse.json(expires.data, { status: upstream.status });
audit-work/source/nabd-patient-web/app/api/auth/otp/verify/route.ts:17:  if (setCookie) response.headers.set("set-cookie", setCookie.replace(/Path=\/api\/v1\/auth\/session\/exchange/gi, "Path=/api/auth/session/exchange"));
audit-work/source/nabd-patient-web/app/api/auth/verify-2fa/route.ts:1:import { NextResponse } from "next/server";
audit-work/source/nabd-patient-web/app/api/auth/verify-2fa/route.ts:4:import { callPatientApi } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/app/api/auth/verify-2fa/route.ts:10:  if (!input.success) return NextResponse.json({ message: "invalid_2fa_payload" }, { status: 400 });
audit-work/source/nabd-patient-web/app/api/auth/verify-2fa/route.ts:13:  if (!upstream.ok) return NextResponse.json(data || { message: "verification_failed" }, { status: upstream.status });
audit-work/source/nabd-patient-web/app/api/auth/verify-2fa/route.ts:15:  if (!tokens) return NextResponse.json({ message: "unexpected_auth_response" }, { status: 502 });
audit-work/source/nabd-patient-web/app/api/auth/verify-2fa/route.ts:16:  const response = NextResponse.json({ authenticated: true });
audit-work/source/nabd-patient-web/app/api/auth/session/route.ts:2:import { NextResponse } from "next/server";
audit-work/source/nabd-patient-web/app/api/auth/session/route.ts:4:import { callPatientApi } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/app/api/auth/session/route.ts:5:export async function GET() { const token = (await cookies()).get(authCookieNames.access)?.value; if (!token) return NextResponse.json({ authenticated: false }, { status: 401 }); const upstream = await callPatientApi("/auth/me", { method: "GET" }, token); if (!upstream.ok) return NextResponse.json({ authenticated: false }, { status: upstream.status }); return NextResponse.json({ authenticated: true, user: await upstream.json() }, { headers: { "cache-control": "no-store" } }); }
audit-work/source/nabd-patient-web/app/api/auth/session/exchange/route.ts:1:import { NextResponse } from "next/server";
audit-work/source/nabd-patient-web/app/api/auth/session/exchange/route.ts:3:import { callPatientApi } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/app/api/auth/session/exchange/route.ts:10:  if (!match?.[1]) return NextResponse.json({ message: "otp_exchange_required" }, { status: 400 });
audit-work/source/nabd-patient-web/app/api/auth/session/exchange/route.ts:14:  if (!upstream.ok) return NextResponse.json(data || { message: "session_exchange_failed" }, { status: upstream.status });
audit-work/source/nabd-patient-web/app/api/auth/session/exchange/route.ts:16:  if (!parsed.success) return NextResponse.json({ message: "unexpected_session_response" }, { status: 502 });
audit-work/source/nabd-patient-web/app/api/auth/session/exchange/route.ts:17:  const response = NextResponse.json(parsed.data, { status: upstream.status });
audit-work/source/nabd-patient-web/app/api/auth/session/exchange/route.ts:20:    .replace(/Path=\/api\/v1\/auth\/session\/exchange/gi, "Path=/api/auth/session/exchange")
audit-work/source/nabd-patient-web/app/api/auth/logout/route.ts:2:import { NextResponse } from "next/server";
audit-work/source/nabd-patient-web/app/api/auth/logout/route.ts:4:import { callPatientApi } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/app/api/auth/logout/route.ts:5:export async function POST() { const token = (await cookies()).get(authCookieNames.access)?.value; if (token) await callPatientApi("/auth/logout", { method: "POST" }, token).catch(() => undefined); const response = NextResponse.json({ success: true }); clearSessionCookies(response); return response; }
audit-work/source/nabd-patient-web/app/api/appointments/book/route.ts:2:import { NextResponse } from "next/server";
audit-work/source/nabd-patient-web/app/api/appointments/book/route.ts:5:import { callPatientApi } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/app/api/appointments/book/route.ts:18:  if (idempotencyKey.length < 16 || idempotencyKey.length > 128) return NextResponse.json({ message: "idempotency_key_required" }, { status: 400 });
audit-work/source/nabd-patient-web/app/api/appointments/book/route.ts:20:  if (!input.success) return NextResponse.json({ message: "invalid_booking_payload" }, { status: 400 });
audit-work/source/nabd-patient-web/app/api/appointments/book/route.ts:22:  if (!accessToken) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
audit-work/source/nabd-patient-web/app/api/appointments/book/route.ts:26:  if (!upstream.ok) return NextResponse.json(data || { message: "booking_failed" }, { status: upstream.status });
audit-work/source/nabd-patient-web/app/api/appointments/book/route.ts:28:  if (!result.success) return NextResponse.json({ message: "unexpected_booking_response" }, { status: 502 });
audit-work/source/nabd-patient-web/app/api/appointments/book/route.ts:29:  return NextResponse.json(result.data, { status: upstream.status, headers: { "cache-control": "no-store" } });
audit-work/source/nabd-patient-web/app/api/appointments/book/route.test.ts:4:vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));
audit-work/source/nabd-patient-web/app/api/appointments/book/route.test.ts:9:function request(body: unknown, headers: HeadersInit = {}) { return new Request("https://web.test/api/appointments/book", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": "idempotency-test-123456", ...headers }, body: JSON.stringify(body) }); }
audit-work/source/nabd-patient-web/app/api/appointments/[appointmentId]/reschedule/route.ts:2:import { NextResponse } from "next/server";
audit-work/source/nabd-patient-web/app/api/appointments/[appointmentId]/reschedule/route.ts:5:import { callPatientApi } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/app/api/appointments/[appointmentId]/reschedule/route.ts:13:  if (!idSchema.safeParse(appointmentId).success) return NextResponse.json({ message: "resource_not_found" }, { status: 404 });
audit-work/source/nabd-patient-web/app/api/appointments/[appointmentId]/reschedule/route.ts:15:  if (key.length < 16 || key.length > 128) return NextResponse.json({ message: "idempotency_key_required" }, { status: 400 });
audit-work/source/nabd-patient-web/app/api/appointments/[appointmentId]/reschedule/route.ts:17:  if (!parsed.success) return NextResponse.json({ message: "invalid_reschedule_payload" }, { status: 400 });
audit-work/source/nabd-patient-web/app/api/appointments/[appointmentId]/reschedule/route.ts:19:  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
audit-work/source/nabd-patient-web/app/api/appointments/[appointmentId]/reschedule/route.ts:22:  if (!upstream.ok) return NextResponse.json(data || { message: "reschedule_failed" }, { status: upstream.status });
audit-work/source/nabd-patient-web/app/api/appointments/[appointmentId]/reschedule/route.ts:23:  return NextResponse.json({ ok: true }, { status: upstream.status, headers: { "cache-control": "no-store" } });
audit-work/source/nabd-patient-web/app/api/appointments/[appointmentId]/reschedule/route.test.ts:3:vi.mock("@/lib/api/upstream",()=>({callPatientApi:state.call})); vi.mock("next/headers",()=>({cookies:async()=>state.cookies}));
audit-work/source/nabd-patient-web/app/api/appointments/[appointmentId]/reschedule/route.test.ts:6:function req(headers:HeadersInit={},body:unknown={scheduled_at:"2030-01-01T10:00:00.000Z"}){return new Request(`https://web.test/api/appointments/${id}/reschedule`,{method:"PATCH",headers:{"content-type":"application/json","idempotency-key":"reschedule-key-123456",...headers},body:JSON.stringify(body)})}
audit-work/source/nabd-patient-web/app/api/appointments/[appointmentId]/payment-intent/route.ts:2:import { NextResponse } from "next/server";
audit-work/source/nabd-patient-web/app/api/appointments/[appointmentId]/payment-intent/route.ts:5:import { createPatientPaymentIntent } from "@/lib/api/payments-server";
audit-work/source/nabd-patient-web/app/api/appointments/[appointmentId]/payment-intent/route.ts:6:import { parsePaymentIntent } from "@/lib/api/payments";
audit-work/source/nabd-patient-web/app/api/appointments/[appointmentId]/payment-intent/route.ts:13:  if (!idSchema.safeParse(appointmentId).success) return NextResponse.json({ message: "resource_not_found" }, { status: 404 });
audit-work/source/nabd-patient-web/app/api/appointments/[appointmentId]/payment-intent/route.ts:15:  if (key.length < 16 || key.length > 128) return NextResponse.json({ message: "idempotency_key_required" }, { status: 400 });
audit-work/source/nabd-patient-web/app/api/appointments/[appointmentId]/payment-intent/route.ts:17:  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
audit-work/source/nabd-patient-web/app/api/appointments/[appointmentId]/payment-intent/route.ts:19:  if (!upstream) return NextResponse.json({ message: "resource_not_found" }, { status: 404 });
audit-work/source/nabd-patient-web/app/api/appointments/[appointmentId]/payment-intent/route.ts:21:  if (!result.ok) return NextResponse.json(data || { message: "payment_intent_failed" }, { status: result.status });
audit-work/source/nabd-patient-web/app/api/appointments/[appointmentId]/payment-intent/route.ts:23:  if (!parsed) return NextResponse.json({ message: "unexpected_payment_intent_response" }, { status: 502 });
audit-work/source/nabd-patient-web/app/api/appointments/[appointmentId]/payment-intent/route.ts:24:  return NextResponse.json(parsed, { status: result.status, headers: { "cache-control": "no-store" } });
audit-work/source/nabd-patient-web/app/api/appointments/[appointmentId]/payment-intent/route.test.ts:3:vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));
audit-work/source/nabd-patient-web/app/api/appointments/[appointmentId]/payment-intent/route.test.ts:8:function req(headers: HeadersInit = {}) { return new Request(`https://web.test/api/appointments/${id}/payment-intent`, { method: "POST", headers: { "idempotency-key": "payment-key-123456", ...headers } }); }
audit-work/source/nabd-patient-web/app/api/appointments/[appointmentId]/cancel/route.ts:2:import { NextResponse } from "next/server";
audit-work/source/nabd-patient-web/app/api/appointments/[appointmentId]/cancel/route.ts:5:import { callPatientApi } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/app/api/appointments/[appointmentId]/cancel/route.ts:13:  if (!idSchema.safeParse(appointmentId).success) return NextResponse.json({ message: "resource_not_found" }, { status: 404 });
audit-work/source/nabd-patient-web/app/api/appointments/[appointmentId]/cancel/route.ts:15:  if (key.length < 16 || key.length > 128) return NextResponse.json({ message: "idempotency_key_required" }, { status: 400 });
audit-work/source/nabd-patient-web/app/api/appointments/[appointmentId]/cancel/route.ts:17:  if (!input.success) return NextResponse.json({ message: "invalid_cancel_payload" }, { status: 400 });
audit-work/source/nabd-patient-web/app/api/appointments/[appointmentId]/cancel/route.ts:19:  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
audit-work/source/nabd-patient-web/app/api/appointments/[appointmentId]/cancel/route.ts:22:  if (!upstream.ok) return NextResponse.json(data || { message: "cancel_failed" }, { status: upstream.status });
audit-work/source/nabd-patient-web/app/api/appointments/[appointmentId]/cancel/route.ts:23:  return NextResponse.json({ ok: true }, { status: upstream.status, headers: { "cache-control": "no-store" } });
audit-work/source/nabd-patient-web/app/api/appointments/[appointmentId]/cancel/route.test.ts:3:vi.mock("@/lib/api/upstream",()=>({callPatientApi:state.call})); vi.mock("next/headers",()=>({cookies:async()=>state.cookies}));
audit-work/source/nabd-patient-web/app/api/appointments/[appointmentId]/cancel/route.test.ts:6:function req(headers:HeadersInit={},body:unknown={}){return new Request(`https://web.test/api/appointments/${id}/cancel`,{method:"POST",headers:{"content-type":"application/json","idempotency-key":"cancel-key-123456",...headers},body:JSON.stringify(body)})}
audit-work/source/nabd-patient-web/app/api/appointments/[appointmentId]/call-token/route.ts:2:import { NextResponse } from "next/server";
audit-work/source/nabd-patient-web/app/api/appointments/[appointmentId]/call-token/route.ts:5:import { callPatientApi } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/app/api/appointments/[appointmentId]/call-token/route.ts:13:  if (!idSchema.safeParse(appointmentId).success) return NextResponse.json({ message: "resource_not_found" }, { status: 404 });
audit-work/source/nabd-patient-web/app/api/appointments/[appointmentId]/call-token/route.ts:15:  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
audit-work/source/nabd-patient-web/app/api/appointments/[appointmentId]/call-token/route.ts:18:  if (!upstream.ok) return NextResponse.json(data || { message: "call_token_unavailable" }, { status: upstream.status, headers: { "cache-control": "no-store" } });
audit-work/source/nabd-patient-web/app/api/appointments/[appointmentId]/call-token/route.ts:20:  if (!parsed.success) return NextResponse.json({ message: "invalid_call_token_response" }, { status: 502, headers: { "cache-control": "no-store" } });
audit-work/source/nabd-patient-web/app/api/appointments/[appointmentId]/call-token/route.ts:21:  return NextResponse.json(parsed.data, { status: 200, headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" } });
audit-work/source/nabd-patient-web/app/api/appointments/[appointmentId]/call-token/route.test.ts:3:vi.mock("@/lib/api/upstream",()=>({callPatientApi:state.call})); vi.mock("next/headers",()=>({cookies:async()=>state.cookies}));
audit-work/source/nabd-patient-web/app/api/patient/[...path]/route.ts:2:import { NextRequest, NextResponse } from "next/server";
audit-work/source/nabd-patient-web/app/api/patient/[...path]/route.ts:5:import { isAllowedPatientApiRequest } from "@/lib/api/patient-allowlist";
audit-work/source/nabd-patient-web/app/api/patient/[...path]/route.ts:6:import { forwardApiResponse } from "@/lib/api/response";
audit-work/source/nabd-patient-web/app/api/patient/[...path]/route.ts:7:import { callPatientApi } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/app/api/patient/[...path]/route.ts:10:async function proxy(request: NextRequest, context: Context) { const { path: parts } = await context.params; const path = `/${parts.map(encodeURIComponent).join("/")}`; if (!isAllowedPatientApiRequest(path, request.method)) return NextResponse.json({ message: "resource_not_found" }, { status: 404 }); const store = await cookies(); let token = store.get(authCookieNames.access)?.value; if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 }); const headers = new Headers(); const target = `${path}${request.nextUrl.search}`; let upstream = await callPatientApi(target, { method: request.method, headers }, token); let rotated: Awaited<ReturnType<typeof refreshSession>> = null; if (upstream.status === 401) { rotated = await refreshSession(); if (rotated) { token = rotated.tokens.accessToken; upstream = await callPatientApi(target, { method: request.method, headers }, token); } } const response = await forwardApiResponse(upstream); if (rotated) setSessionCookies(response, rotated.tokens, rotated.deviceId); if (upstream.status === 401 && !rotated) clearSessionCookies(response); return response; }
audit-work/source/nabd-patient-web/app/api/patient/[...path]/route.test.ts:23:vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));
audit-work/source/nabd-patient-web/app/api/patient/[...path]/route.test.ts:24:vi.mock("@/lib/api/response", () => ({
audit-work/source/nabd-patient-web/app/api/patient/[...path]/route.test.ts:34:    nextUrl: new URL("https://web.nabd.plus/api/patient/orders/mine"),
audit-work/source/nabd-patient-web/app/favicon.ico/route.ts:1:import { NextResponse } from "next/server";
audit-work/source/nabd-patient-web/app/favicon.ico/route.ts:6:  return new NextResponse(faviconSvg, {
audit-work/source/nabd-patient-web/app/llms.txt/route.ts:1:import { NextResponse } from "next/server";
audit-work/source/nabd-patient-web/app/llms.txt/route.ts:24:  return new NextResponse(llmsText, {
audit-work/source/nabd-patient-web/app/[locale]/error.tsx:9:  return <main className="main auth-wrap"><section className="auth-card" role="alert" aria-live="assertive"><div className="eyebrow">{t("errorCode")}</div><h1>{t("errorTitle")}</h1><p>{t("errorBody")}</p><div className="route-state-actions"><button className="button button-primary" type="button" onClick={reset}>{t("retry")}</button><a className="button button-secondary" href={`/${locale}`}>{t("returnHome")}</a></div></section></main>;
audit-work/source/nabd-patient-web/app/[locale]/route-state-ssr.test.tsx:15:    expect(html).toContain('href="/ar"');
audit-work/source/nabd-patient-web/app/[locale]/page.tsx:11:export default async function LandingPage({ params }: Props) { const { locale } = await params; if (!isLocale(locale)) return null; setRequestLocale(locale); const t = await getTranslations("Home"); const metadata = await getTranslations("Metadata"); const url = localizedUrl(locale); return <main className="main premium-landing"><JsonLd data={[{ "@context": "https://schema.org", "@type": "WebSite", name: metadata("siteTitle"), url: siteOrigin(), inLanguage: locale }, { "@context": "https://schema.org", "@type": "MedicalOrganization", name: metadata("siteTitle"), url: siteOrigin() }, { "@context": "https://schema.org", "@type": "MedicalWebPage", name: metadata("portalTitle"), url, inLanguage: locale, isPartOf: { "@type": "WebSite", url: siteOrigin() } }]} /><section className="hero premium-hero"><div className="premium-hero-copy"><div className="eyebrow"><Sparkles size={14} aria-hidden="true" />{t("eyebrow")}</div><h1>{t("title")}</h1><p>{t("body")}</p><div className="hero-actions"><Link className="button button-primary" href={`/${locale}/login`}><ShieldCheck size={18} aria-hidden="true" />{t("signIn")}</Link><Link className="button button-secondary" href={`/${locale}/medicine-catalog`}>{t("medicineCatalog")}<ArrowUpLeft size={17} aria-hidden="true" /></Link></div></div><aside className="trust-card premium-trust-card"><PremiumHealthIllustration /><div className="trust-content"><span className="trust-kicker"><LockKeyhole size={15} aria-hidden="true" />{t("safeguards")}</span><h2>{t("safeguards")}</h2><p>{t("safeBody")}</p><ul className="trust-list"><li><ShieldCheck size={18} aria-hidden="true" />{t("safetyOne")}</li><li><ShieldCheck size={18} aria-hidden="true" />{t("safetyTwo")}</li><li><ShieldCheck size={18} aria-hidden="true" />{t("safetyThree")}</li></ul></div></aside></section></main>; }
audit-work/source/nabd-patient-web/app/[locale]/not-found.tsx:15:  return <main className="main auth-wrap"><section className="auth-card" role="status"><div className="eyebrow">404</div><h1>{t("title")}</h1><p>{t("body")}</p><Link className="button button-primary" href={`/${locale}`}>{t("returnHome")}</Link></section></main>;
audit-work/source/nabd-patient-web/app/[locale]/not-found.test.tsx:24:    expect(html).toContain('href="/ar"');
audit-work/source/nabd-patient-web/app/[locale]/not-found.test.tsx:32:    expect(html).toContain('href="/en"');
audit-work/source/nabd-patient-web/app/[locale]/layout.tsx:15:export default async function LocaleLayout({ children, params }: Props) { const { locale } = await params; if (!isLocale(locale)) notFound(); const typedLocale = locale as Locale; setRequestLocale(typedLocale); const messages = await getMessages(); const t = await getTranslations("Shared"); const hasAccessToken = Boolean((await cookies()).get(authCookieNames.access)?.value); return <NextIntlClientProvider messages={messages}><div className="shell" lang={typedLocale} dir={getDirection(typedLocale)}><div className="dev-notice" role="alert"><span className="dev-notice-badge">BETA</span><span>{t("devNotice")}</span></div><header className="topbar"><Link className="brand" href={`/${typedLocale}`}><span className="brand-mark"><PulseShieldMark decorative /></span><span className="brand-wordmark">{t("brand")}</span></Link><div className="nav-actions"><LocaleSelector current={typedLocale} label={t("language")} />{hasAccessToken ? <SessionActions locale={typedLocale} accountLabel={t("account")} signOutLabel={t("signOut")} /> : <Link className="button button-primary header-login" href={`/${typedLocale}/login`}><ShieldCheck size={16} aria-hidden="true" /><span>{t("patientSignIn")}</span></Link>}</div></header>{children}</div></NextIntlClientProvider>; }
audit-work/source/nabd-patient-web/app/[locale]/profile/profile-page-ssr.test.ts:11:vi.mock("@/lib/api/upstream", () => ({ callPatientApi: async () => state.responses.shift()! }));
audit-work/source/nabd-patient-web/app/[locale]/profile/page.tsx:4:import { callPatientApi } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/app/[locale]/profile/page.tsx:5:import { extractRecord, profileDomainState, readProfileFields, type ProfileDomainState, type ProfileField } from "@/lib/api/profile";
audit-work/source/nabd-patient-web/app/[locale]/profile/page.tsx:58:  return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}><BadgeCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title")}</h1><p>{t("body")}</p></div><span className={styles.heroIcon}><UserRound size={27} aria-hidden="true" /></span></section><nav className={styles.quick} aria-label={dashboardT("title")}>{quickActions.map(({ key, href, Icon, accent }) => <Link className={styles.quickCard} href={href} key={key} style={{ "--quick-accent": accent } as React.CSSProperties}><span className={styles.quickIcon}><Icon size={19} aria-hidden="true" /></span><span className={styles.quickLabel}>{dashboardT(key)}</span><ArrowUpLeft className={styles.quickArrow} size={15} aria-hidden="true" /></Link>)}</nav><div className={styles.grid}>{domains.map((domain) => { const { Icon, accent } = domainVisual[domain.kind]; const isError = domain.state === "error"; const fields = domain.fields.flatMap((field) => { const value = displayFieldValue(field); return value === null ? [] : [{ field, value }]; }); return <section className={styles.domain} key={domain.title} style={{ "--domain-accent": accent } as React.CSSProperties}><div className={styles.domainHead}><span className={styles.domainIcon}><Icon size={20} aria-hidden="true" /></span><h2>{domain.title}</h2></div>{domain.state === "available" ? <dl className={styles.fields}>{fields.map(({ field, value }) => <div className={styles.field} key={field.key}><dt>{t(`fields.${field.key}`)}</dt><dd>{value}</dd></div>)}</dl> : <div className={styles.state}><span className={`${styles.stateIcon} ${isError ? styles.stateIconAlert : ""}`}>{isError ? <CircleAlert size={18} aria-hidden="true" /> : <Icon size={18} aria-hidden="true" />}</span><p className={isError ? styles.stateAlert : undefined} role={isError ? "alert" : undefined}>{stateMessage(domain.state)}</p>{isError ? <RetryButton /> : null}</div>}</section>; })}</div></main>;
audit-work/source/nabd-patient-web/app/[locale]/cart/page.tsx:5:import { callPatientApi } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/app/[locale]/cart/page.tsx:6:import { extractCartSummary } from "@/lib/api/cart";
audit-work/source/nabd-patient-web/app/[locale]/cart/page.tsx:32:    {hasItems ? <><section className={styles.groups}>{cart.groups.filter((group) => group.items.length).map((group) => <article className={styles.group} key={group.kind}><div className={styles.groupHead}><h2>{group.kind}</h2><span>{group.count ?? group.items.length} {t("itemCount")}</span></div>{group.items.map((item) => <div className={styles.item} key={item.lineId}><div><strong>{item.name || item.serviceId}</strong><span>{item.quantity === undefined ? "—" : item.quantity} × {amount(item.price)}</span></div><span>{item.paymentMethod || "—"}</span></div>)}</article>)}</section><section className={styles.total}><span>{t("subtotal")}</span><strong>{amount(cart.subtotal)}</strong><span>{t("homeVisitFee")}</span><strong>{amount(cart.homeVisitFee)}</strong><span>{t("total")}</span><strong>{amount(cart.total)}</strong></section></> : <section className={styles.state}><ShoppingCart size={25} aria-hidden="true" /><h2>{t("empty")}</h2><Link className={styles.back} href={`/${locale}/medicines`}>{t("back")}<Direction size={17} aria-hidden="true" /></Link></section>}
audit-work/source/nabd-patient-web/app/[locale]/cart/cart-ssr.test.ts:8:vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));
audit-work/source/nabd-patient-web/app/[locale]/cart/prescription/page.tsx:5:import { callPatientApi } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/app/[locale]/cart/prescription/page.tsx:29:    <Link className={styles.back} href={`/${locale}/cart`}>{t("back")}<Direction size={17} aria-hidden="true" /></Link>
audit-work/source/nabd-patient-web/app/[locale]/cart/checkout/page.tsx:5:import { callPatientApi } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/app/[locale]/cart/checkout/page.tsx:6:import { extractCartSummary } from "@/lib/api/cart";
audit-work/source/nabd-patient-web/app/[locale]/cart/checkout/page.tsx:32:    <Link className={styles.back} href={`/${locale}/cart`}>{t("back")}<Direction size={17} aria-hidden="true" /></Link>
audit-work/source/nabd-patient-web/app/[locale]/medicines/page.tsx:4:import { extractMedicineRows, parseMedicineSearch } from "@/lib/api/medicines";
audit-work/source/nabd-patient-web/app/[locale]/medicines/page.tsx:5:import { getPatientMedicines } from "@/lib/api/medicines-server";
audit-work/source/nabd-patient-web/app/[locale]/medicines/page.tsx:44:      {medicines.map((medicine) => <Link className={styles.card} key={medicine.id} href={`/${locale}/medicines/${medicine.id}`}>
audit-work/source/nabd-patient-web/app/[locale]/medicines/medicines-ssr.test.ts:14:vi.mock("@/lib/api/medicines-server", () => ({ getPatientMedicines: state.getPatientMedicines }));
audit-work/source/nabd-patient-web/app/[locale]/medicines/medicines-ssr.test.ts:15:vi.mock("@/lib/api/public-medicines-server", () => ({ getPublicMedicine: state.getPublicMedicine }));
audit-work/source/nabd-patient-web/app/[locale]/medicines/[medicineId]/page.tsx:5:import { extractMedicineDetail, parseMedicineId } from "@/lib/api/medicines";
audit-work/source/nabd-patient-web/app/[locale]/medicines/[medicineId]/page.tsx:6:import { getPublicMedicine } from "@/lib/api/public-medicines-server";
audit-work/source/nabd-patient-web/app/[locale]/medicines/[medicineId]/page.tsx:61:    <Link className={styles.back} href={`/${locale}/medicine-catalog`}><ChevronLeft size={17} aria-hidden="true" />{t("back")}</Link>
audit-work/source/nabd-patient-web/app/[locale]/medicines/[medicineId]/medicine-detail-public-ssr.test.ts:11:vi.mock("@/lib/api/public-medicines-server", () => ({ getPublicMedicine: state.getPublicMedicine }));
audit-work/source/nabd-patient-web/app/[locale]/medicines/[medicineId]/medicine-detail-public-ssr.test.ts:40:    expect(html).toContain('href="/en/medicine-catalog"');
audit-work/source/nabd-patient-web/app/[locale]/reminders/page.tsx:4:import { extractMedicationReminderSummaries } from "@/lib/api/reminders";
audit-work/source/nabd-patient-web/app/[locale]/reminders/page.tsx:5:import { getPatientMedicationReminders } from "@/lib/api/reminders-server";
audit-work/source/nabd-patient-web/app/[locale]/reminders/reminders-ssr.test.ts:10:vi.mock("@/lib/api/reminders-server", () => ({ getPatientMedicationReminders: state.getPatientMedicationReminders }));
audit-work/source/nabd-patient-web/app/[locale]/medicine-catalog/medicine-catalog-ssr.test.ts:8:vi.mock("@/lib/api/public-medicines-server", () => ({ getPublicMedicines: state.getPublicMedicines }));
audit-work/source/nabd-patient-web/app/[locale]/medicine-catalog/page.tsx:4:import { extractMedicineRows, parseMedicineSearch } from "@/lib/api/medicines";
audit-work/source/nabd-patient-web/app/[locale]/medicine-catalog/page.tsx:5:import { getPublicMedicines } from "@/lib/api/public-medicines-server";
audit-work/source/nabd-patient-web/app/[locale]/medicine-catalog/page.tsx:44:  return <main className={`main ${styles.page}`}><JsonLd data={{ "@context": "https://schema.org", "@type": "WebPage", url: canonical, inLanguage: locale, name: t("title"), mainEntity: { "@type": "ItemList", itemListElement: itemList } }} /><section className={styles.hero}><div><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title")}</h1><p>{t("body")}</p></div><span className={styles.heroIcon}><Pill size={27} aria-hidden="true" /></span></section><form className={styles.search} action={`/${locale}/medicine-catalog`} method="get"><label className={styles.field}><span>{t("searchLabel")}</span><span className={styles.fieldInput}><Search size={18} aria-hidden="true" /><input name="q" maxLength={80} defaultValue={search.q} autoComplete="off" /></span></label><button className={`button button-primary ${styles.submit}`} type="submit"><Search size={17} aria-hidden="true" />{t("search")}</button></form>{medicines.length === 0 ? <section className={styles.state}><span className={styles.stateIcon}><Pill size={24} aria-hidden="true" /></span><p>{t("empty")}</p></section> : <section className={styles.grid} aria-label={t("title")}>{medicines.map((medicine) => <Link className={styles.card} key={medicine.id} href={`/${locale}/medicines/${medicine.id}`}><span className={styles.cardTop}><span className={styles.medicineIcon}><Pill size={20} aria-hidden="true" /></span><ArrowUpLeft className={styles.openIcon} size={17} aria-hidden="true" /></span><strong className={styles.name} {...textDirectionAttributes(nameForLocale(medicine))}>{nameForLocale(medicine)}</strong>{medicine.activeIngredient ? <span className={styles.detail} {...textDirectionAttributes(medicine.activeIngredient)}>{medicine.activeIngredient}</span> : null}{medicine.form || medicine.strength ? <span className={styles.detail} {...textDirectionAttributes([medicine.form, medicine.strength].filter(Boolean).join(" · "))}>{[medicine.form, medicine.strength].filter(Boolean).join(" · ")}</span> : null}{medicine.requiresPrescription === true ? <span className={styles.prescription}><ShieldCheck size={13} aria-hidden="true" />{t("prescriptionRequired")}</span> : null}<span className={styles.open}>{t("open")}<ArrowUpLeft size={14} aria-hidden="true" /></span></Link>)}</section>}<p className={styles.notice}>{t("notice")}</p></main>;
audit-work/source/nabd-patient-web/app/[locale]/notifications/page.tsx:5:import { extractPatientNotifications } from "@/lib/api/notifications";
audit-work/source/nabd-patient-web/app/[locale]/notifications/page.tsx:6:import { getPatientNotifications } from "@/lib/api/notifications-server";
audit-work/source/nabd-patient-web/app/[locale]/notifications/page.tsx:25:  return <main className={`main ${styles.page}`}><section className={styles.header}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1></div><div className={styles.headerActions}><Link className={styles.settingsLink} href={`/${locale}/notifications/settings`}>{t("settings")}</Link><span className={styles.headerIcon}><Bell size={26} aria-hidden="true" /></span></div></section>{notifications.length === 0 ? <section className={styles.state}><span className={styles.stateIcon}><Bell size={25} aria-hidden="true" /></span><h2>{t("title")}</h2><p>{t("empty")}</p></section> : <section className={styles.list} aria-label={t("title")}>{notifications.map((notification) => { const elevated = ["high", "critical", "urgent"].includes(notification.priority?.toLowerCase() || ""); return <article className={`${styles.card} ${notification.read === false ? styles.unread : ""}`} key={notification.id}><span className={`${styles.icon} ${elevated ? styles.iconPriority : ""}`}>{elevated ? <ShieldAlert size={20} aria-hidden="true" /> : <Bell size={20} aria-hidden="true" />}</span><div className={styles.body}><div className={styles.titleRow}><strong className={styles.title}>{notification.title || t("untitled")}</strong>{notification.read === false ? <span className={styles.dot} aria-label={t("unread")} /> : null}</div>{notification.body ? <p className={styles.copy}>{notification.body}</p> : null}{notification.createdAt ? <span className={styles.meta}><span className={styles.time}><Clock3 size={13} aria-hidden="true" />{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(notification.createdAt))}</span></span> : null}</div></article>; })}</section>}<p className={styles.notice}>{t("notice")}</p></main>;
audit-work/source/nabd-patient-web/app/[locale]/notifications/notifications-ssr.test.ts:10:vi.mock("@/lib/api/notifications-server", () => ({ getPatientNotifications: state.getPatientNotifications }));
audit-work/source/nabd-patient-web/app/[locale]/notifications/notifications-ssr.test.ts:36:    expect(html).not.toMatch(/href="[^"]*private-action/i);
audit-work/source/nabd-patient-web/app/[locale]/notifications/settings/page.tsx:4:import { getPatientNotificationSettings } from "@/lib/api/notification-settings-server";
audit-work/source/nabd-patient-web/app/[locale]/notifications/settings/page.tsx:5:import { extractNotificationSettings } from "@/lib/api/notification-settings";
audit-work/source/nabd-patient-web/app/[locale]/diagnostics/page.tsx:4:import { extractDiagnosticBookings } from "@/lib/api/diagnostics";
audit-work/source/nabd-patient-web/app/[locale]/diagnostics/page.tsx:5:import { getDiagnosticBookings } from "@/lib/api/diagnostics-server";
audit-work/source/nabd-patient-web/app/[locale]/diagnostics/page.tsx:36:        {!response.ok ? response.status === 403 || response.status === 404 ? <p className={styles.alert} role="alert">{t("forbidden")}</p> : <div className={styles.alert} role="alert"><p>{t("unavailable")}</p><RetryButton /></div> : bookings.length === 0 ? <p className={styles.empty}>{t("empty")}</p> : <div className={styles.list}>{bookings.map((booking) => <Link className={styles.card} key={booking.id} href={`/${locale}/diagnostics/${domain}/${booking.id}`}>
audit-work/source/nabd-patient-web/app/[locale]/diagnostics/diagnostics-ssr.test.ts:10:vi.mock("@/lib/api/diagnostics-server", () => ({ getDiagnosticBookings: state.getDiagnosticBookings, getDiagnosticBooking: state.getDiagnosticBooking }));
audit-work/source/nabd-patient-web/app/[locale]/diagnostics/diagnostics-ssr.test.ts:51:    expect(html).toContain('href="/en/diagnostics"');
audit-work/source/nabd-patient-web/app/[locale]/diagnostics/diagnostics-ssr.test.ts:52:    expect(html).not.toMatch(/href="[^"]*(report|pdf)/i);
audit-work/source/nabd-patient-web/app/[locale]/diagnostics/[domain]/[bookingId]/page.tsx:4:import { extractDiagnosticBooking, parseDiagnosticBookingId, parseDiagnosticDomain } from "@/lib/api/diagnostics";
audit-work/source/nabd-patient-web/app/[locale]/diagnostics/[domain]/[bookingId]/page.tsx:5:import { getDiagnosticBooking } from "@/lib/api/diagnostics-server";
audit-work/source/nabd-patient-web/app/[locale]/diagnostics/[domain]/[bookingId]/page.tsx:31:    <Link className={styles.back} href={`/${locale}/diagnostics`}><ChevronLeft size={17} aria-hidden="true" />{t("back")}</Link>
audit-work/source/nabd-patient-web/app/[locale]/diagnostics/labs/page.tsx:5:import { extractLabServices } from "@/lib/api/labs";
audit-work/source/nabd-patient-web/app/[locale]/diagnostics/labs/page.tsx:6:import { getPublicLabServices } from "@/lib/api/labs-server";
audit-work/source/nabd-patient-web/app/[locale]/diagnostics/labs/page.tsx:20:  if (!response || !response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><FlaskConical size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link className={styles.action} href={`/${locale}/diagnostics/labs`}>{t("retry")}</Link></section></main>;
audit-work/source/nabd-patient-web/app/[locale]/diagnostics/labs/labs-ssr.test.ts:4:vi.mock("@/lib/api/labs-server", () => ({ getPublicLabServices: state.getPublicLabServices }));
audit-work/source/nabd-patient-web/app/[locale]/diagnostics/radiology/page.tsx:5:import { extractRadiologyServices } from "@/lib/api/radiology";
audit-work/source/nabd-patient-web/app/[locale]/diagnostics/radiology/page.tsx:6:import { getPublicRadiologyModalities, getPublicRadiologyServices } from "@/lib/api/radiology-server";
audit-work/source/nabd-patient-web/app/[locale]/diagnostics/radiology/page.tsx:19:  if (!servicesResult?.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><CircleAlert size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link className={styles.action} href={`/${locale}/diagnostics/radiology`}>{t("retry")}</Link></section></main>;
audit-work/source/nabd-patient-web/app/[locale]/diagnostics/radiology/radiology-ssr.test.ts:3:vi.mock("@/lib/api/radiology-server", () => ({ getPublicRadiologyServices: state.services, getPublicRadiologyModalities: state.modalities }));
audit-work/source/nabd-patient-web/app/[locale]/diagnostics/packages/page.tsx:5:import { extractLabServices } from "@/lib/api/labs";
audit-work/source/nabd-patient-web/app/[locale]/diagnostics/packages/page.tsx:6:import { getPublicLabServices } from "@/lib/api/labs-server";
audit-work/source/nabd-patient-web/app/[locale]/diagnostics/packages/page.tsx:19:  if (!response || !response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><FlaskConical size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link className={styles.action} href={`/${locale}/diagnostics/packages`}>{t("retry")}</Link></section></main>;
audit-work/source/nabd-patient-web/app/[locale]/diagnostics/packages/page.tsx:25:    {packages.length === 0 ? <section className={styles.state}><FlaskConical size={26} aria-hidden="true" /><h2>{t("emptyTitle")}</h2><p>{search || category ? t("noMatch") : t("emptyBody")}</p></section> : <section className={styles.grid} aria-label={t("title")}>{packages.map((pkg) => { const name = rtl ? pkg.nameAr ?? pkg.nameEn : pkg.nameEn ?? pkg.nameAr; const description = rtl ? pkg.descriptionAr ?? pkg.descriptionEn : pkg.descriptionEn ?? pkg.descriptionAr; return <Link className={styles.card} href={`/${locale}/diagnostics/packages/${pkg.id}`} key={pkg.id}><span className={styles.icon}><FlaskConical size={21} aria-hidden="true" /></span><div className={styles.copy}><strong>{name}</strong>{description ? <p>{description}</p> : null}<div className={styles.meta}>{pkg.price !== undefined ? <span>{t("price", { value: pkg.price })}</span> : null}{pkg.includedServices?.length ? <span>{t("tests", { count: pkg.includedServices.length })}</span> : null}</div><div className={styles.badges}>{pkg.homeVisitSupported ? <span>{t("homeVisit")}</span> : null}{pkg.fastingRequired ? <span>{t("fasting")}</span> : null}</div></div><Arrow size={18} aria-hidden="true" /></Link>; })}</section>}
audit-work/source/nabd-patient-web/app/[locale]/diagnostics/packages/labs-packages-ssr.test.ts:4:vi.mock("@/lib/api/labs-server", () => ({ getPublicLabServices: state.getPublicLabServices, getPublicLabPackage: state.getPublicLabPackage }));
audit-work/source/nabd-patient-web/app/[locale]/diagnostics/packages/[packageId]/page.tsx:5:import { extractLabService, parseLabServiceId } from "@/lib/api/labs";
audit-work/source/nabd-patient-web/app/[locale]/diagnostics/packages/[packageId]/page.tsx:6:import { getPublicLabPackage } from "@/lib/api/labs-server";
audit-work/source/nabd-patient-web/app/[locale]/diagnostics/packages/[packageId]/page.tsx:18:  if (!response) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><FlaskConical size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link className={styles.action} href={`/${locale}/diagnostics/packages/${packageId}`}>{t("retry")}</Link></section></main>;
audit-work/source/nabd-patient-web/app/[locale]/diagnostics/packages/[packageId]/page.tsx:20:  if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><FlaskConical size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link className={styles.action} href={`/${locale}/diagnostics/packages/${packageId}`}>{t("retry")}</Link></section></main>;
audit-work/source/nabd-patient-web/app/[locale]/diagnostics/packages/[packageId]/page.tsx:28:    <Link className={styles.back} href={`/${locale}/diagnostics/packages`}><Arrow size={17} aria-hidden="true" />{t("back")}</Link>
audit-work/source/nabd-patient-web/app/[locale]/dashboard/dashboard-ssr.test.ts:10:vi.mock("@/lib/api/dashboard-server", () => ({ getPatientDashboardProfile: state.profile, getPatientDashboardUpcomingAppointment: state.appointment }));
audit-work/source/nabd-patient-web/app/[locale]/dashboard/dashboard-page.test.ts:9:describe("patient dashboard visual shell", () => { beforeEach(() => { state.access = true; state.redirect.mockReset(); }); it("renders the reference-inspired private dashboard without embedding the session token", async () => { const html = renderToStaticMarkup(await DashboardPage({ params: Promise.resolve({ locale: "ar" }) })); expect(html).toContain("quickTile"); expect(html).toContain('href="/ar/appointments"'); expect(html).toContain('href="/ar/notifications"'); expect(html).toContain('href="/ar/profile"'); expect(html).not.toContain("test-access-token"); }, 15000); });
audit-work/source/nabd-patient-web/app/[locale]/dashboard/page.tsx:8:import { getPatientDashboardProfile, getPatientDashboardUpcomingAppointment } from "@/lib/api/dashboard-server";
audit-work/source/nabd-patient-web/app/[locale]/dashboard/page.tsx:9:import { parseDashboardAppointment, parseDashboardProfile } from "@/lib/api/dashboard";
audit-work/source/nabd-patient-web/app/[locale]/dashboard/page.tsx:68:      <div className={styles.heroTop}><span className={styles.heroBadge}>{t("eyebrow")}</span><div className={styles.heroActions}><Link className={styles.iconAction} href={`/${locale}/notifications`} aria-label={t("notifications")}><Bell size={19} aria-hidden="true" /></Link><Link className={styles.iconAction} href={`/${locale}/profile`} aria-label={t("profile")}><UserRound size={19} aria-hidden="true" /></Link></div></div>
audit-work/source/nabd-patient-web/app/[locale]/dashboard/page.tsx:71:    <section className={styles.section} aria-labelledby="quick-access-title"><div className={styles.sectionHeading}><h2 id="quick-access-title">{t("eyebrow")}</h2><span>{t("title")}</span></div><nav className={styles.quickGrid} aria-label={t("title")}>{quickDestinations.map(({ key, href, icon: Icon, accent }) => <Link key={key} className={styles.quickTile} href={`/${locale}/${href}`} style={{ "--tile-accent": accent } as CSSProperties}><span className={styles.quickIcon}><Icon size={23} aria-hidden="true" /></span><strong>{t(key)}</strong></Link>)}</nav></section>
audit-work/source/nabd-patient-web/app/[locale]/dashboard/page.tsx:72:    <section className={styles.section} aria-label={t("appointments")}><div className={styles.statusCard}><div className={styles.sectionHeading}><h2>{t("appointments")}</h2><Link className={styles.moreLink} href={`/${locale}/appointments`}>{t("appointments")} <Chevron size={17} aria-hidden="true" /></Link></div>{appointment ? <div className={styles.appointmentSummary}><strong>{appointment.doctorName ?? t("appointments")}</strong><span>{appointmentDate ?? appointment.status ?? t("body")}</span><Link className={styles.appointmentOpen} href={`/${locale}/appointments/${encodeURIComponent(appointment.id)}`}>{t("appointments")} <Chevron size={17} aria-hidden="true" /></Link></div> : <p className={styles.emptySummary}>{t("body")}</p>}</div></section>
audit-work/source/nabd-patient-web/app/[locale]/dashboard/page.tsx:73:    <section className={styles.section} aria-label={t("health")}><div className={styles.featureGrid}>{featureDestinations.map(({ key, href, icon: Icon, accent }) => <Link key={key} className={styles.featureCard} href={`/${locale}/${href}`} style={{ "--feature-accent": accent } as CSSProperties}><span className={styles.featureIcon}><Icon size={22} aria-hidden="true" /></span><span className={styles.featureContent}><strong>{t(key)}</strong><span>{t("body")}</span></span><Chevron className={styles.chevron} size={18} aria-hidden="true" /></Link>)}</div></section>
audit-work/source/nabd-patient-web/app/[locale]/dashboard/page.tsx:74:    <section className={styles.section} aria-label={t("profile")}><div className={styles.sectionHeading}><h2>{t("profile")}</h2><span>{t("body")}</span></div><nav className={styles.moreGrid} aria-label={t("profile")}>{moreDestinations.map(({ key, href, icon: Icon }) => <Link key={key} className={styles.moreLink} href={`/${locale}/${href}`}><span>{t(key)}</span><Icon size={17} aria-hidden="true" /></Link>)}</nav></section>
audit-work/source/nabd-patient-web/app/[locale]/health/page.tsx:6:import { extractVitalSummary } from "@/lib/api/vitals";
audit-work/source/nabd-patient-web/app/[locale]/health/page.tsx:7:import { getPatientVitalSummary } from "@/lib/api/vitals-server";
audit-work/source/nabd-patient-web/app/[locale]/health/page.tsx:49:  return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}><HeartPulse size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title")}</h1></div><span className={styles.heroIcon}><Activity size={27} aria-hidden="true" /></span></section><nav className={styles.quickGrid} aria-label={t("title")}>{quickActions.map(({ key, href, icon: Icon, color }) => <Link className={styles.quickAction} key={key} href={`/${locale}/${href}`} style={{ "--quick-color": color } as CSSProperties}><span><Icon size={21} aria-hidden="true" /></span><strong>{labels[key]}</strong></Link>)}</nav>{vitals.length === 0 ? <section className={styles.state}><p>{t("empty")}</p></section> : <section className={styles.grid} aria-label={t("title")}>{vitals.map((vital) => <article className={styles.card} key={vital.key}><div className={styles.cardTop}><span>{t(`vitals.${vital.key}`)}</span><span className={styles.glyph}><VitalGlyph kind={vital.key as VitalGlyphKind} /></span></div><p className={styles.value}>{vital.value}{vital.unit ? ` ${vital.unit}` : ""}</p>{vital.measuredAt ? <p className={styles.date}><CalendarDays size={14} aria-hidden="true" />{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(vital.measuredAt))}</p> : null}</article>)}</section>}<p className={styles.notice}>{t("notice")}</p></main>;
audit-work/source/nabd-patient-web/app/[locale]/health/health-ssr.test.ts:11:vi.mock("@/lib/api/vitals-server", () => ({ getPatientVitalSummary: state.getPatientVitalSummary }));
audit-work/source/nabd-patient-web/app/[locale]/health/reports/page.tsx:4:import { getPatientReports } from "@/lib/api/vitals-server";
audit-work/source/nabd-patient-web/app/[locale]/health/reports/page.tsx:5:import { parseReports } from "@/lib/api/reports";
audit-work/source/nabd-patient-web/app/[locale]/health/chronic-diseases/page.tsx:5:import { getPatientChronicDiseases } from "@/lib/api/chronic-server";
audit-work/source/nabd-patient-web/app/[locale]/health/chronic-diseases/page.tsx:6:import { parseChronicDiseases } from "@/lib/api/chronic";
audit-work/source/nabd-patient-web/app/[locale]/health/chronic-diseases/page.tsx:12:export default async function ChronicDiseasesPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("ChronicDiseases");const token=await requirePatientAccess(locale);let response:Response;try{response=await getPatientChronicDiseases(token);}catch{return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton/></section></main>;}if(response.status===401)redirect(`/${locale}/login`);if(response.status===403||response.status===404)notFound();if(!response.ok)return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton/></section></main>;const diseases=parseChronicDiseases(await response.json().catch(()=>null));return <main className={`main ${styles.page}`}><Link className={styles.back} href={`/${locale}/health`}><ChevronLeft size={17} aria-hidden="true"/>{t("back")}</Link><section className={styles.hero}><div><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true"/>{t("eyebrow")}</p><h1>{t("title")}</h1></div><span className={styles.heroIcon}><HeartPulse size={27} aria-hidden="true"/></span></section>{diseases.length?<section className={styles.grid} aria-label={t("title")}>{diseases.map((disease,index)=><article className={styles.card} key={disease.id||`${disease.name}-${index}`}><div className={styles.cardTop}><span>{t("recordedCondition")}</span><span className={styles.glyph}><Activity size={18} aria-hidden="true"/></span></div><p className={styles.value}>{disease.name}</p><p className={styles.date}>{t("source")}: {disease.source||t("unknown")}</p></article>)}</section>:<section className={styles.state}><HeartPulse size={25} aria-hidden="true"/><p>{t("empty")}</p></section>}<p className={styles.notice}>{t("notice")}</p></main>}
audit-work/source/nabd-patient-web/app/[locale]/health/trends/page.tsx:5:import { getPatientHealthTrends } from "@/lib/api/trends-server";
audit-work/source/nabd-patient-web/app/[locale]/health/trends/page.tsx:6:import { parseHealthTrends } from "@/lib/api/trends";
audit-work/source/nabd-patient-web/app/[locale]/health/trends/page.tsx:13:export default async function HealthTrendsPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("HealthTrends");const token=await requirePatientAccess(locale);let response:Response;try{response=await getPatientHealthTrends(token);}catch{return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton/></section></main>;}if(response.status===401)redirect(`/${locale}/login`);if(response.status===403||response.status===404)notFound();if(!response.ok)return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton/></section></main>;const trends=parseHealthTrends(await response.json().catch(()=>null));return <main className={`main ${styles.page}`}><Link className={styles.back} href={`/${locale}/health`}><ChevronLeft size={17} aria-hidden="true"/>{t("back")}</Link><section className={styles.hero}><div><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true"/>{t("eyebrow")}</p><h1>{t("title")}</h1></div><span className={styles.heroIcon}><Activity size={27} aria-hidden="true"/></span></section>{trends.length?<section className={styles.grid} aria-label={t("title")}>{trends.map((trend)=><article className={styles.card} key={trend.id}><div className={styles.cardTop}><span>{trend.name}</span><span className={styles.glyph}><Direction dir={trend.trendDir}/></span></div><p className={styles.value}>{trend.current} {trend.unit}</p><p className={styles.date}>{t(`direction.${trend.trendDir}`)} · {trend.data.length} {t("readings")}</p><p className={styles.date}>{trend.labels.slice(-5).join(" · ")}</p></article>)}</section>:<section className={styles.state}><Activity size={25} aria-hidden="true"/><p>{t("empty")}</p></section>}<p className={styles.notice}>{t("notice")}</p></main>}
audit-work/source/nabd-patient-web/app/[locale]/health/vitals/page.tsx:5:import { extractVitalHistory } from "@/lib/api/vitals";
audit-work/source/nabd-patient-web/app/[locale]/health/vitals/page.tsx:6:import { getPatientVitalHistory } from "@/lib/api/vitals-server";
audit-work/source/nabd-patient-web/app/[locale]/health/vitals/page.tsx:12:export default async function VitalsPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("Health");const token=await requirePatientAccess(locale);const response=await getPatientVitalHistory(token);if(response.status===401)redirect(`/${locale}/login`);if(response.status===403||response.status===404)notFound();if(!response.ok)return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton/></section></main>;const readings=extractVitalHistory(await response.json().catch(()=>null));return <main className={`main ${styles.page}`}><Link href={`/${locale}/health`} className={styles.back}><ChevronLeft size={17} aria-hidden="true"/>{t("backToHealth")}</Link><section className={styles.hero}><div><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true"/>{t("vitalsHistoryEyebrow")}</p><h1>{t("vitalsHistoryTitle")}</h1><p>{t("vitalsHistoryNotice")}</p></div><span className={styles.heroIcon}><Activity size={27} aria-hidden="true"/></span></section>{readings.length?<section className={styles.grid} aria-label={t("vitalsHistoryTitle")}>{readings.map((reading)=><article className={styles.card} key={reading.id}><div className={styles.cardTop}><span>{t(`vitals.${reading.key}`)}</span><Activity size={19} aria-hidden="true"/></div><p className={styles.value}>{reading.value}{reading.unit?` ${reading.unit}`:""}</p>{reading.context?<p>{reading.context}</p>:null}{reading.measuredAt?<p className={styles.date}><CalendarDays size={14} aria-hidden="true"/>{new Intl.DateTimeFormat(locale,{dateStyle:"medium",timeStyle:"short"}).format(new Date(reading.measuredAt))}</p>:null}</article>)}</section>:<section className={styles.state}><Activity size={25} aria-hidden="true"/><p>{t("vitalsHistoryEmpty")}</p><p>{t("vitalsHistoryNoDefaults")}</p></section>}<p className={styles.notice}>{t("vitalsHistoryReadOnly")}</p></main>}
audit-work/source/nabd-patient-web/app/[locale]/health/score/page.tsx:5:import { getPatientHealthScore } from "@/lib/api/vitals-server";
audit-work/source/nabd-patient-web/app/[locale]/health/score/page.tsx:6:import { parseHealthScore } from "@/lib/api/health-score";
audit-work/source/nabd-patient-web/app/[locale]/health/score/page.tsx:19:  return <main className="main"><Link className={styles.back} href={`/${locale}/health`}><ArrowLeft size={16} aria-hidden="true" />{t("back")}</Link><section className={styles.hero}><div><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("scoreTitle")}</h1><p>{t("scoreNotice")}</p></div><strong className={styles.score}>{score.score == null ? t("scoreInsufficient") : score.score}</strong></section><section className={styles.cards} aria-label={t("scoreComponents")}><div className={styles.card}><span>{t("scoreStatus")}</span><strong>{score.status}</strong></div>{score.components.map((item) => <div className={styles.card} key={item.key}><span>{item.key}</span><strong>{item.score}</strong></div>)}</section></main>;
audit-work/source/nabd-patient-web/app/[locale]/health/chronic-medications/page.tsx:5:import { getPatientChronicMedications } from "@/lib/api/chronic-meds-server";
audit-work/source/nabd-patient-web/app/[locale]/health/chronic-medications/page.tsx:6:import { parseChronicMedications } from "@/lib/api/chronic-meds";
audit-work/source/nabd-patient-web/app/[locale]/health/chronic-medications/page.tsx:12:export default async function ChronicMedicationsPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("ChronicMedications");const token=await requirePatientAccess(locale);let response:Response;try{response=await getPatientChronicMedications(token);}catch{return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton/></section></main>;}if(response.status===401)redirect(`/${locale}/login`);if(response.status===403||response.status===404)notFound();if(!response.ok)return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton/></section></main>;const meds=parseChronicMedications(await response.json().catch(()=>null));return <main className={`main ${styles.page}`}><Link className={styles.back} href={`/${locale}/health`}><ChevronLeft size={17} aria-hidden="true"/>{t("back")}</Link><section className={styles.hero}><div><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true"/>{t("eyebrow")}</p><h1>{t("title")}</h1></div><span className={styles.heroIcon}><Pill size={27} aria-hidden="true"/></span></section>{meds.length?<section className={styles.grid} aria-label={t("title")}>{meds.map((med)=><article className={styles.card} key={med.id}><div className={styles.cardTop}><span>{med.active?t("active"):t("inactive")}</span><span className={styles.glyph}><Pill size={18} aria-hidden="true"/></span></div><p className={styles.value}>{med.name||t("unnamed")}</p>{med.dose?<p className={styles.date}>{med.dose}</p>:null}{med.frequency?<p className={styles.date}><Clock3 size={14} aria-hidden="true"/>{med.frequency}{med.times.length?` · ${med.times.join(", ")}`:""}</p>:null}{med.refillDate?<p className={styles.date}><CalendarDays size={14} aria-hidden="true"/>{t("refillDate")}: {med.refillDate}{med.daysUntilRefill!==undefined?` · ${med.daysUntilRefill} ${t("days")}`:""}</p>:null}{med.pillsRemaining!==undefined?<p className={styles.date}>{t("remaining")}: {med.pillsRemaining}</p>:null}</article>)}</section>:<section className={styles.state}><Pill size={25} aria-hidden="true"/><p>{t("empty")}</p></section>}<p className={styles.notice}>{t("notice")}</p></main>}
audit-work/source/nabd-patient-web/app/[locale]/health/emergency-contacts/page.tsx:5:import { getPatientEmergencyContacts } from "@/lib/api/emergency-contacts-server";
audit-work/source/nabd-patient-web/app/[locale]/health/emergency-contacts/page.tsx:6:import { parseEmergencyContacts } from "@/lib/api/emergency-contacts";
audit-work/source/nabd-patient-web/app/[locale]/health/emergency-contacts/page.tsx:12:export default async function EmergencyContactsPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("EmergencyContacts");const token=await requirePatientAccess(locale);let response:Response;try{response=await getPatientEmergencyContacts(token);}catch{return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton/></section></main>;}if(response.status===401)redirect(`/${locale}/login`);if(response.status===403||response.status===404)notFound();if(!response.ok)return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton/></section></main>;const contacts=parseEmergencyContacts(await response.json().catch(()=>null));return <main className={`main ${styles.page}`}><Link className={styles.back} href={`/${locale}/health`}><ChevronLeft size={17} aria-hidden="true"/>{t("back")}</Link><section className={styles.hero}><div><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true"/>{t("eyebrow")}</p><h1>{t("title")}</h1></div><span className={styles.heroIcon}><Phone size={27} aria-hidden="true"/></span></section>{contacts.length?<section className={styles.grid} aria-label={t("title")}>{contacts.map((contact,index)=><article className={styles.card} key={contact.id||`${contact.name}-${index}`}><div className={styles.cardTop}><span>{contact.isPrimary?t("primary"):t("contact")}</span><span className={styles.glyph}><UserRound size={18} aria-hidden="true"/></span></div><p className={styles.value}>{contact.name}</p>{contact.relation?<p className={styles.date}>{contact.relation}</p>:null}<p className={styles.date}><Phone size={14} aria-hidden="true"/>{contact.maskedPhone}</p></article>)}</section>:<section className={styles.state}><Phone size={25} aria-hidden="true"/><p>{t("empty")}</p></section>}<p className={styles.notice}>{t("notice")}</p></main>}
audit-work/source/nabd-patient-web/app/[locale]/health/sleep/page.tsx:5:import { getPatientSleepReadings } from "@/lib/api/sleep-server";
audit-work/source/nabd-patient-web/app/[locale]/health/sleep/page.tsx:6:import { parseSleepReadings } from "@/lib/api/sleep";
audit-work/source/nabd-patient-web/app/[locale]/health/sleep/page.tsx:12:export default async function SleepPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("Sleep");const token=await requirePatientAccess(locale);let response:Response;try{response=await getPatientSleepReadings(token);}catch{return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton/></section></main>;}if(response.status===401)redirect(`/${locale}/login`);if(response.status===403||response.status===404)notFound();if(!response.ok)return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton/></section></main>;const readings=parseSleepReadings(await response.json().catch(()=>null));return <main className={`main ${styles.page}`}><Link className={styles.back} href={`/${locale}/health`}><ChevronLeft size={17} aria-hidden="true"/>{t("back")}</Link><section className={styles.hero}><div><p className={styles.eyebrow}><Moon size={15} aria-hidden="true"/>{t("eyebrow")}</p><h1>{t("title")}</h1></div><span className={styles.heroIcon}><Activity size={27} aria-hidden="true"/></span></section>{readings.length?<section className={styles.grid} aria-label={t("title")}>{readings.map((reading,index)=><article className={styles.card} key={reading.id||`${reading.measuredAt||"reading"}-${index}`}><div className={styles.cardTop}><span>{t("reading")}</span><span className={styles.glyph}><Moon size={18} aria-hidden="true"/></span></div><p className={styles.value}>{reading.score!==undefined?`${reading.score} ${t("score")}`:t("notAvailable")}</p>{reading.durationHours!==undefined?<p className={styles.date}>{t("duration")}: {reading.durationHours} {t("hours")}</p>:null}{reading.measuredAt?<p className={styles.date}><CalendarDays size={14} aria-hidden="true"/>{new Intl.DateTimeFormat(locale,{dateStyle:"medium",timeStyle:"short"}).format(new Date(reading.measuredAt))}</p>:null}</article>)}</section>:<section className={styles.state}><Moon size={25} aria-hidden="true"/><p>{t("empty")}</p></section>}<p className={styles.notice}><ShieldCheck size={15} aria-hidden="true"/> {t("notice")}</p></main>}
audit-work/source/nabd-patient-web/app/[locale]/mental-health/page.tsx:5:import { getPatientWellbeingDashboard } from "@/lib/api/mental-health-server";
audit-work/source/nabd-patient-web/app/[locale]/mental-health/page.tsx:6:import { parseWellbeingDashboard } from "@/lib/api/mental-health";
audit-work/source/nabd-patient-web/app/[locale]/mental-health/page.tsx:11:export default async function MentalHealthPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("MentalHealth");const token=await requirePatientAccess(locale);const response=await getPatientWellbeingDashboard(token);if(response.status===401)redirect(`/${locale}/login`);if(response.status===403||response.status===404)notFound();if(!response.ok)return <main className="main"><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p></section></main>;const data=parseWellbeingDashboard(await response.json().catch(()=>null));if(!data)return <main className="main"><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p></section></main>;const cards=[[t("moodEntries"),data.mood.totalEntries],[t("avgMood"),data.mood.avgMood??t("notAvailable")],[t("avgEnergy"),data.mood.avgEnergy??t("notAvailable")],[t("avgStress"),data.mood.avgStress??t("notAvailable")],[t("meditationSessions"),data.meditation.totalSessions],[t("meditationMinutes"),data.meditation.totalMinutes]];return <main className="main"><section className={styles.hero}><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title")}</h1><p>{t("notice")}</p></section><section className={styles.grid}>{cards.map(([label,value])=><div className={styles.card} key={String(label)}><span>{label}</span><strong>{value}</strong></div>)}</section><section className={styles.grid} aria-label={t("title")}><Link className={styles.card} href={`/${locale}/mental-health/breathing`}><Activity size={21} aria-hidden="true"/><strong>{t("breathingTitle")}</strong><span>{t("breathingNotice")}</span></Link><Link className={styles.card} href={`/${locale}/mental-health/crisis-contacts`}><HeartHandshake size={21} aria-hidden="true"/><strong>{t("crisisTitle")}</strong><span>{t("crisisNotice")}</span></Link><Link className={styles.card} href={`/${locale}/mental-health/meditation`}><Brain size={21} aria-hidden="true"/><strong>{t("meditationHistoryTitle")}</strong><span>{t("meditationHistoryNotice")}</span></Link></section></main>;}
audit-work/source/nabd-patient-web/app/[locale]/mental-health/mood/page.tsx:5:import { parseMoodHistory } from "@/lib/api/mood";
audit-work/source/nabd-patient-web/app/[locale]/mental-health/mood/page.tsx:6:import { getPatientMoodHistory } from "@/lib/api/mood-server";
audit-work/source/nabd-patient-web/app/[locale]/mental-health/mood/page.tsx:12:export default async function MoodHistoryPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("MentalHealth");const token=await requirePatientAccess(locale);const response=await getPatientMoodHistory(token);if(response.status===401)redirect(`/${locale}/login`);if(response.status===403||response.status===404)notFound();if(!response.ok)return <main className="main"><section className={styles.state} role="alert"><h1>{t("moodHistoryUnavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton/></section></main>;const entries=parseMoodHistory(await response.json().catch(()=>null));return <main className="main"><Link className={styles.back} href={`/${locale}/mental-health`}><ChevronLeft size={17} aria-hidden="true"/>{t("moodBack")}</Link><section className={styles.hero}><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true"/>{t("moodEyebrow")}</p><h1>{t("moodHistoryTitle")}</h1><p>{t("moodHistoryNotice")}</p></section>{entries.length?<section className={styles.grid} aria-label={t("moodHistoryTitle")}>{entries.map((entry)=><article className={styles.card} key={entry.id}><HeartPulse size={21} aria-hidden="true"/><strong>{entry.mood||t("moodUnavailable")}</strong>{entry.energy!==undefined?<span>{t("energy")}: {entry.energy}</span>:null}{entry.stress!==undefined?<span>{t("stress")}: {entry.stress}</span>:null}{entry.sleepHours!==undefined?<span>{t("sleepHours")}: {entry.sleepHours}</span>:null}{entry.loggedAt?<span><CalendarDays size={13} aria-hidden="true"/> {new Intl.DateTimeFormat(locale,{dateStyle:"medium"}).format(new Date(entry.loggedAt))}</span>:null}</article>)}</section>:<section className={styles.state}><HeartPulse size={25} aria-hidden="true"/><p>{t("moodHistoryEmpty")}</p></section>}</main>}
audit-work/source/nabd-patient-web/app/[locale]/mental-health/breathing/page.tsx:5:import { parseBreathingHistory } from "@/lib/api/breathing";
audit-work/source/nabd-patient-web/app/[locale]/mental-health/breathing/page.tsx:6:import { getPatientBreathingHistory } from "@/lib/api/breathing-server";
audit-work/source/nabd-patient-web/app/[locale]/mental-health/breathing/page.tsx:12:export default async function BreathingHistoryPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("MentalHealth");const token=await requirePatientAccess(locale);const response=await getPatientBreathingHistory(token);if(response.status===401)redirect(`/${locale}/login`);if(response.status===403||response.status===404)notFound();if(!response.ok)return <main className="main"><section className={styles.state} role="alert"><h1>{t("breathingUnavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton/></section></main>;const sessions=parseBreathingHistory(await response.json().catch(()=>null));return <main className="main"><Link className={styles.back} href={`/${locale}/mental-health`}><ChevronLeft size={17} aria-hidden="true"/>{t("breathingBack")}</Link><section className={styles.hero}><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true"/>{t("breathingEyebrow")}</p><h1>{t("breathingTitle")}</h1><p>{t("breathingNotice")}</p></section>{sessions.length?<section className={styles.grid} aria-label={t("breathingTitle")}>{sessions.map((session)=><article className={styles.card} key={session.id}><Activity size={21} aria-hidden="true"/><strong>{session.technique||t("techniqueUnavailable")}</strong>{session.rounds!==undefined?<span>{t("rounds")}: {session.rounds}</span>:null}{session.durationSeconds!==undefined?<span><Clock3 size={13} aria-hidden="true"/> {t("durationSeconds")}: {session.durationSeconds}</span>:null}{session.loggedAt?<span><CalendarDays size={13} aria-hidden="true"/> {new Intl.DateTimeFormat(locale,{dateStyle:"medium"}).format(new Date(session.loggedAt))}</span>:null}</article>)}</section>:<section className={styles.state}><Activity size={25} aria-hidden="true"/><p>{t("breathingEmpty")}</p></section>}</main>}
audit-work/source/nabd-patient-web/app/[locale]/mental-health/crisis-contacts/page.tsx:5:import { parseCrisisContacts } from "@/lib/api/crisis-contacts";
audit-work/source/nabd-patient-web/app/[locale]/mental-health/crisis-contacts/page.tsx:6:import { getPatientCrisisContacts } from "@/lib/api/crisis-contacts-server";
audit-work/source/nabd-patient-web/app/[locale]/mental-health/crisis-contacts/page.tsx:12:export default async function CrisisContactsPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("MentalHealth");const token=await requirePatientAccess(locale);const response=await getPatientCrisisContacts(token);if(response.status===401)redirect(`/${locale}/login`);if(response.status===403||response.status===404)notFound();if(!response.ok)return <main className="main"><section className={styles.state} role="alert"><h1>{t("crisisUnavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton/></section></main>;const contacts=parseCrisisContacts(await response.json().catch(()=>null));return <main className="main"><Link className={styles.back} href={`/${locale}/mental-health`}><ChevronLeft size={17} aria-hidden="true"/>{t("crisisBack")}</Link><section className={styles.hero}><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true"/>{t("crisisEyebrow")}</p><h1>{t("crisisTitle")}</h1><p>{t("crisisNotice")}</p></section>{contacts.length?<section className={styles.grid} aria-label={t("crisisTitle")}>{contacts.map((contact)=><article className={styles.card} key={contact.id}><HeartHandshake size={21} aria-hidden="true"/><strong>{contact.name||t("contactUnavailable")}</strong>{contact.relationship?<span>{contact.relationship}</span>:null}{contact.maskedPhone?<span>{contact.maskedPhone}</span>:null}</article>)}</section>:<section className={styles.state}><HeartHandshake size={25} aria-hidden="true"/><p>{t("crisisEmpty")}</p></section>}</main>}
audit-work/source/nabd-patient-web/app/[locale]/mental-health/meditation/page.tsx:5:import { parseMeditationHistory } from "@/lib/api/meditation";
audit-work/source/nabd-patient-web/app/[locale]/mental-health/meditation/page.tsx:6:import { getPatientMeditationHistory } from "@/lib/api/meditation-server";
audit-work/source/nabd-patient-web/app/[locale]/mental-health/meditation/page.tsx:12:export default async function MeditationHistoryPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("MentalHealth");const token=await requirePatientAccess(locale);const response=await getPatientMeditationHistory(token);if(response.status===401)redirect(`/${locale}/login`);if(response.status===403||response.status===404)notFound();if(!response.ok)return <main className="main"><section className={styles.state} role="alert"><h1>{t("meditationHistoryUnavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton/></section></main>;const entries=parseMeditationHistory(await response.json().catch(()=>null));return <main className="main"><Link className={styles.back} href={`/${locale}/mental-health`}><ChevronLeft size={17} aria-hidden="true"/>{t("meditationBack")}</Link><section className={styles.hero}><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true"/>{t("meditationEyebrow")}</p><h1>{t("meditationHistoryTitle")}</h1><p>{t("meditationHistoryNotice")}</p></section>{entries.length?<section className={styles.grid} aria-label={t("meditationHistoryTitle")}>{entries.map((entry)=><article className={styles.card} key={entry.id}><Activity size={21} aria-hidden="true"/><strong>{entry.type||t("meditationUnavailable")}</strong>{entry.durationMinutes!==undefined?<span><Clock3 size={13} aria-hidden="true"/> {entry.durationMinutes} {t("minutes")}</span>:null}{entry.completed!==undefined?<span>{entry.completed?t("completed"):t("notCompleted")}</span>:null}{entry.loggedAt?<span><CalendarDays size={13} aria-hidden="true"/> {new Intl.DateTimeFormat(locale,{dateStyle:"medium"}).format(new Date(entry.loggedAt))}</span>:null}</article>)}</section>:<section className={styles.state}><Activity size={25} aria-hidden="true"/><p>{t("meditationHistoryEmpty")}</p></section>}</main>}
audit-work/source/nabd-patient-web/app/[locale]/prescriptions/prescriptions-ssr.test.ts:10:vi.mock("@/lib/api/prescriptions-server", () => ({ getPatientPrescriptions: state.getPatientPrescriptions }));
audit-work/source/nabd-patient-web/app/[locale]/prescriptions/prescriptions-ssr.test.ts:34:    expect(html).not.toMatch(/href="[^"]*private-prescription/i);
audit-work/source/nabd-patient-web/app/[locale]/prescriptions/page.tsx:3:import { extractPrescriptionSummaries } from "@/lib/api/prescriptions";
audit-work/source/nabd-patient-web/app/[locale]/prescriptions/page.tsx:4:import { getPatientPrescriptions } from "@/lib/api/prescriptions-server";
audit-work/source/nabd-patient-web/app/[locale]/prescriptions/[prescriptionId]/page.tsx:23:      <Link className={styles.date} href={`/${locale}/prescriptions`}>{t("back")}</Link>
audit-work/source/nabd-patient-web/app/[locale]/articles/page.tsx:5:import { getPublicArticleCategories, getPublicArticles } from "@/lib/api/articles-server";
audit-work/source/nabd-patient-web/app/[locale]/articles/page.tsx:6:import { parseArticleCategories, parseArticleList } from "@/lib/api/articles";
audit-work/source/nabd-patient-web/app/[locale]/articles/page.tsx:11:export default async function ArticlesPage({params,searchParams}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("Articles");const Chevron=locale==="ar"||locale==="ur"?ChevronLeft:ChevronRight;const query=searchParams?await searchParams:{};const [response,categoriesResponse]=await Promise.all([getPublicArticles({q:query.q,category:query.category}),getPublicArticleCategories()]);if(!response||!response.ok)return <main className="main"><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton/></section></main>;const articles=parseArticleList(await response.json().catch(()=>null));const categories=categoriesResponse?.ok?parseArticleCategories(await categoriesResponse.json().catch(()=>null)):[];return <main className={`main ${styles.page}`}><section className={styles.hero}><p className={styles.eyebrow}><FileText size={15} aria-hidden="true"/>{t("eyebrow")}</p><h1>{t("title")}</h1><p>{t("notice")}</p><form className={styles.search} method="get"><Search size={18} aria-hidden="true"/><input name="q" defaultValue={query.q||""} maxLength={80} placeholder={t("searchPlaceholder")} aria-label={t("searchPlaceholder")}/><button type="submit">{t("search")}</button></form>{categories.length?<nav className={styles.chips} aria-label={t("categories")}>{categories.map((category)=><Link className={query.category===category?styles.chipActive:styles.chip} key={category} href={`/${locale}/articles?category=${encodeURIComponent(category)}`}><span dir="auto">{category}</span></Link>)}</nav>:null}</section>{articles.length?<section className={styles.list}>{articles.map((article)=><Link className={styles.card} key={article.slug} href={`/${locale}/articles/${article.slug}`}><span className={styles.icon}><FileText size={20} aria-hidden="true"/></span><span className={styles.copy}><strong dir="auto">{locale==="ar"?article.titleAr||article.titleEn:article.titleEn||article.titleAr||t("untitled")}</strong><span dir="auto">{article.category||t("categoryUnavailable")}</span></span><Chevron className={styles.arrow} size={18} aria-hidden="true"/></Link>)}</section>:<section className={styles.empty}><FileText size={34} aria-hidden="true"/><h2>{t("noResultsTitle")}</h2><p>{query.q||query.category?t("noResults"):t("empty")}</p></section>}</main>}
audit-work/source/nabd-patient-web/app/[locale]/articles/[slug]/page.tsx:5:import { getPublicArticle } from "@/lib/api/articles-server";
audit-work/source/nabd-patient-web/app/[locale]/articles/[slug]/page.tsx:6:import { articleSlug, parseArticle } from "@/lib/api/articles";
audit-work/source/nabd-patient-web/app/[locale]/articles/[slug]/page.tsx:11:export default async function ArticlePage({params}:Props){const {locale,slug}=await params;if(!isLocale(locale)||!articleSlug(slug))notFound();setRequestLocale(locale);const t=await getTranslations("Articles");const response=await getPublicArticle(slug);if(response?.status===404)notFound();if(!response||!response.ok)return <main className="main"><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton/></section></main>;const article=parseArticle(await response.json().catch(()=>null));if(!article)notFound();const title=locale==="ar"?article.titleAr||article.titleEn||t("untitled"):article.titleEn||article.titleAr||t("untitled");const excerpt=locale==="ar"?article.excerptAr||article.excerptEn:article.excerptEn||article.excerptAr;return <main className={`main ${styles.page}`}><Link className={styles.back} href={`/${locale}/articles`}><ChevronLeft size={17} aria-hidden="true"/>{t("back")}</Link><section className={styles.hero}><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true"/>{t("eyebrow")}</p><h1>{title}</h1><p>{excerpt||t("excerptUnavailable")}</p></section><section className={styles.notice}><FileText size={20} aria-hidden="true"/><p>{t("bodyHidden")}</p></section></main>}
audit-work/source/nabd-patient-web/app/[locale]/articles/bookmarks/page.tsx:5:import { getPatientArticleBookmarks } from "@/lib/api/articles-server";
audit-work/source/nabd-patient-web/app/[locale]/articles/bookmarks/page.tsx:6:import { parseArticleList } from "@/lib/api/articles";
audit-work/source/nabd-patient-web/app/[locale]/articles/bookmarks/page.tsx:12:export default async function ArticleBookmarksPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);const t=await getTranslations("Articles");const token=await requirePatientAccess(locale);let response:Response;try{response=await getPatientArticleBookmarks(token);}catch{return <main className="main"><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton/></section></main>;}if(response.status===401)redirect(`/${locale}/login`);if(response.status===403||response.status===404)notFound();if(!response.ok)return <main className="main"><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton/></section></main>;const articles=parseArticleList(await response.json().catch(()=>null));return <main className={`main ${styles.page}`}><section className={styles.hero}><p className={styles.eyebrow}><Bookmark size={15} aria-hidden="true"/>{t("eyebrow")}</p><h1>{t("bookmarksTitle")}</h1><p>{t("bookmarksNotice")}</p></section>{articles.length?<section className={styles.list}>{articles.map((article)=><Link className={styles.card} key={article.slug} href={`/${locale}/articles/${article.slug}`}><span className={styles.icon}><FileText size={20} aria-hidden="true"/></span><span className={styles.copy}><strong>{locale==="ar"?article.titleAr||article.titleEn:article.titleEn||article.titleAr||t("untitled")}</strong><span>{article.category||t("categoryUnavailable")}</span></span><ChevronLeft className={styles.arrow} size={18} aria-hidden="true"/></Link>)}</section>:<section className={styles.empty}><Bookmark size={34} aria-hidden="true"/><h2>{t("emptyTitle")}</h2><p>{t("empty")}</p><Link className={styles.primary} href={`/${locale}/articles`}>{t("browse")}</Link></section>}</main>}
audit-work/source/nabd-patient-web/app/[locale]/orders/orders-ssr.test.ts:8:vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));
audit-work/source/nabd-patient-web/app/[locale]/orders/orders-ssr.test.ts:16:describe("order detail SSR boundary", () => { beforeEach(() => { state.requirePatientAccess.mockReset().mockResolvedValue(serverToken); state.callPatientApi.mockReset(); }); it("renders only the allowlisted order summary without customer, address, price, or token", async () => { state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ data: { id: orderId, reference: "Order-123", status: "CONFIRMED", patient_name: "private-customer", delivery_address: "private-address", total_price: 500 } }), { status: 200 })); const html = renderToStaticMarkup(await OrderDetailPage({ params: Promise.resolve({ locale: "en", orderId }) })); expect(state.callPatientApi).toHaveBeenCalledWith(`/patient/pharmacy/orders/${orderId}`, {}, serverToken); expect(html).toContain("Order-123"); expect(html).toContain("CONFIRMED"); expect(html).toContain('href="/en/orders"'); for (const secret of [serverToken, "private-customer", "private-address", "500"]) expect(html).not.toContain(secret); }); });
audit-work/source/nabd-patient-web/app/[locale]/orders/page.tsx:5:import { callPatientApi } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/app/[locale]/orders/page.tsx:6:import { extractOrderRows } from "@/lib/api/orders";
audit-work/source/nabd-patient-web/app/[locale]/orders/page.tsx:40:  return <main className={`main ${styles.page}`}><section className={styles.intro}><div className={styles.introText}><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1><p>{orders.length ? t("detailNotice") : t("empty")}</p></div><span className={styles.introIcon}><ClipboardList size={28} aria-hidden="true" /></span></section><nav className={styles.tabs} aria-label={t("title")}>{(["all", "pending", "completed", "cancelled"] as const).map((tab) => <Link key={tab} className={activeTab === tab ? styles.tabActive : styles.tab} href={`/${locale}/orders?tab=${tab}`} aria-current={activeTab === tab ? "page" : undefined}>{tabLabels[tab]}</Link>)}</nav>{visibleOrders.length === 0 ? <section className={styles.state}><span className={styles.stateIcon}><PackageSearch size={25} aria-hidden="true" /></span><h2>{t("title")}</h2><p>{activeTab === "all" ? t("empty") : tabLabels[activeTab]}</p></section> : <section className={styles.grid} aria-label={tabLabels[activeTab]}>{visibleOrders.map((order) => <Link className={styles.card} key={order.id} href={`/${locale}/orders/${order.id}`}><span className={styles.cardIcon}><ClipboardList size={21} aria-hidden="true" /></span><span className={styles.cardBody}><span className={styles.reference}>{order.reference || t("untitled")}</span><span className={styles.status}>{order.status || t("statusUnavailable")}</span><span className={styles.open}>{t("open")}</span></span><Chevron className={styles.chevron} size={18} aria-hidden="true" /></Link>)}</section>}</main>;
audit-work/source/nabd-patient-web/app/[locale]/orders/[orderId]/page.tsx:4:import { callPatientApi } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/app/[locale]/orders/[orderId]/page.tsx:5:import { extractOrderDetail, parseOrderId } from "@/lib/api/orders";
audit-work/source/nabd-patient-web/app/[locale]/orders/[orderId]/page.tsx:29:    <Link className={styles.back} href={`/${locale}/orders`}><ChevronLeft size={17} aria-hidden="true" />{t("back")}</Link>
audit-work/source/nabd-patient-web/app/[locale]/orders/[orderId]/page.tsx:40:      <Link className={styles.back} href={`/${locale}/orders/${orderId}/tracking`}>{t("open")}</Link>
audit-work/source/nabd-patient-web/app/[locale]/orders/[orderId]/tracking/page.tsx:5:import { callPatientApi } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/app/[locale]/orders/[orderId]/tracking/page.tsx:6:import { extractOrderTracking, parseOrderId } from "@/lib/api/orders";
audit-work/source/nabd-patient-web/app/[locale]/orders/[orderId]/tracking/page.tsx:28:    <Link className={styles.back} href={`/${locale}/orders/${orderId}`}><ChevronLeft size={17} aria-hidden="true" />{t("back")}</Link>
audit-work/source/nabd-patient-web/app/[locale]/wishlist/page.tsx:5:import { getPatientWishlist } from "@/lib/api/wishlist-server";
audit-work/source/nabd-patient-web/app/[locale]/wishlist/page.tsx:6:import { extractWishlist } from "@/lib/api/wishlist";
audit-work/source/nabd-patient-web/app/[locale]/wishlist/page.tsx:27:    {items.length ? <section className={styles.grid} aria-label={t("title")}>{items.map((item) => { const name = locale === "ar" ? item.nameAr || item.nameEn || t("untitled") : item.nameEn || item.nameAr || t("untitled"); return <article className={styles.card} key={item.id}><span className={styles.icon}><Pill size={24} aria-hidden="true" /></span><div className={styles.content}><h2>{name}</h2>{item.brand ? <p>{item.brand}</p> : null}<div className={styles.meta}>{item.price !== undefined ? <span>{t("price", { value: item.price })}</span> : <span>{t("priceUnavailable")}</span>}{item.inStock === false ? <span className={styles.out}>{t("outOfStock")}</span> : item.inStock === true ? <span className={styles.in}>{t("inStock")}</span> : null}</div><Link className={styles.link} href={`/${locale}/medicines/${item.id}`}>{t("open")}</Link></div></article>; })}</section> : <section className={styles.state}><Heart size={26} aria-hidden="true" /><h2>{t("empty")}</h2><Link className={styles.link} href={`/${locale}/medicine-catalog`}>{t("shop")}</Link></section>}
audit-work/source/nabd-patient-web/app/[locale]/appointments/appointments-ssr.test.ts:18:vi.mock("@/lib/api/appointments-server", () => ({
audit-work/source/nabd-patient-web/app/[locale]/appointments/appointments-ssr.test.ts:56:    expect(html).toContain('href="/en/appointments"');
audit-work/source/nabd-patient-web/app/[locale]/appointments/page.tsx:6:import { extractAppointmentRows } from "@/lib/api/appointments";
audit-work/source/nabd-patient-web/app/[locale]/appointments/page.tsx:7:import { getPatientAppointments } from "@/lib/api/appointments-server";
audit-work/source/nabd-patient-web/app/[locale]/appointments/page.tsx:42:  return <main className={`main ${styles.page}`}><section className={styles.header}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1><Link className={styles.specialtiesLink} href={`/${locale}/consultations/specialties`}><Stethoscope size={16} aria-hidden="true" />{t("browseSpecialties")}</Link></div><span className={styles.headerIcon}><CalendarDays size={26} aria-hidden="true" /></span></section><nav className={styles.tabs} aria-label={t("title")}><Link className={activeTab === "upcoming" ? styles.tabActive : styles.tab} href={`/${locale}/appointments?tab=upcoming`} aria-current={activeTab === "upcoming" ? "page" : undefined}>{labels.upcoming}</Link><Link className={activeTab === "past" ? styles.tabActive : styles.tab} href={`/${locale}/appointments?tab=past`} aria-current={activeTab === "past" ? "page" : undefined}>{labels.past}</Link></nav>{filteredAppointments.length === 0 ? <section className={styles.state}><span className={styles.stateIcon}><CalendarDays size={25} aria-hidden="true" /></span><h2>{t("title")}</h2><p>{t("empty")}</p></section> : <><p className={styles.notice}>{t("detailNotice")}</p><section className={styles.grid} aria-label={activeTab === "upcoming" ? labels.upcoming : labels.past}>{filteredAppointments.map((appointment) => <Link className={styles.card} key={appointment.id} href={`/${locale}/appointments/${appointment.id}`}><span className={styles.cardTop}><span className={styles.service}><span className={styles.serviceIcon}><Stethoscope size={18} aria-hidden="true" /></span>{serviceLabel(appointment.serviceType)}</span><span className={styles.status} style={statusStyle(appointment.status)}>{appointment.status || t("statusUnavailable")}</span></span>{appointment.doctorName ? <strong className={styles.doctorName}>{appointment.doctorName}</strong> : null}{appointment.slotStart ? <span className={styles.schedule}><Clock3 size={16} aria-hidden="true" />{t("scheduledAt", { value: new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(appointment.slotStart)) })}</span> : null}<span className={styles.footer}>{t("open")}<Chevron size={17} aria-hidden="true" /></span></Link>)}</section></>}</main>;
audit-work/source/nabd-patient-web/app/[locale]/appointments/[appointmentId]/page.tsx:4:import { extractAppointmentDetail, parseAppointmentId } from "@/lib/api/appointments";
audit-work/source/nabd-patient-web/app/[locale]/appointments/[appointmentId]/page.tsx:5:import { getPatientAppointment } from "@/lib/api/appointments-server";
audit-work/source/nabd-patient-web/app/[locale]/appointments/[appointmentId]/page.tsx:32:    <Link className={styles.back} href={`/${locale}/appointments`}><ChevronLeft size={17} aria-hidden="true" />{t("back")}</Link>
audit-work/source/nabd-patient-web/app/[locale]/chat/chat-ssr.test.ts:10:vi.mock("@/lib/api/chat-server", () => ({ getPatientChatThreads: state.getPatientChatThreads }));
audit-work/source/nabd-patient-web/app/[locale]/chat/chat-ssr.test.ts:32:    expect(html).not.toMatch(/href="[^"]*(private|attachment)/i);
audit-work/source/nabd-patient-web/app/[locale]/chat/page.tsx:3:import { extractChatThreadSummaries } from "@/lib/api/chat";
audit-work/source/nabd-patient-web/app/[locale]/chat/page.tsx:4:import { getPatientChatThreads } from "@/lib/api/chat-server";
audit-work/source/nabd-patient-web/app/[locale]/chat/[threadId]/page.tsx:5:import { extractChatMessageSummaries, extractChatThreadSummaries } from "@/lib/api/chat";
audit-work/source/nabd-patient-web/app/[locale]/chat/[threadId]/page.tsx:6:import { getPatientChatMessages, getPatientChatThread } from "@/lib/api/chat-server";
audit-work/source/nabd-patient-web/app/[locale]/chat/[threadId]/page.tsx:12:export default async function ChatThreadPage({params}:Props){const {locale,threadId}=await params;if(!isLocale(locale)||!/^[0-9a-f-]{36}$/i.test(threadId))notFound();setRequestLocale(locale);const t=await getTranslations("ChatDetail");const token=await requirePatientAccess(locale);let threadResponse:Response;let messagesResponse:Response;try{[threadResponse,messagesResponse]=await Promise.all([getPatientChatThread(token,threadId),getPatientChatMessages(token,threadId)]);}catch{return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton/></section></main>;}if([threadResponse,messagesResponse].some((response)=>response.status===401))redirect(`/${locale}/login`);if([threadResponse,messagesResponse].some((response)=>response.status===403||response.status===404))notFound();if([threadResponse,messagesResponse].some((response)=>!response.ok))return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton/></section></main>;const thread=extractChatThreadSummaries({data:[await threadResponse.json().catch(()=>null)]})[0];const messages=extractChatMessageSummaries(await messagesResponse.json().catch(()=>null));return <main className={`main ${styles.page}`}><Link className={styles.activity} href={`/${locale}/chat`}><ChevronLeft size={17} aria-hidden="true"/>{t("back")}</Link><section className={styles.intro}><div className={styles.introText}><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true"/>{t("eyebrow")}</p><h1>{thread?t(`types.${thread.type}`):t("thread")}</h1></div><span className={styles.introIcon}><MessageCircle size={27} aria-hidden="true"/></span></section><section className={styles.grid} aria-label={t("messagesTitle")}>{messages.length?messages.map((message)=><article className={styles.card} key={message.id}><span className={styles.cardIcon}>{message.hasAttachment?<FileText size={19} aria-hidden="true"/>:<MessageCircle size={19} aria-hidden="true"/>}</span><div className={styles.cardBody}><strong className={styles.type}>{message.deleted?t("deleted"):t(`messageTypes.${message.type}`)}</strong><span className={styles.activity}><CalendarDays size={14} aria-hidden="true"/>{message.createdAt?new Intl.DateTimeFormat(locale,{dateStyle:"medium",timeStyle:"short"}).format(new Date(message.createdAt)):t("timeUnavailable")}</span>{message.hasAttachment?<span className={styles.activity}>{t("attachmentHidden")}</span>:null}</div></article>):<section className={styles.state}><MessageCircle size={25} aria-hidden="true"/><p>{t("empty")}</p></section>}</section><p className={styles.notice}>{t("bodyHidden")}</p></main>}
audit-work/source/nabd-patient-web/app/[locale]/family/page.tsx:3:import { extractFamilyMembers } from "@/lib/api/family";
audit-work/source/nabd-patient-web/app/[locale]/family/page.tsx:4:import { parseFamilyGroup } from "@/lib/api/family-group";
audit-work/source/nabd-patient-web/app/[locale]/family/page.tsx:5:import { getPatientFamilyGroup } from "@/lib/api/family-group-server";
audit-work/source/nabd-patient-web/app/[locale]/family/page.tsx:6:import { getPatientFamilyMembers } from "@/lib/api/family-server";
audit-work/source/nabd-patient-web/app/[locale]/family/family-ssr.test.ts:10:vi.mock("@/lib/api/family-server", () => ({ getPatientFamilyMembers: state.getPatientFamilyMembers }));
audit-work/source/nabd-patient-web/app/[locale]/home-care/page.tsx:4:import { extractHomeCareBookings } from "@/lib/api/home-care";
audit-work/source/nabd-patient-web/app/[locale]/home-care/page.tsx:5:import { getPatientHomeCareBookings } from "@/lib/api/home-care-server";
audit-work/source/nabd-patient-web/app/[locale]/home-care/page.tsx:33:    <Link href={`/${locale}/home-care/services`} className={styles.notice}>{t("browseServices")}</Link>
audit-work/source/nabd-patient-web/app/[locale]/home-care/home-care-ssr.test.ts:10:vi.mock("@/lib/api/home-care-server", () => ({ getPatientHomeCareBookings: state.getPatientHomeCareBookings }));
audit-work/source/nabd-patient-web/app/[locale]/home-care/services/page.tsx:5:import { extractHomeCareServices } from "@/lib/api/home-care-services";
audit-work/source/nabd-patient-web/app/[locale]/home-care/services/page.tsx:6:import { getPublicHomeCareServices } from "@/lib/api/home-care-services-server";
audit-work/source/nabd-patient-web/app/[locale]/home-care/services/page.tsx:18:  if (!response || !response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><HousePlus size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link href={`/${locale}/home-care/services`} className={styles.action}>{t("retry")}</Link></section></main>;
audit-work/source/nabd-patient-web/app/[locale]/home-care/services/page.tsx:22:  return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1><p className={styles.subtitle}>{t("subtitle")}</p></div><span className={styles.heroIcon}><HousePlus size={28} aria-hidden="true" /></span></section><form className={styles.search} method="get" role="search"><Search size={18} aria-hidden="true" /><label className="sr-only" htmlFor="home-care-search">{t("searchLabel")}</label><input id="home-care-search" name="q" defaultValue={q} placeholder={t("searchPlaceholder")} /></form>{filtered.length === 0 ? <section className={styles.state}><HousePlus size={26} aria-hidden="true" /><h2>{t("emptyTitle")}</h2><p>{services.length === 0 ? t("emptyBody") : t("noMatch")}</p></section> : <section className={styles.grid} aria-label={t("title")}>{filtered.map((service, index) => { const name = rtl ? service.nameAr ?? service.nameEn : service.nameEn ?? service.nameAr; const description = rtl ? service.descriptionAr ?? service.descriptionEn : service.descriptionEn ?? service.descriptionAr; const color = ["#1499a7", "#6a5bd5", "#c27629", "#1b9277", "#c45572"][index % 5]; return <Link href={`/${locale}/home-care/services/${service.id}`} className={styles.card} key={service.id}><span className={styles.icon} style={{ backgroundColor: `${color}18`, color }}><HousePlus size={22} aria-hidden="true" /></span><span className={styles.copy}><strong>{name}</strong>{description ? <small>{description}</small> : null}{service.price !== undefined ? <small>{t("price", { value: service.price })}</small> : null}</span><Arrow size={18} aria-hidden="true" /></Link>; })}</section>}</main>;
audit-work/source/nabd-patient-web/app/[locale]/home-care/services/services-ssr.test.ts:7:vi.mock("@/lib/api/home-care-services-server", () => ({ getPublicHomeCareServices: state.list, getPublicHomeCareService: state.detail }));
audit-work/source/nabd-patient-web/app/[locale]/home-care/services/[serviceId]/page.tsx:5:import { extractHomeCareService } from "@/lib/api/home-care-services";
audit-work/source/nabd-patient-web/app/[locale]/home-care/services/[serviceId]/page.tsx:6:import { getPublicHomeCareService } from "@/lib/api/home-care-services-server";
audit-work/source/nabd-patient-web/app/[locale]/home-care/services/[serviceId]/page.tsx:15:  if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><HousePlus size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link href={`/${locale}/home-care/services`} className={styles.action}>{t("back")}</Link></section></main>;
audit-work/source/nabd-patient-web/app/[locale]/home-care/services/[serviceId]/page.tsx:18:  return <main className={`main ${styles.page}`}><Link href={`/${locale}/home-care/services`} className={styles.back}><Arrow size={17} aria-hidden="true" />{t("back")}</Link><article className={styles.detail}><div className={styles.detailIcon}><HousePlus size={34} aria-hidden="true" /></div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{name}</h1>{description ? <p className={styles.description}>{description}</p> : null}<div className={styles.facts}>{service.price !== undefined ? <span><strong>{t("priceLabel")}</strong>{t("price", { value: service.price })}</span> : null}{service.durationValue !== undefined || service.duration ? <span><Clock3 size={16} aria-hidden="true" /><strong>{t("durationLabel")}</strong>{[service.durationValue, service.duration].filter(Boolean).join(" ")}</span> : null}{service.insuranceAvailable ? <span><ShieldCheck size={16} aria-hidden="true" />{t("insurance")}</span> : null}</div><p className={styles.notice}>{t("bookingNotice")}</p></article></main>;
audit-work/source/nabd-patient-web/app/[locale]/consultations/specialties/page.tsx:5:import { extractSpecialties } from "@/lib/api/specialties";
audit-work/source/nabd-patient-web/app/[locale]/consultations/specialties/page.tsx:6:import { getPublicSpecialties } from "@/lib/api/specialties-server";
audit-work/source/nabd-patient-web/app/[locale]/consultations/specialties/page.tsx:23:    return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><span className={styles.stateIcon}><Stethoscope size={28} aria-hidden="true" /></span><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link className={styles.retry} href={`/${locale}/consultations/specialties`}><RefreshCw size={16} aria-hidden="true" />{t("retry")}</Link></section></main>;
audit-work/source/nabd-patient-web/app/[locale]/consultations/specialties/page.tsx:32:    {filtered.length === 0 ? <section className={styles.state}><span className={styles.stateIcon}><Search size={26} aria-hidden="true" /></span><h2>{t("emptyTitle")}</h2><p>{specialties.length === 0 ? t("emptyBody") : t("noMatch")}</p></section> : <section className={styles.grid} aria-label={t("title")}>{filtered.map((specialty, index) => { const name = locale === "ar" || locale === "ur" ? specialty.nameAr ?? specialty.nameEn : specialty.nameEn ?? specialty.nameAr; const color = ["#1f9fb7", "#695bd4", "#d06b45", "#199b79", "#b87318", "#c25079"][index % 6]; return <Link className={styles.card} key={specialty.slug ?? `${name}-${index}`} href={`/${locale}/appointments?specialty=${encodeURIComponent(specialty.nameAr ?? specialty.nameEn ?? "")}`}><span className={styles.cardIcon} style={{ color, backgroundColor: `${color}18` }}><Stethoscope size={23} aria-hidden="true" /></span><span className={styles.cardCopy}><strong>{name}</strong>{specialty.count !== undefined ? <small>{t("doctorCount", { count: specialty.count })}</small> : null}</span><Arrow size={18} aria-hidden="true" /></Link>; })}</section>}
audit-work/source/nabd-patient-web/app/[locale]/consultations/specialties/specialties-ssr.test.ts:8:vi.mock("@/lib/api/specialties-server", () => ({ getPublicSpecialties: state.getPublicSpecialties }));
audit-work/source/nabd-patient-web/app/[locale]/consultations/doctors/page.tsx:5:import { extractDoctors } from "@/lib/api/doctors";
audit-work/source/nabd-patient-web/app/[locale]/consultations/doctors/page.tsx:6:import { getPublicDoctors } from "@/lib/api/doctors-server";
audit-work/source/nabd-patient-web/app/[locale]/consultations/doctors/page.tsx:15:  if (!response || !response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><Stethoscope size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link href={`/${locale}/consultations/doctors`} className={styles.action}>{t("retry")}</Link></section></main>;
audit-work/source/nabd-patient-web/app/[locale]/consultations/doctors/page.tsx:17:  return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1><p className={styles.subtitle}>{t("subtitle")}</p></div><span className={styles.heroIcon}><Stethoscope size={28} aria-hidden="true" /></span></section><form className={styles.search} method="get" role="search"><Search size={18} aria-hidden="true" /><label className="sr-only" htmlFor="doctor-search">{t("searchLabel")}</label><input id="doctor-search" name="q" defaultValue={sp.q ?? sp.specialty ?? ""} placeholder={t("searchPlaceholder")} /><button type="submit">{t("search")}</button></form><nav className={styles.sorts} aria-label={t("sortLabel")}>{([["rating", "sortRating"], ["price", "sortPrice"], ["wait", "sortWait"]] as const).map(([sort, key]) => <Link key={sort} href={`/${locale}/consultations/doctors?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : sp.specialty ? { specialty: sp.specialty } : {}), sort }).toString()}`} className={sp.sort === sort ? styles.sortActive : styles.sort}>{t(key)}</Link>)}</nav>{doctors.length === 0 ? <section className={styles.state}><Stethoscope size={26} aria-hidden="true" /><h2>{t("emptyTitle")}</h2><p>{t("emptyBody")}</p></section> : <section className={styles.grid} aria-label={t("title")}>{doctors.map((doctor) => <Link key={doctor.id} href={`/${locale}/consultations/doctors/${doctor.id}`} className={styles.card}><span className={styles.avatar}><Stethoscope size={21} aria-hidden="true" /></span><span className={styles.copy}><strong>{doctor.name ?? t("nameUnavailable")}</strong>{doctor.degree ? <small>{doctor.degree}</small> : null}{doctor.specialty ? <small>{doctor.specialty}</small> : null}<span className={styles.meta}>{doctor.rating !== undefined ? t("rating", { value: doctor.rating }) : null}{doctor.price !== undefined ? t("price", { value: doctor.price }) : null}</span></span><Arrow size={18} aria-hidden="true" /></Link>)}</section>}</main>;
audit-work/source/nabd-patient-web/app/[locale]/consultations/doctors/doctors-ssr.test.ts:2:const state=vi.hoisted(()=>({get:vi.fn()})); vi.mock("next-intl/server",()=>({getTranslations:async()=> (k:string)=>k,setRequestLocale:vi.fn()})); vi.mock("@/lib/i18n",()=>({isLocale:()=>true})); vi.mock("@/lib/api/doctors-server",()=>({getPublicDoctors:state.get})); vi.mock("next/navigation",()=>({notFound:vi.fn()})); import DoctorsPage from "./page";
audit-work/source/nabd-patient-web/app/[locale]/consultations/doctors/[doctorId]/page.tsx:5:import { extractDoctor, extractDoctorSlots } from "@/lib/api/doctors";
audit-work/source/nabd-patient-web/app/[locale]/consultations/doctors/[doctorId]/page.tsx:6:import { getPublicDoctor, getPublicDoctorSlots } from "@/lib/api/doctors-server";
audit-work/source/nabd-patient-web/app/[locale]/consultations/doctors/[doctorId]/page.tsx:18:  if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><Stethoscope size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link href={`/${locale}/consultations/doctors`} className={styles.action}>{t("retry")}</Link></section></main>;
audit-work/source/nabd-patient-web/app/[locale]/consultations/doctors/[doctorId]/page.tsx:21:  return <main className={`main ${styles.page}`}><Link href={`/${locale}/consultations/doctors`} className={styles.back}><Arrow size={17} aria-hidden="true" />{t("back")}</Link><article className={styles.detail}><div className={styles.detailIcon}><Stethoscope size={34} aria-hidden="true" /></div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{doctor.name ?? t("nameUnavailable")}</h1>{doctor.degree ? <p className={styles.detailLine}><BadgeCheck size={17} aria-hidden="true" />{doctor.degree}</p> : null}{doctor.specialty ? <p className={styles.detailLine}><Stethoscope size={17} aria-hidden="true" />{doctor.specialty}</p> : null}<div className={styles.facts}>{doctor.rating !== undefined ? <span><Star size={16} aria-hidden="true" /><strong>{t("rating", { value: doctor.rating })}</strong></span> : null}{doctor.experienceYears !== undefined ? <span><Clock3 size={16} aria-hidden="true" /><strong>{t("experience", { value: doctor.experienceYears })}</strong></span> : null}{doctor.facility ? <span><Building2 size={16} aria-hidden="true" />{doctor.facility}</span> : null}</div><section className={styles.slotPanel} aria-labelledby="slots-title"><h2 id="slots-title">{t("slotsTitle")}</h2><nav className={styles.slotTabs} aria-label={t("serviceTypeLabel")}>{serviceTypes.map((type) => <Link key={type} className={type === serviceType ? styles.sortActive : styles.sort} href={`/${locale}/consultations/doctors/${doctor.id}?date=${date}&service_type=${type}`}>{t(`service_${type}`)}</Link>)}</nav><p className={styles.slotDate}>{t("slotsForDate", { date })}</p>{slots?.slots.length ? <div className={styles.slotGrid}>{slots.slots.map((slot) => <span key={slot.start} className={slot.available ? styles.slotAvailable : styles.slotUnavailable} aria-label={slot.available ? t("available") : t("unavailable")}>{slot.label}</span>)}</div> : <p className={styles.notice}>{t(slots?.reason === "closed" ? "slotsClosed" : "slotsEmpty")}</p>}</section><p className={styles.notice}>{t("detailNotice")}</p>{slots?.slots.length ? <AppointmentBookingForm locale={locale} doctorId={doctor.id} serviceType={serviceType} slots={slots.slots} /> : null}</article></main>;
audit-work/source/nabd-patient-web/app/[locale]/settings/page.tsx:4:import { getPatientPrivacySettings, getPatientSecuritySettings, getPatientSessions, getPatientStorage } from "@/lib/api/settings-server";
audit-work/source/nabd-patient-web/app/[locale]/settings/page.tsx:5:import { parsePrivacySettings, parseSecuritySettings, parseSessions, parseStorageSummary } from "@/lib/api/settings";
audit-work/source/nabd-patient-web/app/[locale]/insurance/page.tsx:4:import { getPatientClaims } from "@/lib/api/claims-server";
audit-work/source/nabd-patient-web/app/[locale]/insurance/page.tsx:5:import { parseClaims } from "@/lib/api/claims";
audit-work/source/nabd-patient-web/app/[locale]/insurance/page.tsx:6:import { getPatientInsuranceBenefits, getPatientInsurancePolicy } from "@/lib/api/insurance-server";
audit-work/source/nabd-patient-web/app/[locale]/insurance/page.tsx:7:import { parseInsuranceSummary } from "@/lib/api/insurance";
audit-work/source/nabd-patient-web/components-next/locale-selector.tsx:5:  return <nav className="locale-selector" aria-label={label}>{locales.map((locale) => <Link key={locale} className={`locale-option${locale === current ? " locale-option-active" : ""}`} href={`/${locale}`} hrefLang={locale} lang={locale} aria-current={locale === current ? "page" : undefined}>{localeLabels[locale]}</Link>)}</nav>;
audit-work/source/nabd-patient-web/components-next/appointment-reschedule-form.tsx:13:  async function submit(){ if(busy)return; if(!scheduledAt){setError(labels.invalid);return;} setBusy(true);setError(null);try{const response=await fetch(`/api/appointments/${appointmentId}/reschedule`,{method:"PATCH",headers:{"content-type":"application/json","idempotency-key":key.current||crypto.randomUUID()},body:JSON.stringify({scheduled_at:new Date(scheduledAt).toISOString(),...(reason.trim()?{reason:reason.trim()}: {})})});if(!response.ok){setError(response.status===409?labels.conflict:labels.failed);return;}setOpen(false);router.refresh();}catch{setError(labels.unavailable)}finally{setBusy(false)}}
audit-work/source/nabd-patient-web/components-next/session-actions.tsx:16:    try { await fetch("/api/auth/logout", { method: "POST" }); }
audit-work/source/nabd-patient-web/components-next/session-actions.tsx:17:    finally { router.replace(`/${locale}`); router.refresh(); }
audit-work/source/nabd-patient-web/components-next/session-actions.tsx:21:    <Link className="header-account" href={`/${locale}/profile`}><UserRound size={17} aria-hidden="true" /><span>{accountLabel}</span></Link>
audit-work/source/nabd-patient-web/components-next/appointment-booking-form.tsx:20:      const response = await fetch("/api/appointments/book", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": idempotency.current || crypto.randomUUID() }, body: JSON.stringify({ doctor_id: doctorId, type: serviceType, slot_id: selected, ...(notes.trim() ? { notes: notes.trim() } : {}) }) });
audit-work/source/nabd-patient-web/components-next/appointment-booking-form.tsx:23:      if (payload.booking_id) { router.replace(`/${locale}/appointments/${payload.booking_id}`); router.refresh(); return; }
audit-work/source/nabd-patient-web/components-next/locale-selector.test.tsx:9:    for (const locale of ["ar", "en", "ur", "hi", "bn", "fil"]) expect(html).toContain(`href="/${locale}"`);
audit-work/source/nabd-patient-web/components-next/login-form.tsx:21:          const response = await fetch("/api/auth/otp/request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier }) });
audit-work/source/nabd-patient-web/components-next/login-form.tsx:25:        const verify = await fetch("/api/auth/otp/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, code }) });
audit-work/source/nabd-patient-web/components-next/login-form.tsx:27:        const exchange = await fetch("/api/auth/session/exchange", { method: "POST", headers: { "x-nabd-device-id": crypto.randomUUID() } });
audit-work/source/nabd-patient-web/components-next/login-form.tsx:29:        router.replace(`/${locale}/dashboard`); router.refresh(); return;
audit-work/source/nabd-patient-web/components-next/login-form.tsx:31:      const endpoint = twoFactor ? "/api/auth/verify-2fa" : "/api/auth/login";
audit-work/source/nabd-patient-web/components-next/login-form.tsx:33:      const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
audit-work/source/nabd-patient-web/components-next/login-form.tsx:37:      router.replace(`/${locale}/dashboard`); router.refresh();
audit-work/source/nabd-patient-web/components-next/call-token-launcher.tsx:11:  async function requestToken(){ if(state==="loading")return; setState("loading");setError(null);try{const response=await fetch(`/api/appointments/${appointmentId}/call-token`,{method:"GET",cache:"no-store",credentials:"same-origin"});const data=await response.json().catch(()=>null);if(!response.ok||!data?.token||data.provider!=="livekit"||!data.room){setState("error");setError(response.status===409?labels.notReady:labels.unavailable);return;}setCredential({provider:"livekit",token:data.token,room:data.room});setState("ready");}catch{setState("error");setError(labels.unavailable)}}
audit-work/source/nabd-patient-web/components-next/appointment-actions.tsx:12:  async function cancel() { if (busy) return; setBusy(true); setError(null); try { const response = await fetch(`/api/appointments/${appointmentId}/cancel`, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": key.current || crypto.randomUUID() }, body: JSON.stringify(reason.trim() ? { reason: reason.trim() } : {}) }); if (!response.ok) { setError(response.status === 409 ? t("cancelConflict") : t("cancelFailed")); return; } setOpen(false); router.refresh(); } catch { setError(t("cancelUnavailable")); } finally { setBusy(false); } }
audit-work/source/nabd-patient-web/lib/api/chronic-server.ts:1:import { callPatientApi } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/lib/api/sandbox-specialty-provider-count.test.ts:35:    const login = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }), signal: AbortSignal.timeout(12_000) });
audit-work/source/nabd-patient-web/lib/api/sandbox-specialty-provider-count.test.ts:41:    const specialtiesResponse = await fetch(`${baseUrl}/care/specialties`, { headers, signal: AbortSignal.timeout(12_000) });
audit-work/source/nabd-patient-web/lib/api/sandbox-specialty-provider-count.test.ts:42:    const doctorsResponse = await fetch(`${baseUrl}/care/doctors`, { headers, signal: AbortSignal.timeout(12_000) });
audit-work/source/nabd-patient-web/lib/api/sandbox-order-ownership.test.ts:16:  const response = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }) });
audit-work/source/nabd-patient-web/lib/api/sandbox-order-ownership.test.ts:32:    const ownerResponse = await fetch(`${baseUrl}/orders/${sandboxOrderId}`, { headers: { authorization: `Bearer ${ownerToken}` } });
audit-work/source/nabd-patient-web/lib/api/sandbox-order-ownership.test.ts:35:    const otherResponse = await fetch(`${baseUrl}/orders/${sandboxOrderId}`, { headers: { authorization: `Bearer ${otherToken}` } });
audit-work/source/nabd-patient-web/lib/api/doctors-server.ts:1:import { patientApiUrl } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/lib/api/doctors-server.ts:5:  try { return await fetch(patientApiUrl(doctorQuery(input)), { headers: { Accept: "application/json" }, cache: "no-store" }); } catch { return null; }
audit-work/source/nabd-patient-web/lib/api/doctors-server.ts:10:  try { return await fetch(patientApiUrl(`/care/doctors/${doctorId}`), { headers: { Accept: "application/json" }, cache: "no-store" }); } catch { return null; }
audit-work/source/nabd-patient-web/lib/api/doctors-server.ts:15:  try { return await fetch(patientApiUrl(doctorSlotsQuery(input)), { headers: { Accept: "application/json" }, cache: "no-store" }); } catch { return null; }
audit-work/source/nabd-patient-web/lib/api/claims-server.ts:1:import { callPatientApi } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/lib/api/response.ts:1:import { NextResponse } from "next/server";
audit-work/source/nabd-patient-web/lib/api/response.ts:2:export async function forwardApiResponse(upstream: Response) { const contentType = upstream.headers.get("content-type") || "application/json"; const body = await upstream.arrayBuffer(); return new NextResponse(body, { status: upstream.status, headers: { "content-type": contentType, "cache-control": "no-store" } }); }
audit-work/source/nabd-patient-web/lib/api/appointments-server.test.ts:4:vi.mock("@/lib/api/upstream", () => ({ callPatientApi }));
audit-work/source/nabd-patient-web/lib/api/sleep-server.ts:1:import { callPatientApi } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/lib/api/reminders-server.test.ts:4:vi.mock("@/lib/api/upstream", () => ({ callPatientApi }));
audit-work/source/nabd-patient-web/lib/api/notification-settings-server.ts:1:import { callPatientApi } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/lib/api/radiology-server.test.ts:3:vi.mock("@/lib/api/upstream", () => ({ callPatientApi: call }));
audit-work/source/nabd-patient-web/lib/api/public-medicines-server.ts:1:import { medicineQuery, parseMedicineId } from "@/lib/api/medicines";
audit-work/source/nabd-patient-web/lib/api/public-medicines-server.ts:2:import { patientApiUrl } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/lib/api/public-medicines-server.ts:14:    return await fetch(patientApiUrl(publicMedicinePath(medicineQuery(search))), {
audit-work/source/nabd-patient-web/lib/api/public-medicines-server.ts:26:    return await fetch(patientApiUrl(publicMedicinePath(`/medicines/${medicineId}/details`)), {
audit-work/source/nabd-patient-web/lib/api/vitals-server.ts:1:import { callPatientApi } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/lib/api/articles-server.ts:1:import { articleQuery, articleSlug } from "@/lib/api/articles";
audit-work/source/nabd-patient-web/lib/api/articles-server.ts:2:import { callPatientApi, patientApiUrl } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/lib/api/articles-server.ts:9:  try { return await fetch(patientApiUrl(articleQuery(query)), { headers: { Accept: "application/json" }, cache: "force-cache" }); } catch { return null; }
audit-work/source/nabd-patient-web/lib/api/articles-server.ts:12:  try { return await fetch(patientApiUrl("/articles/categories"), { headers: { Accept: "application/json" }, cache: "force-cache" }); } catch { return null; }
audit-work/source/nabd-patient-web/lib/api/articles-server.ts:16:  try { return await fetch(patientApiUrl(publicArticlePath(`/articles/${slug}`)), { headers: { Accept: "application/json" }, cache: "force-cache" }); } catch { return null; }
audit-work/source/nabd-patient-web/lib/api/mood-server.ts:1:import { callPatientApi } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/lib/api/notifications-server.test.ts:4:vi.mock("@/lib/api/upstream", () => ({ callPatientApi }));
audit-work/source/nabd-patient-web/lib/api/medicines-server.test.ts:4:vi.mock("@/lib/api/upstream", () => ({ callPatientApi }));
audit-work/source/nabd-patient-web/lib/api/appointments-server.ts:1:import { callPatientApi } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/lib/api/upstream.ts:1:const API_BASE_URL = (process.env.NABD_API_BASE_URL || "https://api.nabd.plus/api/v1").replace(/\/$/, "");
audit-work/source/nabd-patient-web/lib/api/upstream.ts:9:    return await fetch(patientApiUrl(path), { ...init, headers, cache: "no-store" });
audit-work/source/nabd-patient-web/lib/api/chronic-meds-server.ts:1:import { callPatientApi } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/lib/api/sandbox-appointments-contracts.test.ts:21:  const response = await fetch(`${baseUrl}/auth/login`, {
audit-work/source/nabd-patient-web/lib/api/sandbox-appointments-contracts.test.ts:42:    const listResponse = await fetch(`${baseUrl}/care/appointments`, { headers: { authorization: `Bearer ${ownerToken}` }, signal: AbortSignal.timeout(12_000) });
audit-work/source/nabd-patient-web/lib/api/sandbox-appointments-contracts.test.ts:47:    const ownerDetail = await fetch(`${baseUrl}/care/appointments/${appointmentId}`, { headers: { authorization: `Bearer ${ownerToken}` }, signal: AbortSignal.timeout(12_000) });
audit-work/source/nabd-patient-web/lib/api/sandbox-appointments-contracts.test.ts:49:    const otherDetail = await fetch(`${baseUrl}/care/appointments/${appointmentId}`, { headers: { authorization: `Bearer ${otherToken}` }, signal: AbortSignal.timeout(12_000) });
audit-work/source/nabd-patient-web/lib/api/diagnostics-server.ts:1:import type { DiagnosticDomain } from "@/lib/api/diagnostics";
audit-work/source/nabd-patient-web/lib/api/diagnostics-server.ts:2:import { callPatientApi } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/lib/api/prescriptions-server.test.ts:4:vi.mock("@/lib/api/upstream", () => ({ callPatientApi }));
audit-work/source/nabd-patient-web/lib/api/sandbox-family-contract.test.ts:14:  const response = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }), signal: AbortSignal.timeout(12_000) });
audit-work/source/nabd-patient-web/lib/api/sandbox-family-contract.test.ts:28:    const list = await fetch(`${baseUrl}/family/members`, { headers: { authorization: `Bearer ${ownerToken}` }, signal: AbortSignal.timeout(12_000) });
audit-work/source/nabd-patient-web/lib/api/sandbox-family-contract.test.ts:38:    const response = await fetch(`${baseUrl}/family/members`, { signal: AbortSignal.timeout(12_000) });
audit-work/source/nabd-patient-web/lib/api/mental-health-server.ts:1:import { callPatientApi } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/lib/api/dashboard-server.ts:1:import { callPatientApi } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/lib/api/family-group-server.ts:1:import { callPatientApi } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/lib/api/family-server.test.ts:4:vi.mock("@/lib/api/upstream", () => ({ callPatientApi }));
audit-work/source/nabd-patient-web/lib/api/breathing-server.ts:1:import { callPatientApi } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/lib/api/settings-server.ts:1:import { callPatientApi } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/lib/api/payments-server.ts:1:import { callPatientApi } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/lib/api/vitals-server.test.ts:4:vi.mock("@/lib/api/upstream", () => ({ callPatientApi }));
audit-work/source/nabd-patient-web/lib/api/family-server.ts:1:import { callPatientApi } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/lib/api/sandbox-medicines-contract.test.ts:9:    const response = await fetch(`${baseUrl}/medicines?limit=1`, { signal: AbortSignal.timeout(12_000) });
audit-work/source/nabd-patient-web/lib/api/sandbox-medicines-contract.test.ts:20:    const detail = await fetch(`${baseUrl}/medicines/${encodeURIComponent(id)}/details`, { signal: AbortSignal.timeout(12_000) });
audit-work/source/nabd-patient-web/lib/api/sandbox-medicines-contract.test.ts:24:    const search = await fetch(`${baseUrl}/medicines?limit=1&page=1&q=${encodeURIComponent(searchTerm)}`, { signal: AbortSignal.timeout(12_000) });
audit-work/source/nabd-patient-web/lib/api/sandbox-profile-contracts.test.ts:20:    const loginResponse = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }) });
audit-work/source/nabd-patient-web/lib/api/sandbox-profile-contracts.test.ts:26:        fetch(`${baseUrl}${path}`, { headers: { authorization: `Bearer ${token}` } })
audit-work/source/nabd-patient-web/lib/api/sandbox-profile-contracts.test.ts:40:      const response = await fetch(`${baseUrl}${path}`);
audit-work/source/nabd-patient-web/lib/api/sandbox-profile-contracts.test.ts:51:    const loginResponse = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }) });
audit-work/source/nabd-patient-web/lib/api/sandbox-profile-contracts.test.ts:63:      const response = await fetch(`${baseUrl}${path}`, { headers: { authorization: `Bearer ${token}` } });
audit-work/source/nabd-patient-web/lib/api/sandbox-profile-contracts.test.ts:77:    const loginResponse = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }) });
audit-work/source/nabd-patient-web/lib/api/sandbox-profile-contracts.test.ts:82:    const medicalResponse = await fetch(`${baseUrl}/medical-profile`, { headers: { authorization: `Bearer ${token}` } });
audit-work/source/nabd-patient-web/lib/api/sandbox-profile-contracts.test.ts:89:      const response = await fetch(`${baseUrl}${path}`, { headers: { authorization: `Bearer ${token}` } });
audit-work/source/nabd-patient-web/lib/api/diagnostics-server.test.ts:4:vi.mock("@/lib/api/upstream", () => ({ callPatientApi }));
audit-work/source/nabd-patient-web/lib/api/home-care-server.ts:1:import { callPatientApi } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/lib/api/reminders-server.ts:1:import { callPatientApi } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/lib/api/wishlist-server.ts:1:import { callPatientApi } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/lib/api/labs-server.ts:1:import { patientApiUrl } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/lib/api/labs-server.ts:13:  try { return await fetch(patientApiUrl(`/labs/packages/${packageId}`), { headers: { Accept: "application/json" }, cache: "no-store" }); } catch { return null; }
audit-work/source/nabd-patient-web/lib/api/labs-server.ts:28:  try { return await fetch(patientApiUrl(path), { headers: { Accept: "application/json" }, cache: "no-store" }); } catch { return null; }
audit-work/source/nabd-patient-web/lib/api/specialties-server.ts:1:import { patientApiUrl } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/lib/api/specialties-server.ts:11:    return await fetch(patientApiUrl(specialtiesPath("/care/specialties")), {
audit-work/source/nabd-patient-web/lib/api/sandbox-vitals-contract.test.ts:14:  const response = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }), signal: AbortSignal.timeout(12_000) });
audit-work/source/nabd-patient-web/lib/api/sandbox-vitals-contract.test.ts:28:    const response = await fetch(`${baseUrl}/health/vitals/summary`, { headers: { authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(12_000) });
audit-work/source/nabd-patient-web/lib/api/sandbox-vitals-contract.test.ts:38:    const response = await fetch(`${baseUrl}/health/vitals/summary`, { signal: AbortSignal.timeout(12_000) });
audit-work/source/nabd-patient-web/lib/api/prescriptions-server.ts:1:import { callPatientApi } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/lib/api/chat-server.test.ts:4:vi.mock("@/lib/api/upstream", () => ({ callPatientApi }));
audit-work/source/nabd-patient-web/lib/api/sandbox-secrets.test.ts:22:    const response = await fetch(`${baseUrl}/auth/login`, {
audit-work/source/nabd-patient-web/lib/api/trends-server.ts:1:import { callPatientApi } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/lib/api/sandbox-prescriptions-contract.test.ts:14:  const response = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }), signal: AbortSignal.timeout(12_000) });
audit-work/source/nabd-patient-web/lib/api/sandbox-prescriptions-contract.test.ts:28:    const response = await fetch(`${baseUrl}/prescriptions/mine`, { headers: { authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(12_000) });
audit-work/source/nabd-patient-web/lib/api/sandbox-prescriptions-contract.test.ts:38:    const response = await fetch(`${baseUrl}/prescriptions/mine`, { signal: AbortSignal.timeout(12_000) });
audit-work/source/nabd-patient-web/lib/api/chat-server.ts:1:import { callPatientApi } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/lib/api/labs-server.test.ts:5:vi.mock("@/lib/api/upstream", () => ({ patientApiUrl: (path: string) => `https://api.test${path}` }));
audit-work/source/nabd-patient-web/lib/api/sandbox-home-care-contract.test.ts:21:  const response = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }), signal: AbortSignal.timeout(12_000) });
audit-work/source/nabd-patient-web/lib/api/sandbox-home-care-contract.test.ts:36:    const list = await fetch(`${baseUrl}/home-care/bookings/my`, { headers: { authorization: `Bearer ${ownerToken}` }, signal: AbortSignal.timeout(12_000) });
audit-work/source/nabd-patient-web/lib/api/sandbox-home-care-contract.test.ts:40:    const ownerDetail = await fetch(`${baseUrl}/home-care/bookings/${encodeURIComponent(bookingId)}`, { headers: { authorization: `Bearer ${ownerToken}` }, signal: AbortSignal.timeout(12_000) });
audit-work/source/nabd-patient-web/lib/api/sandbox-home-care-contract.test.ts:42:    const otherDetail = await fetch(`${baseUrl}/home-care/bookings/${encodeURIComponent(bookingId)}`, { headers: { authorization: `Bearer ${otherToken}` }, signal: AbortSignal.timeout(12_000) });
audit-work/source/nabd-patient-web/lib/api/sandbox-reminders-contract.test.ts:14:  const response = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }), signal: AbortSignal.timeout(12_000) });
audit-work/source/nabd-patient-web/lib/api/sandbox-reminders-contract.test.ts:28:    const response = await fetch(`${baseUrl}/health/reminders`, { headers: { authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(12_000) });
audit-work/source/nabd-patient-web/lib/api/sandbox-reminders-contract.test.ts:38:    const response = await fetch(`${baseUrl}/health/reminders`, { signal: AbortSignal.timeout(12_000) });
audit-work/source/nabd-patient-web/lib/api/sandbox-chat-contract.test.ts:14:  const response = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }), signal: AbortSignal.timeout(12_000) });
audit-work/source/nabd-patient-web/lib/api/sandbox-chat-contract.test.ts:28:    const response = await fetch(`${baseUrl}/chat/threads`, { headers: { authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(12_000) });
audit-work/source/nabd-patient-web/lib/api/sandbox-chat-contract.test.ts:38:    const response = await fetch(`${baseUrl}/chat/threads`, { signal: AbortSignal.timeout(12_000) });
audit-work/source/nabd-patient-web/lib/api/insurance-server.ts:1:import { callPatientApi } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/lib/api/medicines-server.ts:1:import { medicineQuery } from "@/lib/api/medicines";
audit-work/source/nabd-patient-web/lib/api/medicines-server.ts:2:import { callPatientApi } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/lib/api/crisis-contacts-server.ts:1:import { callPatientApi } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/lib/api/home-care-server.test.ts:4:vi.mock("@/lib/api/upstream", () => ({ callPatientApi }));
audit-work/source/nabd-patient-web/lib/api/home-care-services-server.ts:1:import { patientApiUrl } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/lib/api/home-care-services-server.ts:13:  try { return await fetch(patientApiUrl(servicePath("/home-care/services")), { headers: { Accept: "application/json" }, cache: "no-store" }); } catch { return null; }
audit-work/source/nabd-patient-web/lib/api/home-care-services-server.ts:18:  try { return await fetch(patientApiUrl(servicePath(`/home-care/services/${serviceId}`)), { headers: { Accept: "application/json" }, cache: "no-store" }); } catch { return null; }
audit-work/source/nabd-patient-web/lib/api/sandbox-diagnostics-contracts.test.ts:21:  const response = await fetch(`${baseUrl}/auth/login`, {
audit-work/source/nabd-patient-web/lib/api/sandbox-diagnostics-contracts.test.ts:43:      const list = await fetch(`${baseUrl}/${domain}/bookings/mine`, { headers: { authorization: `Bearer ${ownerToken}` }, signal: AbortSignal.timeout(12_000) });
audit-work/source/nabd-patient-web/lib/api/sandbox-diagnostics-contracts.test.ts:48:      const ownerDetail = await fetch(`${baseUrl}/${domain}/bookings/${encodeURIComponent(resourceId)}`, { headers: { authorization: `Bearer ${ownerToken}` }, signal: AbortSignal.timeout(12_000) });
audit-work/source/nabd-patient-web/lib/api/sandbox-diagnostics-contracts.test.ts:50:      const otherDetail = await fetch(`${baseUrl}/${domain}/bookings/${encodeURIComponent(resourceId)}`, { headers: { authorization: `Bearer ${otherToken}` }, signal: AbortSignal.timeout(12_000) });
audit-work/source/nabd-patient-web/lib/api/emergency-contacts-server.ts:1:import { callPatientApi } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/lib/api/notifications-server.ts:1:import { callPatientApi } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/lib/api/sandbox-notifications-contract.test.ts:14:  const response = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, password }), signal: AbortSignal.timeout(12_000) });
audit-work/source/nabd-patient-web/lib/api/sandbox-notifications-contract.test.ts:29:    const list = await fetch(`${baseUrl}/notifications`, { headers, signal: AbortSignal.timeout(25_000) });
audit-work/source/nabd-patient-web/lib/api/sandbox-notifications-contract.test.ts:30:    const count = await fetch(`${baseUrl}/notifications/unread-count`, { headers, signal: AbortSignal.timeout(25_000) });
audit-work/source/nabd-patient-web/lib/api/sandbox-notifications-contract.test.ts:42:      fetch(`${baseUrl}/notifications`, { signal: AbortSignal.timeout(12_000) }),
audit-work/source/nabd-patient-web/lib/api/sandbox-notifications-contract.test.ts:43:      fetch(`${baseUrl}/notifications/unread-count`, { signal: AbortSignal.timeout(12_000) })
audit-work/source/nabd-patient-web/lib/api/meditation-server.ts:1:import { callPatientApi } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/lib/api/radiology-server.ts:1:import { callPatientApi } from "@/lib/api/upstream";
audit-work/source/nabd-patient-web/lib/auth/cookies.ts:1:import { NextResponse } from "next/server";
audit-work/source/nabd-patient-web/lib/auth/cookies.ts:6:export function setSessionCookies(response: NextResponse, tokens: TokenPair, deviceId: string) {
audit-work/source/nabd-patient-web/lib/auth/cookies.ts:11:export function clearSessionCookies(response: NextResponse) { for (const name of Object.values(authCookieNames)) response.cookies.set(name, "", { ...commonCookie, maxAge: 0 }); }

## nabd_plus_patient_app
audit-work/source/nabd_plus_patient_app/app/(auth)/_layout.tsx
audit-work/source/nabd_plus_patient_app/app/(auth)/forgot-password.tsx
audit-work/source/nabd_plus_patient_app/app/(auth)/login.tsx
audit-work/source/nabd_plus_patient_app/app/(auth)/otp.tsx
audit-work/source/nabd_plus_patient_app/app/(auth)/privacy.tsx
audit-work/source/nabd_plus_patient_app/app/(auth)/provider-info.tsx
audit-work/source/nabd_plus_patient_app/app/(auth)/register.tsx
audit-work/source/nabd_plus_patient_app/app/(auth)/reset-password.tsx
audit-work/source/nabd_plus_patient_app/app/(auth)/terms.tsx
audit-work/source/nabd_plus_patient_app/app/(auth)/welcome.tsx
audit-work/source/nabd_plus_patient_app/app/(onboarding)/_layout.tsx
audit-work/source/nabd_plus_patient_app/app/(onboarding)/index.tsx
audit-work/source/nabd_plus_patient_app/app/(onboarding)/language.tsx
audit-work/source/nabd_plus_patient_app/app/(onboarding)/permissions.tsx
audit-work/source/nabd_plus_patient_app/app/(tabs)/_layout.tsx
audit-work/source/nabd_plus_patient_app/app/(tabs)/consultations/index.tsx
audit-work/source/nabd_plus_patient_app/app/(tabs)/diagnostics.tsx
audit-work/source/nabd_plus_patient_app/app/(tabs)/health.tsx
audit-work/source/nabd_plus_patient_app/app/(tabs)/index.tsx
audit-work/source/nabd_plus_patient_app/app/(tabs)/nursing.tsx
audit-work/source/nabd_plus_patient_app/app/(tabs)/pharmacy.tsx
audit-work/source/nabd_plus_patient_app/app/(tabs)/services.tsx
audit-work/source/nabd_plus_patient_app/app/_layout.tsx
audit-work/source/nabd_plus_patient_app/app/ai/chat-doctor.tsx
audit-work/source/nabd_plus_patient_app/app/ai/monthly-report.tsx
audit-work/source/nabd_plus_patient_app/app/ai/prescription-translator.tsx
audit-work/source/nabd_plus_patient_app/app/ai/skin-analysis.tsx
audit-work/source/nabd_plus_patient_app/app/ai/symptom-checker.tsx
audit-work/source/nabd_plus_patient_app/app/ai/symptom-timeline.tsx
audit-work/source/nabd_plus_patient_app/app/ai/triage.tsx
audit-work/source/nabd_plus_patient_app/app/articles/[slug].tsx
audit-work/source/nabd_plus_patient_app/app/articles/bookmarks.tsx
audit-work/source/nabd_plus_patient_app/app/articles/index.tsx
audit-work/source/nabd_plus_patient_app/app/community/hub.tsx
audit-work/source/nabd_plus_patient_app/app/community/post-detail.tsx
audit-work/source/nabd_plus_patient_app/app/consultations/appointment-detail.tsx
audit-work/source/nabd_plus_patient_app/app/consultations/appointments.tsx
audit-work/source/nabd_plus_patient_app/app/consultations/booking-confirm.tsx
audit-work/source/nabd_plus_patient_app/app/consultations/booking-pending.tsx
audit-work/source/nabd_plus_patient_app/app/consultations/booking-success.tsx
audit-work/source/nabd_plus_patient_app/app/consultations/call-history.tsx
audit-work/source/nabd_plus_patient_app/app/consultations/cancel-reschedule.tsx
audit-work/source/nabd_plus_patient_app/app/consultations/chat-with-doctor.tsx
audit-work/source/nabd_plus_patient_app/app/consultations/clinic-confirm.tsx
audit-work/source/nabd_plus_patient_app/app/consultations/clinic-location.tsx
audit-work/source/nabd_plus_patient_app/app/consultations/doctor-profile.tsx
audit-work/source/nabd_plus_patient_app/app/consultations/doctor-search.tsx
audit-work/source/nabd_plus_patient_app/app/consultations/follow-up.tsx
audit-work/source/nabd_plus_patient_app/app/consultations/home-visit-tracking.tsx
audit-work/source/nabd_plus_patient_app/app/consultations/incoming-call.tsx
audit-work/source/nabd_plus_patient_app/app/consultations/post-call-rating.tsx
audit-work/source/nabd_plus_patient_app/app/consultations/prescription-from-doctor.tsx
audit-work/source/nabd_plus_patient_app/app/consultations/share-report.tsx
audit-work/source/nabd_plus_patient_app/app/consultations/specialty-select.tsx
audit-work/source/nabd_plus_patient_app/app/consultations/summary.tsx
audit-work/source/nabd_plus_patient_app/app/consultations/video-call.tsx
audit-work/source/nabd_plus_patient_app/app/consultations/virtual-waiting-room.tsx
audit-work/source/nabd_plus_patient_app/app/consultations/waiting-room.tsx
audit-work/source/nabd_plus_patient_app/app/delivery/address-select.tsx
audit-work/source/nabd_plus_patient_app/app/diagnostics/book-sample.tsx
audit-work/source/nabd_plus_patient_app/app/diagnostics/booking-confirm.tsx
audit-work/source/nabd_plus_patient_app/app/diagnostics/booking-success.tsx
audit-work/source/nabd_plus_patient_app/app/diagnostics/cart.tsx
audit-work/source/nabd_plus_patient_app/app/diagnostics/checkout.tsx
audit-work/source/nabd_plus_patient_app/app/diagnostics/insurance-approval.tsx
audit-work/source/nabd_plus_patient_app/app/diagnostics/insurance-upload.tsx
audit-work/source/nabd_plus_patient_app/app/diagnostics/lab-comparison.tsx
audit-work/source/nabd_plus_patient_app/app/diagnostics/my-results.tsx
audit-work/source/nabd_plus_patient_app/app/diagnostics/orders.tsx
audit-work/source/nabd_plus_patient_app/app/diagnostics/package-detail.tsx
audit-work/source/nabd_plus_patient_app/app/diagnostics/packages.tsx
audit-work/source/nabd_plus_patient_app/app/diagnostics/results-history.tsx
audit-work/source/nabd_plus_patient_app/app/diagnostics/sample-tracking.tsx
audit-work/source/nabd_plus_patient_app/app/diagnostics/search.tsx
audit-work/source/nabd_plus_patient_app/app/diagnostics/technician-tracking.tsx
audit-work/source/nabd_plus_patient_app/app/diagnostics/test-detail.tsx
audit-work/source/nabd_plus_patient_app/app/diagnostics/upload-rx.tsx
audit-work/source/nabd_plus_patient_app/app/drug-scanner/index.tsx
audit-work/source/nabd_plus_patient_app/app/emergency/index.tsx
audit-work/source/nabd_plus_patient_app/app/emergency/sos-active.tsx
audit-work/source/nabd_plus_patient_app/app/emergency/sos.tsx
audit-work/source/nabd_plus_patient_app/app/emergency/tracking.tsx
audit-work/source/nabd_plus_patient_app/app/family/calendar.tsx
audit-work/source/nabd_plus_patient_app/app/family/chat.tsx
audit-work/source/nabd_plus_patient_app/app/family/emergency-contacts.tsx
audit-work/source/nabd_plus_patient_app/app/family/hub.tsx
audit-work/source/nabd_plus_patient_app/app/family/index.tsx
audit-work/source/nabd_plus_patient_app/app/family/invite.tsx
audit-work/source/nabd_plus_patient_app/app/family/join.tsx
audit-work/source/nabd_plus_patient_app/app/family/member-health.tsx
audit-work/source/nabd_plus_patient_app/app/family/permission-request.tsx
audit-work/source/nabd_plus_patient_app/app/family/permissions.tsx
audit-work/source/nabd_plus_patient_app/app/family/scan.tsx
audit-work/source/nabd_plus_patient_app/app/family/shared-calendar.tsx
audit-work/source/nabd_plus_patient_app/app/health/actionable-order.tsx
audit-work/source/nabd_plus_patient_app/app/health/add-family-member.tsx
audit-work/source/nabd_plus_patient_app/app/health/chronic-disease.tsx
audit-work/source/nabd_plus_patient_app/app/health/chronic-medications.tsx
audit-work/source/nabd_plus_patient_app/app/health/conditions-allergies.tsx
audit-work/source/nabd_plus_patient_app/app/health/edit-profile.tsx
audit-work/source/nabd_plus_patient_app/app/health/emergency-contacts.tsx
audit-work/source/nabd_plus_patient_app/app/health/family-calendar.tsx
audit-work/source/nabd_plus_patient_app/app/health/family-chat.tsx
audit-work/source/nabd_plus_patient_app/app/health/family-hub.tsx
audit-work/source/nabd_plus_patient_app/app/health/family-member-detail.tsx
audit-work/source/nabd_plus_patient_app/app/health/health-id.tsx
audit-work/source/nabd_plus_patient_app/app/health/medication-reminder-add.tsx
audit-work/source/nabd_plus_patient_app/app/health/medication-reminder-list.tsx
audit-work/source/nabd_plus_patient_app/app/health/medications.tsx
audit-work/source/nabd_plus_patient_app/app/health/prescriptions.tsx
audit-work/source/nabd_plus_patient_app/app/health/refills.tsx
audit-work/source/nabd_plus_patient_app/app/health/reminders.tsx
audit-work/source/nabd_plus_patient_app/app/health/reports.tsx
audit-work/source/nabd_plus_patient_app/app/health/sleep-score.tsx
audit-work/source/nabd_plus_patient_app/app/health/sleep-tracker.tsx
audit-work/source/nabd_plus_patient_app/app/health/smart-reminders.tsx
audit-work/source/nabd_plus_patient_app/app/health/trends.tsx
audit-work/source/nabd_plus_patient_app/app/health/vitals-log.tsx
audit-work/source/nabd_plus_patient_app/app/health/vitals.tsx
audit-work/source/nabd_plus_patient_app/app/health/wearables.tsx
audit-work/source/nabd_plus_patient_app/app/index.tsx
audit-work/source/nabd_plus_patient_app/app/insurance/add-policy.tsx
audit-work/source/nabd_plus_patient_app/app/insurance/approval-pending.tsx
audit-work/source/nabd_plus_patient_app/app/insurance/benefits-summary.tsx
audit-work/source/nabd_plus_patient_app/app/insurance/claim-tracking.tsx
audit-work/source/nabd_plus_patient_app/app/insurance/copay.tsx
audit-work/source/nabd_plus_patient_app/app/insurance/coverage-check.tsx
audit-work/source/nabd_plus_patient_app/app/insurance/hub.tsx
audit-work/source/nabd_plus_patient_app/app/insurance/index.tsx
audit-work/source/nabd_plus_patient_app/app/insurance/network-providers.tsx
audit-work/source/nabd_plus_patient_app/app/insurance/payment-split.tsx
audit-work/source/nabd_plus_patient_app/app/insurance/policy-detail.tsx
audit-work/source/nabd_plus_patient_app/app/insurance/refund-status.tsx
audit-work/source/nabd_plus_patient_app/app/insurance/submit-claim.tsx
audit-work/source/nabd_plus_patient_app/app/loyalty/challenges.tsx
audit-work/source/nabd_plus_patient_app/app/loyalty/hub.tsx
audit-work/source/nabd_plus_patient_app/app/loyalty/leaderboard.tsx
audit-work/source/nabd_plus_patient_app/app/loyalty/referrals.tsx
audit-work/source/nabd_plus_patient_app/app/loyalty/rewards.tsx
audit-work/source/nabd_plus_patient_app/app/map/index.tsx
audit-work/source/nabd_plus_patient_app/app/maternity/baby-development.tsx
audit-work/source/nabd_plus_patient_app/app/maternity/baby-growth.tsx
audit-work/source/nabd_plus_patient_app/app/maternity/fetus-data.ts
audit-work/source/nabd_plus_patient_app/app/maternity/hub.tsx
audit-work/source/nabd_plus_patient_app/app/maternity/maternity-setup.tsx
audit-work/source/nabd_plus_patient_app/app/maternity/ovulation-tracker.tsx
audit-work/source/nabd_plus_patient_app/app/maternity/pregnancy-tracker.tsx
audit-work/source/nabd_plus_patient_app/app/mental-health/breathing.tsx
audit-work/source/nabd_plus_patient_app/app/mental-health/crisis-support.tsx
audit-work/source/nabd_plus_patient_app/app/mental-health/hub.tsx
audit-work/source/nabd_plus_patient_app/app/mental-health/index.tsx
audit-work/source/nabd_plus_patient_app/app/mental-health/meditation.tsx
audit-work/source/nabd_plus_patient_app/app/mental-health/mood-journal.tsx
audit-work/source/nabd_plus_patient_app/app/mental-health/self-assessment.tsx
audit-work/source/nabd_plus_patient_app/app/mental-health/therapist-match.tsx
audit-work/source/nabd_plus_patient_app/app/notifications/index.tsx
audit-work/source/nabd_plus_patient_app/app/nursing/live-tracking.tsx
audit-work/source/nabd_plus_patient_app/app/nursing/nurse-profile.tsx
audit-work/source/nabd_plus_patient_app/app/nursing/service-details.tsx
audit-work/source/nabd_plus_patient_app/app/nursing/service-info.tsx
audit-work/source/nabd_plus_patient_app/app/nutrition/ai-meal-planner.tsx
audit-work/source/nabd_plus_patient_app/app/nutrition/ai-plan-builder.tsx
audit-work/source/nabd_plus_patient_app/app/nutrition/body-composition.tsx
audit-work/source/nabd_plus_patient_app/app/nutrition/body-target.tsx
audit-work/source/nabd_plus_patient_app/app/nutrition/calorie-analyzer.tsx
audit-work/source/nabd_plus_patient_app/app/nutrition/daily-tracker.tsx
audit-work/source/nabd_plus_patient_app/app/nutrition/exercise-plan.tsx
audit-work/source/nabd_plus_patient_app/app/nutrition/food-scanner.tsx
audit-work/source/nabd_plus_patient_app/app/nutrition/hub.tsx
audit-work/source/nabd_plus_patient_app/app/nutrition/index.tsx
audit-work/source/nabd_plus_patient_app/app/nutrition/log-meal.tsx
audit-work/source/nabd_plus_patient_app/app/nutrition/nutrition-plan.tsx
audit-work/source/nabd_plus_patient_app/app/nutrition/water-tracker.tsx
audit-work/source/nabd_plus_patient_app/app/offers/[id].tsx
audit-work/source/nabd_plus_patient_app/app/offers/index.tsx
audit-work/source/nabd_plus_patient_app/app/orders/index.tsx
audit-work/source/nabd_plus_patient_app/app/payments/failed.tsx
audit-work/source/nabd_plus_patient_app/app/payments/failure.tsx
audit-work/source/nabd_plus_patient_app/app/payments/processing.tsx
audit-work/source/nabd_plus_patient_app/app/payments/success.tsx
audit-work/source/nabd_plus_patient_app/app/pharmacy/barcode-scanner.tsx
audit-work/source/nabd_plus_patient_app/app/pharmacy/broadcast-status.tsx
audit-work/source/nabd_plus_patient_app/app/pharmacy/cart.tsx
audit-work/source/nabd_plus_patient_app/app/pharmacy/chat-with-pharmacist.tsx
audit-work/source/nabd_plus_patient_app/app/pharmacy/checkout.tsx
audit-work/source/nabd_plus_patient_app/app/pharmacy/custom-item.tsx
audit-work/source/nabd_plus_patient_app/app/pharmacy/drug-not-found.tsx
audit-work/source/nabd_plus_patient_app/app/pharmacy/filters.tsx
audit-work/source/nabd_plus_patient_app/app/pharmacy/manual-order.tsx
audit-work/source/nabd_plus_patient_app/app/pharmacy/medicine-compare.tsx
audit-work/source/nabd_plus_patient_app/app/pharmacy/order-confirm.tsx
audit-work/source/nabd_plus_patient_app/app/pharmacy/order-history.tsx
audit-work/source/nabd_plus_patient_app/app/pharmacy/order-tracking.tsx
audit-work/source/nabd_plus_patient_app/app/pharmacy/payment.tsx
audit-work/source/nabd_plus_patient_app/app/pharmacy/pharmacist-chat.tsx
audit-work/source/nabd_plus_patient_app/app/pharmacy/product-detail.tsx
audit-work/source/nabd_plus_patient_app/app/pharmacy/product-search.tsx
audit-work/source/nabd_plus_patient_app/app/pharmacy/reorder.tsx
audit-work/source/nabd_plus_patient_app/app/pharmacy/rx-order.tsx
audit-work/source/nabd_plus_patient_app/app/pharmacy/scan-prescription.tsx
audit-work/source/nabd_plus_patient_app/app/pharmacy/waiting-for-pharmacy.tsx
audit-work/source/nabd_plus_patient_app/app/pharmacy/wishlist.tsx
audit-work/source/nabd_plus_patient_app/app/profile/addresses.tsx
audit-work/source/nabd_plus_patient_app/app/profile/edit.tsx
audit-work/source/nabd_plus_patient_app/app/profile/index.tsx
audit-work/source/nabd_plus_patient_app/app/profile/insurance.tsx
audit-work/source/nabd_plus_patient_app/app/programs/active.tsx
audit-work/source/nabd_plus_patient_app/app/reports/ai-analysis.tsx
audit-work/source/nabd_plus_patient_app/app/reports/hub.tsx
audit-work/source/nabd_plus_patient_app/app/reports/passport.tsx
audit-work/source/nabd_plus_patient_app/app/reports/timeline.tsx
audit-work/source/nabd_plus_patient_app/app/reports/view-report.tsx
audit-work/source/nabd_plus_patient_app/app/returns/detail.tsx
audit-work/source/nabd_plus_patient_app/app/returns/hub.tsx
audit-work/source/nabd_plus_patient_app/app/returns/new-request.tsx
audit-work/source/nabd_plus_patient_app/app/reviews/index.tsx
audit-work/source/nabd_plus_patient_app/app/room/[id].tsx
audit-work/source/nabd_plus_patient_app/app/search/index.tsx
audit-work/source/nabd_plus_patient_app/app/services/index.tsx
audit-work/source/nabd_plus_patient_app/app/settings/about.tsx
audit-work/source/nabd_plus_patient_app/app/settings/data.tsx
audit-work/source/nabd_plus_patient_app/app/settings/feedback.tsx
audit-work/source/nabd_plus_patient_app/app/settings/help.tsx
audit-work/source/nabd_plus_patient_app/app/settings/index.tsx
audit-work/source/nabd_plus_patient_app/app/settings/language.tsx
audit-work/source/nabd_plus_patient_app/app/settings/notifications-settings.tsx
audit-work/source/nabd_plus_patient_app/app/settings/notifications.tsx
audit-work/source/nabd_plus_patient_app/app/settings/privacy.tsx
audit-work/source/nabd_plus_patient_app/app/settings/security.tsx
audit-work/source/nabd_plus_patient_app/app/settings/support-chat.tsx
audit-work/source/nabd_plus_patient_app/app/settings/terms.tsx
audit-work/source/nabd_plus_patient_app/app/shared/location-picker.tsx
audit-work/source/nabd_plus_patient_app/app/support/chat.tsx
audit-work/source/nabd_plus_patient_app/app/support/ticket.tsx
audit-work/source/nabd_plus_patient_app/app/voice/index.tsx
audit-work/source/nabd_plus_patient_app/app/wallet/cards.tsx
audit-work/source/nabd_plus_patient_app/app/wallet/hub.tsx
audit-work/source/nabd_plus_patient_app/app/wallet/topup.tsx
audit-work/source/nabd_plus_patient_app/app/wallet/transactions.tsx
audit-work/source/nabd_plus_patient_app/app/wallet/transfer.tsx
audit-work/source/nabd_plus_patient_app/app/wearables/hub.tsx
audit-work/source/nabd_plus_patient_app/src/constants/index.ts
audit-work/source/nabd_plus_patient_app/src/core/config/index.ts
audit-work/source/nabd_plus_patient_app/src/core/data/index.ts
audit-work/source/nabd_plus_patient_app/src/core/domain/dtos/index.ts
audit-work/source/nabd_plus_patient_app/src/core/domain/entities/index.ts
audit-work/source/nabd_plus_patient_app/src/core/domain/errors/index.ts
audit-work/source/nabd_plus_patient_app/src/core/domain/pagination/index.ts
audit-work/source/nabd_plus_patient_app/src/core/domain/specifications/index.ts
audit-work/source/nabd_plus_patient_app/src/core/domain/value-objects/index.ts
audit-work/source/nabd_plus_patient_app/src/core/platform/user/index.ts
audit-work/source/nabd_plus_patient_app/src/design-system/index.ts
audit-work/source/nabd_plus_patient_app/src/guided-tour/index.ts
audit-work/source/nabd_plus_patient_app/src/guided-tour/types/index.ts
audit-work/source/nabd_plus_patient_app/src/i18n/index.ts
audit-work/source/nabd_plus_patient_app/src/navigation/index.ts
audit-work/source/nabd_plus_patient_app/src/services/auth/index.ts
audit-work/source/nabd_plus_patient_app/src/services/index.ts
audit-work/source/nabd_plus_patient_app/src/store/index.ts
audit-work/source/nabd_plus_patient_app/src/theme/index.ts
audit-work/source/nabd_plus_patient_app/src/types/index.ts
audit-work/source/nabd_plus_patient_app/src/constants/index.ts:7:  ?? (process.env.EXPO_PUBLIC_API_URL ? `${process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '')}/api/v1` : 'https://api.nabd.plus/api/v1');
audit-work/source/nabd_plus_patient_app/src/data/repositories/RepositoryCoordinator.ts:55:    this.registerFeatureRepository('users', '/api/v1/users', dbManager);
audit-work/source/nabd_plus_patient_app/src/navigation/guards/AuthGuard.tsx:25:        router.replace('/(auth)/login');
audit-work/source/nabd_plus_patient_app/src/navigation/guards/AuthGuard.tsx:28:        router.replace('/');
audit-work/source/nabd_plus_patient_app/src/features/consultation/InsuranceCopayScreen.tsx:17:      <TouchableOpacity style={styles.payBtn} onPress={() => navigation.navigate('PaymentGateway')}>
audit-work/source/nabd_plus_patient_app/src/__tests__/utils/testUtils.ts:18:  apiBaseUrl:       'http://localhost:8002/api/v1',
audit-work/source/nabd_plus_patient_app/src/services/HttpClient.ts:1:import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
audit-work/source/nabd_plus_patient_app/src/services/HttpClient.ts:7:    ? `${process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '')}/api/v1`
audit-work/source/nabd_plus_patient_app/src/services/HttpClient.ts:8:    : 'https://api.nabd.plus/api/v1';
audit-work/source/nabd_plus_patient_app/src/services/HttpClient.ts:10:export const HttpClient = axios.create({
audit-work/source/nabd_plus_patient_app/src/hooks/useGuestGuard.tsx:59:            onPress: () => router.push('/(auth)/login'),
audit-work/source/nabd_plus_patient_app/src/hooks/useGuestGuard.tsx:64:            onPress: () => router.push('/(auth)/register'),
audit-work/source/nabd_plus_patient_app/src/hooks/usePushNotifications.ts:87:        router.push({ pathname: translated.pathname as any, params: { ...(translated.params || {}), ...(params || {}) } } as any);
audit-work/source/nabd_plus_patient_app/src/hooks/usePushNotifications.ts:90:        router.push('/notifications/index' as any);
audit-work/source/nabd_plus_patient_app/src/hooks/usePushNotifications.ts:98:        router.push({ pathname: '/consultations/chat-with-doctor', params: { doctorId: data.senderId, doctorName: data.senderName } } as any);
audit-work/source/nabd_plus_patient_app/src/hooks/usePushNotifications.ts:102:        router.push('/consultations/appointments' as any);
audit-work/source/nabd_plus_patient_app/src/hooks/usePushNotifications.ts:108:        router.push({ pathname: '/pharmacy/order-tracking', params: { orderId: data.order_id || data.orderId } } as any);
audit-work/source/nabd_plus_patient_app/src/hooks/usePushNotifications.ts:113:        router.push('/consultations/appointments' as any);
audit-work/source/nabd_plus_patient_app/src/hooks/usePushNotifications.ts:116:        router.push('/pharmacy/cart' as any);
audit-work/source/nabd_plus_patient_app/src/hooks/usePushNotifications.ts:122:        router.push('/diagnostics/my-results' as any);
audit-work/source/nabd_plus_patient_app/src/hooks/usePushNotifications.ts:127:        router.push({ pathname: '/nursing/live-tracking', params: { type: 'nurse', bookingId: data.bookingId || data.booking_id } } as any);
audit-work/source/nabd_plus_patient_app/src/hooks/usePushNotifications.ts:130:        router.push('/nursing/service-details' as any);
audit-work/source/nabd_plus_patient_app/src/hooks/usePushNotifications.ts:134:        router.push('/returns/hub' as any);
audit-work/source/nabd_plus_patient_app/src/hooks/usePushNotifications.ts:137:        router.push('/insurance/hub' as any);
audit-work/source/nabd_plus_patient_app/src/hooks/usePushNotifications.ts:140:        router.push('/family/hub' as any);
audit-work/source/nabd_plus_patient_app/src/hooks/usePushNotifications.ts:144:        router.push('/wallet/hub' as any);
audit-work/source/nabd_plus_patient_app/src/hooks/usePushNotifications.ts:148:        router.push('/health/medication-reminder-list' as any);
audit-work/source/nabd_plus_patient_app/src/hooks/usePushNotifications.ts:153:        router.push('/loyalty/hub' as any);
audit-work/source/nabd_plus_patient_app/src/hooks/usePushNotifications.ts:158:        router.push('/emergency/tracking' as any);
audit-work/source/nabd_plus_patient_app/src/hooks/usePushNotifications.ts:166:            router.push({ pathname: translated.pathname as any, params: { ...(translated.params || {}), ...(action.payload || {}) } } as any);
audit-work/source/nabd_plus_patient_app/src/hooks/usePushNotifications.ts:168:            router.push('/notifications/index' as any);
audit-work/source/nabd_plus_patient_app/src/utils/callkeep.ts:63:      router.push({
audit-work/source/nabd_plus_patient_app/src/utils/callkeep.ts:89:    router.push({
audit-work/source/nabd_plus_patient_app/src/utils/callkeep.ts:110:    router.push({
audit-work/source/nabd_plus_patient_app/src/utils/prefetch.ts:28:  Image.prefetch(valid, 'memory-disk').catch(() => {});
audit-work/source/nabd_plus_patient_app/src/utils/imageUrl.ts:12:  BASE_URL.replace('/api/v1', '');
audit-work/source/nabd_plus_patient_app/src/utils/api.ts:70:      return await fetch(url, { ...options, headers, signal: ctrl.signal });
audit-work/source/nabd_plus_patient_app/src/core/config/ConfigManager.ts:49:    apiBaseUrl:         process.env.EXPO_PUBLIC_API_BASE_URL    ?? 'http://localhost:8002/api/v1',
audit-work/source/nabd_plus_patient_app/src/core/config/ConfigManager.ts:59:    apiBaseUrl:         process.env.EXPO_PUBLIC_API_BASE_URL    ?? 'https://staging-api.nabdahplus.com/api/v1',
audit-work/source/nabd_plus_patient_app/src/core/config/ConfigManager.ts:69:    apiBaseUrl:         process.env.EXPO_PUBLIC_API_BASE_URL    ?? 'https://api.nabd.plus/api/v1',
audit-work/source/nabd_plus_patient_app/src/core/config/ConfigManager.ts:70:    fastapiBaseUrl:     process.env.EXPO_PUBLIC_FASTAPI_BASE_URL ?? 'https://api.nabd.plus/api/v1',
audit-work/source/nabd_plus_patient_app/src/core/platform/auth/SessionManager.ts:77:    const res = await fetch(`${BASE_URL}/auth/refresh`, {
audit-work/source/nabd_plus_patient_app/src/core/platform/realtime/RealtimeClient.ts:31:    const cleanUrl = baseUrl.replace('/api/v1', '').replace('/api', '');
audit-work/source/nabd_plus_patient_app/src/guided-tour/engines/AnalyticsCollector.ts:26:    // POST /api/v1/tours/analytics/events
audit-work/source/nabd_plus_patient_app/src/store/index.ts:22:import { baseApi } from './api/baseApi';
audit-work/source/nabd_plus_patient_app/src/store/integration/EventBusIntegrator.ts:4:import { baseApi } from '../api/baseApi';
audit-work/source/nabd_plus_patient_app/src/store/middleware/memoryManager.ts:2:import { baseApi } from '../api/baseApi';
audit-work/source/nabd_plus_patient_app/src/components/Header.tsx:131:            onPress={() => router.push('/notifications')}
audit-work/source/nabd_plus_patient_app/src/components/Header.tsx:137:          <TouchableOpacity onPress={() => router.push('/profile')} style={styles.avatarBtn}>
audit-work/source/nabd_plus_patient_app/src/components/BottomNavBar.tsx:30:    router.push(screen);
audit-work/source/nabd_plus_patient_app/src/components/NotificationHandler.tsx:99:        router.push({ pathname: data.screen as any, params: (data.params as any) || {} });
audit-work/source/nabd_plus_patient_app/src/components/NotificationHandler.tsx:104:        router.push({ pathname: legacy.pathname as any, params: legacy.params });
audit-work/source/nabd_plus_patient_app/src/components/NotificationHandler.tsx:108:      router.push('/notifications' as any);
audit-work/source/nabd_plus_patient_app/src/context/AppContext.tsx:77:      const res = await fetch(`${appConfig.apiBaseUrl}/config`);
audit-work/source/nabd_plus_patient_app/src/context/SocketContext.tsx:144:        // because router.push inside this pure context can sometimes miss the navigation tree
audit-work/source/nabd_plus_patient_app/app/index.tsx:29:        router.replace("/(auth)/welcome");
audit-work/source/nabd_plus_patient_app/app/index.tsx:31:        router.replace("/(tabs)");
audit-work/source/nabd_plus_patient_app/app/index.tsx:34:      router.replace("/(auth)/welcome");
audit-work/source/nabd_plus_patient_app/app/ai-assistant.tsx:135:            onPress={() => router.push('/ai/prescription-translator')}
audit-work/source/nabd_plus_patient_app/app/support/ticket.tsx:44:          onPress={() => router.push("/support/chat")}
audit-work/source/nabd_plus_patient_app/app/support/ticket.tsx:69:              onPress={() => router.push("/support/chat")}
audit-work/source/nabd_plus_patient_app/app/community/hub.tsx:172:                router.push({
audit-work/source/nabd_plus_patient_app/app/reports/hub.tsx:179:                  router.push({
audit-work/source/nabd_plus_patient_app/app/reports/hub.tsx:238:                      router.push({
audit-work/source/nabd_plus_patient_app/app/reports/hub.tsx:251:                      router.push({
audit-work/source/nabd_plus_patient_app/app/reports/timeline.tsx:89:          onPress={() => router.push("/reports/passport" as any)}
audit-work/source/nabd_plus_patient_app/app/reports/view-report.tsx:246:            router.push({ pathname: "/reports/ai-analysis", params: { id: report.id } })
audit-work/source/nabd_plus_patient_app/app/profile/index.tsx:34:    router.replace('/(auth)/welcome');
audit-work/source/nabd_plus_patient_app/app/profile/index.tsx:61:          {!isGuest && <IconButton icon="edit" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.push('/health/edit-profile')} />}
audit-work/source/nabd_plus_patient_app/app/profile/index.tsx:95:                  router.push(item.route as any);
audit-work/source/nabd_plus_patient_app/app/offers/index.tsx:59:            <TouchableOpacity key={o.id || i} activeOpacity={0.85} onPress={() => o.id && router.push(`/offers/${o.id}`)}>
audit-work/source/nabd_plus_patient_app/app/offers/[id].tsx:62:      router.push({ pathname: '/consultations/book/[id]', params: { id: p.id } } as any);
audit-work/source/nabd_plus_patient_app/app/loyalty/hub.tsx:113:            <IconButton icon="info" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.push('/loyalty/leaderboard')} />
audit-work/source/nabd_plus_patient_app/app/loyalty/hub.tsx:114:            <IconButton icon="redeem" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.push('/loyalty/rewards')} />
audit-work/source/nabd_plus_patient_app/app/loyalty/hub.tsx:268:              onPress={() => router.push('/loyalty/rewards')}
audit-work/source/nabd_plus_patient_app/app/ai/monthly-report.tsx:105:            <TouchableOpacity onPress={() => router.replace('/ai/monthly-report')} style={[styles.primaryBtn, { backgroundColor: colors.primary }]}><AppText variant="bodySM" color="#fff">إعادة المحاولة</AppText></TouchableOpacity>
audit-work/source/nabd_plus_patient_app/app/ai/monthly-report.tsx:115:            <TouchableOpacity onPress={() => router.push('/health/vitals-log')} style={[styles.primaryBtn, { backgroundColor: colors.primary }]}>
audit-work/source/nabd_plus_patient_app/app/ai/monthly-report.tsx:191:                      <TouchableOpacity onPress={() => router.push('/health/trends')} style={[styles.recBox, { backgroundColor: colors.primary + '10' }]}>
audit-work/source/nabd_plus_patient_app/app/ai/monthly-report.tsx:229:          <TouchableOpacity onPress={() => router.push('/health/trends')} style={[styles.primaryBtn, { backgroundColor: colors.primary }]}>
audit-work/source/nabd_plus_patient_app/app/ai/monthly-report.tsx:232:          <TouchableOpacity onPress={() => router.push('/(tabs)/consultations')}
audit-work/source/nabd_plus_patient_app/app/ai/skin-analysis.tsx:45:    return <View style={[styles.container, { backgroundColor: colors.background }]}><View style={[styles.header, { backgroundColor: clinical ? '#9A3412' : '#0F766E', paddingTop: insets.top + 12 }]}><TouchableOpacity onPress={reset} style={styles.backButton}><Icon name="refresh" size={21} color="#FFFFFF" /></TouchableOpacity><AppText variant="h4" color="#FFFFFF">{t('skinTitle')}</AppText></View><ScrollView contentContainerStyle={styles.content}><View style={[styles.result, { backgroundColor: clinical ? '#FFF7ED' : '#F0FDFA', borderColor: clinical ? '#FED7AA' : '#99F6E4' }]}><Icon name={clinical ? 'warning' : 'info'} size={30} color={clinical ? '#C2410C' : '#0F766E'} /><AppText variant="h5" color={clinical ? '#9A3412' : '#115E59'}>{t(clinical ? 'clinicalTitle' : 'selfObservationTitle')}</AppText><AppText variant="bodySM" color={clinical ? '#9A3412' : '#115E59'} style={styles.centerText}>{t(clinical ? 'clinicalBody' : 'selfObservationBody')}</AppText><TouchableOpacity onPress={() => router.push('/(tabs)/consultations')} style={[styles.primaryAction, { backgroundColor: clinical ? '#C2410C' : '#0F766E' }]}><Icon name="doctor" size={18} color="#FFFFFF" /><AppText variant="h6" color="#FFFFFF">{t('bookConsultation')}</AppText></TouchableOpacity></View><View style={[styles.notice, { backgroundColor: colors.backgroundSecondary }]}><AppText variant="caption" color={colors.textSecondary} style={styles.centerText}>{t('skinNotice')}</AppText></View><TouchableOpacity onPress={reset} style={[styles.outlineAction, { borderColor: colors.border }]}><AppText variant="h6" color={colors.textPrimary}>{t('startAgain')}</AppText></TouchableOpacity></ScrollView></View>;
audit-work/source/nabd_plus_patient_app/app/ai/prescription-translator.tsx:239:                      <Button label={med.price != null ? `اطلب — ${med.price} ر.س` : 'اطلب من الصيدلية'} variant="primary" icon="shopping_cart" size="sm" full={false} onPress={() => router.push('/(tabs)/pharmacy')} style={{ flex: 1 }} />
audit-work/source/nabd_plus_patient_app/app/ai/prescription-translator.tsx:240:                      <Button label="تفاصيل" variant="outline" icon="info" size="sm" full={false} onPress={() => router.push('/pharmacy/product-detail')} style={{ flex: 1 }} />
audit-work/source/nabd_plus_patient_app/app/ai/prescription-translator.tsx:248:            <TouchableOpacity onPress={() => router.push('/(tabs)/pharmacy')} style={{ borderRadius: 18, overflow: 'hidden' }}>
audit-work/source/nabd_plus_patient_app/app/ai/prescription-translator.tsx:259:              <Button label="إضافة للتذكيرات" variant="outline" icon="bell" onPress={() => router.push('/health/medication-reminder-add')} />
audit-work/source/nabd_plus_patient_app/app/ai/prescription-translator.tsx:260:              <Button label="مشاركة مع الطبيب" variant="ghost" icon="share" onPress={() => router.push('/consultations/share-report')} />
audit-work/source/nabd_plus_patient_app/app/ai/triage.tsx:57:          {emergency ? <TouchableOpacity accessibilityRole="button" onPress={callLocalEmergency} style={[styles.primaryAction, { backgroundColor: '#B91C1C' }]}><Icon name="call" size={18} color="#FFFFFF" /><AppText variant="h6" color="#FFFFFF">{t('callEmergency')}</AppText></TouchableOpacity> : <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/(tabs)/consultations')} style={[styles.primaryAction, { backgroundColor: '#312E81' }]}><Icon name="doctor" size={18} color="#FFFFFF" /><AppText variant="h6" color="#FFFFFF">{t('bookConsultation')}</AppText></TouchableOpacity>}
audit-work/source/nabd_plus_patient_app/app/notifications/index.tsx:120:      if (translated) router.push({ pathname: translated.pathname as any, params: translated.params || {} });
audit-work/source/nabd_plus_patient_app/app/notifications/index.tsx:137:          else router.replace('/');
audit-work/source/nabd_plus_patient_app/app/search/index.tsx:84:      router.push(`/consultations/doctor/${id}` as any);
audit-work/source/nabd_plus_patient_app/app/search/index.tsx:86:      router.push('/(tabs)/health' as any);
audit-work/source/nabd_plus_patient_app/app/search/index.tsx:89:      router.push({ pathname: '/pharmacy/product-detail', params: { id } } as any);
audit-work/source/nabd_plus_patient_app/app/search/index.tsx:91:      router.push({ pathname: '/diagnostics/test-detail', params: { id } } as any);
audit-work/source/nabd_plus_patient_app/app/search/index.tsx:93:      router.push({ pathname: '/diagnostics/test-detail', params: { id, type: 'radiology' } } as any);
audit-work/source/nabd_plus_patient_app/app/search/index.tsx:95:      router.push(`/articles/${r.slug || id}` as any);
audit-work/source/nabd_plus_patient_app/app/search/index.tsx:97:      router.push('/insurance/hub' as any);
audit-work/source/nabd_plus_patient_app/app/search/index.tsx:99:      router.push({ pathname: '/community/post-detail', params: { id } } as any);
audit-work/source/nabd_plus_patient_app/app/search/index.tsx:101:      router.push({ pathname: '/family/member-health', params: { id } } as any);
audit-work/source/nabd_plus_patient_app/app/voice/index.tsx:101:            onPress={() => router.push(a.route)}
audit-work/source/nabd_plus_patient_app/app/services/index.tsx:91:                  onPress={() => router.push(item.route as any)}
audit-work/source/nabd_plus_patient_app/app/diagnostics/search.tsx:97:                  router.push({
audit-work/source/nabd_plus_patient_app/app/diagnostics/cart.tsx:192:              (router.push as any)({ pathname: '/diagnostics/checkout', params: { serviceType, labName, labId: selectedLab } });
audit-work/source/nabd_plus_patient_app/app/diagnostics/booking-success.tsx:88:        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary, marginBottom: 16 }]} onPress={() => router.replace('/diagnostics/orders' as never)}>
audit-work/source/nabd_plus_patient_app/app/diagnostics/booking-success.tsx:93:        <TouchableOpacity style={[styles.secondaryBtn, { borderColor: colors.primary }]} onPress={() => router.push('/(tabs)')}>
audit-work/source/nabd_plus_patient_app/app/diagnostics/orders.tsx:213:                  (router.push as any)(`/diagnostics/sample-tracking?bookingId=${order.id}`)
audit-work/source/nabd_plus_patient_app/app/diagnostics/my-results.tsx:140:                onPress={() => router.push({ pathname: "/diagnostics/order/[id]", params: { id: b.id } })}
audit-work/source/nabd_plus_patient_app/app/diagnostics/results-history.tsx:72:                onPress={() => hasReport && router.push({ pathname: '/reports/view-report', params: { id: report.id || item.id } })}
audit-work/source/nabd_plus_patient_app/app/diagnostics/insurance-approval.tsx:240:                  (router.push as any)({ 
audit-work/source/nabd_plus_patient_app/app/diagnostics/insurance-approval.tsx:250:                onPress={() => (router.push as any)('/consultations')}
audit-work/source/nabd_plus_patient_app/app/diagnostics/insurance-approval.tsx:259:                (router.push as any)({ 
audit-work/source/nabd_plus_patient_app/app/diagnostics/insurance-upload.tsx:187:                onPress={() => (router.push as any)('/consultations')}
audit-work/source/nabd_plus_patient_app/app/diagnostics/insurance-upload.tsx:363:                (router.push as any)({ 
audit-work/source/nabd_plus_patient_app/app/diagnostics/test-detail.tsx:152:              router.push('/diagnostics/cart' as any);
audit-work/source/nabd_plus_patient_app/app/diagnostics/packages.tsx:111:              router.push(`/diagnostics/package-detail?id=${pkg.id}`)
audit-work/source/nabd_plus_patient_app/app/diagnostics/book-sample.tsx:50:        <Button label="الذهاب إلى السلة" variant="gradient" size="lg" icon="cart" onPress={() => router.replace('/diagnostics/cart')} />
audit-work/source/nabd_plus_patient_app/app/diagnostics/lab-comparison.tsx:82:      router.push("/diagnostics/cart");
audit-work/source/nabd_plus_patient_app/app/diagnostics/lab/[id].tsx:136:               onPress={() => (router.push as any)(`/diagnostics/test-detail?id=${test.id}&labId=${id}`)}
audit-work/source/nabd_plus_patient_app/app/diagnostics/order/[id].tsx:78:      router.push({ pathname: '/reports/view-report', params: { id: reportId } });
audit-work/source/nabd_plus_patient_app/app/health/medication-reminder-list.tsx:70:    <View style={[styles.header, { paddingTop: insets.top + 16 }]}><Button label={t('add')} variant="ghost" size="sm" icon="add" full={false} onPress={() => router.push('/health/medication-reminder-add')} /><View style={styles.titleWrap}><AppText variant="h3">{t('reminderTitle')}</AppText><AppText variant="caption" color={colors.textTertiary}>{t('doseTimeline')}</AppText></View><IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} /></View>
audit-work/source/nabd_plus_patient_app/app/health/medication-reminder-list.tsx:76:      {!error && reminders.length === 0 && <Card style={styles.empty}><AppText variant="h6">{t('noReminders')}</AppText><AppText variant="bodySM" color={colors.textTertiary} align="right">{t('noRemindersHint')}</AppText><Button label={t('addReminder')} variant="gradient" icon="add" onPress={() => router.push('/health/medication-reminder-add')} /></Card>}
audit-work/source/nabd_plus_patient_app/app/health/medication-reminder-list.tsx:86:  return <Card style={styles.reminder}><View style={styles.reminderHeading}><View style={{ flex: 1, alignItems: 'flex-end', gap: 3 }}><AppText variant="h6">{reminderName(reminder, t('medicineUnnamed'))}</AppText><AppText variant="bodyXS" color={colors.textTertiary}>{dosage}</AppText><AppText variant="caption" color={colors.textTertiary}>{`${t('frequencyAndDuration')}: ${frequencyLabel(reminder, t)}`}</AppText>{reminder.instructions_ar ? <AppText variant="caption" color={colors.textTertiary}>{reminder.instructions_ar}</AppText> : null}</View>{reminder.chronic && <Badge label={t('chronicMedication')} color={colors.warning} />}</View>{doses.map((dose) => <View key={dose.time_key} style={[styles.dose, { borderTopColor: colors.borderLight }]}><View style={[styles.dot, { backgroundColor: colorFor(dose.status) }]} /><View style={{ flex: 1, alignItems: 'flex-end', gap: 2 }}><AppText variant="labelMD">{t('doseTime', { time: dose.time_key })}</AppText><AppText variant="caption" color={colorFor(dose.status)}>{t(dose.status)}</AppText></View>{dose.status === 'pending' ? <View style={styles.actions}><Button label={t('takeDose')} variant="primary" size="sm" full={false} loading={actionKey === `${reminder.id}-${dose.time_key}-taken`} onPress={() => onLog(reminder, dose, 'taken')} /><Button label={t('skipDose')} variant="outline" size="sm" full={false} loading={actionKey === `${reminder.id}-${dose.time_key}-skipped`} onPress={() => onLog(reminder, dose, 'skipped')} /></View> : <Badge label={t(dose.status)} color={colorFor(dose.status)} />}</View>)}<View style={styles.footer}><Button label={t('edit')} variant="ghost" size="sm" full={false} onPress={() => router.push({ pathname: '/health/medication-reminder-add', params: { id: reminder.id } })} /><Button label={t('syncAlerts')} variant="ghost" size="sm" full={false} loading={actionKey === `sync-${reminder.id}`} onPress={() => onSync(reminder)} /><Button label={t('stopReminder')} variant="ghost" size="sm" full={false} loading={actionKey === `stop-${reminder.id}`} onPress={() => onStop(reminder.id)} /></View></Card>;
audit-work/source/nabd_plus_patient_app/app/health/edit-profile.tsx:74:      <Card onPress={() => router.push('/health/conditions-allergies')} style={styles.link}><View style={{ alignItems: 'flex-end', flex: 1 }}><AppText variant="h6">الأمراض والحساسية</AppText><AppText variant="caption" color={colors.textTertiary}>إضافة وحذف العناصر من الشاشة المخصصة</AppText></View></Card><Button label="حفظ الملف الصحي" variant="gradient" icon="check_circle" loading={saving} onPress={save} />
audit-work/source/nabd_plus_patient_app/app/health/actionable-order.tsx:37:    router.push('/(tabs)/pharmacy');
audit-work/source/nabd_plus_patient_app/app/health/actionable-order.tsx:42:    router.push('/diagnostics/search');
audit-work/source/nabd_plus_patient_app/app/health/actionable-order.tsx:131:            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.info }]} onPress={() => router.push('/diagnostics/search')}>
audit-work/source/nabd_plus_patient_app/app/health/prescriptions.tsx:42:          <IconButton icon="camera" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.push('/pharmacy/rx-order')} />
audit-work/source/nabd_plus_patient_app/app/health/prescriptions.tsx:69:                    onPress={() => router.push('/(tabs)/pharmacy')}
audit-work/source/nabd_plus_patient_app/app/health/medication-reminder-add.tsx:60:      router.replace({ pathname: '/health/medication-reminder-list', params: notificationResult.permissionDenied ? { alertStatus: 'permission_denied' } : { alertStatus: 'synced' } });
audit-work/source/nabd_plus_patient_app/app/health/health-id.tsx:199:            <TouchableOpacity onPress={() => router.push('/health/emergency-contacts')}>
audit-work/source/nabd_plus_patient_app/app/health/health-id.tsx:246:          onPress={() => router.push('/health/edit-profile')}
audit-work/source/nabd_plus_patient_app/app/health/chronic-medications.tsx:42:      if (kind === 'refill' && response?.order_id) { router.push({ pathname: '/pharmacy/order-tracking', params: { orderId: response.order_id } }); return; }
audit-work/source/nabd_plus_patient_app/app/health/chronic-medications.tsx:50:    <View style={[styles.header, { paddingTop: insets.top + 16 }]}><Button label={t('add')} variant="ghost" size="sm" icon="add" full={false} onPress={() => router.push('/health/medication-reminder-add')} /><View style={styles.titleWrap}><AppText variant="h3">{t('chronicTitle')}</AppText><AppText variant="caption" color={colors.textTertiary}>{t('refillTracking')}</AppText></View><IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} /></View>
audit-work/source/nabd_plus_patient_app/app/health/chronic-medications.tsx:54:      {!error && items.length === 0 && <Card style={styles.empty}><AppText variant="h6">{t('noChronic')}</AppText><AppText variant="bodySM" color={colors.textTertiary} align="right">{t('noChronicHint')}</AppText><Button label={t('addReminder')} variant="gradient" icon="add" onPress={() => router.push('/health/medication-reminder-add')} /></Card>}
audit-work/source/nabd_plus_patient_app/app/health/sleep-score.tsx:117:                    onPress={() => router.push('/health/sleep-tracker')}
audit-work/source/nabd_plus_patient_app/app/health/refills.tsx:77:                  [{ text: 'تتبع الطلب', onPress: () => router.push({ pathname: '/pharmacy/order-tracking', params: tracking }) }, { text: 'حسناً', style: 'cancel' }],
audit-work/source/nabd_plus_patient_app/app/health/refills.tsx:87:                  { text: 'إضافة عنوان', onPress: () => router.push('/profile/addresses') }, { text: 'إلغاء', style: 'cancel' },
audit-work/source/nabd_plus_patient_app/app/health/chronic-disease.tsx:44:          <IconButton icon="add" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.push('/health/edit-profile')} />
audit-work/source/nabd_plus_patient_app/app/health/chronic-disease.tsx:141:                <TouchableOpacity onPress={() => router.push('/(tabs)/consultations')}
audit-work/source/nabd_plus_patient_app/app/health/chronic-disease.tsx:173:          <TouchableOpacity onPress={() => router.push('/health/vitals')}
audit-work/source/nabd_plus_patient_app/app/health/family-hub.tsx:194:            onPress={() => router.push("/family/join")}
audit-work/source/nabd_plus_patient_app/app/health/family-hub.tsx:208:                onPress={() => router.push(q.route as any)}
audit-work/source/nabd_plus_patient_app/app/health/family-hub.tsx:232:                  router.push({
audit-work/source/nabd_plus_patient_app/app/health/family-hub.tsx:264:                        router.push({
audit-work/source/nabd_plus_patient_app/app/health/family-hub.tsx:274:                    onPress={() => router.push("/family/chat")}
audit-work/source/nabd_plus_patient_app/app/health/family-hub.tsx:283:            onPress={() => router.push("/family/invite")}
audit-work/source/nabd_plus_patient_app/app/health/medications.tsx:37:      <Button label={t('add')} variant="ghost" size="sm" icon="add" full={false} onPress={() => router.push('/health/medication-reminder-add')} />
audit-work/source/nabd_plus_patient_app/app/health/medications.tsx:51:        <Animated.View entering={FadeInDown.delay(80).duration(360)}><NavigationCard title={t('remindersToday')} detail={reminders.length ? t('activeReminders', { count: reminders.length }) : t('noActiveReminders')} action={t('viewReminders')} tint={colors.primary} onPress={() => router.push('/health/medication-reminder-list')} /></Animated.View>
audit-work/source/nabd_plus_patient_app/app/health/medications.tsx:52:        <Animated.View entering={FadeInDown.delay(150).duration(360)}><NavigationCard title={t('deviceAlerts')} detail={t('deviceAlertsHint')} action={t('syncAlerts')} tint={colors.secondary} onPress={() => router.push('/health/medication-reminder-list')} /></Animated.View>
audit-work/source/nabd_plus_patient_app/app/health/medications.tsx:53:        <Animated.View entering={FadeInDown.delay(185).duration(360)}><NavigationCard title={t('addReminder')} detail={t('medicationAndDose')} action={t('add')} tint={colors.secondary} onPress={() => router.push('/health/medication-reminder-add')} /></Animated.View>
audit-work/source/nabd_plus_patient_app/app/health/medications.tsx:54:        <Animated.View entering={FadeInDown.delay(255).duration(360)}><NavigationCard title={t('chronicMeds')} detail={chronic ? t('chronicCount', { count: chronic }) : t('chronicHint')} action={t('manage')} tint={colors.warning} onPress={() => router.push('/health/chronic-medications')} /></Animated.View>
audit-work/source/nabd_plus_patient_app/app/health/medications.tsx:55:        <Animated.View entering={FadeInDown.delay(325).duration(360)}><NavigationCard title={t('prescriptions')} detail={t('prescriptionsHint')} action={t('viewPrescriptions')} tint={colors.info} onPress={() => router.push('/health/prescriptions')} /></Animated.View>
audit-work/source/nabd_plus_patient_app/app/health/wearables.tsx:97:          <IconButton icon="sleep" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.push('/health/sleep-tracker')} />
audit-work/source/nabd_plus_patient_app/app/health/vitals.tsx:43:      {!error && items.length === 0 && <Card style={styles.empty}><AppText variant="h6">لا توجد قراءات مسجلة</AppText><AppText variant="bodySM" color={colors.textTertiary} align="right">أضف قراءة جديدة لتظهر هنا. لا تُستخدم قيم افتراضية عند عدم وجود بيانات.</AppText><Button label="إضافة قراءة" variant="gradient" icon="add" onPress={() => router.push('/health/vitals-log')} /></Card>}
audit-work/source/nabd_plus_patient_app/app/health/vitals.tsx:44:      <View style={styles.grid}>{items.map((item) => <Card key={item.key} onPress={() => router.push({ pathname: '/health/vitals-log', params: { type: item.key } } as any)} style={styles.vital}><View style={{ alignItems: 'flex-end', gap: 5 }}><AppText variant="bodySM" color={colors.textSecondary}>{item.label}</AppText><View style={styles.valueRow}><AppText variant="h3" color={item.color || colors.primary}>{item.value}</AppText><AppText variant="caption" color={colors.textTertiary}>{item.unit}</AppText></View><AppText variant="caption" color={colors.textTertiary}>{arabicDate(item.measured_at)}</AppText></View></Card>)}</View>
audit-work/source/nabd_plus_patient_app/app/health/vitals.tsx:45:      <Button label="إضافة قراءة جديدة" variant="gradient" icon="add" onPress={() => router.push('/health/vitals-log')} />
audit-work/source/nabd_plus_patient_app/app/health/vitals.tsx:46:      {items.length > 0 && <Button label="عرض السجل" variant="outline" onPress={() => router.push('/health/vitals-log')} />}
audit-work/source/nabd_plus_patient_app/app/health/vitals.tsx:47:      <Card onPress={() => router.push('/health/conditions-allergies')} style={styles.link}><View style={{ flex: 1, alignItems: 'flex-end' }}><AppText variant="h6">الأمراض والحساسية</AppText><AppText variant="caption" color={colors.textTertiary}>تُدار من الملف الطبي المرجعي</AppText></View></Card>
audit-work/source/nabd_plus_patient_app/app/mental-health/hub.tsx:40:          <TouchableOpacity key={card.key} accessibilityRole="button" onPress={() => router.push(card.route as any)} activeOpacity={0.82} style={[styles.card, { backgroundColor: colors.surface, borderColor: card.color + '33' }]}>
audit-work/source/nabd_plus_patient_app/app/mental-health/crisis-support.tsx:69:          <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/(tabs)/consultations')} style={styles.consultationButton}><Icon name="doctor" size={18} color="#1D4ED8" /><AppText variant="caption" color="#1D4ED8">{t('consultation')}</AppText></TouchableOpacity>
audit-work/source/nabd_plus_patient_app/app/articles/index.tsx:88:        <IconButton icon="bookmark" onPress={() => router.push("/articles/bookmarks")} />
audit-work/source/nabd_plus_patient_app/app/articles/index.tsx:158:              onPress={() => router.push({ pathname: "/articles/[slug]", params: { slug: a.slug } })}
audit-work/source/nabd_plus_patient_app/app/articles/bookmarks.tsx:78:          <Button label="تصفح المقالات" variant="gradient" icon="document" onPress={() => router.push("/articles")} />
audit-work/source/nabd_plus_patient_app/app/articles/bookmarks.tsx:86:              onPress={() => router.push({ pathname: "/articles/[slug]", params: { slug: a.slug } })}
audit-work/source/nabd_plus_patient_app/app/articles/[slug].tsx:164:                  onPress={() => router.replace({ pathname: "/articles/[slug]", params: { slug: r.slug } })}
audit-work/source/nabd_plus_patient_app/app/drug-scanner/index.tsx:199:              <TouchableOpacity onPress={() => router.push('/(tabs)/consultations')}
audit-work/source/nabd_plus_patient_app/app/maternity/hub.tsx:20:  return <View style={[styles.container, { backgroundColor: colors.background }]}><StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} /><View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.secondary }]}><View style={{ width:44 }} /><View style={styles.titleWrap}><AppText variant="h3" color="#fff">{t('title')}</AppText><AppText variant="caption" color="rgba(255,255,255,0.82)">{t('subtitle')}</AppText></View><IconButton icon="back" bg="rgba(255,255,255,0.16)" color="#fff" onPress={() => router.back()} /></View>{loading ? <View style={styles.center}><ActivityIndicator color={colors.secondary} /><AppText variant="bodySM" color={colors.textTertiary}>{t('loading')}</AppText></View> : <ScrollView contentContainerStyle={[styles.content, { paddingBottom:insets.bottom + 32 }]}>{error && <Card style={styles.error}><AppText variant="bodySM" color="#B91C1C" align="right">{error}</AppText><Button label={t('retry')} size="sm" variant="outline" full={false} onPress={load} /></Card>}{!profile?.profile_ready ? <Animated.View entering={FadeInDown.duration(300)}><Card style={styles.empty}><Icon name="calendar_today" size={36} color={colors.secondary} /><AppText variant="h5">{t('profileRequired')}</AppText><AppText variant="bodySM" color={colors.textSecondary} align="right">{t('choosePath')}</AppText><Button label={t('openSetup')} variant="gradient" onPress={() => router.push('/maternity/maternity-setup')} /></Card></Animated.View> : profile.is_pregnant ? <PregnancyCard profile={profile} t={t} format={format} colors={colors} /> : <CycleCard profile={profile} cycle={cycle} t={t} format={format} colors={colors} />}{profile?.profile_ready && <><Animated.View entering={FadeInDown.delay(180).duration(300)}><Card style={[styles.notice, { backgroundColor: colors.warningSurface, borderColor: colors.warning + '55' }]}><AppText variant="bodySM" color={colors.textSecondary} align="right">{profile.is_pregnant ? t('pregnancyNotice') : t('cycleNotice')}</AppText><AppText variant="caption" color={colors.textTertiary} align="right">{t('safetyNotice')}</AppText></Card></Animated.View><Animated.View entering={FadeInDown.delay(240).duration(300)}><Button label={t('update')} variant="outline" icon="edit" onPress={() => router.push('/maternity/maternity-setup')} /></Animated.View></>}</ScrollView>}</View>;
audit-work/source/nabd_plus_patient_app/app/maternity/maternity-setup.tsx:15:  const save = async () => { if (!lmp.trim() || (mode === 'cycle' && !cycleLength.trim())) { setError(t('profileRequired')); return; } setSaving(true); setError(null); try { await apiFetch('/maternity/profile', { method: 'POST', body: JSON.stringify(mode === 'pregnancy' ? { is_pregnant: true, lmp_date: lmp.trim(), ...(dueDate.trim() ? { due_date: dueDate.trim() } : {}) } : { is_pregnant: false, last_period_date: lmp.trim(), cycle_length: Number(cycleLength), is_regular: regular === 'true' }) }); router.replace('/maternity/hub'); } catch { setError(t('saveError')); } finally { setSaving(false); } };
audit-work/source/nabd_plus_patient_app/app/orders/index.tsx:257:                onPress={() => it.route && router.push(it.route)}
audit-work/source/nabd_plus_patient_app/app/nutrition/hub.tsx:27:      <Animated.View entering={FadeInDown.duration(320)}><Card style={[styles.hero, { backgroundColor: colors.primarySurface, borderColor: colors.primary + '33' }]}><View style={styles.heroRow}><View style={[styles.ring, { borderColor: colors.primary }]}><AppText variant="h5" color={colors.primary}>{target ? `${percent}%` : '—'}</AppText></View><View style={{ flex: 1, alignItems: 'flex-end', gap: 4 }}><AppText variant="h5">{profile?.profile_ready ? t('summary') : t('setupTitle')}</AppText><AppText variant="bodySM" color={colors.textSecondary}>{target ? `${consumed} / ${target} kcal` : t('setupHint')}</AppText></View></View><Button label={profile?.profile_ready ? t('bodyGoals') : t('setup')} variant="outline" size="sm" full={false} onPress={() => router.push('/nutrition/body-target')} /></Card></Animated.View>
audit-work/source/nabd_plus_patient_app/app/nutrition/hub.tsx:28:      <Animated.View entering={FadeInDown.delay(80).duration(320)}><ActionCard icon="calendar" title={t('dailyTracker')} detail={t('mealsLogged', { count: summary?.meals_count || 0 })} color={colors.primary} action={t('today')} onPress={() => router.push('/nutrition/daily-tracker')} /></Animated.View>
audit-work/source/nabd_plus_patient_app/app/nutrition/hub.tsx:29:      <Animated.View entering={FadeInDown.delay(150).duration(320)}><ActionCard icon="food" title={t('logMeal')} detail={t('nutritionSafety')} color={colors.success} action={t('addMeal')} onPress={() => router.push('/nutrition/log-meal')} /></Animated.View>
audit-work/source/nabd_plus_patient_app/app/nutrition/hub.tsx:30:      <Animated.View entering={FadeInDown.delay(220).duration(320)}><ActionCard icon="water" title={t('waterLog')} detail={target ? `${profile?.daily_water_target_ml || 0} ml` : t('noTarget')} color={colors.info} action={t('dailyTracker')} onPress={() => router.push('/nutrition/daily-tracker')} /></Animated.View>
audit-work/source/nabd_plus_patient_app/app/nutrition/log-meal.tsx:32:      router.replace('/nutrition/daily-tracker');
audit-work/source/nabd_plus_patient_app/app/nutrition/body-target.tsx:21:  const save = async () => { if (![height, weight, targetWeight, calorieTarget, waterTarget].every(finite)) { setError(t('formRequired')); return; } setSaving(true); setError(null); try { const response: any = await apiFetch('/nutrition/profile', { method: 'POST', body: JSON.stringify({ goal, activity_level: activity, height_cm: Number(height), weight_kg: Number(weight), target_weight_kg: Number(targetWeight), daily_calorie_target: Number(calorieTarget), daily_water_target_ml: Number(waterTarget), dietary_restrictions: list(restrictions), allergies: list(allergies) }) }); const saved: Profile = response?.data || response; setBmi(saved.bmi ?? null); router.replace('/nutrition/hub'); } catch { setError(t('saveError')); } finally { setSaving(false); } };
audit-work/source/nabd_plus_patient_app/app/nutrition/daily-tracker.tsx:36:    <View style={[styles.header, { paddingTop: insets.top + 16 }]}><Button label={t('logMeal')} variant="ghost" size="sm" icon="add" full={false} onPress={() => router.push('/nutrition/log-meal')} /><View style={styles.titleWrap}><AppText variant="h3">{t('dailyTracker')}</AppText><AppText variant="caption" color={colors.textTertiary}>{t('today')}</AppText></View><IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} /></View>
audit-work/source/nabd_plus_patient_app/app/nutrition/daily-tracker.tsx:43:        <Animated.View entering={FadeInDown.delay(210).duration(320)}><Card style={styles.section}><View style={styles.sectionHeader}><AppText variant="h6">{t('mealHistory')}</AppText><Button label={t('addMeal')} variant="ghost" size="sm" full={false} onPress={() => router.push('/nutrition/log-meal')} /></View>{meals.length === 0 ? <AppText variant="bodySM" color={colors.textTertiary} align="right">{t('noMeals')}</AppText> : meals.map((meal) => <View key={meal.id || `${meal.name}-${meal.logged_at}`} style={[styles.mealRow, { borderTopColor: colors.borderLight }]}><Badge label={t(meal.meal_type)} color={colors.primary} /><View style={{ flex: 1, alignItems: 'flex-end', gap: 2 }}><AppText variant="labelMD">{meal.name}</AppText><AppText variant="caption" color={colors.textTertiary}>{`${meal.calories} kcal${meal.protein_g ? ` · ${meal.protein_g} g ${t('protein')}` : ''}`}</AppText></View></View>)}</Card></Animated.View>
audit-work/source/nabd_plus_patient_app/app/s/[type]/[slug].tsx:35:          router.replace(factory(id));
audit-work/source/nabd_plus_patient_app/app/s/[type]/[slug].tsx:48:    router.replace({ pathname: '/search', params: { q: String(slug || '').replace(/-/g, ' ') } });
audit-work/source/nabd_plus_patient_app/app/nursing/live-tracking.tsx:131:          <TouchableOpacity style={{ backgroundColor: '#23B5CE', width: '100%', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 }} onPress={() => router.push('/(tabs)')}>
audit-work/source/nabd_plus_patient_app/app/nursing/live-tracking.tsx:181:          onPress={() => router.push("/(tabs)")}
audit-work/source/nabd_plus_patient_app/app/nursing/service-info.tsx:55:  const goBook = () => router.push({
audit-work/source/nabd_plus_patient_app/app/nursing/service-details.tsx:151:                      router.push({ pathname: '/nursing/nurse-profile', params: { nurseId: nurse.id, flow, serviceId } });
audit-work/source/nabd_plus_patient_app/app/nursing/service-details.tsx:216:                  router.push({ pathname: '/nursing/nurse-profile', params: { nurseId: selectedNurseForLock, flow, serviceId } });
audit-work/source/nabd_plus_patient_app/app/nursing/nurse-profile.tsx:139:        router.replace({ pathname: '/nursing/live-tracking', params: { type: transportMode, bookingId } });
audit-work/source/nabd_plus_patient_app/app/nursing/nurse-profile.tsx:158:        <TouchableOpacity style={styles.successBtn} onPress={() => router.push('/(tabs)')}>
audit-work/source/nabd_plus_patient_app/app/nursing/nurse-profile.tsx:253:            <TouchableOpacity onPress={() => router.push('/delivery/address-select')}>
audit-work/source/nabd_plus_patient_app/app/payments/processing.tsx:149:            router.replace({
audit-work/source/nabd_plus_patient_app/app/payments/processing.tsx:156:            router.replace({
audit-work/source/nabd_plus_patient_app/app/payments/processing.tsx:181:          router.replace({
audit-work/source/nabd_plus_patient_app/app/payments/processing.tsx:195:          router.replace({
audit-work/source/nabd_plus_patient_app/app/payments/processing.tsx:412:                router.replace({
audit-work/source/nabd_plus_patient_app/app/payments/failure.tsx:78:            onPress={() => router.replace("/(tabs)")}
audit-work/source/nabd_plus_patient_app/app/payments/failed.tsx:77:          onPress={() => router.push("/wallet/hub")}
audit-work/source/nabd_plus_patient_app/app/payments/failed.tsx:82:        <TouchableOpacity onPress={() => router.replace("/(tabs)")}>
audit-work/source/nabd_plus_patient_app/app/payments/success.tsx:85:            if (apptId) router.push({ pathname: '/consultations/booking-pending', params: { appointmentId: apptId, visitType: vt } });
audit-work/source/nabd_plus_patient_app/app/payments/success.tsx:86:            else if (vt === 'clinic') router.push('/consultations/clinic-location');
audit-work/source/nabd_plus_patient_app/app/payments/success.tsx:87:            else if (vt === 'home') router.push('/consultations/home-visit-tracking');
audit-work/source/nabd_plus_patient_app/app/payments/success.tsx:88:            else router.push({ pathname: '/consultations/booking-success', params: { visitType: vt } });
audit-work/source/nabd_plus_patient_app/app/payments/success.tsx:98:            onPress={() => router.replace({ pathname: '/pharmacy/order-tracking', params: { orderId: (params.bookingId || '') as string } })}
audit-work/source/nabd_plus_patient_app/app/payments/success.tsx:107:            onPress={() => router.replace('/wallet/hub')}
audit-work/source/nabd_plus_patient_app/app/payments/success.tsx:114:        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={{ borderRadius: 16, overflow: 'hidden' }}>
audit-work/source/nabd_plus_patient_app/app/map/index.tsx:614:                onPress={() => { closeSheet(); router.push('/health/edit-profile'); }} style={[styles.insBanner, { backgroundColor: isDark ? 'rgba(240,105,92,0.15)' : '#FEEFED' } ]}>
audit-work/source/nabd_plus_patient_app/app/map/index.tsx:638:                    router.push({ pathname: '/consultations/doctor-profile', params: { doctorId: selectedProvider.id } });
audit-work/source/nabd_plus_patient_app/app/map/index.tsx:640:                    router.push('/(tabs)/pharmacy');
audit-work/source/nabd_plus_patient_app/app/map/index.tsx:642:                    router.push('/diagnostics/booking-confirm');
audit-work/source/nabd_plus_patient_app/app/map/index.tsx:644:                    router.push('/(tabs)/consultations');
audit-work/source/nabd_plus_patient_app/app/map/index.tsx:646:                    router.push('/(tabs)/nursing');
audit-work/source/nabd_plus_patient_app/app/family/scan.tsx:39:    router.replace({ pathname: '/family/join', params: { code } });
audit-work/source/nabd_plus_patient_app/app/family/hub.tsx:101:            onPress={() => router.push("/family/invite")}
audit-work/source/nabd_plus_patient_app/app/family/hub.tsx:115:            onPress={() => router.push("/(tabs)/index" as any)}
audit-work/source/nabd_plus_patient_app/app/family/hub.tsx:136:                onPress={() => router.push(q.route as any)}
audit-work/source/nabd_plus_patient_app/app/family/hub.tsx:160:                  router.push({
audit-work/source/nabd_plus_patient_app/app/family/hub.tsx:192:                        router.push({
audit-work/source/nabd_plus_patient_app/app/family/hub.tsx:202:                    onPress={() => router.push("/family/chat")}
audit-work/source/nabd_plus_patient_app/app/family/hub.tsx:211:            onPress={() => router.push("/family/invite")}
audit-work/source/nabd_plus_patient_app/app/family/join.tsx:99:          onPress={() => router.replace("/health/family-hub")}
audit-work/source/nabd_plus_patient_app/app/family/join.tsx:172:              onPress={() => router.push("/family/scan")}
audit-work/source/nabd_plus_patient_app/app/family/emergency-contacts.tsx:67:        <IconButton icon="add" onPress={() => router.push("/family/invite")} />
audit-work/source/nabd_plus_patient_app/app/family/emergency-contacts.tsx:157:            onPress={() => router.push("/family/invite")}
audit-work/source/nabd_plus_patient_app/app/family/emergency-contacts.tsx:161:            onPress={() => router.push("/emergency/sos")}
audit-work/source/nabd_plus_patient_app/app/family/member-health.tsx:153:              router.push({
audit-work/source/nabd_plus_patient_app/app/family/member-health.tsx:282:            onPress={() => router.push("/family/chat")}
audit-work/source/nabd_plus_patient_app/app/family/member-health.tsx:288:            onPress={() => router.push("/(tabs)/consultations")}
audit-work/source/nabd_plus_patient_app/app/(onboarding)/index.tsx:87:      router.replace('/(onboarding)/language');
audit-work/source/nabd_plus_patient_app/app/(onboarding)/index.tsx:97:    router.replace('/(onboarding)/language');
audit-work/source/nabd_plus_patient_app/app/(onboarding)/language.tsx:58:        <Button label="متابعة" variant="gradient" size="lg" iconRight="chevronLeft" onPress={() => { setLang(selected); router.replace('/(auth)/welcome'); }} />
audit-work/source/nabd_plus_patient_app/app/(onboarding)/permissions.tsx:74:    router.replace("/(auth)/welcome");
audit-work/source/nabd_plus_patient_app/app/(tabs)/index.tsx:76:      <IconButton icon="notification" bg="rgba(255,255,255,0.15)" color="#FFFFFF" onPress={() => router.push('/notifications')} />
audit-work/source/nabd_plus_patient_app/app/(tabs)/index.tsx:78:      <IconButton icon="person" bg="rgba(255,255,255,0.15)" color="#FFFFFF" onPress={() => router.push('/profile')} />
audit-work/source/nabd_plus_patient_app/app/(tabs)/index.tsx:89:        <Quick icon="consultations" color="#2E86FF" label={t('consultation')} onPress={() => router.push('/(tabs)/consultations')} colors={colors} />
audit-work/source/nabd_plus_patient_app/app/(tabs)/index.tsx:90:        <Quick icon="pharmacy" color="#16A34A" label={t('pharmacy')} onPress={() => router.push('/(tabs)/pharmacy')} colors={colors} />
audit-work/source/nabd_plus_patient_app/app/(tabs)/index.tsx:91:        <Quick icon="science" color="#7A6BEA" label={t('diagnostics')} onPress={() => router.push('/(tabs)/diagnostics')} colors={colors} />
audit-work/source/nabd_plus_patient_app/app/(tabs)/index.tsx:92:        <Quick icon="emergency" color="#DC2626" label={t('emergency')} onPress={() => router.push('/emergency/sos')} colors={colors} />
audit-work/source/nabd_plus_patient_app/app/(tabs)/index.tsx:93:        <Quick icon="heart-pulse" color="#23B5CE" label={t('profile')} onPress={() => router.push('/(tabs)/health')} colors={colors} />
audit-work/source/nabd_plus_patient_app/app/(tabs)/index.tsx:94:        <Quick icon="brain" color="#7A6BEA" label={t('safeTriage')} onPress={() => router.push('/ai/triage')} colors={colors} />
audit-work/source/nabd_plus_patient_app/app/(tabs)/index.tsx:97:      <Section title={t('medications')} action={t('manageReminders')} onAction={() => router.push('/health/medication-reminder-list')} colors={colors} />
audit-work/source/nabd_plus_patient_app/app/(tabs)/index.tsx:98:      <Card onPress={() => router.push('/health/medication-reminder-list')} style={[styles.featureCard, { borderColor: colors.success + '33' }]}>
audit-work/source/nabd_plus_patient_app/app/(tabs)/index.tsx:102:      <Section title={t('nutrition')} action={t('openTracker')} onAction={() => router.push('/nutrition/daily-tracker')} colors={colors} />
audit-work/source/nabd_plus_patient_app/app/(tabs)/index.tsx:103:      <View style={styles.doubleGrid}><Metric icon="food" color={colors.primary} title={t('mealsToday')} value={t('mealsCount', { count: mealCount })} onPress={() => router.push('/nutrition/daily-tracker')} colors={colors} /><Metric icon="water" color={colors.info} title={t('waterToday')} value={t('waterAmount', { count: water })} onPress={() => router.push('/nutrition/daily-tracker')} colors={colors} /></View>
audit-work/source/nabd_plus_patient_app/app/(tabs)/index.tsx:106:      <View style={styles.doubleGrid}><Metric icon="heart-pulse" color={colors.secondary} title={t('vitals')} value={vitals.length ? t('updated') : t('noVitals')} onPress={() => router.push('/health/vitals')} colors={colors} /><Metric icon="brain" color="#7A6BEA" title={t('mood')} value={moodLoggedToday ? t('moodLogged') : t('moodNotLogged')} onPress={() => router.push('/mental-health/mood-journal')} colors={colors} /></View>
audit-work/source/nabd_plus_patient_app/app/(tabs)/index.tsx:107:      <Card onPress={() => router.push('/maternity/hub')} style={styles.featureCard}><View style={[styles.featureIcon, { backgroundColor: colors.maternity + '18' }]}><Icon name="pregnant_woman" size={24} color={colors.maternity} /></View><View style={styles.rightText}><AppText variant="h6">{t('maternity')}</AppText><AppText variant="caption" color={colors.textTertiary}>{maternityTitle}</AppText></View><Icon name="chevronLeft" size={20} color={colors.textTertiary} /></Card>
audit-work/source/nabd_plus_patient_app/app/(tabs)/index.tsx:109:      <Section title={t('appointments')} action={t('viewAll')} onAction={() => router.push('/consultations/appointments')} colors={colors} />
audit-work/source/nabd_plus_patient_app/app/(tabs)/index.tsx:110:      <Card onPress={() => appointment?.id ? router.push({ pathname: '/consultations/appointment-detail', params: { id: appointment.id } }) : router.push('/(tabs)/consultations')} style={styles.featureCard}><View style={[styles.featureIcon, { backgroundColor: '#2E86FF18' }]}><Icon name="calendar_today" size={24} color="#2E86FF" /></View><View style={styles.rightText}>{appointment ? <><AppText variant="caption" color={colors.textTertiary}>{t('nextAppointment')}</AppText><AppText variant="h6">{appointment.doctorName || appointment.type || t('consultation')}</AppText><AppText variant="caption" color={colors.textSecondary}>{[appointment.date, appointment.time].filter(Boolean).join(' · ')}</AppText></> : <><AppText variant="h6">{t('noAppointment')}</AppText><AppText variant="caption" color={colors.textTertiary}>{t('consultation')}</AppText></>}</View><Icon name="chevronLeft" size={20} color={colors.textTertiary} /></Card>
audit-work/source/nabd_plus_patient_app/app/(tabs)/diagnostics.tsx:96:            onPress={() => (router.push as any)('/diagnostics/orders')}
audit-work/source/nabd_plus_patient_app/app/(tabs)/diagnostics.tsx:180:            <TouchableOpacity onPress={() => (router.push as any)('/delivery/address-select')}>
audit-work/source/nabd_plus_patient_app/app/(tabs)/diagnostics.tsx:188:          <TouchableOpacity style={styles.insuranceCard} onPress={() => (router.push as any)('/diagnostics/insurance-upload')}>
audit-work/source/nabd_plus_patient_app/app/(tabs)/diagnostics.tsx:207:                <TouchableOpacity onPress={() => (router.push as any)('/diagnostics/packages')}>
audit-work/source/nabd_plus_patient_app/app/(tabs)/diagnostics.tsx:215:                    <TouchableOpacity style={[styles.pkgCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => (router.push as any)(`/diagnostics/package-detail?id=${pkg.id}&serviceType=${serviceType}`)}>
audit-work/source/nabd_plus_patient_app/app/(tabs)/diagnostics.tsx:248:                  <TouchableOpacity style={[styles.testItem, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => (router.push as any)(`/diagnostics/test-detail?id=${test.id}`)}>
audit-work/source/nabd_plus_patient_app/app/(tabs)/diagnostics.tsx:291:                    <TouchableOpacity style={[styles.labCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => (router.push as any)(`/diagnostics/lab/${lab.id}`)}>
audit-work/source/nabd_plus_patient_app/app/(tabs)/diagnostics.tsx:306:                  <TouchableOpacity style={[styles.testItem, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => (router.push as any)(`/diagnostics/test-detail?id=${test.id}`)}>
audit-work/source/nabd_plus_patient_app/app/(tabs)/diagnostics.tsx:358:                <TouchableOpacity style={[styles.testItem, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => (router.push as any)(`/diagnostics/test-detail?id=${rad.id}&isRadiology=true`)}>
audit-work/source/nabd_plus_patient_app/app/(tabs)/diagnostics.tsx:374:                    onPress={() => (router.push as any)({ pathname: '/diagnostics/checkout', params: { serviceType, labName: rad.name, total: String(rad.price || ''), isRadiology: 'true', radiologyType: rad.name, serviceId: rad.id } })}
audit-work/source/nabd_plus_patient_app/app/(tabs)/diagnostics.tsx:394:            onPress={() => (router.push as any)('/diagnostics/cart')}
audit-work/source/nabd_plus_patient_app/app/(tabs)/services.tsx:122:              onPress={() => router.push(srv.route as any)}
audit-work/source/nabd_plus_patient_app/app/(tabs)/services.tsx:168:              onPress={() => router.push(srv.route as any)}
audit-work/source/nabd_plus_patient_app/app/(tabs)/pharmacy.tsx:236:                onPress={() => router.push('/pharmacy/barcode-scanner')}
audit-work/source/nabd_plus_patient_app/app/(tabs)/pharmacy.tsx:259:              onPress={() => router.push('/pharmacy/filters')}
audit-work/source/nabd_plus_patient_app/app/(tabs)/pharmacy.tsx:276:              onPress={() => router.push('/pharmacy/scan-prescription')}
audit-work/source/nabd_plus_patient_app/app/(tabs)/pharmacy.tsx:300:              onPress={() => router.push('/pharmacy/order-history')}
audit-work/source/nabd_plus_patient_app/app/(tabs)/pharmacy.tsx:374:                onPress={() => router.push('/pharmacy/manual-order')}
audit-work/source/nabd_plus_patient_app/app/(tabs)/pharmacy.tsx:391:                onPress={() => router.push({ pathname: '/pharmacy/product-detail', params: { id: m.id, name: pickDbField(m, 'name') || m.name } })}
audit-work/source/nabd_plus_patient_app/app/(tabs)/pharmacy.tsx:448:                    onPress={() => router.push({ pathname: '/pharmacy/product-detail', params: { id: m.id, name: pickDbField(m, 'name') || m.name } })}
audit-work/source/nabd_plus_patient_app/app/(tabs)/pharmacy.tsx:538:            onPress={() => router.push('/pharmacy/cart')}
audit-work/source/nabd_plus_patient_app/app/(tabs)/health.tsx:150:            onPress={() => router.push("/health/health-id")}
audit-work/source/nabd_plus_patient_app/app/(tabs)/health.tsx:161:            onPress={() => router.push("/health/edit-profile")}
audit-work/source/nabd_plus_patient_app/app/(tabs)/health.tsx:182:                onPress={() => router.push(q.route as any)}
audit-work/source/nabd_plus_patient_app/app/(tabs)/health.tsx:210:              onPress={() => router.push("/health/vitals")}
audit-work/source/nabd_plus_patient_app/app/(tabs)/health.tsx:257:            onAction={() => router.push("/health/vitals")}
audit-work/source/nabd_plus_patient_app/app/(tabs)/health.tsx:267:                  onPress={() => router.push("/health/vitals")}
audit-work/source/nabd_plus_patient_app/app/(tabs)/health.tsx:314:          onPress={() => router.push("/(tabs)/nursing")}
audit-work/source/nabd_plus_patient_app/app/(tabs)/health.tsx:343:              onAction={() => router.push("/consultations/appointments")}
audit-work/source/nabd_plus_patient_app/app/(tabs)/health.tsx:347:                router.push({
audit-work/source/nabd_plus_patient_app/app/(tabs)/nursing.tsx:91:    router.push({ 
audit-work/source/nabd_plus_patient_app/app/(tabs)/nursing.tsx:99:    router.push({
audit-work/source/nabd_plus_patient_app/app/(tabs)/consultations/index.tsx:33:      router.push(`/consultations/doctor/${params?.doc?.id || params?.id || 'd1'}`);
audit-work/source/nabd_plus_patient_app/app/(tabs)/consultations/index.tsx:35:      router.push('/ai-assistant');
audit-work/source/nabd_plus_patient_app/app/(tabs)/consultations/index.tsx:257:        <TouchableOpacity onPress={() => router.push('/consultations/specialty-select')}><LocalizedText style={{ fontSize: 12, fontWeight: '700', color: resolveColor('var(--pd)') }}>عرض الكل</LocalizedText></TouchableOpacity>
audit-work/source/nabd_plus_patient_app/app/(tabs)/consultations/index.tsx:286:        <TouchableOpacity onPress={() => router.push('/consultations/doctor-search')}><LocalizedText style={{ fontSize: 12, fontWeight: '700', color: resolveColor('var(--pd)') }}>عرض الكل</LocalizedText></TouchableOpacity>
audit-work/source/nabd_plus_patient_app/app/(tabs)/consultations/index.tsx:374:        <TouchableOpacity onPress={() => router.push('/offers')}><LocalizedText style={{ fontSize: 12, fontWeight: '700', color: resolveColor('var(--pd)') }}>عرض الكل</LocalizedText></TouchableOpacity>
audit-work/source/nabd_plus_patient_app/app/(tabs)/consultations/index.tsx:378:          <TouchableOpacity key={p.id || i} activeOpacity={0.9} onPress={() => p.id && router.push(`/offers/${p.id}`)} style={[styles.promoCard, { backgroundColor: colors.s, borderColor: colors.bd } ]}>
audit-work/source/nabd_plus_patient_app/app/(tabs)/consultations/index.tsx:402:        <TouchableOpacity onPress={() => router.push('/consultations/doctor-search')}><LocalizedText style={{ fontSize: 12, fontWeight: '700', color: resolveColor('var(--pd)') }}>عرض الكل</LocalizedText></TouchableOpacity>
audit-work/source/nabd_plus_patient_app/app/(tabs)/consultations/index.tsx:490:          <TouchableOpacity onPress={() => router.push('/consultations/doctor-search')} style={{ alignItems: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: colors.s, borderWidth: 1, borderColor: colors.bd }}>
audit-work/source/nabd_plus_patient_app/app/delivery/address-select.tsx:73:          onPress={() => router.push('/shared/location-picker')}
audit-work/source/nabd_plus_patient_app/app/delivery/address-select.tsx:135:          onPress={() => router.push('/shared/location-picker')}
audit-work/source/nabd_plus_patient_app/app/consultations/specialty-select.tsx:86:              router.push({
audit-work/source/nabd_plus_patient_app/app/consultations/share-report.tsx:151:              onPress={() => router.push("/reports/hub")}
audit-work/source/nabd_plus_patient_app/app/consultations/appointments.tsx:162:                  onPress={() => router.push("/(tabs)/consultations")}
audit-work/source/nabd_plus_patient_app/app/consultations/appointments.tsx:187:                router.push({
audit-work/source/nabd_plus_patient_app/app/consultations/appointments.tsx:266:                      router.push({
audit-work/source/nabd_plus_patient_app/app/consultations/appointments.tsx:280:                        router.push({
audit-work/source/nabd_plus_patient_app/app/consultations/appointments.tsx:300:                    router.push({
audit-work/source/nabd_plus_patient_app/app/consultations/video-call.tsx:158:    router.replace({
audit-work/source/nabd_plus_patient_app/app/consultations/virtual-waiting-room.tsx:188:          router.push({
audit-work/source/nabd_plus_patient_app/app/consultations/prescription-from-doctor.tsx:63:      router.push("/pharmacy/rx-order");
audit-work/source/nabd_plus_patient_app/app/consultations/prescription-from-doctor.tsx:230:                        router.push({
audit-work/source/nabd_plus_patient_app/app/consultations/prescription-from-doctor.tsx:285:              onPress={() => router.push("/consultations/follow-up")}
audit-work/source/nabd_plus_patient_app/app/consultations/prescription-from-doctor.tsx:335:              onPress={() => router.push("/diagnostics/search")}
audit-work/source/nabd_plus_patient_app/app/consultations/summary.tsx:72:    router.push({
audit-work/source/nabd_plus_patient_app/app/consultations/summary.tsx:141:              onPress={() => router.push({ pathname: '/consultations/prescription-from-doctor', params: { appointmentId } })}
audit-work/source/nabd_plus_patient_app/app/consultations/summary.tsx:169:          onPress={() => router.push({ pathname: '/consultations/post-call-rating', params: { appointmentId } })}
audit-work/source/nabd_plus_patient_app/app/consultations/doctor-search.tsx:179:                router.push({
audit-work/source/nabd_plus_patient_app/app/consultations/doctor-search.tsx:185:                router.push({
audit-work/source/nabd_plus_patient_app/app/consultations/incoming-call.tsx:54:    router.replace({
audit-work/source/nabd_plus_patient_app/app/consultations/booking-success.tsx:54:      router.push("/(tabs)/consultations");
audit-work/source/nabd_plus_patient_app/app/consultations/booking-success.tsx:58:      router.push("/consultations/appointments");
audit-work/source/nabd_plus_patient_app/app/consultations/booking-success.tsx:62:    router.push({
audit-work/source/nabd_plus_patient_app/app/consultations/booking-success.tsx:283:            onPress={() => router.push("/(tabs)")}
audit-work/source/nabd_plus_patient_app/app/consultations/clinic-confirm.tsx:74:      router.push({ pathname: '/consultations/clinic-location', params: { appointmentId } });
audit-work/source/nabd_plus_patient_app/app/consultations/clinic-confirm.tsx:90:    router.push({ pathname: '/consultations/chat-with-doctor', params: { doctorId: appt.doctor_user_id || appt.doctor_id, appointmentId } });
audit-work/source/nabd_plus_patient_app/app/consultations/clinic-confirm.tsx:94:    router.push({ pathname: '/consultations/cancel-reschedule', params: { appointmentId } });
audit-work/source/nabd_plus_patient_app/app/consultations/clinic-confirm.tsx:103:        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={{ width: 40, alignItems: 'center' }}>
audit-work/source/nabd_plus_patient_app/app/consultations/appointment-detail.tsx:86:              onPress={() => router.push({ pathname: '/consultations/doctor/[id]', params: { id: appointment?.doctor_id || '1' } })}
audit-work/source/nabd_plus_patient_app/app/consultations/appointment-detail.tsx:127:            onPress={() => router.push({ pathname: '/consultations/summary', params: { appointmentId: appointment?.id } })}
audit-work/source/nabd_plus_patient_app/app/consultations/appointment-detail.tsx:142:            onPress={() => router.push({ pathname: '/reviews', params: { booking_kind: 'appointment', booking_id: appointment?.id, providerName: appointment?.doctor?.name || appointment?.doctor_name || '' } })}
audit-work/source/nabd_plus_patient_app/app/consultations/appointment-detail.tsx:188:                      router.push({ pathname: '/insurance/payment-split', params: { request_id: request.id } });
audit-work/source/nabd_plus_patient_app/app/consultations/appointment-detail.tsx:201:          onPress={() => router.push({ pathname: '/consultations/cancel-reschedule', params: { appointmentId: appointment?.id } })}
audit-work/source/nabd_plus_patient_app/app/consultations/appointment-detail.tsx:207:            onPress={() => router.push({ pathname: '/consultations/virtual-waiting-room', params: { appointmentId: appointment?.id } })}
audit-work/source/nabd_plus_patient_app/app/consultations/appointment-detail.tsx:217:            onPress={() => router.push({ pathname: '/consultations/clinic-location', params: { appointmentId: appointment?.id } })}
audit-work/source/nabd_plus_patient_app/app/consultations/appointment-detail.tsx:227:            onPress={() => router.push({ pathname: '/consultations/home-visit-tracking', params: { appointmentId: appointment?.id } })}
audit-work/source/nabd_plus_patient_app/app/consultations/doctor-profile.tsx:20:      router.replace(`/consultations/doctor/${doctorId}`);
audit-work/source/nabd_plus_patient_app/app/consultations/doctor-profile.tsx:22:      router.replace('/consultations/doctor-search');
audit-work/source/nabd_plus_patient_app/app/consultations/follow-up.tsx:147:                onPress={() => router.push('/(tabs)/pharmacy')}
audit-work/source/nabd_plus_patient_app/app/consultations/follow-up.tsx:184:                onPress={() => router.push({ pathname: '/consultations/chat-with-doctor', params: { doctorId: appt.doctor_id } } as any)}
audit-work/source/nabd_plus_patient_app/app/consultations/follow-up.tsx:192:                onPress={() => router.push({ pathname: '/consultations/book/[id]', params: { id: appt.doctor_id } } as any)}
audit-work/source/nabd_plus_patient_app/app/consultations/home-visit-tracking.tsx:107:              router.push({ pathname: '/consultations/chat-with-doctor', params: { doctorId } });
audit-work/source/nabd_plus_patient_app/app/consultations/waiting-room.tsx:244:          onPress={() => router.replace("/(tabs)/consultations")}
audit-work/source/nabd_plus_patient_app/app/consultations/booking-confirm.tsx:122:          const baseUrl = API_BASE_URL.replace('https://api.nabdahplus.com/v1', `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8002'}/api/v1`);
audit-work/source/nabd_plus_patient_app/app/consultations/booking-confirm.tsx:123:          const res = await fetch(`${baseUrl}/insurance/coverage-check?provider_id=${params.doctorId}&service_type=consultation`, {
audit-work/source/nabd_plus_patient_app/app/consultations/booking-confirm.tsx:216:        router.replace({
audit-work/source/nabd_plus_patient_app/app/consultations/booking-confirm.tsx:234:        router.replace({ pathname: '/insurance/payment-split', params: { request_id: insuranceRequest.id } });
audit-work/source/nabd_plus_patient_app/app/consultations/booking-confirm.tsx:241:        router.replace({
audit-work/source/nabd_plus_patient_app/app/consultations/booking-confirm.tsx:350:                <Button label="تعديل بيانات التأمين" variant="ghost" icon="edit" onPress={() => router.push('/profile/insurance')} />
audit-work/source/nabd_plus_patient_app/app/consultations/booking-pending.tsx:52:      router.replace({ pathname: '/consultations/clinic-confirm', params: { appointmentId: id } });
audit-work/source/nabd_plus_patient_app/app/consultations/booking-pending.tsx:54:      router.replace({ pathname: '/consultations/home-visit-tracking', params: { appointmentId: id } });
audit-work/source/nabd_plus_patient_app/app/consultations/booking-pending.tsx:56:      router.replace({ pathname: '/consultations/virtual-waiting-room', params: { appointmentId: id } });
audit-work/source/nabd_plus_patient_app/app/consultations/booking-pending.tsx:137:            <Button label={AR ? 'حجز موعد آخر' : 'Book another appointment'} onPress={() => router.replace('/consultations/doctor-search')} />
audit-work/source/nabd_plus_patient_app/app/consultations/booking-pending.tsx:138:            <Button variant="outline" label={AR ? 'العودة للرئيسية' : 'Back to home'} onPress={() => router.replace('/(tabs)')} />
audit-work/source/nabd_plus_patient_app/app/consultations/cancel-reschedule.tsx:112:          { text: 'حسناً', onPress: () => router.replace('/consultations/appointments') },
audit-work/source/nabd_plus_patient_app/app/consultations/cancel-reschedule.tsx:123:          { text: 'حسناً', onPress: () => router.replace('/consultations/appointments') },
audit-work/source/nabd_plus_patient_app/app/consultations/post-call-rating.tsx:47:      router.replace('/(tabs)/consultations');
audit-work/source/nabd_plus_patient_app/app/consultations/post-call-rating.tsx:59:        <TouchableOpacity onPress={() => router.replace('/(tabs)/consultations')} style={{ width: 40, height: 40, justifyContent: 'center' }}>
audit-work/source/nabd_plus_patient_app/app/consultations/call-history.tsx:87:    router.push({
audit-work/source/nabd_plus_patient_app/app/consultations/book/[id].tsx:158:    router.push({
audit-work/source/nabd_plus_patient_app/app/consultations/book/[id].tsx:329:                <TouchableOpacity onPress={() => router.push('/delivery/address-select')}>
audit-work/source/nabd_plus_patient_app/app/consultations/book/[id].tsx:334:              <Button label="اختيار عنوان الزيارة" variant="outline" icon="location" onPress={() => router.push('/delivery/address-select')} />
audit-work/source/nabd_plus_patient_app/app/consultations/clinic/[id].tsx:95:                  <TouchableOpacity key={doc.id || i} onPress={() => router.push(`/consultations/doctor-profile?doctorId=${doc.id}`)} style={{ width: 140, backgroundColor: colors.surface, borderRadius: 16, padding: 12, alignItems: 'center' }}>
audit-work/source/nabd_plus_patient_app/app/consultations/doctor/[id].tsx:26:      (router.push as any)({
audit-work/source/nabd_plus_patient_app/app/consultations/doctor/[id].tsx:239:              <TouchableOpacity onPress={() => doc?.facility_id && router.push(`/consultations/clinic/${doc.facility_id}`)} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: 14, backgroundColor: 'rgba(255,255,255,0.4)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
audit-work/source/nabd_plus_patient_app/app/consultations/doctor/[id].tsx:530:              (router.push as any)({
audit-work/source/nabd_plus_patient_app/app/wallet/hub.tsx:209:              onPress={() => router.push(action.route as any)}
audit-work/source/nabd_plus_patient_app/app/wallet/hub.tsx:285:            <TouchableOpacity onPress={() => router.push('/wallet/transactions')}>
audit-work/source/nabd_plus_patient_app/app/wallet/hub.tsx:316:          onPress={() => router.push('/loyalty/hub')}
audit-work/source/nabd_plus_patient_app/app/wallet/topup.tsx:55:      router.push({
audit-work/source/nabd_plus_patient_app/app/(auth)/welcome.tsx:21:    if (screen === 'sH') router.push('/(tabs)');
audit-work/source/nabd_plus_patient_app/app/(auth)/welcome.tsx:22:    else if (screen === 's86') router.push('/(auth)/register');
audit-work/source/nabd_plus_patient_app/app/(auth)/welcome.tsx:23:    else if (screen === 's85') router.push('/(auth)/login');
audit-work/source/nabd_plus_patient_app/app/(auth)/welcome.tsx:150:          <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={[styles.modernSocialBtn, { backgroundColor: isDark ? '#1A2540' : '#FFFFFF' }]} activeOpacity={0.8}>
audit-work/source/nabd_plus_patient_app/app/(auth)/welcome.tsx:156:          <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={[styles.modernSocialBtn, { backgroundColor: isDark ? '#FFFFFF' : '#000000' }]} activeOpacity={0.8}>
audit-work/source/nabd_plus_patient_app/app/(auth)/welcome.tsx:162:          <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={[styles.modernSocialBtn, { backgroundColor: '#FFFC00' }]} activeOpacity={0.8}>
audit-work/source/nabd_plus_patient_app/app/(auth)/welcome.tsx:167:          <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={[styles.modernSocialBtn, { backgroundColor: isDark ? '#1A2540' : '#FFFFFF' }]} activeOpacity={0.8}>
audit-work/source/nabd_plus_patient_app/app/(auth)/terms.tsx:66:    fetch(`${BASE_URL}/legal/policy/patient_terms?lang=${AR ? "ar" : "en"}`)
audit-work/source/nabd_plus_patient_app/app/(auth)/forgot-password.tsx:38:      router.push({
audit-work/source/nabd_plus_patient_app/app/(auth)/reset-password.tsx:77:          onPress={() => router.replace("/(auth)/login")}
audit-work/source/nabd_plus_patient_app/app/(auth)/login.tsx:70:      scopes: ['https://auth.snapchat.com/oauth2/api/user.display_name'],
audit-work/source/nabd_plus_patient_app/app/(auth)/login.tsx:103:        router.replace('/(auth)/provider-info' as any);
audit-work/source/nabd_plus_patient_app/app/(auth)/login.tsx:105:        router.replace('/(tabs)');
audit-work/source/nabd_plus_patient_app/app/(auth)/login.tsx:177:        router.replace('/(auth)/provider-info' as any);
audit-work/source/nabd_plus_patient_app/app/(auth)/login.tsx:179:        router.replace('/(tabs)');
audit-work/source/nabd_plus_patient_app/app/(auth)/login.tsx:283:          <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
audit-work/source/nabd_plus_patient_app/app/(auth)/login.tsx:307:          onPress={() => router.push({ pathname: '/(auth)/otp', params: { phone: '+966' + phone.replace(/^0+/, ''), mode: 'login' } })} 
audit-work/source/nabd_plus_patient_app/app/(auth)/login.tsx:347:          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
audit-work/source/nabd_plus_patient_app/app/(auth)/register.tsx:92:      scopes: ['https://auth.snapchat.com/oauth2/api/user.display_name'],
audit-work/source/nabd_plus_patient_app/app/(auth)/register.tsx:125:        router.replace('/(auth)/provider-info' as any);
audit-work/source/nabd_plus_patient_app/app/(auth)/register.tsx:127:        router.replace('/(tabs)');
audit-work/source/nabd_plus_patient_app/app/(auth)/register.tsx:182:      router.push({
audit-work/source/nabd_plus_patient_app/app/(auth)/register.tsx:277:            أوافق على <LocalizedText onPress={() => router.push('/(auth)/terms')} style={{ color: resolveColor('var(--p)', isDark), fontWeight: '800' }}>الشروط والأحكام</LocalizedText> و<LocalizedText onPress={() => router.push('/(auth)/privacy')} style={{ color: resolveColor('var(--p)', isDark), fontWeight: '800' }}>سياسة الخصوصية</LocalizedText>
audit-work/source/nabd_plus_patient_app/app/(auth)/register.tsx:328:          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
audit-work/source/nabd_plus_patient_app/app/(auth)/otp.tsx:89:          router.replace({ pathname: '/(auth)/reset-password', params: { email: emailParam } });
audit-work/source/nabd_plus_patient_app/app/(auth)/otp.tsx:139:        router.replace('/(auth)/provider-info' as any);
audit-work/source/nabd_plus_patient_app/app/(auth)/otp.tsx:141:        router.replace('/(tabs)');
audit-work/source/nabd_plus_patient_app/app/(auth)/provider-info.tsx:15:    router.replace("/(tabs)");
audit-work/source/nabd_plus_patient_app/app/(auth)/provider-info.tsx:19:    router.replace("/(auth)/login");
audit-work/source/nabd_plus_patient_app/app/(auth)/privacy.tsx:70:    fetch(`${BASE_URL}/legal/policy/privacy_policy?lang=${AR ? "ar" : "en"}`)
audit-work/source/nabd_plus_patient_app/app/returns/hub.tsx:124:            onPress={() => router.push("/returns/new-request")}
audit-work/source/nabd_plus_patient_app/app/returns/hub.tsx:245:                  router.push({
audit-work/source/nabd_plus_patient_app/app/returns/hub.tsx:308:          onPress={() => router.push("/returns/new-request")}
audit-work/source/nabd_plus_patient_app/app/returns/new-request.tsx:98:        <TouchableOpacity onPress={() => router.replace('/returns/hub')} style={styles.doneBtn}>
audit-work/source/nabd_plus_patient_app/app/returns/new-request.tsx:101:        <TouchableOpacity onPress={() => router.replace('/(tabs)')}><AppText variant="bodySM">الرئيسية</AppText></TouchableOpacity>
audit-work/source/nabd_plus_patient_app/app/pharmacy/cart.tsx:65:    router.push('/pharmacy/checkout');
audit-work/source/nabd_plus_patient_app/app/pharmacy/cart.tsx:178:                  onPress={() => router.push('/(tabs)/consultations')}
audit-work/source/nabd_plus_patient_app/app/pharmacy/cart.tsx:198:          onPress={() => router.push('/pharmacy/manual-order')}
audit-work/source/nabd_plus_patient_app/app/pharmacy/barcode-scanner.tsx:48:        router.push({ pathname: '/pharmacy/product-detail', params: { id: m.id || m._id, name: pickLocalized(m.name_ar, m.name_en) } });
audit-work/source/nabd_plus_patient_app/app/pharmacy/barcode-scanner.tsx:50:        router.push({ pathname: '/search', params: { q: name } });
audit-work/source/nabd_plus_patient_app/app/pharmacy/barcode-scanner.tsx:97:    router.push({ pathname: '/pharmacy/product-detail', params: { id: result.id || result.barcode, name: result.name } });
audit-work/source/nabd_plus_patient_app/app/pharmacy/barcode-scanner.tsx:160:          <TouchableOpacity onPress={() => router.push('/pharmacy/drug-not-found')} style={{ marginTop: 16 }}>
audit-work/source/nabd_plus_patient_app/app/pharmacy/barcode-scanner.tsx:214:                <Button label="إضافة الدواء يدوياً" variant="outline" icon="add" onPress={() => router.push('/pharmacy/drug-not-found')} />
audit-work/source/nabd_plus_patient_app/app/pharmacy/drug-not-found.tsx:62:        <Button label="العودة للصيدلية" variant="gradient" icon="medication" onPress={() => router.replace('/(tabs)/pharmacy')} style={{ marginTop: 16, width: '80%' }} />
audit-work/source/nabd_plus_patient_app/app/pharmacy/filters.tsx:109:    router.replace({
audit-work/source/nabd_plus_patient_app/app/pharmacy/scan-prescription.tsx:119:      router.push(added ? '/pharmacy/cart' : '/pharmacy/rx-order');
audit-work/source/nabd_plus_patient_app/app/pharmacy/chat-with-pharmacist.tsx:192:            router.push('/pharmacy/cart');
audit-work/source/nabd_plus_patient_app/app/pharmacy/custom-item.tsx:116:          onPress={() => router.replace("/(tabs)/pharmacy")}
audit-work/source/nabd_plus_patient_app/app/pharmacy/order-confirm.tsx:55:      router.push({ pathname: '/pharmacy/payment', params: { orderId, total: order?.total || 0 } });
audit-work/source/nabd_plus_patient_app/app/pharmacy/order-confirm.tsx:66:      router.replace({ pathname: '/pharmacy/waiting-for-pharmacy', params: { orderId } });
audit-work/source/nabd_plus_patient_app/app/pharmacy/manual-order.tsx:47:    router.push('/pharmacy/cart');
audit-work/source/nabd_plus_patient_app/app/pharmacy/product-detail.tsx:85:    if (i >= 0 && next) router.push({ pathname: '/pharmacy/product-detail', params: { id: next } });
audit-work/source/nabd_plus_patient_app/app/pharmacy/product-detail.tsx:238:        <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/pharmacy/cart')}>
audit-work/source/nabd_plus_patient_app/app/pharmacy/product-detail.tsx:364:                    <TouchableOpacity key={alt.id} style={[styles.altCard, { backgroundColor: colors.s, borderColor: colors.bd }]} onPress={() => router.push({ pathname: '/pharmacy/product-detail', params: { id: alt.id } })}>
audit-work/source/nabd_plus_patient_app/app/pharmacy/product-detail.tsx:386:                    <TouchableOpacity key={alt.id} style={[styles.altCard, { backgroundColor: colors.s, borderColor: colors.bd }]} onPress={() => router.push({ pathname: '/pharmacy/product-detail', params: { id: alt.id } })}>
audit-work/source/nabd_plus_patient_app/app/pharmacy/pharmacist-chat.tsx:122:            onPress={() => router.replace("/pharmacy/cart")}
audit-work/source/nabd_plus_patient_app/app/pharmacy/pharmacist-chat.tsx:242:                            ? router.push({ pathname: "/pharmacy/payment", params: { orderId: activeOrderId } })
audit-work/source/nabd_plus_patient_app/app/pharmacy/pharmacist-chat.tsx:243:                            : router.push("/pharmacy/order-history")
audit-work/source/nabd_plus_patient_app/app/pharmacy/order-history.tsx:108:    router.push("/pharmacy/cart");
audit-work/source/nabd_plus_patient_app/app/pharmacy/order-history.tsx:197:                router.push({
audit-work/source/nabd_plus_patient_app/app/pharmacy/payment.tsx:69:      router.replace({ pathname: '/pharmacy/order-tracking', params: { orderId } });
audit-work/source/nabd_plus_patient_app/app/pharmacy/payment.tsx:74:      router.replace({ pathname: '/pharmacy/order-tracking', params: { orderId } });
audit-work/source/nabd_plus_patient_app/app/pharmacy/payment.tsx:80:      router.replace({ pathname: '/pharmacy/order-tracking', params: { orderId } });
audit-work/source/nabd_plus_patient_app/app/pharmacy/payment.tsx:87:      router.push({
audit-work/source/nabd_plus_patient_app/app/pharmacy/order-tracking.tsx:82:    fetch();
audit-work/source/nabd_plus_patient_app/app/pharmacy/order-tracking.tsx:100:          onPress={() => router.replace('/(tabs)/pharmacy')}
audit-work/source/nabd_plus_patient_app/app/pharmacy/order-tracking.tsx:126:            onPress={() => router.push('/pharmacy/chat-with-pharmacist')}
audit-work/source/nabd_plus_patient_app/app/pharmacy/order-tracking.tsx:206:            onPress={() => router.push({ pathname: '/reviews', params: { booking_kind: 'pharmacy', booking_id: orderIdStr, providerName: orderData?.pharmacy_name || '' } })}
audit-work/source/nabd_plus_patient_app/app/pharmacy/wishlist.tsx:163:                router.push({
audit-work/source/nabd_plus_patient_app/app/pharmacy/broadcast-status.tsx:47:      router.replace({ pathname: '/pharmacy/order-tracking', params: { orderId } });
audit-work/source/nabd_plus_patient_app/app/pharmacy/waiting-for-pharmacy.tsx:103:          router.replace({
audit-work/source/nabd_plus_patient_app/app/pharmacy/waiting-for-pharmacy.tsx:133:            router.replace("/(tabs)/pharmacy");
audit-work/source/nabd_plus_patient_app/app/pharmacy/reorder.tsx:67:      router.replace({ pathname: '/pharmacy/waiting-for-pharmacy', params: { orderId: nextOrderId } });
audit-work/source/nabd_plus_patient_app/app/pharmacy/reorder.tsx:127:        <Button label="إضافة أصناف جديدة" variant="outline" icon="add" onPress={() => router.push('/(tabs)/pharmacy')} />
audit-work/source/nabd_plus_patient_app/app/pharmacy/rx-order.tsx:57:      router.replace('/pharmacy/checkout');
audit-work/source/nabd_plus_patient_app/app/pharmacy/checkout.tsx:107:            router.push('/profile/insurance');
audit-work/source/nabd_plus_patient_app/app/pharmacy/checkout.tsx:117:    router.push('/shared/location-picker');
audit-work/source/nabd_plus_patient_app/app/pharmacy/checkout.tsx:172:        router.replace({ pathname: '/pharmacy/order-tracking', params: { orderId } });
audit-work/source/nabd_plus_patient_app/app/pharmacy/checkout.tsx:176:      router.push({ pathname: '/pharmacy/waiting-for-pharmacy', params: { orderId } });
audit-work/source/nabd_plus_patient_app/app/settings/index.tsx:83:      router.push("/settings/language");
audit-work/source/nabd_plus_patient_app/app/settings/index.tsx:89:      router.replace("/(auth)/welcome");
audit-work/source/nabd_plus_patient_app/app/settings/index.tsx:92:    if (item.route) router.push(item.route as any);
audit-work/source/nabd_plus_patient_app/app/settings/help.tsx:93:                if (opt.route) router.push(opt.route as any);
audit-work/source/nabd_plus_patient_app/app/settings/help.tsx:160:          onPress={() => router.push("/settings/support-chat")}
audit-work/source/nabd_plus_patient_app/app/settings/data.tsx:54:      action: () => router.push("/settings/privacy"),
audit-work/source/nabd_plus_patient_app/app/settings/about.tsx:221:              onPress={() => router.push("/settings/terms")}
audit-work/source/nabd_plus_patient_app/app/settings/about.tsx:238:              onPress={() => router.push("/settings/privacy")}
audit-work/source/nabd_plus_patient_app/app/insurance/hub.tsx:205:          <IconButton icon="add" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.push('/insurance/add-policy')} />
audit-work/source/nabd_plus_patient_app/app/insurance/hub.tsx:284:              onPress={() => router.push(a.route as any)}
audit-work/source/nabd_plus_patient_app/app/insurance/hub.tsx:297:            <TouchableOpacity onPress={() => router.push('/insurance/benefits-summary')}>
audit-work/source/nabd_plus_patient_app/app/insurance/hub.tsx:329:            <TouchableOpacity onPress={() => router.push('/insurance/policy-detail' as any)}>
audit-work/source/nabd_plus_patient_app/app/insurance/hub.tsx:354:            <TouchableOpacity onPress={() => router.push('/insurance/add-policy')}>
audit-work/source/nabd_plus_patient_app/app/insurance/hub.tsx:362:              onPress={() => router.push({ pathname: '/insurance/policy-detail', params: { policyId: policy.id } })}
audit-work/source/nabd_plus_patient_app/app/insurance/hub.tsx:387:            <TouchableOpacity onPress={() => router.push('/insurance/claim-tracking')}>
audit-work/source/nabd_plus_patient_app/app/insurance/hub.tsx:399:              onPress={() => router.push('/insurance/claim-tracking')}
audit-work/source/nabd_plus_patient_app/app/insurance/network-providers.tsx:177:                <TouchableOpacity onPress={() => router.push("/insurance/add-policy")}>
audit-work/source/nabd_plus_patient_app/app/insurance/add-policy.tsx:91:      router.replace('/insurance/hub');
audit-work/source/nabd_plus_patient_app/app/insurance/claim-tracking.tsx:48:        <TouchableOpacity onPress={() => router.push('/insurance/submit-claim')} style={[styles.newClaimBtn, { backgroundColor: '#1a1a2e' } ]}>
audit-work/source/nabd_plus_patient_app/app/insurance/claim-tracking.tsx:108:                  <TouchableOpacity onPress={() => router.push('/support/chat')}><AppText variant="bodySM" color={colors.primary}>تقديم اعتراض عبر الدعم</AppText></TouchableOpacity>
audit-work/source/nabd_plus_patient_app/app/insurance/claim-tracking.tsx:112:                <TouchableOpacity onPress={() => router.push('/insurance/refund-status')}
audit-work/source/nabd_plus_patient_app/app/insurance/coverage-check.tsx:140:                onPress={() => router.push('/support/chat')}
audit-work/source/nabd_plus_patient_app/app/insurance/copay.tsx:58:      router.replace({ pathname: '/payments/processing', params: { moyasarId: txn.id, paymentUrl: txn.checkout_url || '', bookingId: copayRequest.id, bookingKind: 'insurance', amount: String(txn.amount ?? dueAmount) } });
audit-work/source/nabd_plus_patient_app/app/insurance/payment-split.tsx:46:        router.replace({ pathname: '/payments/processing', params: { moyasarId: txn.id, paymentUrl: txn.checkout_url || '', bookingId: request.id, bookingKind: 'insurance', amount: String(txn.amount) } });
audit-work/source/nabd_plus_patient_app/app/insurance/payment-split.tsx:69:        {action === 'paid' && <Button label="العودة إلى حجوزاتي" onPress={() => router.replace('/(tabs)')} />}
audit-work/source/nabd_plus_patient_app/app/insurance/policy-detail.tsx:71:            <TouchableOpacity onPress={() => router.push('/insurance/add-policy')}>
audit-work/source/nabd_plus_patient_app/app/insurance/policy-detail.tsx:107:          onPress={() => router.push("/insurance/coverage-check")}
audit-work/source/nabd_plus_patient_app/app/insurance/approval-pending.tsx:87:        <Button label="متابعة حالة الطلبات" variant="ghost" icon="refresh" onPress={() => router.push('/insurance/claim-tracking')} />
audit-work/source/nabd_plus_patient_app/app/insurance/approval-pending.tsx:103:            <Button label={`ادفع كاش — ${totalAmount} ر.س`} variant="gradient" icon="card" onPress={() => router.push('/payments/processing')} />
audit-work/source/nabd_plus_patient_app/app/insurance/approval-pending.tsx:105:          <Button label="اتصل بشركة التأمين" variant="outline" icon="call" onPress={() => router.replace('/(tabs)/consultations')} />
audit-work/source/nabd_plus_patient_app/app/insurance/approval-pending.tsx:177:        <Button label={copayAmount !== null && copayAmount > 0 ? `تأكيد ودفع ${copayAmount} ر.س` : 'تأكيد'} variant="gradient" size="lg" icon="check_circle" onPress={() => router.push('/payments/processing')} />
audit-work/source/nabd_plus_patient_app/app/emergency/sos.tsx:67:                router.push({
audit-work/source/nabd_plus_patient_app/app/emergency/sos.tsx:206:            onPress={() => router.push("/emergency/tracking" as never)}
audit-work/source/nabd_plus_patient_app/app/emergency/sos-active.tsx:81:                { text: 'حسناً', onPress: () => router.push('/(tabs)/index' as any) }
audit-work/source/nabd_plus_patient_app/app/emergency/tracking.tsx:60:          {!data?.error && <Button title="طلب إسعاف" onPress={() => router.push('/emergency/sos' as never)} />}
audit-work/source/nabd_plus_patient_app/app/programs/active.tsx:104:        <IconButton icon="sparkles" onPress={() => router.push('/loyalty/hub' as any)} />

## nabdah-backend
audit-work/source/nabdah-backend/src/app.module.ts:96:import { WebhooksModule } from './modules/webhooks/webhooks.module';
audit-work/source/nabdah-backend/src/health.controller.ts:7:@Controller()
audit-work/source/nabdah-backend/src/health.controller.ts:15:  @Get()
audit-work/source/nabdah-backend/src/health.controller.ts:26:  @Get('health/liveness')
audit-work/source/nabdah-backend/src/health.controller.ts:32:  @Get('health/readiness')
audit-work/source/nabdah-backend/src/modules/analytics/analytics.module.ts:120:@Controller('admin/analytics')
audit-work/source/nabdah-backend/src/modules/analytics/analytics.module.ts:126:  @Get('overview')
audit-work/source/nabdah-backend/src/modules/analytics/analytics.module.ts:129:  @Get('top-searched')
audit-work/source/nabdah-backend/src/modules/analytics/analytics.module.ts:132:  @Get('top-medicines')
audit-work/source/nabdah-backend/src/modules/analytics/analytics.module.ts:135:  @Get('top-doctors')
audit-work/source/nabdah-backend/src/modules/analytics/analytics.module.ts:138:  @Get('top-pharmacies')
audit-work/source/nabdah-backend/src/modules/analytics/analytics.module.ts:141:  @Get('top-services')
audit-work/source/nabdah-backend/src/modules/storage/storage.module.ts:346:@Controller('storage')
audit-work/source/nabdah-backend/src/modules/storage/storage.module.ts:349:  @Post('upload')
audit-work/source/nabdah-backend/src/modules/storage/storage.module.ts:360:  @Get(':id')
audit-work/source/nabdah-backend/src/modules/storage/storage.module.ts:370:  @Get(':id/signed-url')
audit-work/source/nabdah-backend/src/modules/storage/storage.module.ts:381:  @Post('upload-suggestion-image')
audit-work/source/nabdah-backend/src/modules/storage/storage.module.ts:398:  @Post('upload-cloudinary')
audit-work/source/nabdah-backend/src/modules/users/users.controller.ts:7:@Controller('users')
audit-work/source/nabdah-backend/src/modules/users/users.controller.ts:13:  @Get('me/display')
audit-work/source/nabdah-backend/src/modules/users/users.controller.ts:19:  @Patch('me')
audit-work/source/nabdah-backend/src/modules/users/users.controller.ts:24:  @Get('me/health-id')
audit-work/source/nabdah-backend/src/modules/users/users.controller.ts:29:  @Get('me/profile')
audit-work/source/nabdah-backend/src/modules/users/users.controller.ts:34:  @Patch('me/profile')
audit-work/source/nabdah-backend/src/modules/users/users.controller.ts:39:  @Get('me/wishlist')
audit-work/source/nabdah-backend/src/modules/users/users.controller.ts:44:  @Post('me/wishlist/:itemId')
audit-work/source/nabdah-backend/src/modules/users/users.controller.ts:50:  @Get('me/notification-settings')
audit-work/source/nabdah-backend/src/modules/users/users.controller.ts:55:  @Patch('me/notification-settings')
audit-work/source/nabdah-backend/src/modules/users/users.controller.ts:61:  @Get('me/storage')
audit-work/source/nabdah-backend/src/modules/users/users.controller.ts:66:  @Get('me/privacy-settings')
audit-work/source/nabdah-backend/src/modules/users/users.controller.ts:71:  @Patch('me/privacy-settings')
audit-work/source/nabdah-backend/src/modules/users/users.controller.ts:76:  @Get('me/security-settings')
audit-work/source/nabdah-backend/src/modules/users/users.controller.ts:81:  @Patch('me/security-settings')
audit-work/source/nabdah-backend/src/modules/users/users.controller.ts:86:  @Post('me/change-password')
audit-work/source/nabdah-backend/src/modules/users/users.controller.ts:91:  @Get('me/sessions')
audit-work/source/nabdah-backend/src/modules/users/users.controller.ts:95:  @Delete('me/sessions/:jti')
audit-work/source/nabdah-backend/src/modules/users/users.controller.ts:100:  @Get()
audit-work/source/nabdah-backend/src/modules/users/users.controller.ts:106:  @Post(':id/toggle')
audit-work/source/nabdah-backend/src/modules/users/users.controller.ts:112:  @Delete(':id')
audit-work/source/nabdah-backend/src/modules/users/user.insurance.controller.ts:14:@Controller('user')
audit-work/source/nabdah-backend/src/modules/users/user.insurance.controller.ts:21:  @Get('insurance')
audit-work/source/nabdah-backend/src/modules/users/users.addresses.controller.ts:6:@Controller('users/me/addresses')
audit-work/source/nabdah-backend/src/modules/users/users.addresses.controller.ts:11:  @Get()
audit-work/source/nabdah-backend/src/modules/users/users.addresses.controller.ts:17:  @Post()
audit-work/source/nabdah-backend/src/modules/users/users.addresses.controller.ts:34:  @Patch(':addressId')
audit-work/source/nabdah-backend/src/modules/users/users.addresses.controller.ts:52:  @Delete(':addressId')
audit-work/source/nabdah-backend/src/modules/users/users.insurance.controller.ts:35:@Controller('users/me/insurance')
audit-work/source/nabdah-backend/src/modules/users/users.insurance.controller.ts:40:  @Get()
audit-work/source/nabdah-backend/src/modules/users/users.insurance.controller.ts:56:  @Post()
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:176:@Controller('bookings')
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:179:  @Get('quote') quote(@Query() q: any) {
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:456:@Controller('insurance')
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:462:  @Get('companies') companies() { return this.svc.companiesList(); }
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:463:  @Post('save-policy') savePolicy(@CurrentUser() u: any, @Body() b: any) { return this.svc.savePolicy(u, b); }
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:464:  @Get('my-policy') myPolicy(@CurrentUser() u: any) { return this.svc.myPolicy(u); }
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:466:  @Get('coverage-check') async coverageCheck(@CurrentUser() u: any, @Query() q: any) {
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:478:  @Get('benefits-summary') async benefits(@CurrentUser() u: any) {
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:483:  @Post('requests') createRequest(@CurrentUser() u: any, @Body() b: any) { return this.svc.createRequest(u, b); }
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:484:  @Get('requests/my') myRequests(@CurrentUser() u: any) { return this.svc.myRequests(u); }
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:485:  @Get('requests/:id') one(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.getOne(id, u); }
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:486:  @Post('requests/:id/pay-copay') payCopay(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.payCopay(u, id, b); }
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:487:  @Post('requests/:id/cancel') cancel(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.cancel(u, id); }
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:488:  @Post('requests/:id/resubmit') resubmit(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.resubmit(u, id, b); }
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:489:  @Post('requests/:id/appeal') appeal(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.appeal(u, id, b); }
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:492:  @Get('requests/provider/queue') providerQueue(@CurrentUser() u: any, @Query('state') state?: string) { return this.svc.providerQueue(u, state); }
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:493:  @Post('requests/:id/decide') decide(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.decide(u, id, b); }
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:496:  @Post('payment-confirm') paymentConfirm(@CurrentUser() u: any, @Body() b: any) {
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:501:  @Get('claims/my') claimsMy(@CurrentUser() u: any) { return this.svc.myRequests(u); }
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:505:@Controller()
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:510:  @Post('patient/pay-copay') payCopay(@CurrentUser() u: any, @Body() b: any) {
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:514:  @Post('home-care/insurance/verify') verify(@CurrentUser() u: any) {
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:585:@Controller('refunds')
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:589:  @Post('request') request(@CurrentUser() u: any, @Body() b: any) { return this.svc.request(u, b); }
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:590:  @Get('my') my(@CurrentUser() u: any) { return this.svc.myRefunds(u); }
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:591:  @Get('policy-preview') preview(@Query('scheduled_at') s?: string) {
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:597:@Controller('admin/finance')
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:604:  @Get('ledger/summary') summary() { return this.finance.platformSummary(); }
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:605:  @Get('refunds/queue') refundsQueue() { return this.refunds.adminQueue(); }
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:606:  @Post('refunds/:id/decide') decideRefund(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) {
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:611:@Controller('admin/insurance')
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:615:  @Get('requests') all(@Query('state') state?: string) { return this.svc.adminAll(state); }
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:616:  @Get('stats') stats() { return this.svc.adminStats(); }
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:619:@Controller('finance')
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:624:  @Post('ledger/accrue') accrue(@Body() b: any) { return this.finance.accrue(b); }
audit-work/source/nabdah-backend/src/modules/insurance-engine/insurance-engine.module.ts:625:  @Get('ledger/provider/summary') providerSummary(@CurrentUser() u: any) { return this.finance.providerSummary(u.id); }
audit-work/source/nabdah-backend/src/modules/support/support.controller.ts:8:@Controller('support')
audit-work/source/nabdah-backend/src/modules/support/support.controller.ts:11:  @Post('requests') create(@CurrentUser() u: any, @Body() b: any) { return this.svc.create(u, b); }
audit-work/source/nabdah-backend/src/modules/support/support.controller.ts:13:  @Post('tickets') createTicket(@CurrentUser() u: any, @Body() b: any) { return this.svc.create(u, b); }
audit-work/source/nabdah-backend/src/modules/support/support.controller.ts:14:  @Get('requests/mine') mine(@CurrentUser() u: any) { return this.svc.mine(u); }
audit-work/source/nabdah-backend/src/modules/support/support.controller.ts:15:  @Get('requests/:id') one(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.getOne(u, id); }
audit-work/source/nabdah-backend/src/modules/support/support.controller.ts:16:  @Post('requests/:id/reply') reply(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.reply(u, id, b.message); }
audit-work/source/nabdah-backend/src/modules/support/support.controller.ts:19:  @Get('admin/requests') @Roles(UserRole.ADMIN) adminList(@Query('status') status?: string) { return this.svc.adminList(status); }
audit-work/source/nabdah-backend/src/modules/support/support.controller.ts:20:  @Patch('admin/requests/:id') @Roles(UserRole.ADMIN) adminUpdate(@Param('id') id: string, @Body() b: any) { return this.svc.adminUpdateStatus(id, b.status, b.assigned_to); }
audit-work/source/nabdah-backend/src/modules/support/support.controller.ts:23:  @Get('tickets')
audit-work/source/nabdah-backend/src/modules/support/support.controller.ts:29:  @Get('faqs')
audit-work/source/nabdah-backend/src/modules/support/support.controller.ts:34:  @Post('feedback')
audit-work/source/nabdah-backend/src/modules/support/support.controller.ts:39:  @Get('settings') get(@CurrentUser() u: any) { return this.svc.getSettings(u); }
audit-work/source/nabdah-backend/src/modules/support/support.controller.ts:40:  @Patch('settings') update(@CurrentUser() u: any, @Body() b: any) { return this.svc.updateSettings(u, b); }
audit-work/source/nabdah-backend/src/modules/webhooks/webhooks.controller.ts:4:import { WebhooksService } from './webhooks.service';
audit-work/source/nabdah-backend/src/modules/webhooks/webhooks.controller.ts:9:@Controller('webhooks')
audit-work/source/nabdah-backend/src/modules/webhooks/webhooks.controller.ts:14:  @Post('moyasar')
audit-work/source/nabdah-backend/src/modules/webhooks/webhooks.controller.ts:24:  @Post('paytabs')
audit-work/source/nabdah-backend/src/modules/webhooks/webhooks.controller.ts:34:  @Post('sms')
audit-work/source/nabdah-backend/src/modules/webhooks/webhooks.controller.ts:42:  @Post('livekit')
audit-work/source/nabdah-backend/src/modules/webhooks/webhooks.module.ts:2:import { WebhooksController } from './webhooks.controller';
audit-work/source/nabdah-backend/src/modules/webhooks/webhooks.module.ts:3:import { WebhooksService } from './webhooks.service';
audit-work/source/nabdah-backend/src/modules/webhooks/webhooks.service.ts:31:   * E5-F1: webhook verification is FAIL-CLOSED in production.
audit-work/source/nabdah-backend/src/modules/webhooks/webhooks.service.ts:40:        this.logger.error('MOYASAR_WEBHOOK_SECRET is not set — rejecting webhook (fail-closed)');
audit-work/source/nabdah-backend/src/modules/webhooks/webhooks.service.ts:55:        this.logger.error('PAYTABS_SERVER_KEY is not set — rejecting webhook (fail-closed)');
audit-work/source/nabdah-backend/src/modules/webhooks/webhooks.service.ts:71:    const key = `webhook_seen:${kind}:${id}`;
audit-work/source/nabdah-backend/src/modules/webhooks/webhooks.service.ts:110:      if (isProd()) throw new BadRequestException('SMS webhook not configured');
audit-work/source/nabdah-backend/src/modules/webhooks/webhooks.service.spec.ts:2:import { WebhooksService } from './webhooks.service';
audit-work/source/nabdah-backend/src/modules/webhooks/webhooks.service.spec.ts:4:/** E5-F1 regression: webhook signature verification must be FAIL-CLOSED in production. */
audit-work/source/nabdah-backend/src/modules/webhooks/webhooks.service.spec.ts:31:  it('rejects moyasar webhook when secret missing in production (fail-closed)', async () => {
audit-work/source/nabdah-backend/src/modules/webhooks/webhooks.service.spec.ts:39:  it('rejects moyasar webhook when signature header missing (production)', async () => {
audit-work/source/nabdah-backend/src/modules/webhooks/webhooks.service.spec.ts:46:  it('accepts a correctly signed moyasar webhook (production)', async () => {
audit-work/source/nabdah-backend/src/modules/webhooks/webhooks.service.spec.ts:67:  it('rejects paytabs webhook when signature invalid (production)', async () => {
audit-work/source/nabdah-backend/src/modules/webhooks/webhooks.service.spec.ts:74:  it('accepts correctly signed paytabs webhook (production)', async () => {
audit-work/source/nabdah-backend/src/modules/webhooks/webhooks.service.spec.ts:84:  it('rejects sms webhook when token not configured in production', async () => {
audit-work/source/nabdah-backend/src/modules/webhooks/webhooks.service.spec.ts:90:  it('rejects sms webhook with wrong token (timing-safe)', async () => {
audit-work/source/nabdah-backend/src/modules/webhooks/guards/livekit-webhook.guard.ts:29:      throw new UnauthorizedException('LiveKit webhook cryptographic identity mismatch.');
audit-work/source/nabdah-backend/src/modules/community/community.controller.ts:10:@Controller('community')
audit-work/source/nabdah-backend/src/modules/community/community.controller.ts:16:  @Get('posts')
audit-work/source/nabdah-backend/src/modules/community/community.controller.ts:26:  @Post('posts')
audit-work/source/nabdah-backend/src/modules/community/community.controller.ts:31:  @Get('posts/:id')
audit-work/source/nabdah-backend/src/modules/community/community.controller.ts:36:  @Post('posts/:id/comment')
audit-work/source/nabdah-backend/src/modules/community/community.controller.ts:41:  @Put('posts/:id/vote')
audit-work/source/nabdah-backend/src/modules/community/community.controller.ts:46:  @Delete('posts/:id')
audit-work/source/nabdah-backend/src/modules/community/community.controller.ts:53:  @Get('admin/pending')
audit-work/source/nabdah-backend/src/modules/community/community.controller.ts:58:  @Put('admin/:id/moderate')
audit-work/source/nabdah-backend/src/modules/community/community.controller.ts:65:  @Get('live-sessions')
audit-work/source/nabdah-backend/src/modules/community/community.controller.ts:70:  @Post('live-sessions')
audit-work/source/nabdah-backend/src/modules/community/community.controller.ts:75:  @Put('live-sessions/:id/join')
audit-work/source/nabdah-backend/src/modules/community/community.controller.ts:80:  @Put('live-sessions/:id/status')
audit-work/source/nabdah-backend/src/modules/push/push.module.ts:692:@Controller('push')
audit-work/source/nabdah-backend/src/modules/push/push.module.ts:697:  @Post('register')
audit-work/source/nabdah-backend/src/modules/push/push.module.ts:700:  @Post('unregister')
audit-work/source/nabdah-backend/src/modules/push/push.module.ts:703:  @Get('devices')
audit-work/source/nabdah-backend/src/modules/push/push.module.ts:706:  @Post('test')
audit-work/source/nabdah-backend/src/modules/push/push.module.ts:710:  @Post('web/subscribe')
audit-work/source/nabdah-backend/src/modules/push/push.module.ts:722:  @Post('web/unsubscribe')
audit-work/source/nabdah-backend/src/modules/push/push.module.ts:729:  @Get('web/vapid-key')
audit-work/source/nabdah-backend/src/modules/push/push.module.ts:733:  @Post('events')
audit-work/source/nabdah-backend/src/modules/push/push.module.ts:736:  @Post('admin/campaign')
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:7:@Controller('pharmacy')
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:14:  @Get('prescriptions/:rxNumber') async byRxNumber(@CurrentUser() u: any, @Param('rxNumber') rx: string) {
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:26:  @Post('reports/eod') async eod(@CurrentUser() u: any) {
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:42:  @Get('orders/incoming') incoming(@CurrentUser() u: any) { return this.svc.incoming(u); }
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:43:  @Get('orders/preparing') preparing(@CurrentUser() u: any) { return this.svc.preparing(u); }
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:44:  @Get('orders/ready') ready(@CurrentUser() u: any) { return this.svc.ready(u); }
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:45:  @Get('orders/completed') completed(@CurrentUser() u: any) { return this.svc.completed(u); }
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:46:  @Get('orders/basket-review') basketReview(@CurrentUser() u: any) { return this.svc.basketReview(u); }
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:47:  @Get('orders/awaiting-approval') awaitingApproval(@CurrentUser() u: any) { return this.svc.awaitingApproval(u); }
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:48:  @Get('orders/refills') refills(@CurrentUser() u: any) { return this.svc.refillOrders(u); }
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:51:  @Post('orders/:id/accept') accept(@CurrentUser() u: any, @Param('id') id: string) { return this.ordersSvc.accept(id, u); }
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:52:  @Post('orders/:id/reject') reject(@CurrentUser() u: any, @Param('id') id: string, @Body() b: { reason?: string }) { return this.ordersSvc.reject(id, u, b?.reason || ''); }
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:53:  @Post('orders/:id/preparing') preparingAction(@CurrentUser() u: any, @Param('id') id: string) { return this.ordersSvc.markPreparing(id, u); }
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:54:  @Post('orders/:id/ready') readyAction(@CurrentUser() u: any, @Param('id') id: string) { return this.ordersSvc.markReady(id, u); }
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:55:  @Post('orders/:id/partial') partial(@CurrentUser() u: any, @Param('id') id: string, @Body() b: { unavailable_medicine_ids: string[] }) { return this.ordersSvc.markPartial(id, u, b.unavailable_medicine_ids || []); }
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:58:  @Get('inventory') inventory(@CurrentUser() u: any) { return this.svc.getInventory(u); }
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:59:  @Post('inventory/stock') stock(@CurrentUser() u: any, @Body() b: { medicine_id: string; stock_qty: number; is_available?: boolean }) { return this.svc.updateStock(u, b.medicine_id, b.stock_qty, b.is_available !== false); }
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:60:  @Post('inventory/add') addMed(@CurrentUser() u: any, @Body() b: any) { return this.svc.addMedicineToInventory(u, b); }
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:63:  @Get('orders/:id') orderDetail(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.orderDetail(u, id); }
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:64:  @Post('orders/:id/items/:idx/unavailable') itemUnavailable(@CurrentUser() u: any, @Param('id') id: string, @Param('idx') idx: string) { return this.svc.markItemUnavailable(u, id, parseInt(idx, 10)); }
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:65:  @Post('orders/:id/items/:idx/restore') itemRestore(@CurrentUser() u: any, @Param('id') id: string, @Param('idx') idx: string) { return this.svc.restoreItem(u, id, parseInt(idx, 10)); }
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:66:  @Post('orders/:id/items/:idx/qty') itemQty(@CurrentUser() u: any, @Param('id') id: string, @Param('idx') idx: string, @Body() b: { qty: number }) { return this.svc.updateItemQty(u, id, parseInt(idx, 10), b.qty); }
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:67:  @Post('orders/:id/items/:idx/substitute') itemSub(@CurrentUser() u: any, @Param('id') id: string, @Param('idx') idx: string, @Body() b: { name_ar: string; name_en?: string; medicine_id?: string; qty?: number; price?: number; note?: string }) { return this.svc.substituteItem(u, id, parseInt(idx, 10), b); }
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:70:  @Post('orders/:id/submit-basket') submitBasket(@CurrentUser() u: any, @Param('id') id: string, @Body() b: { note?: string }) { return this.svc.submitBasket(u, id, b?.note); }
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:73:  @Post('orders/:id/insurance') setInsurance(@CurrentUser() u: any, @Param('id') id: string, @Body() b: { status: 'approved' | 'rejected' | 'pending'; reason?: string }) {
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:83:@Controller('provider/pharmacy')
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:88:  @Post('orders/:id/accept') accept(@CurrentUser() u: any, @Param('id') id: string) { return this.ordersSvc.accept(id, u); }
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:89:  @Post('orders/:id/submit-basket') submitBasket(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.submitBasket(u, id, b?.note); }
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:90:  @Post('orders/:id/insurance') insurance(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) {
audit-work/source/nabdah-backend/src/modules/pharmacy_ops/pharmacy_ops.controller.ts:93:  @Post('orders/:id/dispatch') dispatch(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) {
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:21:@Controller('home-care')
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:33:  @Get('services') servicesList(@Query() q: any) {
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:39:  @Get('services/:id') async serviceOne(@Param('id') id: string) {
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:45:  @Get('providers') async providers(@Query() q: any) {
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:53:  @Get('providers/:id') async provider(@Param('id') id: string) {
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:74:  @Post('bookings') async createBooking(@CurrentUser() u: any, @Body() body: any) {
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:98:  @Get('bookings/my') myBookings(@CurrentUser() u: any, @Query() q: any) {
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:104:  @Get('bookings/nursing/all') nursingQueue(@CurrentUser() u: any, @Query() q: any) {
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:141:  @Post('bookings/:id/respond') respond(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:151:  @Post('bookings/:id/assign') async assign(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:158:  @Post('bookings/:id/check-in') checkIn(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:162:  @Post('bookings/:id/gps') async gps(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:170:  @Post('bookings/:id/visit-report') visitReport(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:183:  @Get('care-plans/:patientId') async listCarePlans(@CurrentUser() u: any, @Param('patientId') patientId: string) {
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:189:  @Post('care-plans/:patientId') async createCarePlan(@CurrentUser() u: any, @Param('patientId') patientId: string, @Body() body: any) {
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:209:  @Post('provider/availability') async setAvailability(@CurrentUser() u: any, @Body() body: any) {
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:215:  @Post('inventory/request') async inventoryRequest(@CurrentUser() u: any, @Body() body: any) {
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:265:@Controller('provider/nursing')
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:268:  @Get('checklist') checklist(@Query('category') category?: string) {
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:271:  @Get('supplies') supplies() { return { items: NURSING_SUPPLIES }; }
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:276:@Controller()
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:281:  @Get('chats/provider') providerThreads(@CurrentUser() u: any, @Query() q: any) {
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:285:  @Get('chat/channels') channels(@CurrentUser() u: any, @Query() q: any) {
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:289:  @Get('chats/:id/messages') getMessages(@CurrentUser() u: any, @Param('id') id: string, @Query() q: any) {
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:293:  @Post('chats/:id/messages') postMessage(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) {
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:298:  @Post('chat/messages/:threadId') postLegacy(@CurrentUser() u: any, @Param('threadId') threadId: string, @Body() body: any) {
audit-work/source/nabdah-backend/src/modules/home-care-compat/home-care-compat.module.ts:303:  @Post('provider/chat/send') providerSend(@CurrentUser() u: any, @Body() body: any) {
audit-work/source/nabdah-backend/src/modules/admin-web-core/controllers/admin-config.controller.ts:4:@Controller('admin/config')
audit-work/source/nabdah-backend/src/modules/admin-web-core/controllers/admin-config.controller.ts:8:  @Get('sla')
audit-work/source/nabdah-backend/src/modules/admin-web-core/controllers/admin-config.controller.ts:19:  @Put('sla')
audit-work/source/nabdah-backend/src/modules/admin-web-core/controllers/system-health.controller.ts:3:@Controller('system-health')
audit-work/source/nabdah-backend/src/modules/admin-web-core/controllers/system-health.controller.ts:6:  @Get('liveness')
audit-work/source/nabdah-backend/src/modules/admin-web-core/controllers/system-health.controller.ts:19:  @Get('readiness')
audit-work/source/nabdah-backend/src/modules/admin-web-core/controllers/admin-governance.controller.ts:11:@Controller('admin/governance')
audit-work/source/nabdah-backend/src/modules/admin-web-core/controllers/admin-governance.controller.ts:25:  @Put('trigger-emergency-maintenance')
audit-work/source/nabdah-backend/src/modules/admin-web-core/controllers/admin-governance.controller.ts:33:  @Get('fraud-alerts')
audit-work/source/nabdah-backend/src/modules/admin-web-core/controllers/admin-governance.controller.ts:40:  @Get('audit-logs')
audit-work/source/nabdah-backend/src/modules/admin-web-core/controllers/admin-extended-operations.controller.ts:6:@Controller('admin/extended-operations')
audit-work/source/nabdah-backend/src/modules/admin-web-core/controllers/admin-extended-operations.controller.ts:12:  @Get('procurement/pending')
audit-work/source/nabdah-backend/src/modules/admin-web-core/controllers/admin-extended-operations.controller.ts:22:  @Patch('issue-quote/:procurementId')
audit-work/source/nabdah-backend/src/modules/admin-web-core/controllers/provider-moderation.controller.ts:8:@Controller('providers')
audit-work/source/nabdah-backend/src/modules/admin-web-core/controllers/provider-moderation.controller.ts:45:  @Post('provider-deltas')
audit-work/source/nabdah-backend/src/modules/admin-web-core/controllers/provider-moderation.controller.ts:51:  @Post('provider-deltas/:id/approve')
audit-work/source/nabdah-backend/src/modules/admin-web-core/controllers/provider-moderation.controller.ts:82:  @Post('provider-deltas/:id/reject')
audit-work/source/nabdah-backend/src/modules/admin-web-core/controllers/analytics.controller.ts:13:@Controller('nabd-extensions/admin/analytics')
audit-work/source/nabdah-backend/src/modules/admin-web-core/controllers/analytics.controller.ts:36:  @Get('heatmaps')
audit-work/source/nabdah-backend/src/modules/admin-web-core/controllers/finance.controller.ts:21:@Controller('admin/finance')
audit-work/source/nabdah-backend/src/modules/admin-web-core/controllers/finance.controller.ts:32:  @Get('commissions')
audit-work/source/nabdah-backend/src/modules/admin-web-core/controllers/finance.controller.ts:38:  @Get('withdrawals/pending')
audit-work/source/nabdah-backend/src/modules/admin-web-core/controllers/finance.controller.ts:71:  @Post('withdrawals/:id/execute')
audit-work/source/nabdah-backend/src/modules/admin-web-core/controllers/finance.controller.ts:131:  @Post('withdrawals/:id/reject')
audit-work/source/nabdah-backend/src/modules/bans/bans.controller.ts:14:@Controller('bans')
audit-work/source/nabdah-backend/src/modules/bans/bans.controller.ts:20:  @Post()
audit-work/source/nabdah-backend/src/modules/bans/bans.controller.ts:25:  @Delete(':value')
audit-work/source/nabdah-backend/src/modules/bans/bans.controller.ts:30:  @Get()
audit-work/source/nabdah-backend/src/modules/media/media.controller.ts:10:@Controller('media')
audit-work/source/nabdah-backend/src/modules/media/media.controller.ts:19:  @Post('upload')
audit-work/source/nabdah-backend/src/modules/media/media.controller.ts:53:  @Post('presigned')
audit-work/source/nabdah-backend/src/modules/media/media.controller.ts:73:  @Get(':id/url')
audit-work/source/nabdah-backend/src/modules/media/media.controller.ts:163:  @Delete('*key')
audit-work/source/nabdah-backend/src/modules/cart/cart.module.ts:206:@Controller('cart')
audit-work/source/nabdah-backend/src/modules/cart/cart.module.ts:213:  @Get('') get(@CurrentUser() u: any) { return this.svc.get(u); }
audit-work/source/nabdah-backend/src/modules/cart/cart.module.ts:214:  @Post('items') @RequireIdempotency()
audit-work/source/nabdah-backend/src/modules/cart/cart.module.ts:216:  @Patch('items/:lineId') @RequireIdempotency()
audit-work/source/nabdah-backend/src/modules/cart/cart.module.ts:218:  @Delete('items/:lineId') @RequireIdempotency()
audit-work/source/nabdah-backend/src/modules/cart/cart.module.ts:220:  @Post('lines') add(@Body() b: any, @CurrentUser() u: any) { return this.svc.addLine(u, b); }
audit-work/source/nabdah-backend/src/modules/cart/cart.module.ts:221:  @Patch('lines/:lineId') upd(@Param('lineId') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.updateLine(u, id, b); }
audit-work/source/nabdah-backend/src/modules/cart/cart.module.ts:222:  @Delete('lines/:lineId') rm(@Param('lineId') id: string, @CurrentUser() u: any) { return this.svc.removeLine(u, id); }
audit-work/source/nabdah-backend/src/modules/cart/cart.module.ts:223:  @Post('clear') clr(@Body() b: any, @CurrentUser() u: any) { return this.svc.clear(u, b?.kind); }
audit-work/source/nabdah-backend/src/modules/cart/cart.module.ts:224:  @Post('checkout') @RequireIdempotency()
audit-work/source/nabdah-backend/src/modules/cart/cart.module.ts:226:  @Get('checkout') chk(@CurrentUser() u: any) { return this.svc.prepareCheckout(u); }
audit-work/source/nabdah-backend/src/modules/cart/cart.module.ts:227:  @Get('prescription')
audit-work/source/nabdah-backend/src/modules/consistency/consistency.module.ts:160:@Controller('consistency')
audit-work/source/nabdah-backend/src/modules/consistency/consistency.module.ts:165:  @Get('audit') audit() { return this.svc.audit(); }
audit-work/source/nabdah-backend/src/modules/consistency/consistency.module.ts:166:  @Post('reconcile') reconcile() { return this.svc.reconcile(); }
audit-work/source/nabdah-backend/src/modules/consistency/consistency.module.ts:167:  @Post('fix-orphans') fixOrphans(@Query('dry_run') dry?: string) { return this.svc.fixOrphans(dry !== 'false'); }
audit-work/source/nabdah-backend/src/modules/feature-flags/feature-flags.controller.ts:8:@Controller('feature-flags')
audit-work/source/nabdah-backend/src/modules/feature-flags/feature-flags.controller.ts:14:  @Get()
audit-work/source/nabdah-backend/src/modules/feature-flags/feature-flags.controller.ts:20:@Controller('admin/feature-flags')
audit-work/source/nabdah-backend/src/modules/feature-flags/feature-flags.controller.ts:25:  @Get()
audit-work/source/nabdah-backend/src/modules/feature-flags/feature-flags.controller.ts:31:  @Post(':key')
audit-work/source/nabdah-backend/src/modules/facility-ops/facility-ops.module.ts:253:@Controller('facility/beds')
audit-work/source/nabdah-backend/src/modules/facility-ops/facility-ops.module.ts:258:  @Get('wards')
audit-work/source/nabdah-backend/src/modules/facility-ops/facility-ops.module.ts:263:  @Get('wards/:wardId/beds')
audit-work/source/nabdah-backend/src/modules/facility-ops/facility-ops.module.ts:268:  @Post('wards')
audit-work/source/nabdah-backend/src/modules/facility-ops/facility-ops.module.ts:273:  @Post('admission')
audit-work/source/nabdah-backend/src/modules/facility-ops/facility-ops.module.ts:278:  @Get('admissions')
audit-work/source/nabdah-backend/src/modules/facility-ops/facility-ops.module.ts:283:  @Put('discharge/:admissionId')
audit-work/source/nabdah-backend/src/modules/facility-ops/facility-ops.module.ts:289:@Controller('facility/shifts')
audit-work/source/nabdah-backend/src/modules/facility-ops/facility-ops.module.ts:294:  @Get()
audit-work/source/nabdah-backend/src/modules/facility-ops/facility-ops.module.ts:299:  @Post()
audit-work/source/nabdah-backend/src/modules/facility-ops/facility-ops.module.ts:304:  @Post(':id/substitute')
audit-work/source/nabdah-backend/src/modules/facility-ops/facility-ops.module.ts:309:  @Post('attendance/check-in')
audit-work/source/nabdah-backend/src/modules/facility-ops/facility-ops.module.ts:314:  @Post('attendance/check-out/:attendanceId')
audit-work/source/nabdah-backend/src/modules/facility-ops/facility-ops.module.ts:319:  @Get('attendance')
audit-work/source/nabdah-backend/src/modules/facility-ops/facility-ops.module.ts:325:@Controller('facility/surgeries')
audit-work/source/nabdah-backend/src/modules/facility-ops/facility-ops.module.ts:330:  @Post('book')
audit-work/source/nabdah-backend/src/modules/facility-ops/facility-ops.module.ts:335:  @Get('schedule')
audit-work/source/nabdah-backend/src/modules/facility-ops/facility-ops.module.ts:345:@Controller('facility')
audit-work/source/nabdah-backend/src/modules/facility-ops/facility-ops.module.ts:352:  @Get('announcements')
audit-work/source/nabdah-backend/src/modules/facility-ops/facility-ops.module.ts:359:  @Post('announcements')
audit-work/source/nabdah-backend/src/modules/facility-ops/facility-ops.module.ts:376:  @Get('resources')
audit-work/source/nabdah-backend/src/modules/facility-ops/facility-ops.module.ts:383:  @Post('resources')
audit-work/source/nabdah-backend/src/modules/facility-ops/facility-ops.module.ts:405:  @Put('resources/:id')
audit-work/source/nabdah-backend/src/modules/admin-governance/admin-governance.module.ts:233:@Controller('admin/governance')
audit-work/source/nabdah-backend/src/modules/admin-governance/admin-governance.module.ts:238:  @Get('summary') summary() { return this.svc.globalSummary(); }
audit-work/source/nabdah-backend/src/modules/admin-governance/admin-governance.module.ts:239:  @Get('providers-performance') perf(@Query() q: any) { return this.svc.providersPerformance({ type: q.type, limit: q.limit ? Number(q.limit) : undefined }); }
audit-work/source/nabdah-backend/src/modules/admin-governance/admin-governance.module.ts:240:  @Get('patient/:id') patient(@Param('id') id: string) { return this.svc.patientProfile(id); }
audit-work/source/nabdah-backend/src/modules/admin-governance/admin-governance.module.ts:241:  @Get('trace/:entity_type/:entity_id') trace(@Param('entity_type') et: string, @Param('entity_id') ei: string) { return this.svc.entityTrace(et, ei); }
audit-work/source/nabdah-backend/src/modules/admin-governance/admin-governance.module.ts:244:@Controller('kill-switches')
audit-work/source/nabdah-backend/src/modules/admin-governance/admin-governance.module.ts:261:  @Get()
audit-work/source/nabdah-backend/src/modules/admin-governance/admin-governance.module.ts:270:  @Post(':key')
audit-work/source/nabdah-backend/src/modules/admin-governance/admin-governance.module.ts:288:@Controller('commissions')
audit-work/source/nabdah-backend/src/modules/admin-governance/admin-governance.module.ts:301:  @Get()
audit-work/source/nabdah-backend/src/modules/admin-governance/admin-governance.module.ts:338:  @Put(':id')
audit-work/source/nabdah-backend/src/modules/admin-governance/system-config.controller.ts:15:@Controller('admin/governance/system-config')
audit-work/source/nabdah-backend/src/modules/admin-governance/system-config.controller.ts:19:  @Get()
audit-work/source/nabdah-backend/src/modules/admin-governance/system-config.controller.ts:31:  @Put()
audit-work/source/nabdah-backend/src/modules/admin-governance/b2b.controller.ts:8:@Controller('b2b')
audit-work/source/nabdah-backend/src/modules/admin-governance/b2b.controller.ts:15:  @Get('requests')
audit-work/source/nabdah-backend/src/modules/admin-governance/b2b.controller.ts:24:  @Post('requests/:id/approve')
audit-work/source/nabdah-backend/src/modules/admin-governance/b2b.controller.ts:34:  @Post('requests/:id/reject')
audit-work/source/nabdah-backend/src/modules/slot-locks/slot-locks.module.ts:57:@Controller('slot-locks')
audit-work/source/nabdah-backend/src/modules/slot-locks/slot-locks.module.ts:61:  @Post('reserve') reserve(@CurrentUser() u: any, @Body() b: any) { return this.svc.reserve(u, b); }
audit-work/source/nabdah-backend/src/modules/slot-locks/slot-locks.module.ts:62:  @Post(':id/confirm') confirm(@CurrentUser() u: any, @Param('id') id: string, @Body() b: { booking_id: string }) { return this.svc.confirm(u, id, b.booking_id); }
audit-work/source/nabdah-backend/src/modules/slot-locks/slot-locks.module.ts:63:  @Post(':id/release') release(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.release(u, id); }
audit-work/source/nabdah-backend/src/modules/slot-locks/slot-locks.module.ts:64:  @Get('mine') mine(@CurrentUser() u: any) { return this.svc.mine(u); }
audit-work/source/nabdah-backend/src/modules/loyalty/loyalty.controller.ts:9:@Controller('loyalty')
audit-work/source/nabdah-backend/src/modules/loyalty/loyalty.controller.ts:13:  @Get('config')
audit-work/source/nabdah-backend/src/modules/loyalty/loyalty.controller.ts:22:  @Get('account')
audit-work/source/nabdah-backend/src/modules/loyalty/loyalty.controller.ts:28:  @Get('transactions')
audit-work/source/nabdah-backend/src/modules/loyalty/loyalty.controller.ts:34:  @Get('leaderboard')
audit-work/source/nabdah-backend/src/modules/loyalty/loyalty.controller.ts:40:  @Get('challenges')
audit-work/source/nabdah-backend/src/modules/loyalty/loyalty.controller.ts:46:  @Post('challenges/:id/join')
audit-work/source/nabdah-backend/src/modules/loyalty/loyalty.controller.ts:52:  @Get('rewards')
audit-work/source/nabdah-backend/src/modules/loyalty/loyalty.controller.ts:58:  @Post('rewards/:id/claim')
audit-work/source/nabdah-backend/src/modules/loyalty/loyalty.controller.ts:64:  @Get('rewards/claimed')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:6:@Controller('medicines')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:12:  @Get()
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:45:  @Get('autocomplete')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:51:  @Post('lookup-barcode')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:57:  @Get('by-barcode/:code')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:63:  @Get('categories')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:69:  @Get('filters')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:75:  @Post('compare')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:85:  @Get('hot')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:92:  @Get('search/did-you-mean')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:99:  @Get('search/trending')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:105:  @Get('search/recent')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:111:  @Post('admin/hot/regenerate')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:118:  @Post(':id/report-shortage')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:124:  @Get('admin/shortage-reports')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:131:  @Post('admin/shortage-reports/:reportId/approve')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:138:  @Post('admin/shortage-reports/:reportId/reject')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:145:  @Post('admin/catalog/:id/clear-shortage-badge')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:152:  @Post('admin/catalog/:id/availability')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:161:  @Post(':id/suggest-image')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:167:  @Get('admin/image-suggestions')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:174:  @Post('admin/image-suggestions/:suggestionId/approve')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:181:  @Post('admin/image-suggestions/:suggestionId/reject')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:189:  @Post(':id/suggest-change')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:196:  @Post('suggest-new-item')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:202:  @Get('admin/change-requests')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:209:  @Post('admin/change-requests/:requestId/approve')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:216:  @Post('admin/change-requests/:requestId/reject')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:223:  @Patch('admin/catalog/:id')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:230:  @Get('admin/catalog')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:247:  @Post('admin/catalog')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:254:  @Post('admin/catalog/:id/delete')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:261:  @Get('admin/reports')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:268:  @Get('me/recently-viewed')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:274:  @Get(':id')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:280:  @Get(':id/details')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:289:  @Get(':id/alternatives')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:294:  @Post('manual-entry')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:299:  @Get('admin/pending-review')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:305:  @Post('admin/catalog')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:311:  @Delete('admin/catalog/:id')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:317:  @Post(':id/approve')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:323:  @Post(':id/reject')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:329:  @Patch(':id')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:336:  @Post('admin/import-json')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:342:  @Post('admin/import-csv')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:352:@Controller('public/catalog')
audit-work/source/nabdah-backend/src/modules/medicines/medicines.controller.ts:357:  @Get(':locale/:category.json')
audit-work/source/nabdah-backend/src/modules/seo/seo.controller.ts:13:@Controller('seo')
audit-work/source/nabdah-backend/src/modules/seo/seo.controller.ts:19:  @Get('resolve/:type/:slug')
audit-work/source/nabdah-backend/src/modules/seo/seo.controller.ts:28:  @Get('meta/:type/:slug')
audit-work/source/nabdah-backend/src/modules/seo/seo.controller.ts:35:  @Get('build/:type/:id')
audit-work/source/nabdah-backend/src/modules/seo/seo.controller.ts:45:  @Get('sitemap.xml')
audit-work/source/nabdah-backend/src/modules/seo/seo.controller.ts:58:  @Get('llms.txt')
audit-work/source/nabdah-backend/src/modules/seo/seo.controller.ts:70:  @Get('robots.txt')
audit-work/source/nabdah-backend/src/modules/timeline/timeline.controller.ts:8:@Controller('timeline')
audit-work/source/nabdah-backend/src/modules/timeline/timeline.controller.ts:17:  @Get()
audit-work/source/nabdah-backend/src/modules/timeline/timeline.controller.ts:35:  @Get('summary')
audit-work/source/nabdah-backend/src/modules/service-catalog/service-catalog.module.ts:185:@Controller('service-catalog')
audit-work/source/nabdah-backend/src/modules/service-catalog/service-catalog.module.ts:190:  @Get('mine/:type') mine(@Param('type') t: 'lab' | 'radiology', @CurrentUser() u: any) { return this.svc.myCatalog(u, t); }
audit-work/source/nabdah-backend/src/modules/service-catalog/service-catalog.module.ts:191:  @Post('mine/:type') create(@Param('type') t: 'lab' | 'radiology', @Body() b: any, @CurrentUser() u: any) { return this.svc.createService(u, t, b); }
audit-work/source/nabdah-backend/src/modules/service-catalog/service-catalog.module.ts:192:  @Patch('mine/:type/:id') update(@Param('type') t: 'lab' | 'radiology', @Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.updateService(u, t, id, b); }
audit-work/source/nabdah-backend/src/modules/service-catalog/service-catalog.module.ts:193:  @Post('mine/:type/:id/toggle') toggle(@Param('type') t: 'lab' | 'radiology', @Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.toggleService(u, t, id, !!b.active); }
audit-work/source/nabdah-backend/src/modules/service-catalog/service-catalog.module.ts:194:  @Delete('mine/:type/:id') del(@Param('type') t: 'lab' | 'radiology', @Param('id') id: string, @CurrentUser() u: any) { return this.svc.deleteService(u, t, id); }
audit-work/source/nabdah-backend/src/modules/service-catalog/service-catalog.module.ts:196:  @Get('schedule/:entity') sched(@Param('entity') e: string, @CurrentUser() u: any) { return this.svc.getSchedule(u, e); }
audit-work/source/nabdah-backend/src/modules/service-catalog/service-catalog.module.ts:197:  @Patch('schedule/:entity') setSched(@Param('entity') e: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.upsertSchedule(u, e, b); }
audit-work/source/nabdah-backend/src/modules/service-catalog/service-catalog.module.ts:200:  @Get('admin/:type') @Roles(UserRole.ADMIN) adminAll(@Param('type') t: 'lab' | 'radiology', @Query() q: any) { return this.svc.adminListAll(t, q); }
audit-work/source/nabdah-backend/src/modules/service-catalog/service-catalog.module.ts:201:  @Post('admin/:type/:id/approve') @Roles(UserRole.ADMIN) approve(@Param('type') t: 'lab' | 'radiology', @Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.adminApproveService(t, id, b.approve !== false, u); }
audit-work/source/nabdah-backend/src/modules/ai/ai.controller.ts:9:@Controller('ai')
audit-work/source/nabdah-backend/src/modules/ai/ai.controller.ts:14:  @Get('config')
audit-work/source/nabdah-backend/src/modules/ai/ai.controller.ts:20:  @Post('config')
audit-work/source/nabdah-backend/src/modules/ai/ai.controller.ts:27:  @Get('admin/gateway')
audit-work/source/nabdah-backend/src/modules/ai/ai.controller.ts:34:  @Post('admin/gateway/provider/:key')
audit-work/source/nabdah-backend/src/modules/ai/ai.controller.ts:41:  @Post('admin/gateway/mode')
audit-work/source/nabdah-backend/src/modules/ai/ai.controller.ts:48:  @Get('admin/usage')
audit-work/source/nabdah-backend/src/modules/ai/ai.controller.ts:55:  @Post('triage')
audit-work/source/nabdah-backend/src/modules/ai/ai.controller.ts:60:  @Get('triage/history')
audit-work/source/nabdah-backend/src/modules/ai/ai.controller.ts:65:  @Post('voice-to-order')
audit-work/source/nabdah-backend/src/modules/ai/ai.controller.ts:84:  @Post('prescription-ocr')
audit-work/source/nabdah-backend/src/modules/ai/ai.controller.ts:90:  @Post('parse-excel')
audit-work/source/nabdah-backend/src/modules/ai/ai.controller.ts:106:  @Post('copilot/suggest')
audit-work/source/nabdah-backend/src/modules/ai/ai.controller.ts:113:  @Post('ocr-translate')
audit-work/source/nabdah-backend/src/modules/ai/ai.controller.ts:119:  @Post('skin-analysis')
audit-work/source/nabdah-backend/src/modules/ai/ai.controller.ts:124:  @Post('medicine-image-search')
audit-work/source/nabdah-backend/src/modules/ai/ai.controller.ts:129:  @Post('barcode-lookup')
audit-work/source/nabdah-backend/src/modules/ai/ai.controller.ts:134:  @Post('analyze-meal')
audit-work/source/nabdah-backend/src/modules/ai/ai.controller.ts:143:  @Post('analyze-report')
audit-work/source/nabdah-backend/src/modules/ai/ai.controller.ts:149:  @Post('generate-exercise-plan')
audit-work/source/nabdah-backend/src/modules/ai/ai.controller.ts:154:  @Post('generate-diet-plan')
audit-work/source/nabdah-backend/src/modules/patient-ux/patient-ux.module.ts:144:@Controller('patient-ux')
audit-work/source/nabdah-backend/src/modules/patient-ux/patient-ux.module.ts:148:  @Post('review') rate(@CurrentUser() u: any, @Body() b: any) { return this.svc.rate(u, b); }
audit-work/source/nabdah-backend/src/modules/patient-ux/patient-ux.module.ts:149:  @Post('refund') refund(@CurrentUser() u: any, @Body() b: any) { return this.svc.requestRefund(u, b); }
audit-work/source/nabdah-backend/src/modules/patient-ux/patient-ux.module.ts:150:  @Get('refund/mine') refunds(@CurrentUser() u: any) { return this.svc.myRefunds(u); }
audit-work/source/nabdah-backend/src/modules/patient-ux/patient-ux.module.ts:151:  @Post('rebook') rebook(@CurrentUser() u: any, @Body() b: any) { return this.svc.rebook(u, b); }
audit-work/source/nabdah-backend/src/modules/patient-ux/patient-ux.module.ts:155:@Controller('admin/refunds')
audit-work/source/nabdah-backend/src/modules/patient-ux/patient-ux.module.ts:160:  @Get() list() { return this.svc.adminListRefunds(); }
audit-work/source/nabdah-backend/src/modules/patient-ux/patient-ux.module.ts:161:  @Get('pending') pending() { return this.svc.adminListRefunds('requested'); }
audit-work/source/nabdah-backend/src/modules/patient-ux/patient-ux.module.ts:162:  @Post(':id/decide') decide(@CurrentUser() u: any, @Param('id') id: string, @Body() body: { decision: 'approved' | 'rejected'; note?: string; amount?: number }) {
audit-work/source/nabdah-backend/src/modules/patient-ux/patient-ux.module.ts:271:@Controller('admin/override')
audit-work/source/nabdah-backend/src/modules/patient-ux/patient-ux.module.ts:277:  @Post('cancel') cancel(@CurrentUser() u: any, @Body() body: { kind: string; id: string; reason: string }) {
audit-work/source/nabdah-backend/src/modules/patient-ux/patient-ux.module.ts:282:  @Post('transition') transition(@CurrentUser() u: any, @Body() body: { kind: string; id: string; state: string; reason: string }) {
audit-work/source/nabdah-backend/src/modules/patient-ux/patient-ux.module.ts:287:  @Post('payment') markPayment(@CurrentUser() u: any, @Body() body: { kind: string; id: string; payment_status: 'paid' | 'refunded' | 'failed'; amount?: number; reason: string }) {
audit-work/source/nabdah-backend/src/modules/home/home.controller.ts:5:@Controller('home')
audit-work/source/nabdah-backend/src/modules/home/home.controller.ts:10:  @Get('offers')
audit-work/source/nabdah-backend/src/modules/home/home.controller.ts:15:  @Get('upcoming-appointment')
audit-work/source/nabdah-backend/src/modules/home/home.controller.ts:20:  @Get('search')
audit-work/source/nabdah-backend/src/modules/notifications/notifications.controller.ts:7:@Controller('notifications')
audit-work/source/nabdah-backend/src/modules/notifications/notifications.controller.ts:12:  @Get()
audit-work/source/nabdah-backend/src/modules/notifications/notifications.controller.ts:22:  @Post('register-token')
audit-work/source/nabdah-backend/src/modules/notifications/notifications.controller.ts:36:  @Post(':id/read')
audit-work/source/nabdah-backend/src/modules/notifications/notifications.controller.ts:41:  @Post('read-all')
audit-work/source/nabdah-backend/src/modules/notifications/notifications.controller.ts:46:  @Post('admin/send')
audit-work/source/nabdah-backend/src/modules/notifications/notifications.controller.ts:53:  @Post('admin/schedule')
audit-work/source/nabdah-backend/src/modules/notifications/notifications.controller.ts:61:  @Get('admin/delivery-stats')
audit-work/source/nabdah-backend/src/modules/referral/referral.controller.ts:11:@Controller('referrals')
audit-work/source/nabdah-backend/src/modules/referral/referral.controller.ts:16:  @Get('my')
audit-work/source/nabdah-backend/src/modules/referral/referral.controller.ts:22:  @Post('apply')
audit-work/source/nabdah-backend/src/modules/auth/auth.controller.ts:81:@Controller('auth')
audit-work/source/nabdah-backend/src/modules/auth/auth.controller.ts:89:  @Post('otp/request')
audit-work/source/nabdah-backend/src/modules/auth/auth.controller.ts:97:  @Post('otp/verify')
audit-work/source/nabdah-backend/src/modules/auth/auth.controller.ts:104:  @Post('session/exchange')
audit-work/source/nabdah-backend/src/modules/auth/auth.controller.ts:114:  @Post('password/forgot')
audit-work/source/nabdah-backend/src/modules/auth/auth.controller.ts:120:  @Post('password/reset')
audit-work/source/nabdah-backend/src/modules/auth/auth.controller.ts:127:  @Post('register')
audit-work/source/nabdah-backend/src/modules/auth/auth.controller.ts:145:  @Post('login')
audit-work/source/nabdah-backend/src/modules/auth/auth.controller.ts:171:  @Post('guest')
audit-work/source/nabdah-backend/src/modules/auth/auth.controller.ts:176:  @Post('convert-guest')
audit-work/source/nabdah-backend/src/modules/auth/auth.controller.ts:183:  @Post('login/verify-2fa')
audit-work/source/nabdah-backend/src/modules/auth/auth.controller.ts:205:  @Get('me')
audit-work/source/nabdah-backend/src/modules/auth/auth.controller.ts:213:  @Get('trusted-devices')
audit-work/source/nabdah-backend/src/modules/auth/auth.controller.ts:219:  @Delete('trusted-devices/:deviceId')
audit-work/source/nabdah-backend/src/modules/auth/auth.controller.ts:225:  @Post('heartbeat')
audit-work/source/nabdah-backend/src/modules/auth/auth.controller.ts:236:  @Get('sessions/online')
audit-work/source/nabdah-backend/src/modules/auth/auth.controller.ts:243:  @Post('refresh')
audit-work/source/nabdah-backend/src/modules/auth/auth.controller.ts:249:  @Post('logout-all')
audit-work/source/nabdah-backend/src/modules/auth/auth.controller.ts:255:  @Post('consent')
audit-work/source/nabdah-backend/src/modules/auth/auth.controller.ts:265:  @Post('logout')
audit-work/source/nabdah-backend/src/modules/auth/auth.controller.ts:278:  @Post('send-otp')
audit-work/source/nabdah-backend/src/modules/auth/auth.controller.ts:286:  @Post('verify-otp')
audit-work/source/nabdah-backend/src/modules/auth/auth.controller.ts:294:  @Post('reset-password')
audit-work/source/nabdah-backend/src/modules/auth/auth.controller.ts:303:  @Post('social-login')
audit-work/source/nabdah-backend/src/modules/auth/passkey.controller.ts:14:@Controller('auth/passkey')
audit-work/source/nabdah-backend/src/modules/auth/passkey.controller.ts:19:  @Post('enroll/options')
audit-work/source/nabdah-backend/src/modules/auth/passkey.controller.ts:24:  @Post('enroll/verify')
audit-work/source/nabdah-backend/src/modules/auth/passkey.controller.ts:30:  @Get('devices')
audit-work/source/nabdah-backend/src/modules/auth/passkey.controller.ts:36:  @Delete('devices/:credentialId')
audit-work/source/nabdah-backend/src/modules/auth/passkey.controller.ts:44:  @Post('login/verify')
audit-work/source/nabdah-backend/src/modules/api-security/api-security.module.ts:191:@Controller('admin/security')
audit-work/source/nabdah-backend/src/modules/api-security/api-security.module.ts:197:  @Get('events')
audit-work/source/nabdah-backend/src/modules/api-security/api-security.module.ts:209:  @Post('blacklist/clear')
audit-work/source/nabdah-backend/src/modules/moyasar/moyasar.module.ts:313:  /** Verify Moyasar webhook HMAC-SHA256 signature — fail-closed in production (E5-F1) */
audit-work/source/nabdah-backend/src/modules/moyasar/moyasar.module.ts:318:        this.logger.error('MOYASAR_WEBHOOK_SECRET is not set — rejecting webhook (fail-closed)');
audit-work/source/nabdah-backend/src/modules/moyasar/moyasar.module.ts:334:  /** Process an inbound Moyasar webhook event */
audit-work/source/nabdah-backend/src/modules/moyasar/moyasar.module.ts:336:    // Moyasar sends the payment object directly as the webhook body
audit-work/source/nabdah-backend/src/modules/moyasar/moyasar.module.ts:374:@Controller('moyasar')
audit-work/source/nabdah-backend/src/modules/moyasar/moyasar.module.ts:379:  @Post('payments')
audit-work/source/nabdah-backend/src/modules/moyasar/moyasar.module.ts:404:  @Get('payments/booking/:bookingId')
audit-work/source/nabdah-backend/src/modules/moyasar/moyasar.module.ts:415:  @Get('payments/me')
audit-work/source/nabdah-backend/src/modules/moyasar/moyasar.module.ts:422:  @Get('payments/sync/:moyasarId')
audit-work/source/nabdah-backend/src/modules/moyasar/moyasar.module.ts:433:  @Post('payments/:moyasarId/refund')
audit-work/source/nabdah-backend/src/modules/moyasar/moyasar.module.ts:443:  /** Moyasar webhook receiver (public — authenticated via HMAC signature, E5-F1 fail-closed) */
audit-work/source/nabdah-backend/src/modules/moyasar/moyasar.module.ts:445:  @Post('webhook')
audit-work/source/nabdah-backend/src/modules/moyasar/moyasar.module.ts:447:  webhook(@Body() body: any, @Headers('x-moyasar-signature') signature: string, @Req() req: any) {
audit-work/source/nabdah-backend/src/modules/moyasar/moyasar.module.ts:457:  @Get('callback')
audit-work/source/nabdah-backend/src/modules/i18n/i18n.controller.ts:8:@Controller('i18n')
audit-work/source/nabdah-backend/src/modules/i18n/i18n.controller.ts:13:  @Get()
audit-work/source/nabdah-backend/src/modules/i18n/i18n.controller.ts:19:  @Get('all')
audit-work/source/nabdah-backend/src/modules/export/export.controller.ts:7:@Controller('export')
audit-work/source/nabdah-backend/src/modules/export/export.controller.ts:19:  @Get('patients')
audit-work/source/nabdah-backend/src/modules/export/export.controller.ts:25:  @Get('appointments')
audit-work/source/nabdah-backend/src/modules/export/export.controller.ts:31:  @Get('orders')
audit-work/source/nabdah-backend/src/modules/export/export.controller.ts:37:  @Get('transactions')
audit-work/source/nabdah-backend/src/modules/export/export.controller.ts:43:  @Get('audit-logs')
audit-work/source/nabdah-backend/src/modules/realtime/realtime.sse.ts:11:@Controller('realtime')
audit-work/source/nabdah-backend/src/modules/realtime/realtime.gateway.ts:6:  SubscribeMessage, WebSocketGateway, WebSocketServer,
audit-work/source/nabdah-backend/src/modules/realtime/realtime.gateway.ts:17:@WebSocketGateway({ cors: getWebSocketCorsOptions(), namespace: '/', transports: ['websocket', 'polling'] })
audit-work/source/nabdah-backend/src/modules/realtime/realtime.gateway.ts:128:  @SubscribeMessage('presence:get')
audit-work/source/nabdah-backend/src/modules/realtime/realtime.gateway.ts:134:  @SubscribeMessage('presence:heartbeat')
audit-work/source/nabdah-backend/src/modules/realtime/realtime.gateway.ts:143:  @SubscribeMessage('chat:join')
audit-work/source/nabdah-backend/src/modules/realtime/realtime.gateway.ts:152:  @SubscribeMessage('chat:leave')
audit-work/source/nabdah-backend/src/modules/realtime/realtime.gateway.ts:161:  @SubscribeMessage('chat:typing:start')
audit-work/source/nabdah-backend/src/modules/realtime/realtime.gateway.ts:173:  @SubscribeMessage('chat:typing:stop')
audit-work/source/nabdah-backend/src/modules/realtime/realtime.gateway.ts:184:  @SubscribeMessage('chat:read')
audit-work/source/nabdah-backend/src/modules/realtime/realtime.gateway.ts:197:  @SubscribeMessage('chat:delivered')
audit-work/source/nabdah-backend/src/modules/realtime/realtime.gateway.ts:212:  @SubscribeMessage('call:incoming')
audit-work/source/nabdah-backend/src/modules/realtime/realtime.gateway.ts:227:  @SubscribeMessage('call:accepted')
audit-work/source/nabdah-backend/src/modules/realtime/realtime.gateway.ts:240:  @SubscribeMessage('call:rejected')
audit-work/source/nabdah-backend/src/modules/realtime/realtime.gateway.ts:254:  @SubscribeMessage('call:ended')
audit-work/source/nabdah-backend/src/modules/realtime/realtime.gateway.ts:267:  @SubscribeMessage('call:ice_candidate')
audit-work/source/nabdah-backend/src/modules/realtime/realtime.gateway.ts:279:  @SubscribeMessage('call:sdp_offer')
audit-work/source/nabdah-backend/src/modules/realtime/realtime.gateway.ts:291:  @SubscribeMessage('call:sdp_answer')
audit-work/source/nabdah-backend/src/modules/realtime/realtime.gateway.ts:305:  @SubscribeMessage('join_channel')
audit-work/source/nabdah-backend/src/modules/realtime/realtime.gateway.ts:313:  @SubscribeMessage('leave_channel')
audit-work/source/nabdah-backend/src/modules/realtime/realtime.gateway.ts:320:  @SubscribeMessage('waiting_room:join')
audit-work/source/nabdah-backend/src/modules/realtime/realtime.gateway.ts:356:  @SubscribeMessage('waiting_room:leave')
audit-work/source/nabdah-backend/src/modules/medical-profile/medical-profile.controller.ts:9:@Controller('medical-profile')
audit-work/source/nabdah-backend/src/modules/medical-profile/medical-profile.controller.ts:13:  @Get() get(@CurrentUser() u: any) { return this.svc.getOrCreate(u); }
audit-work/source/nabdah-backend/src/modules/medical-profile/medical-profile.controller.ts:14:  @Get('passport-token')
audit-work/source/nabdah-backend/src/modules/medical-profile/medical-profile.controller.ts:20:  @Patch() update(@CurrentUser() u: any, @Body() b: any) { return this.svc.update(u, b); }
audit-work/source/nabdah-backend/src/modules/medical-profile/medical-profile.controller.ts:22:  @Post('chronic-diseases') addCd(@CurrentUser() u: any, @Body() b: any) { return this.svc.addItem(u, 'chronic_diseases', b); }
audit-work/source/nabdah-backend/src/modules/medical-profile/medical-profile.controller.ts:23:  @Delete('chronic-diseases/:id') delCd(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.removeItem(u, 'chronic_diseases', id); }
audit-work/source/nabdah-backend/src/modules/medical-profile/medical-profile.controller.ts:25:  @Post('allergies') addAl(@CurrentUser() u: any, @Body() b: any) { return this.svc.addItem(u, 'allergies', b); }
audit-work/source/nabdah-backend/src/modules/medical-profile/medical-profile.controller.ts:26:  @Delete('allergies/:id') delAl(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.removeItem(u, 'allergies', id); }
audit-work/source/nabdah-backend/src/modules/medical-profile/medical-profile.controller.ts:28:  @Post('surgeries') addS(@CurrentUser() u: any, @Body() b: any) { return this.svc.addItem(u, 'surgeries', b); }
audit-work/source/nabdah-backend/src/modules/medical-profile/medical-profile.controller.ts:29:  @Delete('surgeries/:id') delS(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.removeItem(u, 'surgeries', id); }
audit-work/source/nabdah-backend/src/modules/medical-profile/medical-profile.controller.ts:31:  @Post('long-term-medications') addLm(@CurrentUser() u: any, @Body() b: any) { return this.svc.addItem(u, 'long_term_medications', b); }
audit-work/source/nabdah-backend/src/modules/medical-profile/medical-profile.controller.ts:32:  @Delete('long-term-medications/:id') delLm(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.removeItem(u, 'long_term_medications', id); }
audit-work/source/nabdah-backend/src/modules/medical-profile/medical-profile.controller.ts:35:  @Get('provider/:patientId') byPatient(@CurrentUser() u: any, @Param('patientId') pid: string) { return this.svc.getForPatient(u, pid); }
audit-work/source/nabdah-backend/src/modules/tour/tour.controller.ts:6:@Controller('tour')
audit-work/source/nabdah-backend/src/modules/tour/tour.controller.ts:10:  @Get('status')
audit-work/source/nabdah-backend/src/modules/tour/tour.controller.ts:15:  @Post('complete')
audit-work/source/nabdah-backend/src/modules/recruitment/recruitment.module.ts:220:@Controller('recruitment')
audit-work/source/nabdah-backend/src/modules/recruitment/recruitment.module.ts:226:  @Get('candidate/profile')
audit-work/source/nabdah-backend/src/modules/recruitment/recruitment.module.ts:231:  @Post('candidate/profile')
audit-work/source/nabdah-backend/src/modules/recruitment/recruitment.module.ts:236:  @Get('applications/my')
audit-work/source/nabdah-backend/src/modules/recruitment/recruitment.module.ts:242:  @Post('jobs')
audit-work/source/nabdah-backend/src/modules/recruitment/recruitment.module.ts:251:  @Put('jobs/:id')
audit-work/source/nabdah-backend/src/modules/recruitment/recruitment.module.ts:259:  @Get('jobs')
audit-work/source/nabdah-backend/src/modules/recruitment/recruitment.module.ts:265:  @Get('jobs/:id')
audit-work/source/nabdah-backend/src/modules/recruitment/recruitment.module.ts:270:  @Post('jobs/:id/apply')
audit-work/source/nabdah-backend/src/modules/recruitment/recruitment.module.ts:275:  @Get('jobs/:id/applications')
audit-work/source/nabdah-backend/src/modules/recruitment/recruitment.module.ts:280:  @Patch('applications/:id/status')
audit-work/source/nabdah-backend/src/modules/finance-engine/finance-engine.module.ts:859:@Controller('finance-engine')
audit-work/source/nabdah-backend/src/modules/finance-engine/finance-engine.module.ts:869:  @Post('coupons/validate')
audit-work/source/nabdah-backend/src/modules/finance-engine/finance-engine.module.ts:881:  @Post('loyalty/redeem-quote')
audit-work/source/nabdah-backend/src/modules/finance-engine/finance-engine.module.ts:889:  @Get('provider/balance')
audit-work/source/nabdah-backend/src/modules/finance-engine/finance-engine.module.ts:896:@Controller('admin/finance-engine')
audit-work/source/nabdah-backend/src/modules/finance-engine/finance-engine.module.ts:911:  @Get('reports/summary')
audit-work/source/nabdah-backend/src/modules/finance-engine/finance-engine.module.ts:918:  @Post('commission-rules')
audit-work/source/nabdah-backend/src/modules/finance-engine/finance-engine.module.ts:923:  @Get('commission-rules/history')
audit-work/source/nabdah-backend/src/modules/finance-engine/finance-engine.module.ts:928:  @Post('commission-rules/resolve')
audit-work/source/nabdah-backend/src/modules/finance-engine/finance-engine.module.ts:936:  @Get('approvals')
audit-work/source/nabdah-backend/src/modules/finance-engine/finance-engine.module.ts:941:  @Post('approvals/request')
audit-work/source/nabdah-backend/src/modules/finance-engine/finance-engine.module.ts:946:  @Post('approvals/:id/decide')
audit-work/source/nabdah-backend/src/modules/finance-engine/finance-engine.module.ts:974:  @Post('refunds/:id/execute')
audit-work/source/nabdah-backend/src/modules/finance-engine/finance-engine.module.ts:1004:  @Get('fraud/duplicate-payments/:bookingId')
audit-work/source/nabdah-backend/src/modules/finance-engine/finance-engine.module.ts:1010:  @Get('provider-balance/:providerId')
audit-work/source/nabdah-backend/src/modules/operations-safety/operations-safety.module.ts:137:@Controller('ops')
audit-work/source/nabdah-backend/src/modules/operations-safety/operations-safety.module.ts:142:  @Get('sla') sla() { return this.svc.slaReport(); }
audit-work/source/nabdah-backend/src/modules/operations-safety/operations-safety.module.ts:143:  @Post('escalate') escalate(@Body() b: any) { return this.svc.escalate(b); }
audit-work/source/nabdah-backend/src/modules/operations-safety/operations-safety.module.ts:144:  @Post('penalty/assess') assess(@Body() b: any) { return this.svc.assessPenalty(b); }
audit-work/source/nabdah-backend/src/modules/operations-safety/operations-safety.module.ts:145:  @Post('fallback') fallback(@Body() b: any) { return this.svc.fallback(b); }
audit-work/source/nabdah-backend/src/modules/operations-safety/operations-safety.module.ts:146:  @Get('penalties') penalties(@Query() q: any) { return this.svc.listPenalties(q); }
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:10:@Controller('health')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:14:  @Get('vitals')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:18:  @Get('vitals-log')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:23:  @Get('vitals/chart')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:26:  @Get('vitals/recent')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:29:  @Get('vitals/latest')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:32:  @Get('vitals/summary')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:35:  @Get('score')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:38:  @Post('vitals')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:44:  @Patch('vitals/:id')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:47:  @Delete('vitals/:id')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:51:  @Post('wearables/link')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:54:  @Delete('wearables/:deviceId')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:57:  @Get('reminders')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:60:  @Post('reminders')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:63:  @Post('reminders/:id/log')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:67:  @Post('reminders/:id/refill')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:69:  @Post('reminders/:id/refill/snooze')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:71:  @Post('reminders/:id/refill/cancel')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:74:  @Patch('reminders/:id')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:79:  @Delete('reminders/:id')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:83:  @Post('medications/:id/refill')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:86:  @Get('sleep')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:90:  @Post('sleep')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:96:  @Get('reports')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:101:  @Get('medications/reminders')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:106:  @Get('prescriptions')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:111:  @Get('emergency-contacts')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:116:  @Post('emergency-contacts')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:121:  @Delete('emergency-contacts/:id')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:126:  @Get('chronic-diseases')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:131:  @Get('chronic-meds')
audit-work/source/nabdah-backend/src/modules/health/health.controller.ts:136:  @Get('trends')
audit-work/source/nabdah-backend/src/modules/health/health-dashboard.controller.ts:12:@Controller('admin/health-dashboard')
audit-work/source/nabdah-backend/src/modules/health/health-dashboard.controller.ts:31:  @Get()
audit-work/source/nabdah-backend/src/modules/mental-health/mental-health.controller.ts:8:@Controller('mental-health')
audit-work/source/nabdah-backend/src/modules/mental-health/mental-health.controller.ts:21:  @Post('mood')
audit-work/source/nabdah-backend/src/modules/mental-health/mental-health.controller.ts:28:  @Get('mood')
audit-work/source/nabdah-backend/src/modules/mental-health/mental-health.controller.ts:34:  @Get('mood/stats')
audit-work/source/nabdah-backend/src/modules/mental-health/mental-health.controller.ts:40:  @Post('meditation')
audit-work/source/nabdah-backend/src/modules/mental-health/mental-health.controller.ts:46:  @Get('meditation')
audit-work/source/nabdah-backend/src/modules/mental-health/mental-health.controller.ts:52:  @Get('meditation/stats')
audit-work/source/nabdah-backend/src/modules/mental-health/mental-health.controller.ts:58:  @Post('breathing')
audit-work/source/nabdah-backend/src/modules/mental-health/mental-health.controller.ts:64:  @Get('breathing')
audit-work/source/nabdah-backend/src/modules/mental-health/mental-health.controller.ts:72:  @Get('crisis-contacts')
audit-work/source/nabdah-backend/src/modules/mental-health/mental-health.controller.ts:78:  @Post('crisis-contacts')
audit-work/source/nabdah-backend/src/modules/mental-health/mental-health.controller.ts:84:  @Delete('crisis-contacts/:id')
audit-work/source/nabdah-backend/src/modules/mental-health/mental-health.controller.ts:90:  @Get('dashboard')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:5:@Controller('labs')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:9:  @Public() @Get('services')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:29:  @Public() @Get('packages')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:32:  @Public() @Get('categories')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:35:  @Public() @Get('services/:id')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:38:  @Post('bookings')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:41:  @Get('bookings/mine')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:44:  @Get('bookings/:id')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:47:  @Post('bookings/:id/cancel')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:50:  @Patch('bookings/:id/state')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:55:  @Post('bookings/:id/documents')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:60:  @Patch('bookings/:id/insurance')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:65:  @Patch('bookings/:id/items/:serviceId/opt-in-cash')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:70:  @Get('provider/inbox')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:75:  @Post('bookings/:id/assign-technician')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:80:  @Post('bookings/:id/upload-report')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:86:  @Patch('bookings/:id/reschedule')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:91:  @Post('bookings/:id/gps')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:96:  @Get('bookings/:id/tracking')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:101:  @Post('bookings/:id/emergency')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:106:  @Post('bookings/:id/reassign')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:111:  @Get('admin/all')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:124:  @Post('samples/register')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:130:  @Patch('samples/:id/stage')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:136:  @Get('samples')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:143:  @Post('admin/catalog')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:149:  @Put('admin/catalog/:id')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:155:  @Delete('admin/catalog/:id')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:162:  @Patch('admin/bookings/:id/force-state')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:168:  @Public() @Get('packages/:id')
audit-work/source/nabdah-backend/src/modules/labs/labs.controller.ts:173:  @Public() @Get('compatible-providers')
audit-work/source/nabdah-backend/src/modules/labs/lab-results.controller.ts:8:@Controller('lab-results')
audit-work/source/nabdah-backend/src/modules/labs/lab-results.controller.ts:11:  @Post() create(@CurrentUser() u: any, @Body() b: any) { return this.svc.create(u, b); }
audit-work/source/nabdah-backend/src/modules/labs/lab-results.controller.ts:12:  @Get('mine') mine(@CurrentUser() u: any) { return this.svc.mineFor(u); }
audit-work/source/nabdah-backend/src/modules/labs/lab-results.controller.ts:13:  @Get('by-booking/:bid') byBkg(@CurrentUser() u: any, @Param('bid') bid: string) { return this.svc.byBooking(u, bid); }
audit-work/source/nabdah-backend/src/modules/labs/lab-results.controller.ts:14:  @Get(':id') one(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.one(u, id); }
audit-work/source/nabdah-backend/src/modules/labs/controllers/labs-engine.controller.ts:7:@Controller('labs/bookings')
audit-work/source/nabdah-backend/src/modules/labs/controllers/labs-engine.controller.ts:14:  @Get('queue')
audit-work/source/nabdah-backend/src/modules/labs/controllers/labs-engine.controller.ts:23:  @Post(':id/respond')
audit-work/source/nabdah-backend/src/modules/labs/controllers/labs-engine.controller.ts:42:  @Post('collect-sample/:id')
audit-work/source/nabdah-backend/src/modules/labs/controllers/labs-engine.controller.ts:70:  @Post('finalize-test/:id')
audit-work/source/nabdah-backend/src/modules/labs/controllers/labs-engine.controller.ts:100:  @Get('catalog')
audit-work/source/nabdah-backend/src/modules/labs/controllers/labs-engine.controller.ts:106:  @Post('catalog')
audit-work/source/nabdah-backend/src/modules/labs/controllers/labs-engine.controller.ts:121:  @Get('wallet')
audit-work/source/nabdah-backend/src/modules/prescriptions/prescriptions.controller.ts:6:@Controller('prescriptions')
audit-work/source/nabdah-backend/src/modules/prescriptions/prescriptions.controller.ts:11:  @Post('create')
audit-work/source/nabdah-backend/src/modules/prescriptions/prescriptions.controller.ts:17:  @Post('upload')
audit-work/source/nabdah-backend/src/modules/prescriptions/prescriptions.controller.ts:22:  @Post('manual-entry')
audit-work/source/nabdah-backend/src/modules/prescriptions/prescriptions.controller.ts:28:  @Post(':id/send')
audit-work/source/nabdah-backend/src/modules/prescriptions/prescriptions.controller.ts:34:  @Post(':id/transition')
audit-work/source/nabdah-backend/src/modules/prescriptions/prescriptions.controller.ts:39:  @Post(':id/substitute')
audit-work/source/nabdah-backend/src/modules/prescriptions/prescriptions.controller.ts:45:  @Get('manual-review/queue')
audit-work/source/nabdah-backend/src/modules/prescriptions/prescriptions.controller.ts:49:  @Get('active')
audit-work/source/nabdah-backend/src/modules/prescriptions/prescriptions.controller.ts:52:  @Get('mine')
audit-work/source/nabdah-backend/src/modules/prescriptions/prescriptions.controller.ts:57:  @Get('doctor/mine')
audit-work/source/nabdah-backend/src/modules/prescriptions/prescriptions.controller.ts:63:  @Get('pharmacy/queue')
audit-work/source/nabdah-backend/src/modules/prescriptions/prescriptions.controller.ts:69:  @Get(':id')
audit-work/source/nabdah-backend/src/modules/billing/billing.module.ts:209:@Controller('billing')
audit-work/source/nabdah-backend/src/modules/billing/billing.module.ts:215:  @Get('invoice/:kind/:bookingId')
audit-work/source/nabdah-backend/src/modules/billing/billing.module.ts:221:  @Get('invoice/:kind/:bookingId/pdf')
audit-work/source/nabdah-backend/src/modules/billing/billing.module.ts:230:  @Post('invoice/:kind/:bookingId/email')
audit-work/source/nabdah-backend/src/modules/billing/billing.module.ts:235:  @Get('my')
audit-work/source/nabdah-backend/src/modules/billing/billing.module.ts:241:  @Get('admin/list')
audit-work/source/nabdah-backend/src/modules/articles/articles.module.ts:96:@Controller('articles')
audit-work/source/nabdah-backend/src/modules/articles/articles.module.ts:100:  @Public() @Get() list(@Query() q: any) { return this.svc.list(q); }
audit-work/source/nabdah-backend/src/modules/articles/articles.module.ts:101:  @Public() @Get('categories') cats() { return this.svc.categories(); }
audit-work/source/nabdah-backend/src/modules/articles/articles.module.ts:102:  @Public() @Get(':slug') one(@Param('slug') slug: string) { return this.svc.bySlug(slug); }
audit-work/source/nabdah-backend/src/modules/articles/articles.module.ts:106:@Controller('admin/articles')
audit-work/source/nabdah-backend/src/modules/articles/articles.module.ts:112:  @Get() list() { return this.svc.adminList(); }
audit-work/source/nabdah-backend/src/modules/articles/articles.module.ts:113:  @Post() create(@Body() body: any) { return this.svc.create(body); }
audit-work/source/nabdah-backend/src/modules/articles/articles.module.ts:114:  @Patch(':id') update(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body); }
audit-work/source/nabdah-backend/src/modules/articles/articles.module.ts:115:  @Post(':id/publish') publish(@Param('id') id: string) { return this.svc.publish(id); }
audit-work/source/nabdah-backend/src/modules/articles/articles.module.ts:116:  @Post(':id/unpublish') unpublish(@Param('id') id: string) { return this.svc.unpublish(id); }
audit-work/source/nabdah-backend/src/modules/articles/articles.module.ts:117:  @Delete(':id') remove(@Param('id') id: string) { return this.svc.remove(id); }
audit-work/source/nabdah-backend/src/modules/articles/articles.module.ts:121:@Controller('articles')
audit-work/source/nabdah-backend/src/modules/articles/articles.module.ts:127:  @Post(':id/bookmark')
audit-work/source/nabdah-backend/src/modules/articles/articles.module.ts:139:  @Delete(':id/bookmark')
audit-work/source/nabdah-backend/src/modules/articles/articles.module.ts:149:@Controller('articles/bookmarks')
audit-work/source/nabdah-backend/src/modules/articles/articles.module.ts:157:  @Get('mine')
audit-work/source/nabdah-backend/src/modules/articles/articles.module.ts:167:  @Get(':slug/status')
audit-work/source/nabdah-backend/src/modules/articles/articles.module.ts:176:  @Post(':slug/toggle')
audit-work/source/nabdah-backend/src/modules/articles/seo.controller.ts:10:@Controller('seo')
audit-work/source/nabdah-backend/src/modules/articles/seo.controller.ts:15:  @Get('resolve/:type/:slug')
audit-work/source/nabdah-backend/src/modules/admin-authority/admin-authority.module.ts:251:@Controller('admin/authority')
audit-work/source/nabdah-backend/src/modules/admin-authority/admin-authority.module.ts:256:  @Post('appointments/:id/force-cancel') fca(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.forceCancelAppt(u, id, b.reason || ''); }
audit-work/source/nabdah-backend/src/modules/admin-authority/admin-authority.module.ts:257:  @Post('appointments/:id/force-confirm') fcoappt(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.forceConfirmAppt(u, id, b.reason || ''); }
audit-work/source/nabdah-backend/src/modules/admin-authority/admin-authority.module.ts:258:  @Post('appointments/:id/force-reschedule') fra(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.forceRescheduleAppt(u, id, b.new_time, b.reason || ''); }
audit-work/source/nabdah-backend/src/modules/admin-authority/admin-authority.module.ts:259:  @Post('orders/:id/force-cancel') fco(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.forceCancelOrder(u, id, b.reason || ''); }
audit-work/source/nabdah-backend/src/modules/admin-authority/admin-authority.module.ts:260:  @Post('orders/:id/force-complete') fkco(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.forceCompleteOrder(u, id, b.reason || ''); }
audit-work/source/nabdah-backend/src/modules/admin-authority/admin-authority.module.ts:261:  @Post('orders/:id/force-reassign') frr(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.forceReassignOrder(u, id, b.pharmacy_id, b.reason || ''); }
audit-work/source/nabdah-backend/src/modules/admin-authority/admin-authority.module.ts:263:  @Post('labs/:id/force-cancel') fcl(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.forceCancelLab(u, id, b.reason || ''); }
audit-work/source/nabdah-backend/src/modules/admin-authority/admin-authority.module.ts:264:  @Post('labs/:id/force-complete') fkcl(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.forceCompleteLab(u, id, b.reason || ''); }
audit-work/source/nabdah-backend/src/modules/admin-authority/admin-authority.module.ts:265:  @Post('labs/:id/override-insurance') oil(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.overrideLabInsurance(u, id, b.status, b.reason || ''); }
audit-work/source/nabdah-backend/src/modules/admin-authority/admin-authority.module.ts:267:  @Post('radiology/:id/force-cancel') fcr(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.forceCancelRad(u, id, b.reason || ''); }
audit-work/source/nabdah-backend/src/modules/admin-authority/admin-authority.module.ts:268:  @Post('radiology/:id/force-complete') fkcr(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.forceCompleteRad(u, id, b.reason || ''); }
audit-work/source/nabdah-backend/src/modules/admin-authority/admin-authority.module.ts:269:  @Post('radiology/:id/override-insurance') oir(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.overrideRadInsurance(u, id, b.status, b.reason || ''); }
audit-work/source/nabdah-backend/src/modules/admin-authority/admin-authority.module.ts:271:  @Post('providers/:id/suspend') susp(@Param('id') id: string, @Body() b: any, @CurrentUser() u: any) { return this.svc.suspendProvider(u, id, b.reason || ''); }
audit-work/source/nabdah-backend/src/modules/admin-authority/admin-authority.module.ts:272:  @Post('providers/:id/unsuspend') unsp(@Param('id') id: string, @CurrentUser() u: any) { return this.svc.unsuspendProvider(u, id); }
audit-work/source/nabdah-backend/src/modules/admin-authority/admin-authority.module.ts:273:  @Post('users/:id/impersonate') impersonate(@Param('id') targetUserId: string, @CurrentUser() admin: any) { return this.svc.impersonateUser(admin, targetUserId); }
audit-work/source/nabdah-backend/src/modules/admin-authority/admin-authority.module.ts:275:  @Get('actions') log(@Query() q: any) { return this.svc.listActions({ action: q?.action, admin_id: q?.admin_id, target_type: q?.target_type, limit: q?.limit ? Number(q.limit) : undefined }); }
audit-work/source/nabdah-backend/src/modules/providers/providers.controller.ts:6:@Controller('providers')
audit-work/source/nabdah-backend/src/modules/providers/providers.controller.ts:13:  @Post('apply')
audit-work/source/nabdah-backend/src/modules/providers/providers.controller.ts:20:  @Get()
audit-work/source/nabdah-backend/src/modules/providers/providers.controller.ts:33:  @Get('map')
audit-work/source/nabdah-backend/src/modules/providers/providers.controller.ts:39:  @Get(':id')
audit-work/source/nabdah-backend/src/modules/providers/providers.controller.ts:45:  @Get('me/profile')
audit-work/source/nabdah-backend/src/modules/providers/providers.controller.ts:58:  @Post('admin/create')
audit-work/source/nabdah-backend/src/modules/providers/providers.controller.ts:64:  @Get('admin/all')
audit-work/source/nabdah-backend/src/modules/providers/providers.controller.ts:70:  @Get('admin/pending')
audit-work/source/nabdah-backend/src/modules/providers/providers.controller.ts:76:  @Post(':id/approve')
audit-work/source/nabdah-backend/src/modules/providers/providers.controller.ts:82:  @Post(':id/reject')
audit-work/source/nabdah-backend/src/modules/providers/providers.controller.ts:88:  @Post(':id/suspend')
audit-work/source/nabdah-backend/src/modules/providers/providers.controller.ts:95:  @Post('admin/seed-demo')
audit-work/source/nabdah-backend/src/modules/providers/controllers/hospital-enterprise.controller.ts:10:@Controller('providers/enterprise')
audit-work/source/nabdah-backend/src/modules/providers/controllers/hospital-enterprise.controller.ts:19:  @Post('provision-sub-provider')
audit-work/source/nabdah-backend/src/modules/providers/controllers/hospital-enterprise.controller.ts:49:  @Get('branch-staff/:hospitalId/:branchId')
audit-work/source/nabdah-backend/src/modules/providers/controllers/hospital-enterprise.controller.ts:70:  @Post('branch-financials/:hospitalId/:branchId')
audit-work/source/nabdah-backend/src/modules/payouts/provider-payouts.controller.ts:9:@Controller('provider/payouts')
audit-work/source/nabdah-backend/src/modules/payouts/provider-payouts.controller.ts:45:  @Post('request')
audit-work/source/nabdah-backend/src/modules/payouts/provider-payouts.controller.ts:111:  @Get('mine')
audit-work/source/nabdah-backend/src/modules/payouts/provider-payouts.controller.ts:116:  @Get('balance')
audit-work/source/nabdah-backend/src/modules/ratings/ratings.module.ts:85:@Controller('ratings')
audit-work/source/nabdah-backend/src/modules/ratings/ratings.module.ts:89:  @Post()
audit-work/source/nabdah-backend/src/modules/ratings/ratings.module.ts:96:  @Get('provider/:id')
audit-work/source/nabdah-backend/src/modules/ratings/ratings.module.ts:101:  @Get('mine/:entity_type/:entity_id')
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:523:@Controller('provider/ops')
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:529:  @Post('doctor/leave') addLeave(@CurrentUser() u: any, @Body() b: any) { return this.svc.addLeave(u.id, b); }
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:530:  @Get('doctor/leave') leaves(@CurrentUser() u: any): Promise<any[]> { return this.svc.myLeaves(u.id); }
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:531:  @Delete('doctor/leave/:id') cancelLeave(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.cancelLeave(u.id, id); }
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:534:  @Post('doctor/templates') saveTemplate(@CurrentUser() u: any, @Body() b: any) { return this.svc.saveTemplate(u.id, b); }
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:535:  @Get('doctor/templates') templates(@CurrentUser() u: any): Promise<any[]> { return this.svc.myTemplates(u.id); }
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:536:  @Delete('doctor/templates/:id') delTemplate(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.deleteTemplate(u.id, id); }
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:537:  @Post('doctor/diagnoses') saveDx(@CurrentUser() u: any, @Body() b: any) { return this.svc.saveDiagnosis(u.id, b); }
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:538:  @Get('doctor/diagnoses') diagnoses(@CurrentUser() u: any, @Query('search') s?: string): Promise<any[]> { return this.svc.myDiagnoses(u.id, s); }
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:539:  @Post('doctor/blacklist/:patientId') block(@CurrentUser() u: any, @Param('patientId') p: string, @Body() b: any) { return this.svc.blacklistPatient(u.id, p, b?.reason); }
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:540:  @Delete('doctor/blacklist/:patientId') unblock(@CurrentUser() u: any, @Param('patientId') p: string) { return this.svc.unblacklistPatient(u.id, p); }
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:541:  @Get('doctor/blacklist') blacklist(@CurrentUser() u: any): Promise<any[]> { return this.svc.myBlacklist(u.id); }
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:542:  @Get('doctor/patient-crm/:patientId') getCrm(@CurrentUser() u: any, @Param('patientId') p: string) { return this.svc.getPatientCrm(u.id, p); }
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:543:  @Put('doctor/patient-crm/:patientId') putCrm(@CurrentUser() u: any, @Param('patientId') p: string, @Body() b: any) { return this.svc.putPatientCrm(u.id, p, b || {}); }
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:546:  @Post('lab/bookings/:id/qc/:action') qc(@CurrentUser() u: any, @Param('id') id: string, @Param('action') action: string, @Body() b: any) { return this.svc.labQc(u, id, action, b); }
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:549:  @Post('nursing/bookings/:id/checklist/:phase') checklist(@CurrentUser() u: any, @Param('id') id: string, @Param('phase') phase: string, @Body() b: any) { return this.svc.nursingChecklist(u, id, phase as any, b?.items || {}); }
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:550:  @Post('nursing/bookings/:id/sign') sign(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.nursingSign(u, id, b?.signature, b?.signer_name); }
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:551:  @Post('nursing/bookings/:id/track') track(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.nursingTrack(u, id, b?.lat, b?.lng); }
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:552:  @Post('nursing/bookings/:id/escalate') escalate(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.nursingEscalate(u, id, b?.reason); }
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:555:  @Get('ambulance/:id/eta') eta(@Param('id') id: string, @Query('lat') lat: string, @Query('lng') lng: string) { return this.svc.ambulanceEta(id, parseFloat(lat), parseFloat(lng)); }
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:556:  @Post('ambulance/:id/handover') handover(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.ambulanceHandover(u, id, b); }
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:557:  @Post('ambulance/:id/complete') complete(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.svc.ambulanceComplete(u, id, b); }
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:560:  @Get('invoice/:orderId/pdf') async invoice(@CurrentUser() u: any, @Param('orderId') id: string, @Res({ passthrough: true }) res: any) {
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:566:  @Get('wallet/ledger') wallet(@CurrentUser() u: any, @Query('limit') l?: string): Promise<any> { return this.svc.walletLedger(u.id, l ? parseInt(l) : 100); }
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:571:@Controller('provider')
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:577:  @Post('ops/availability/toggle-instant')
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:583:  @Get('wallet') async wallet(@CurrentUser() u: any) {
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:588:  @Get('wallet/transactions') async walletTx(@CurrentUser() u: any) {
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:600:  @Get('stats/today') async statsToday(@CurrentUser() u: any): Promise<any> {
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:605:  @Get('reviews') async myReviews(@CurrentUser() u: any): Promise<any[]> {
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:609:  @Post('reviews/:id/reply') replyReview(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) {
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:614:  @Get('working-hours') async getHours(@CurrentUser() u: any) {
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:617:  @Put('working-hours') async putHours(@CurrentUser() u: any, @Body() b: any) {
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:622:  @Get('schedule/settings') async getSched(@CurrentUser() u: any) {
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:625:  @Post('schedule/settings') async postSched(@CurrentUser() u: any, @Body() b: any) {
audit-work/source/nabdah-backend/src/modules/provider-ops/provider-ops.module.ts:630:  @Post('consultation/end') endConsultation(@CurrentUser() u: any, @Body() b: any) {
audit-work/source/nabdah-backend/src/modules/config/config.controller.ts:8:@Controller('config')
audit-work/source/nabdah-backend/src/modules/config/config.controller.ts:13:  @Get()
audit-work/source/nabdah-backend/src/modules/event-reliability/event-reliability.module.ts:131:@Controller('events')
audit-work/source/nabdah-backend/src/modules/event-reliability/event-reliability.module.ts:136:  @Get('status') status() { return this.svc.status(); }
audit-work/source/nabdah-backend/src/modules/event-reliability/event-reliability.module.ts:137:  @Post('retry-failed') retry() { return this.svc.retryFailed(); }
audit-work/source/nabdah-backend/src/modules/event-reliability/event-reliability.module.ts:138:  @Post('replay/:eventId') replay(@Param('eventId') id: string) { return this.svc.replayOne(id); }
audit-work/source/nabdah-backend/src/modules/maternity/maternity.controller.ts:6:@Controller('maternity')
audit-work/source/nabdah-backend/src/modules/maternity/maternity.controller.ts:19:  @Get('profile')
audit-work/source/nabdah-backend/src/modules/maternity/maternity.controller.ts:24:  @Get('content')
audit-work/source/nabdah-backend/src/modules/maternity/maternity.controller.ts:30:  @Post('profile')
audit-work/source/nabdah-backend/src/modules/maternity/maternity.controller.ts:36:  @Post('kicks')
audit-work/source/nabdah-backend/src/modules/maternity/maternity.controller.ts:42:  @Post('contractions')
audit-work/source/nabdah-backend/src/modules/maternity/maternity.controller.ts:48:  @Put('checkups/:week/toggle')
audit-work/source/nabdah-backend/src/modules/maternity/maternity.controller.ts:54:  @Post('infant-growth')
audit-work/source/nabdah-backend/src/modules/provider-jobs/provider-jobs.module.ts:254:@Controller('provider/jobs')
audit-work/source/nabdah-backend/src/modules/provider-jobs/provider-jobs.module.ts:258:  @Get('queue') queue(@CurrentUser() u: any, @Query() q: any) { return this.svc.queue(u, (q.status as any) || 'incoming', q.kind); }
audit-work/source/nabdah-backend/src/modules/provider-jobs/provider-jobs.module.ts:259:  @Get('my-capabilities') async myCaps(@CurrentUser() u: any) {
audit-work/source/nabdah-backend/src/modules/provider-jobs/provider-jobs.module.ts:263:  @Post(':type/:id/accept') accept(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string, @Body() b: any) { return this.svc.accept(u, t, id, b?.reason); }
audit-work/source/nabdah-backend/src/modules/provider-jobs/provider-jobs.module.ts:264:  @Post(':type/:id/reject') reject(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string, @Body() b: any) { return this.svc.reject(u, t, id, b?.reason); }
audit-work/source/nabdah-backend/src/modules/provider-jobs/provider-jobs.module.ts:265:  @Post(':type/:id/start') start(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string, @Body() b: any) { return this.svc.start(u, t, id, b?.reason); }
audit-work/source/nabdah-backend/src/modules/provider-jobs/provider-jobs.module.ts:266:  @Post(':type/:id/complete') complete(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string, @Body() b: any) { return this.svc.complete(u, t, id, b?.reason); }
audit-work/source/nabdah-backend/src/modules/provider-jobs/provider-jobs.module.ts:267:  @Post(':type/:id/insurance') insurance(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string, @Body() b: any) { return this.svc.updateInsurance(u, t, id, b); }
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:8:@Controller('orders')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:14:  @Post('create')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:21:  @Get('mine')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:26:  @Post(':id/reorder')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:32:  @Post(':id/reorder-partial')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:38:  @Post(':id/cancel')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:45:  @Post(':id/approve-basket')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:49:  @Post(':id/reject-basket')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:55:  @Get('pharmacy/queue')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:61:  @Get(':id')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:66:  @Get(':id/report.pdf')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:74:  @Get(':id/tracking')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:79:  @Patch(':id/items/:itemId/opt-in-cash')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:86:  @Patch(':id/insurance-approval')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:92:  @Post(':id/accept')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:98:  @Post(':id/reject')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:104:  @Post(':id/preparing')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:110:  @Post(':id/ready')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:116:  @Post(':id/partial')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:123:  @Post(':id/assign-delivery')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:129:  @Post(':id/delivery/update')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:135:  @Post(':id/dispatch')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:141:  @Post(':id/delivered')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:148:  @Get()
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:154:  @Get('admin/escalated')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:160:  @Post(':id/admin/transition')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:166:  @Post('bids/place')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:172:  @Post('bids/:id/accept')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:177:  @Get('bids/request/:id')
audit-work/source/nabdah-backend/src/modules/orders/orders.controller.ts:182:  @Get('bids/pharmacy/mine')
audit-work/source/nabdah-backend/src/modules/admin-notification-center/admin-notification-center.module.ts:369:@Controller('admin/notification-center')
audit-work/source/nabdah-backend/src/modules/admin-notification-center/admin-notification-center.module.ts:376:  @Get('segments')
audit-work/source/nabdah-backend/src/modules/admin-notification-center/admin-notification-center.module.ts:380:  @Get('stats/overview')
audit-work/source/nabdah-backend/src/modules/admin-notification-center/admin-notification-center.module.ts:384:  @Post('broadcasts')
audit-work/source/nabdah-backend/src/modules/admin-notification-center/admin-notification-center.module.ts:388:  @Post('campaigns')
audit-work/source/nabdah-backend/src/modules/admin-notification-center/admin-notification-center.module.ts:392:  @Get('campaigns')
audit-work/source/nabdah-backend/src/modules/admin-notification-center/admin-notification-center.module.ts:398:  @Get('campaigns/:id')
audit-work/source/nabdah-backend/src/modules/admin-notification-center/admin-notification-center.module.ts:402:  @Post('campaigns/:id/send')
audit-work/source/nabdah-backend/src/modules/admin-notification-center/admin-notification-center.module.ts:406:  @Delete('campaigns/:id')
audit-work/source/nabdah-backend/src/modules/admin-notification-center/admin-notification-center.module.ts:410:  @Post('retarget/run')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:7:@Controller()
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:16:  @Patch('notifications/:id/read')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:24:  @Get('wallet/balance')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:30:  @Post('wallet/credit')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:43:  @Post('wallet/debit')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:56:  @Post('referral/code')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:62:  @Post('referral/claim')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:69:  @Get('config/flags')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:74:  @Put('admin/config/flags')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:85:  @Get('patients/timeline')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:90:  @Get('patients/passport')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:95:  @Post('medical/programs/enroll')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:101:  @Get('medical/programs/active')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:106:  @Post('medical/programs/complete-session')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:116:  @Post('provider/match/pharmacy')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:121:  @Post('provider/match/nurse')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:126:  @Get('provider/rankings')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:132:  @Get('provider/fraud-alerts')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:142:  @Post('nursing/attendance/verify')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:147:  @Get('nursing/visit/checklist')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:152:  @Post('pharmacy/broadcast/respond')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:158:  @Get('pharmacy/inventory/expiry')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:163:  @Post('labs/samples/barcode-verify')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:169:  @Post('labs/results/verify')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:178:  @Get('admin/analytics/heatmaps')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:184:  @Post('admin/ads/bid')
audit-work/source/nabdah-backend/src/modules/nabd-extensions/nabd-extensions.controller.ts:190:  @Post('corporate/enroll')
audit-work/source/nabdah-backend/src/modules/nutrition/nutrition.controller.ts:8:@Controller('nutrition')
audit-work/source/nabdah-backend/src/modules/nutrition/nutrition.controller.ts:22:  @Get('profile')
audit-work/source/nabdah-backend/src/modules/nutrition/nutrition.controller.ts:28:  @Post('profile')
audit-work/source/nabdah-backend/src/modules/nutrition/nutrition.controller.ts:35:  @Post('meals')
audit-work/source/nabdah-backend/src/modules/nutrition/nutrition.controller.ts:41:  @Get('meals')
audit-work/source/nabdah-backend/src/modules/nutrition/nutrition.controller.ts:48:  @Get('daily-summary')
audit-work/source/nabdah-backend/src/modules/nutrition/nutrition.controller.ts:55:  @Post('water')
audit-work/source/nabdah-backend/src/modules/nutrition/nutrition.controller.ts:61:  @Get('water')
audit-work/source/nabdah-backend/src/modules/nutrition/nutrition.controller.ts:68:  @Post('exercise')
audit-work/source/nabdah-backend/src/modules/nutrition/nutrition.controller.ts:74:  @Get('exercise')
audit-work/source/nabdah-backend/src/modules/nutrition/nutrition.controller.ts:81:  @Get('weekly-report')
audit-work/source/nabdah-backend/src/modules/livekit/livekit.controller.ts:7:@Controller('calls')
audit-work/source/nabdah-backend/src/modules/livekit/livekit.controller.ts:13:  @Get('provider/waiting-room')
audit-work/source/nabdah-backend/src/modules/livekit/livekit.controller.ts:18:  @Post('provider/ping-patient')
audit-work/source/nabdah-backend/src/modules/livekit/livekit.controller.ts:23:  @Post('provider/no-show')
audit-work/source/nabdah-backend/src/modules/livekit/livekit.controller.ts:31:  @Post('webhook')
audit-work/source/nabdah-backend/src/modules/livekit/livekit.controller.ts:32:  async webhook(@Body() body: any) {
audit-work/source/nabdah-backend/src/modules/livekit/livekit.controller.ts:33:    // Implement LiveKit webhook verification here
audit-work/source/nabdah-backend/src/modules/livekit/livekit.controller.ts:37:  @Post('initiate')
audit-work/source/nabdah-backend/src/modules/livekit/livekit.controller.ts:46:  @Post(':sessionId/join')
audit-work/source/nabdah-backend/src/modules/livekit/livekit.controller.ts:51:  @Post(':sessionId/end')
audit-work/source/nabdah-backend/src/modules/livekit/livekit.controller.ts:56:  @Post(':sessionId/reject')
audit-work/source/nabdah-backend/src/modules/livekit/livekit.controller.ts:61:  @Post(':sessionId/metrics')
audit-work/source/nabdah-backend/src/modules/livekit/livekit.controller.ts:70:  @Get('history')
audit-work/source/nabdah-backend/src/modules/livekit/livekit.controller.ts:75:  @Get('sessions/:sessionId')
audit-work/source/nabdah-backend/src/modules/livekit/livekit.controller.ts:81:  @Get('admin/rooms')
audit-work/source/nabdah-backend/src/modules/livekit/livekit.controller.ts:87:  @Get('admin/analytics')
audit-work/source/nabdah-backend/src/modules/livekit/livekit.controller.ts:93:  @Get('admin/rooms/:roomName/participants')
audit-work/source/nabdah-backend/src/modules/livekit/livekit.controller.ts:99:  @Post('admin/rooms/:roomName/mute/:participantId')
audit-work/source/nabdah-backend/src/modules/livekit/livekit.controller.ts:109:  @Post('admin/rooms/:roomName/remove/:participantId')
audit-work/source/nabdah-backend/src/modules/doctors/doctors.module.ts:246:@Controller('doctors')
audit-work/source/nabdah-backend/src/modules/doctors/doctors.module.ts:251:  @Public() @Get('') list(@Query() q: any) { return this.svc.listDoctors(q); }
audit-work/source/nabdah-backend/src/modules/doctors/doctors.module.ts:252:  @Public() @Get('specialties') specs() { return this.svc.specialties(); }
audit-work/source/nabdah-backend/src/modules/doctors/doctors.module.ts:253:  @Public() @Get(':id') detail(@Param('id') id: string) { return this.svc.doctorDetail(id); }
audit-work/source/nabdah-backend/src/modules/doctors/doctors.module.ts:254:  @Public() @Get(':id/slots') slots(@Param('id') id: string, @Query('date') date: string) { return this.svc.availableSlots(id, date); }
audit-work/source/nabdah-backend/src/modules/doctors/doctors.module.ts:256:  @Post('appointments') book(@Body() body: any, @CurrentUser() user: any) { return this.svc.book(user, body); }
audit-work/source/nabdah-backend/src/modules/doctors/doctors.module.ts:257:  @Get('appointments/mine') mine(@CurrentUser() user: any) { return this.svc.myAppointments(user); }
audit-work/source/nabdah-backend/src/modules/doctors/doctors.module.ts:258:  @Get('appointments/inbox') inbox(@Query('status') s: string | undefined, @CurrentUser() user: any) { return this.svc.doctorInbox(user, s); }
audit-work/source/nabdah-backend/src/modules/doctors/doctors.module.ts:259:  @Get('appointments/:id') ap(@Param('id') id: string, @CurrentUser() user: any) { return this.svc.appointmentDetail(user, id); }
audit-work/source/nabdah-backend/src/modules/doctors/doctors.module.ts:260:  @Patch('appointments/:id/state') tr(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) { return this.svc.transition(user, id, body.state); }
audit-work/source/nabdah-backend/src/modules/doctors/doctors.module.ts:262:  @Get('appointments/:id/messages') msgs(@Param('id') id: string, @CurrentUser() user: any) { return this.svc.listMessages(user, id); }
audit-work/source/nabdah-backend/src/modules/doctors/doctors.module.ts:263:  @Post('appointments/:id/messages') postMsg(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) { return this.svc.postMessage(user, id, body.text); }
audit-work/source/nabdah-backend/src/modules/doctors/doctors.module.ts:264:  @Post('appointments/:id/note') note(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) { return this.svc.upsertNote(user, id, body); }
audit-work/source/nabdah-backend/src/modules/doctors/doctors.module.ts:266:  @Patch('availability') avail(@Body() body: any, @CurrentUser() user: any) { return this.svc.setAvailability(user, body); }
audit-work/source/nabdah-backend/src/modules/doctors/doctors.module.ts:269:@Controller('notifications')
audit-work/source/nabdah-backend/src/modules/doctors/doctors.module.ts:273:  @Get('') list(@CurrentUser() user: any) { return this.svc.listNotifications(user); }
audit-work/source/nabdah-backend/src/modules/doctors/doctors.module.ts:274:  @Get('unread-count') unread(@CurrentUser() user: any) { return this.svc.unreadCount(user); }
audit-work/source/nabdah-backend/src/modules/doctors/doctors.module.ts:275:  @Patch(':id/read') mr(@Param('id') id: string, @CurrentUser() user: any) { return this.svc.markRead(user, id); }
audit-work/source/nabdah-backend/src/modules/doctors/doctors.module.ts:276:  @Post('mark-all-read') mar(@CurrentUser() user: any) { return this.svc.markAllRead(user); }
audit-work/source/nabdah-backend/src/modules/admin/admin.controller.ts:19:@Controller('admin')
audit-work/source/nabdah-backend/src/modules/admin/admin.controller.ts:39:  @Get('referrals/report')
audit-work/source/nabdah-backend/src/modules/admin/admin.controller.ts:100:  @Get('loyalty/overview')
audit-work/source/nabdah-backend/src/modules/admin/admin.controller.ts:139:  @Get('users/:userId/overview')
audit-work/source/nabdah-backend/src/modules/admin/admin.controller.ts:242:  @Get('disputes')
audit-work/source/nabdah-backend/src/modules/admin/admin.controller.ts:251:  @Get('users')
audit-work/source/nabdah-backend/src/modules/admin/admin.controller.ts:309:  @Get('users/stats')
audit-work/source/nabdah-backend/src/modules/admin/admin.controller.ts:332:  @Get('sub-admins')
audit-work/source/nabdah-backend/src/modules/admin/admin.controller.ts:348:  @Post('sub-admins')
audit-work/source/nabdah-backend/src/modules/admin/admin.controller.ts:377:  @Patch('sub-admins/:userId')
audit-work/source/nabdah-backend/src/modules/admin/admin.controller.ts:398:  @Delete('sub-admins/:userId')
audit-work/source/nabdah-backend/src/modules/admin/admin.controller.ts:423:  @Post('providers/create')
audit-work/source/nabdah-backend/src/modules/admin/admin.controller.ts:458:  @Post('users/:userId/ban')
audit-work/source/nabdah-backend/src/modules/admin/admin.controller.ts:474:  @Post('users/:userId/unban')
audit-work/source/nabdah-backend/src/modules/admin/admin.controller.ts:490:  @Delete('users/:userId')
audit-work/source/nabdah-backend/src/modules/admin/admin.controller.ts:529:  @Post('approve/:userId')
audit-work/source/nabdah-backend/src/modules/admin/admin.controller.ts:543:  @Post('suspend/:userId')
audit-work/source/nabdah-backend/src/modules/admin/admin.controller.ts:557:  @Post('provider-deltas')
audit-work/source/nabdah-backend/src/modules/admin/admin.controller.ts:563:  @Post('provider-deltas/:deltaId/approve')
audit-work/source/nabdah-backend/src/modules/admin/admin.controller.ts:577:  @Post('provider-deltas/:deltaId/reject')
audit-work/source/nabdah-backend/src/modules/payments/paymob.service.ts:91:      this.logger.warn('Paymob webhook rejected: invalid HMAC signature');
audit-work/source/nabdah-backend/src/modules/payments/paymob.controller.ts:9:@Controller('payments/paymob')
audit-work/source/nabdah-backend/src/modules/payments/paymob.controller.ts:14:  @Get('methods')
audit-work/source/nabdah-backend/src/modules/payments/paymob.controller.ts:19:  @Post('initiate')
audit-work/source/nabdah-backend/src/modules/payments/paymob.controller.ts:25:  @Post('verify')
audit-work/source/nabdah-backend/src/modules/payments/payments-idor.spec.ts:68:  it('fails closed when a payment webhook has no valid Moyasar signature', async () => {
audit-work/source/nabdah-backend/src/modules/payments/payments-idor.spec.ts:72:      .rejects.toThrow('invalid_webhook_signature');
audit-work/source/nabdah-backend/src/modules/payments/payments-idor.spec.ts:78:  it('accepts only an exact HMAC over the raw Moyasar webhook payload', () => {
audit-work/source/nabdah-backend/src/modules/payments/payments-idor.spec.ts:80:    process.env.MOYASAR_WEBHOOK_SECRET = 'test-webhook-secret';
audit-work/source/nabdah-backend/src/modules/payments/payments-idor.spec.ts:82:    const valid = crypto.createHmac('sha256', 'test-webhook-secret').update(rawBody).digest('hex');
audit-work/source/nabdah-backend/src/modules/payments/payments.module.ts:223:    // patient, an admin, or the signature-authenticated internal webhook path may trigger it.
audit-work/source/nabdah-backend/src/modules/payments/payments.module.ts:261:    t.webhook_payload = result.raw;
audit-work/source/nabdah-backend/src/modules/payments/payments.module.ts:321:      t.webhook_payload = j;
audit-work/source/nabdah-backend/src/modules/payments/payments.module.ts:327:    t.webhook_payload = j;
audit-work/source/nabdah-backend/src/modules/payments/payments.module.ts:353:      throw new BadRequestException('invalid_webhook_signature');
audit-work/source/nabdah-backend/src/modules/payments/payments.module.ts:376:@Controller('payments')
audit-work/source/nabdah-backend/src/modules/payments/payments.module.ts:380:  @Post('intent/:type/:id')
audit-work/source/nabdah-backend/src/modules/payments/payments.module.ts:383:  @Post('verify/:txn') verify(@CurrentUser() u: any, @Param('txn') txn: string) { return this.svc.verifyPayment(u, txn); }
audit-work/source/nabdah-backend/src/modules/payments/payments.module.ts:384:  @Post('retry/:type/:id')
audit-work/source/nabdah-backend/src/modules/payments/payments.module.ts:387:  @Post('refund/:txn') refund(@CurrentUser() u: any, @Param('txn') txn: string, @Body() b: { amount?: number; reason?: string }) { return this.svc.refundPayment(u, txn, b.amount, b.reason); }
audit-work/source/nabdah-backend/src/modules/payments/payments.module.ts:388:  @Post('capture/:txn') capture(@CurrentUser() u: any, @Param('txn') txn: string) { return this.svc.capturePayment(u, txn); }
audit-work/source/nabdah-backend/src/modules/payments/payments.module.ts:389:  @Get('booking/:type/:id') list(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string) { return this.svc.listForBooking(u, t, id); }
audit-work/source/nabdah-backend/src/modules/payments/payments.module.ts:392:@Controller('payments/webhook')
audit-work/source/nabdah-backend/src/modules/payments/payments.module.ts:396:  @Post(':provider') @HttpCode(200) async webhook(
audit-work/source/nabdah-backend/src/modules/business-rules/business-rules.module.ts:167:@Controller('business-rules')
audit-work/source/nabdah-backend/src/modules/business-rules/business-rules.module.ts:172:  @Get('config/surge')
audit-work/source/nabdah-backend/src/modules/business-rules/business-rules.module.ts:175:  @Post('config/surge')
audit-work/source/nabdah-backend/src/modules/business-rules/business-rules.module.ts:178:  @Post('validate') validate(@Body() ctx: RuleContext) { return this.svc.validate(ctx); }
audit-work/source/nabdah-backend/src/modules/chat/chat.module.ts:19:@Controller(['chat', 'chats'])
audit-work/source/nabdah-backend/src/modules/chat/chat.module.ts:24:  @Get('threads/:threadId/permissions')
audit-work/source/nabdah-backend/src/modules/chat/chat.module.ts:137:  @Get('threads')
audit-work/source/nabdah-backend/src/modules/chat/chat.module.ts:142:  @Post('threads/direct')
audit-work/source/nabdah-backend/src/modules/chat/chat.module.ts:147:  @Post('threads/group')
audit-work/source/nabdah-backend/src/modules/chat/chat.module.ts:152:  @Post('threads/booking')
audit-work/source/nabdah-backend/src/modules/chat/chat.module.ts:157:  @Get('threads/:threadId')
audit-work/source/nabdah-backend/src/modules/chat/chat.module.ts:162:  @Get('threads/:threadId/messages')
audit-work/source/nabdah-backend/src/modules/chat/chat.module.ts:173:  @Post('threads/:threadId/messages')
audit-work/source/nabdah-backend/src/modules/chat/chat.module.ts:179:  @Post('threads/:threadId/read')
audit-work/source/nabdah-backend/src/modules/chat/chat.module.ts:184:  @Get('threads/:threadId/rt-token')
audit-work/source/nabdah-backend/src/modules/chat/chat.module.ts:189:  @Post('threads/:threadId/delivered')
audit-work/source/nabdah-backend/src/modules/chat/chat.module.ts:194:  @Patch('messages/:msgId')
audit-work/source/nabdah-backend/src/modules/chat/chat.module.ts:199:  @Delete('messages/:msgId')
audit-work/source/nabdah-backend/src/modules/chat/chat.module.ts:204:  @Post('messages/:msgId/reactions')
audit-work/source/nabdah-backend/src/modules/chat/chat.module.ts:209:  @Delete('messages/:msgId/reactions/:emoji')
audit-work/source/nabdah-backend/src/modules/chat/chat.module.ts:214:  @Post('messages/:msgId/pin')
audit-work/source/nabdah-backend/src/modules/chat/chat.module.ts:219:  @Post('threads/:threadId/participants')
audit-work/source/nabdah-backend/src/modules/chat/chat.module.ts:224:  @Delete('threads/:threadId/participants/:userId')
audit-work/source/nabdah-backend/src/modules/chat/chat.gateway.ts:2:  WebSocketGateway,
audit-work/source/nabdah-backend/src/modules/chat/chat.gateway.ts:4:  SubscribeMessage,
audit-work/source/nabdah-backend/src/modules/chat/chat.gateway.ts:19:@WebSocketGateway({
audit-work/source/nabdah-backend/src/modules/chat/chat.gateway.ts:71:  @SubscribeMessage('join_thread')
audit-work/source/nabdah-backend/src/modules/chat/chat.gateway.ts:89:  @SubscribeMessage('typing')
audit-work/source/nabdah-backend/src/modules/chat/chat.gateway.ts:104:  @SubscribeMessage('send_message')
audit-work/source/nabdah-backend/src/modules/chat/chat.gateway.ts:124:  @SubscribeMessage('initiate_call')
audit-work/source/nabdah-backend/src/modules/chat/chat.gateway.ts:141:  @SubscribeMessage('mark_seen')
audit-work/source/nabdah-backend/src/modules/system-health/system-health.controller.ts:5:@Controller('system-health')
audit-work/source/nabdah-backend/src/modules/system-health/system-health.controller.ts:13:  @Get('liveness')
audit-work/source/nabdah-backend/src/modules/system-health/system-health.controller.ts:29:  @Get('readiness')
audit-work/source/nabdah-backend/src/modules/legal/legal-enterprise.controller.ts:10:@Controller()
audit-work/source/nabdah-backend/src/modules/legal/legal-enterprise.controller.ts:28:  @Get('legal/policy/:key/pdf')
audit-work/source/nabdah-backend/src/modules/legal/legal-enterprise.controller.ts:44:  @Get('legal/archive/:id/pdf')
audit-work/source/nabdah-backend/src/modules/legal/legal-enterprise.controller.ts:56:  @Get('legal/archive/:id/verify')
audit-work/source/nabdah-backend/src/modules/legal/legal-enterprise.controller.ts:60:  @Get('admin/finance/commission-history')
audit-work/source/nabdah-backend/src/modules/legal/legal-enterprise.controller.ts:68:  @Get('admin/audit-log')
audit-work/source/nabdah-backend/src/modules/legal/legal-enterprise.controller.ts:76:  @Get('provider/settlements')
audit-work/source/nabdah-backend/src/modules/legal/legal-enterprise.controller.ts:82:  @Get('provider/settlements/excel')
audit-work/source/nabdah-backend/src/modules/legal/legal-enterprise.controller.ts:91:  @Get('provider/settlements/pdf')
audit-work/source/nabdah-backend/src/modules/legal/legal-enterprise.controller.ts:101:  @Post('admin/providers/license-monitor/run')
audit-work/source/nabdah-backend/src/modules/legal/legal-enterprise.controller.ts:107:  @Get('provider/insurance-matrix')
audit-work/source/nabdah-backend/src/modules/legal/legal-enterprise.controller.ts:111:  @Put('provider/insurance-matrix')
audit-work/source/nabdah-backend/src/modules/legal/legal-enterprise.controller.ts:119:  @Get('provider/sla')
audit-work/source/nabdah-backend/src/modules/legal/legal-enterprise.controller.ts:126:  @Get('consents')
audit-work/source/nabdah-backend/src/modules/legal/legal-enterprise.controller.ts:130:  @Put('consents/:type')
audit-work/source/nabdah-backend/src/modules/legal/legal-enterprise.controller.ts:141:  @Get('admin/legal/policy/:key/diff')
audit-work/source/nabdah-backend/src/modules/legal/legal.module.ts:156:@Controller()
audit-work/source/nabdah-backend/src/modules/legal/legal.module.ts:161:  @Get('legal/policies')
audit-work/source/nabdah-backend/src/modules/legal/legal.module.ts:165:  @Get('legal/policy/:key')
audit-work/source/nabdah-backend/src/modules/legal/legal.module.ts:170:  @Get('legal/pending')
audit-work/source/nabdah-backend/src/modules/legal/legal.module.ts:174:  @Post('legal/accept/:key')
audit-work/source/nabdah-backend/src/modules/legal/legal.module.ts:180:  @Put('admin/legal/policy/:key')
audit-work/source/nabdah-backend/src/modules/legal/legal.module.ts:187:  @Get('admin/finance/commissions')
audit-work/source/nabdah-backend/src/modules/legal/legal.module.ts:192:  @Put('admin/finance/commissions')
audit-work/source/nabdah-backend/src/modules/legal/legal.module.ts:199:  @Get('finance/commission-for')
audit-work/source/nabdah-backend/src/modules/unified-bookings/unified-bookings.module.ts:399:@Controller('unified-bookings')
audit-work/source/nabdah-backend/src/modules/unified-bookings/unified-bookings.module.ts:404:  @Get('mine') mine(@CurrentUser() u: any, @Query() q: any) { return this.svc.myTimeline(u, { state: q.state, kind: q.kind }); }
audit-work/source/nabdah-backend/src/modules/unified-bookings/unified-bookings.module.ts:405:  @Post()
audit-work/source/nabdah-backend/src/modules/unified-bookings/unified-bookings.module.ts:408:  @Post(':id/cancel')
audit-work/source/nabdah-backend/src/modules/unified-bookings/unified-bookings.module.ts:411:  @Post(':id/reschedule')
audit-work/source/nabdah-backend/src/modules/unified-bookings/unified-bookings.module.ts:414:  @Get(':id/call-token')
audit-work/source/nabdah-backend/src/modules/unified-bookings/unified-bookings.module.ts:416:  @Get(':kind/:id') one(@CurrentUser() u: any, @Param('kind') k: string, @Param('id') id: string) { return this.svc.getOne(u, k, id); }
audit-work/source/nabdah-backend/src/modules/unified-bookings/unified-bookings.module.ts:417:  @Post(':kind/:id/cancel')
audit-work/source/nabdah-backend/src/modules/unified-bookings/unified-bookings.module.ts:420:  @Patch(':kind/:id/reschedule')
audit-work/source/nabdah-backend/src/modules/unified-bookings/unified-bookings.module.ts:423:  @Post('match') match(@CurrentUser() u: any, @Body() b: any) { return this.svc.smartMatch(u, b); }
audit-work/source/nabdah-backend/src/modules/unified-bookings/unified-bookings.module.ts:424:  @Post('nursing-broadcast')
audit-work/source/nabdah-backend/src/modules/unified-bookings/unified-bookings.module.ts:427:  @Post('checkout-cart')
audit-work/source/nabdah-backend/src/modules/booking-ops/booking-ops.module.ts:180:@Controller('booking/flow')
audit-work/source/nabdah-backend/src/modules/booking-ops/booking-ops.module.ts:184:  @Get('invoice/:type/:id') invoice(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string) { return this.svc.invoice(u, t, id); }
audit-work/source/nabdah-backend/src/modules/booking-ops/booking-ops.module.ts:185:  @Get('payment/:type/:id') payment(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string) { return this.svc.payment(u, t, id); }
audit-work/source/nabdah-backend/src/modules/booking-ops/booking-ops.module.ts:186:  @Post('payment/:type/:id/mark') mark(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string, @Body() b: any) { return this.svc.markPayment(u, t, id, b); }
audit-work/source/nabdah-backend/src/modules/booking-ops/booking-ops.module.ts:187:  @Post('attachments/:type/:id') addAtt(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string, @Body() b: any) { return this.svc.addAttachment(u, t, id, b); }
audit-work/source/nabdah-backend/src/modules/booking-ops/booking-ops.module.ts:188:  @Get('attachments/:type/:id') listAtt(@CurrentUser() u: any, @Param('type') t: string, @Param('id') id: string) { return this.svc.listAttachments(u, t, id); }
audit-work/source/nabdah-backend/src/modules/socket/socket.gateway.ts:1:import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage } from '@nestjs/websockets';
audit-work/source/nabdah-backend/src/modules/socket/socket.gateway.ts:6:@WebSocketGateway({ cors: getWebSocketCorsOptions() })
audit-work/source/nabdah-backend/src/modules/socket/socket.gateway.ts:19:  @SubscribeMessage('sendMessage')
audit-work/source/nabdah-backend/src/modules/socket/socket.gateway.ts:27:  @SubscribeMessage('joinProviderRoom')
audit-work/source/nabdah-backend/src/modules/socket/socket.gateway.ts:33:  @SubscribeMessage('joinPatientRoom')
audit-work/source/nabdah-backend/src/modules/legacy/legacy.module.ts:83:@Controller('legacy')
audit-work/source/nabdah-backend/src/modules/legacy/legacy.module.ts:88:  @Get('report') report() { return this.svc.report(); }
audit-work/source/nabdah-backend/src/modules/legacy/legacy.module.ts:89:  @Get('usage-map') usageMap() { return this.svc.usageMap(); }
audit-work/source/nabdah-backend/src/modules/ops/ops.controller.ts:15:@Controller('admin/ops')
audit-work/source/nabdah-backend/src/modules/ops/ops.controller.ts:39:  @Get('overview')
audit-work/source/nabdah-backend/src/modules/ops/ops.controller.ts:119:  @Get('requests')
audit-work/source/nabdah-backend/src/modules/ops/ops.controller.ts:162:  @Get('traffic')
audit-work/source/nabdah-backend/src/modules/family/family.controller.ts:8:@Controller('family')
audit-work/source/nabdah-backend/src/modules/family/family.controller.ts:21:  @Post('create')
audit-work/source/nabdah-backend/src/modules/family/family.controller.ts:26:  @Get('my-group')
audit-work/source/nabdah-backend/src/modules/family/family.controller.ts:32:  @Post('invite')
audit-work/source/nabdah-backend/src/modules/family/family.controller.ts:37:  @Post('join')
audit-work/source/nabdah-backend/src/modules/family/family.controller.ts:42:  @Post('leave')
audit-work/source/nabdah-backend/src/modules/family/family.controller.ts:47:  @Patch('member/:userId/relation')
audit-work/source/nabdah-backend/src/modules/family/family.controller.ts:52:  @Patch('members/:memberId/permissions')
audit-work/source/nabdah-backend/src/modules/family/family.controller.ts:57:  @Patch('member/:userId/permissions')
audit-work/source/nabdah-backend/src/modules/family/family.controller.ts:62:  @Get('member-records/:userId')
audit-work/source/nabdah-backend/src/modules/family/family.controller.ts:67:  @Delete('members/:memberId')
audit-work/source/nabdah-backend/src/modules/family/family.controller.ts:72:  @Delete('remove-member/:userId')
audit-work/source/nabdah-backend/src/modules/family/family.controller.ts:77:  @Get('my-group/members')
audit-work/source/nabdah-backend/src/modules/family/family.controller.ts:82:  @Get('members')
audit-work/source/nabdah-backend/src/modules/family/family.controller.ts:87:  @Get('member-health/:userId')
audit-work/source/nabdah-backend/src/modules/family/family.controller.ts:92:  @Get('emergency-contacts')
audit-work/source/nabdah-backend/src/modules/family/family.controller.ts:98:  @Post('calendar/event')
audit-work/source/nabdah-backend/src/modules/family/family.controller.ts:103:  @Get('calendar')
audit-work/source/nabdah-backend/src/modules/family/family.controller.ts:108:  @Delete('calendar/event/:eventId')
audit-work/source/nabdah-backend/src/modules/family/family.controller.ts:114:  @Post('permissions/request')
audit-work/source/nabdah-backend/src/modules/family/family.controller.ts:119:  @Get('permissions/pending')
audit-work/source/nabdah-backend/src/modules/family/family.controller.ts:124:  @Put('permissions/respond/:requestId')
audit-work/source/nabdah-backend/src/modules/home-care/home-care.controller.ts:12:@Controller('nursing')
audit-work/source/nabdah-backend/src/modules/home-care/home-care.controller.ts:54:  @Post('notes')
audit-work/source/nabdah-backend/src/modules/home-care/home-care.controller.ts:82:  @Get('notes/:patientId')
audit-work/source/nabdah-backend/src/modules/home-care/home-care.controller.ts:95:  @Public() @Get('catalog')
audit-work/source/nabdah-backend/src/modules/home-care/home-care.controller.ts:101:  @Post('admin/catalog')
audit-work/source/nabdah-backend/src/modules/home-care/home-care.controller.ts:106:  @Put('admin/catalog/:id')
audit-work/source/nabdah-backend/src/modules/home-care/home-care.controller.ts:111:  @Delete('admin/catalog/:id')
audit-work/source/nabdah-backend/src/modules/home-care/home-care.controller.ts:117:  @Get('visits')
audit-work/source/nabdah-backend/src/modules/home-care/home-care.controller.ts:124:  @Get('visits/:id')
audit-work/source/nabdah-backend/src/modules/home-care/home-care.controller.ts:133:  @Get('visits/:id/tracking')
audit-work/source/nabdah-backend/src/modules/home-care/home-care.controller.ts:175:  @Post('visits/:id/respond')
audit-work/source/nabdah-backend/src/modules/home-care/home-care.controller.ts:202:  @Post('visits/:id/transit')
audit-work/source/nabdah-backend/src/modules/home-care/home-care.controller.ts:220:  @Post('visits/:id/arrive')
audit-work/source/nabdah-backend/src/modules/home-care/home-care.controller.ts:255:  @Post('visits/:id/start-care')
audit-work/source/nabdah-backend/src/modules/home-care/home-care.controller.ts:271:  @Post('visits/:id/no-show')
audit-work/source/nabdah-backend/src/modules/home-care/home-care.controller.ts:291:  @Post('visits/:id/emergency-abort')
audit-work/source/nabdah-backend/src/modules/home-care/home-care.controller.ts:308:  @Post('visits/:id/complete')
audit-work/source/nabdah-backend/src/modules/home-care/home-care.controller.ts:336:  @Get('wallet')
audit-work/source/nabdah-backend/src/modules/home-care/home-care.controller.ts:395:@Controller('home-care')
audit-work/source/nabdah-backend/src/modules/home-care/home-care.controller.ts:399:  @Get('bookings/:bookingId')
audit-work/source/nabdah-backend/src/modules/home-care/controllers/home-care-tracking.controller.ts:20:@Controller('home-care/tracking')
audit-work/source/nabdah-backend/src/modules/home-care/controllers/home-care-tracking.controller.ts:52:  @Post('verify-attendance/:bookingId')
audit-work/source/nabdah-backend/src/modules/home-care/controllers/home-care-tracking.controller.ts:91:  @Post('submit-supplies-request')
audit-work/source/nabdah-backend/src/modules/drivers/drivers.controller.ts:6:@Controller('drivers')
audit-work/source/nabdah-backend/src/modules/drivers/drivers.controller.ts:11:  @Post('online')
audit-work/source/nabdah-backend/src/modules/drivers/drivers.controller.ts:17:  @Post('offline')
audit-work/source/nabdah-backend/src/modules/drivers/drivers.controller.ts:23:  @Get('shift')
audit-work/source/nabdah-backend/src/modules/drivers/drivers.controller.ts:29:  @Post('location')
audit-work/source/nabdah-backend/src/modules/drivers/drivers.controller.ts:35:  @Get(':driverId/location')
audit-work/source/nabdah-backend/src/modules/drivers/drivers.controller.ts:40:  @Get('orders/available')
audit-work/source/nabdah-backend/src/modules/drivers/drivers.controller.ts:46:  @Get('orders/active')
audit-work/source/nabdah-backend/src/modules/drivers/drivers.controller.ts:52:  @Get('orders/history')
audit-work/source/nabdah-backend/src/modules/drivers/drivers.controller.ts:58:  @Post('orders/:id/accept')
audit-work/source/nabdah-backend/src/modules/drivers/drivers.controller.ts:64:  @Post('orders/:id/pickup')
audit-work/source/nabdah-backend/src/modules/drivers/drivers.controller.ts:70:  @Post('orders/:id/deliver')
audit-work/source/nabdah-backend/src/modules/drivers/drivers.controller.ts:77:  @Get('admin/online')
audit-work/source/nabdah-backend/src/modules/drivers/drivers.controller.ts:84:  @Get('available')
audit-work/source/nabdah-backend/src/modules/coturn/coturn.controller.ts:5:@Controller('calls/ice')
audit-work/source/nabdah-backend/src/modules/coturn/coturn.controller.ts:10:  @Get('config')
audit-work/source/nabdah-backend/src/modules/coturn/coturn.controller.ts:15:  @Get('credentials')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:41:@Controller('family/chat')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:59:  @Get('messages')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:71:  @Post('messages')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:89:@Controller('health/medications')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:93:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:103:  @Post()
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:123:@Controller('wearables')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:127:  @Get('devices')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:133:  @Post('devices')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:147:  @Get('data')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:156:  @Post('data')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:175:@Controller('home-care/packages')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:179:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:209:@Controller('maternity/vaccines')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:213:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:226:  @Post()
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:248:@Controller('nutrition/foods')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:252:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:295:@Controller('offers')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:299:  @Get(':id')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:320:@Controller('promotions/offers')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:324:  @Get(':id/providers')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:342:@Controller('reports')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:346:  @Get('timeline')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:358:  @Get(':id')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:371:@Controller('support/chat')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:376:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:379:  @Post()
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:384:  @Get('messages')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:392:  @Post('messages')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:420:@Controller('audit')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:424:  @Post()
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:433:  @Post('batch')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:455:@Controller('ai')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:459:  @Post('drug-interactions')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:478:@Controller('consultations')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:490:  @Get(':id')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:508:  @Get(':id/messages')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:521:  @Post(':id/messages')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:541:@Controller('facility')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:545:  @Get('inbox')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:556:  @Post('inbox/:id/read')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:567:@Controller('nursing')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:571:  @Get('jobs/active')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:591:  @Post('notes')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:614:  @Post('jobs/:id/notes')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:633:  @Post('coverage/verify-gps')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:651:@Controller('pharmacy')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:655:  @Get('products')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:682:  @Post('shortages/report')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:717:@Controller('provider-deltas')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:721:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:735:@Controller('provider/capabilities')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:739:  @Get('lab-services')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:748:  @Get('radiology-services')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:759:@Controller('provider/facility')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:769:  @Get('audit-logs')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:781:  @Get('calendar')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:798:  @Get('patients/active')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:813:  @Get('subaccounts')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:826:  @Get('shifts')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:841:@Controller('provider/pharmacy/b2b')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:845:  @Post('voice-to-order')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:905:@Controller('mental-health')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:907:  @Get('assessment-questions')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:927:@Controller('drugs')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:961:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:984:  @Get('categories')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:995:  @Get(':id')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:1028:@Controller('provider/dashboard')
audit-work/source/nabdah-backend/src/modules/compat/compat.module.ts:1033:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:54:@Controller('dashboard')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:58:  @Get('kpis')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:78:  @Get('alerts')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:95:  @Get('live-feed')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:112:@Controller('broadcast')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:116:  @Get('live')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:124:  @Get('config')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:130:  @Put('config')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:140:  @Post(':id/expand')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:150:  @Post(':id/cancel')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:162:@Controller('emergency')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:166:  @Post(':id/dispatch')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:186:@Controller('contracts')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:190:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:197:@Controller('shifts')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:201:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:208:  @Post()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:222:@Controller('scorecard')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:226:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:246:@Controller('compliance')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:250:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:277:@Controller('transport')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:281:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:288:@Controller('family-cards')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:292:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:303:@Controller('blacklist')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:307:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:318:@Controller('fraud')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:322:  @Get('alerts')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:330:@Controller('admins')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:334:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:347:@Controller('waitlist')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:351:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:358:@Controller('referrals')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:362:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:372:@Controller('tasks')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:376:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:382:  @Post()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:407:@Controller('specialties')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:411:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:423:  @Post()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:432:@Controller('services')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:436:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:451:@Controller('complaints')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:455:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:462:@Controller('cms')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:466:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:473:@Controller('banners')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:477:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:483:  @Post()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:498:@Controller('orders')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:502:  @Post(':id/reassign')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:528:@Controller('financial')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:532:  @Get('summary')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:563:@Controller('commissions')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:567:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:573:  @Put(':id')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:585:@Controller('refunds')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:589:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:595:  @Post()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:607:@Controller('coupons')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:611:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:617:  @Post()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:640:  @Patch(':code')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:654:@Controller('loyalty')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:658:  @Put('config')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:668:  @Put('earn-rules/:id')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:678:  @Post('earn-rules/:id/toggle')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:686:  @Get('users/:id/balance')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:715:  @Post('manual-adjust')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:724:  @Post('redeem')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:735:@Controller('delivery')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:739:  @Get('rules')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:745:  @Post('rules')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:758:  @Put('rules/:id')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:768:  @Post('rules/:id/toggle')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:776:  @Delete('rules/:id')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:783:  @Put('base-fees')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:793:  @Post('toggle')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:805:@Controller('delivery')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:807:  @Get('check')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:828:@Controller('promotions')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:832:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:839:  @Get(':id')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:846:  @Post()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:862:  @Put(':id')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:872:  @Post(':id/toggle')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:881:  @Delete(':id')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:890:@Controller('promotions')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:892:  @Get('applicable')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:921:@Controller('notifications')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:925:  @Get('history')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:934:  @Post('send')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:955:  @Get('auto-rules')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:961:  @Post('auto-rules')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:973:  @Put('auto-rules/:id')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:983:  @Delete('auto-rules/:id')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:992:@Controller('nursing-services')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:996:  @Get()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1008:@Controller('insurance')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1042:  @Post('claims/:id/approve')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1047:  @Post('claims/:id/reject')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1054:@Controller('providers')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1058:  @Get(':id/sub-accounts')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1072:@Controller('medicines')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1076:  @Post(':id/shortage')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1096:@Controller('bulk-upload')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1100:  @Post()
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1143:@Controller('home-care')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1146:  @Get('bookings/nursing/my')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1182:@Controller('system')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1199:  @Get('theme') theme() { return this.getConfig('theme', DEFAULT_THEME); }
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1200:  @Put('theme') putTheme(@CurrentUser() u: any, @Body() b: any) { return this.putConfig('theme', b || {}, u); }
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1202:  @Get('permissions') permissions() { return this.getConfig('permissions', DEFAULT_PERMISSIONS); }
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1203:  @Put('permissions') putPermissions(@CurrentUser() u: any, @Body() b: any) { return this.putConfig('permissions', b || [], u); }
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1205:  @Get('workflows') workflows() { return this.getConfig('workflows', DEFAULT_WORKFLOWS); }
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1206:  @Put('workflows') putWorkflows(@CurrentUser() u: any, @Body() b: any) { return this.putConfig('workflows', b || [], u); }
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1208:  @Get('ai-config') aiConfig() { return this.getConfig('ai-config', DEFAULT_AI_CONFIG); }
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1209:  @Put('ai-config') putAiConfig(@CurrentUser() u: any, @Body() b: any) { return this.putConfig('ai-config', b || {}, u); }
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1211:  @Get('alert-rules') alertRules() { return this.getConfig('alert-rules', []); }
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1212:  @Put('alert-rules') putAlertRules(@CurrentUser() u: any, @Body() b: any) { return this.putConfig('alert-rules', b || [], u); }
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1216:@Controller('analytics')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1220:  @Get('overview')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1248:  @Get('heatmap')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1264:  @Post('custom-report')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1302:@Controller('admin/nursing')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1306:  @Get('requests')
audit-work/source/nabdah-backend/src/modules/compat/admin-spa.module.ts:1311:  @Post('requests/:id/assign')
audit-work/source/nabdah-backend/src/modules/device-trust/device-trust.module.ts:127:@Controller('device-trust')
audit-work/source/nabdah-backend/src/modules/device-trust/device-trust.module.ts:131:  @Post('challenge')
audit-work/source/nabdah-backend/src/modules/device-trust/device-trust.module.ts:138:  @Post('challenge-guest')
audit-work/source/nabdah-backend/src/modules/device-trust/device-trust.module.ts:143:  @Post('verify')
audit-work/source/nabdah-backend/src/modules/device-trust/device-trust.module.ts:149:  @Get('status')
audit-work/source/nabdah-backend/src/modules/security/security.module.ts:134:@Controller('security/audit')
audit-work/source/nabdah-backend/src/modules/security/security.module.ts:139:  @Get('admin')
audit-work/source/nabdah-backend/src/modules/security/security.module.ts:152:  @Get('my-activity')
audit-work/source/nabdah-backend/src/modules/security/security.module.ts:161:  @Get('recent')
audit-work/source/nabdah-backend/src/modules/security/security.module.ts:165:  @Get('critical')
audit-work/source/nabdah-backend/src/modules/provider/leave-requests.controller.ts:7:@Controller('provider/leave-requests')
audit-work/source/nabdah-backend/src/modules/provider/leave-requests.controller.ts:14:  @Get()
audit-work/source/nabdah-backend/src/modules/provider/leave-requests.controller.ts:23:  @Post()
audit-work/source/nabdah-backend/src/modules/provider/leave-requests.controller.ts:48:  @Post('action')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:24:@Controller('provider/auth')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:27:  @Public() @Post('register')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:29:  @Public() @Post('login')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:31:  @Public() @Post('refresh')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:33:  @Post('logout')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:35:  @Public() @Post('send-otp')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:40:  @Public() @Post('verify-email')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:42:  @Public() @Post('forgot-password')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:44:  @Public() @Post('verify-reset-code')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:46:  @Public() @Post('reset-password')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:48:  @Get('me')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:52:@Controller('provider')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:58:  @Get('profile') get(@CurrentUser() u: any) { return this.svc.getProfile(u); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:59:  @Patch('profile') update(@CurrentUser() u: any, @Body() body: any) { return this.svc.updateProfile(u, body); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:60:  @Post('profile/phones') addPhone(@CurrentUser() u: any, @Body() body: any) { return this.svc.addPhone(u, body); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:61:  @Delete('profile/phones/:phone_id') removePhone(@CurrentUser() u: any, @Param('phone_id') pid: string) { return this.svc.removePhone(u, pid); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:63:  @Post('kyc/documents') uploadDoc(@CurrentUser() u: any, @Body() body: any) { return this.svc.uploadDocument(u, body); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:64:  @Get('kyc/documents') listDocs(@CurrentUser() u: any) { return this.svc.listDocuments(u); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:66:  @Get('directory') directory() { return this.svc.directory(); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:68:  @Post('bank-account') upsertBank(@CurrentUser() u: any, @Body() body: any) { return this.svc.upsertBank(u, body); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:69:  @Get('bank-account') getBank(@CurrentUser() u: any) { return this.svc.getBank(u); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:70:  @Public() @Get('banks') banks() { return this.svc.banks_list(); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:72:  @Post('profile/image/upload')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:83:  @Get('profile/image/status')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:88:  @Post('onboarding/submit') submit(@CurrentUser() u: any) { return this.svc.submitForApproval(u); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:90:  @Post('settings/delta')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:96:@Controller('provider/operators')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:99:  @Get() list(@CurrentUser() u: any) { return this.svc.list(u); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:100:  @Post('invite') invite(@CurrentUser() u: any, @Body() body: any) { return this.svc.invite(u, body); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:101:  @Public() @Post('accept-invite') accept(@Body() body: any) { return this.svc.acceptInvite(body); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:102:  @Patch(':id') update(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.update(u, id, body); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:103:  @Post(':id/disable') disable(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.disable(u, id, body?.reason); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:104:  @Post(':id/enable') enable(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.enable(u, id); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:105:  @Delete(':id') revoke(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.revoke(u, id); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:108:@Controller('admin/providers')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:114:  @Get() list(@CurrentUser() u: any, @Query() q: any): Promise<any> { return this.svc.list(u, q); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:117:  @Get('by-user/:userId') byUser(@CurrentUser() u: any, @Param('userId') userId: string) { return this.svc.detailByUser(u, userId); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:118:  @Get(':id') detail(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.detail(u, id); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:119:  @Post(':id/approve') approve(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.approve(u, id, body); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:120:  @Post(':id/reject') reject(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.reject(u, id, body); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:122:  @Post(':id/reprocess-image')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:127:  @Post(':id/replace-image')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:132:  @Post(':id/retry-image-jobs')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:137:  @Get(':id/image-logs')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:141:  @Post(':id/request-changes') needsChanges(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.requestChanges(u, id, body); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:142:  @Post(':id/suspend') suspend(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.suspend(u, id, body); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:156:@Controller('provider/requests')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:164:  @Get() list(@CurrentUser() u: any, @Query() q: any) { return this.svc.list(u, q); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:165:  @Get(':id') detail(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.detail(u, id); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:166:  @Post(':id/accept') accept(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.accept(u, id, body || {}); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:167:  @Post(':id/reject') reject(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.reject(u, id, body || {}); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:168:  @Post(':id/start') start(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.start(u, id, body || {}); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:169:  @Post(':id/complete') complete(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.complete(u, id, body || {}); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:170:  @Post(':id/cancel') cancel(@CurrentUser() u: any, @Param('id') id: string, @Body() body: any) { return this.svc.cancel(u, id, body || {}); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:171:  @Post(':id/assign-staff') assignStaff(@CurrentUser() u: any, @Param('id') id: string, @Body() body: { staff_id: string; notes?: string }) { return this.svc.assignStaff(u, id, body); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:173:  @Get(':id/orders')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:183:  @Post(':id/end')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:228:  @Post(':id/insurance-copay')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:292:  @Post(':id/sick-leave')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:342:  @Post(':id/medical-report')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:381:@Controller('provider/wallet')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:395:  @Post('withdraw')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:401:@Controller('provider/notifications')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:404:  @Get() list(@CurrentUser() u: any, @Query() q: any) { return this.svc.list(u, q); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:405:  @Post(':id/read') markRead(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.markRead(u, id); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:406:  @Post('read-all') markAllRead(@CurrentUser() u: any) { return this.svc.markAllRead(u); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:409:@Controller('provider/schedule')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:412:  @Get() view(@CurrentUser() u: any, @Query() q: any) { return this.svc.view(u, q); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:415:@Controller('provider')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:421:  @Get('me') me(@CurrentUser() u: any) { return this.dash.me(u); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:422:  @Get('dashboard/stats') stats(@CurrentUser() u: any) { return this.dash.stats(u); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:423:  @Get('dashboard/recent') recent(@CurrentUser() u: any, @Query('limit') limit?: string) {
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:426:  @Get('availability') getAvail(@CurrentUser() u: any) { return this.dash.getAvailability(u); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:427:  @Post('availability') setAvail(@CurrentUser() u: any, @Body() body: any) { return this.dash.setAvailability(u, body); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:428:  @Post('seed') seed(@CurrentUser() u: any) { return this.seedSvc.seed(u); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:429:  @Post('seed/reset') seedReset(@CurrentUser() u: any) { return this.seedSvc.resetSeed(u); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:437:@Controller('provider/capabilities')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:441:  @Get('pharmacy') listPharma(@CurrentUser() u: any) { return this.svc.listPharmacy(u); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:442:  @Post('pharmacy') upsertPharma(@CurrentUser() u: any, @Body() body: any) { return this.svc.upsertPharmacy(u, body); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:443:  @Delete('pharmacy/:id') delPharma(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.deletePharmacy(u, id); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:445:  @Get('lab') listLab(@CurrentUser() u: any) { return this.svc.listLab(u); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:446:  @Post('lab') upsertLab(@CurrentUser() u: any, @Body() body: any) { return this.svc.upsertLab(u, body); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:447:  @Delete('lab/:id') delLab(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.deleteLab(u, id); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:449:  @Get('radiology') listRad(@CurrentUser() u: any) { return this.svc.listRadiology(u); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:450:  @Post('radiology') upsertRad(@CurrentUser() u: any, @Body() body: any) { return this.svc.upsertRadiology(u, body); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:451:  @Delete('radiology/:id') delRad(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.deleteRadiology(u, id); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:453:  @Get('doctor-sessions') listDoc(@CurrentUser() u: any) { return this.svc.listDoctorSessions(u); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:454:  @Post('doctor-sessions') upsertDoc(@CurrentUser() u: any, @Body() body: any) { return this.svc.upsertDoctorSession(u, body); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:455:  @Delete('doctor-sessions/:id') delDoc(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.deleteDoctorSession(u, id); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:457:  @Get('home-care') listHc(@CurrentUser() u: any) { return this.svc.listHomeCare(u); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:458:  @Post('home-care') upsertHc(@CurrentUser() u: any, @Body() body: any) { return this.svc.upsertHomeCare(u, body); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:459:  @Delete('home-care/:id') delHc(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.deleteHomeCare(u, id); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:462:@Controller('provider/zones')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:465:  @Get() list(@CurrentUser() u: any) { return this.svc.listZones(u); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:466:  @Post() upsert(@CurrentUser() u: any, @Body() body: any) { return this.svc.upsertZone(u, body); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:467:  @Delete(':id') del(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.deleteZone(u, id); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:470:@Controller('provider/schedule-slots')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:473:  @Get() list(@CurrentUser() u: any) { return this.svc.listSlots(u); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:474:  @Post() upsert(@CurrentUser() u: any, @Body() body: any) { return this.svc.upsertSlot(u, body); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:475:  @Delete(':id') del(@CurrentUser() u: any, @Param('id') id: string) { return this.svc.deleteSlot(u, id); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:478:@Controller('provider/score')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:481:  @Get() me(@CurrentUser() u: any) { return this.svc.getMy(u); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:482:  @Post('recompute') recompute(@CurrentUser() u: any) { return this.svc.recompute(u.id); }
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:485:@Controller('admin/matching')
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:493:  @Get('preview/:requestId') preview(@CurrentUser() u: any, @Param('requestId') id: string, @Query('limit') limit?: string) {
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:497:  @Post('preview') previewAdHoc(@CurrentUser() u: any, @Body() body: any) {
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:501:  @Post('dispatch/:requestId') dispatch(@CurrentUser() u: any, @Param('requestId') id: string, @Body() body: any) {
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:505:  @Post('assign/:requestId/:providerId') assign(@CurrentUser() u: any, @Param('requestId') rid: string, @Param('providerId') pid: string) {
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:509:  @Get('attempts/:requestId') attempts(@CurrentUser() u: any, @Param('requestId') id: string) {
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:513:  @Post('expire-stale') expireStale(@CurrentUser() u: any) {
audit-work/source/nabdah-backend/src/modules/provider/provider.controllers.ts:518:  @Post('seed-unassigned') seedUnassigned(@CurrentUser() u: any, @Body() body: any) {
audit-work/source/nabdah-backend/src/modules/provider/simulated-features.controller.ts:16:@Controller('provider/features')
audit-work/source/nabdah-backend/src/modules/provider/simulated-features.controller.ts:29:  @Post('promotions')
audit-work/source/nabdah-backend/src/modules/provider/simulated-features.controller.ts:45:  @Get('promotions')
audit-work/source/nabdah-backend/src/modules/provider/simulated-features.controller.ts:51:  @Post('referrals')
audit-work/source/nabdah-backend/src/modules/provider/simulated-features.controller.ts:65:  @Get('referrals')
audit-work/source/nabdah-backend/src/modules/provider/simulated-features.controller.ts:72:  @Get('crm/patients')
audit-work/source/nabdah-backend/src/modules/provider/simulated-features.controller.ts:89:  @Get('crm/patients/:id')
audit-work/source/nabdah-backend/src/modules/provider/simulated-features.controller.ts:107:  @Patch('crm/patients/:id')
audit-work/source/nabdah-backend/src/modules/provider/simulated-features.controller.ts:128:  @Post('home-care/bookings/:id/check-in')
audit-work/source/nabdah-backend/src/modules/provider/simulated-features.controller.ts:147:  @Post('home-care/reports/:id/submit')
audit-work/source/nabdah-backend/src/modules/provider/simulated-features.controller.ts:169:  @Post('radiology/bookings/:id/upload-report')
audit-work/source/nabdah-backend/src/modules/provider/simulated-features.controller.ts:187:  @Post('radiology/bookings/:id/publish-report')
audit-work/source/nabdah-backend/src/modules/care/doctor-integration.controller.ts:7:@Controller('provider/doctor-engine')
audit-work/source/nabdah-backend/src/modules/care/doctor-integration.controller.ts:14:  @Put('synchronize-settings')
audit-work/source/nabdah-backend/src/modules/care/doctor-integration.controller.ts:36:  @Post('finalize-encounter')
audit-work/source/nabdah-backend/src/modules/care/appointments.controller.ts:8:@Controller('care/appointments')
audit-work/source/nabdah-backend/src/modules/care/appointments.controller.ts:14:  @Post()
audit-work/source/nabdah-backend/src/modules/care/appointments.controller.ts:19:  @Get()
audit-work/source/nabdah-backend/src/modules/care/appointments.controller.ts:24:  @Get(':id')
audit-work/source/nabdah-backend/src/modules/care/appointments.controller.ts:29:  @Post('waitlist/join')
audit-work/source/nabdah-backend/src/modules/care/appointments.controller.ts:34:  @Patch(':id/cancel')
audit-work/source/nabdah-backend/src/modules/care/appointments.controller.ts:39:  @Patch(':id/reschedule')
audit-work/source/nabdah-backend/src/modules/care/appointments.controller.ts:45:  @Patch(':id/confirm')
audit-work/source/nabdah-backend/src/modules/care/appointments.controller.ts:51:  @Patch(':id/check-in')
audit-work/source/nabdah-backend/src/modules/care/appointments.controller.ts:57:  @Patch(':id/start')
audit-work/source/nabdah-backend/src/modules/care/appointments.controller.ts:63:  @Patch(':id/complete')
audit-work/source/nabdah-backend/src/modules/care/appointments.controller.ts:69:  @Post(':id/finish')
audit-work/source/nabdah-backend/src/modules/care/appointments.controller.ts:75:  @Get(':id/summary')
audit-work/source/nabdah-backend/src/modules/care/doctor-referrals.controller.ts:10:@Controller('provider/doctor-referrals')
audit-work/source/nabdah-backend/src/modules/care/doctor-referrals.controller.ts:29:  @Get('my-referrals/:doctorId')
audit-work/source/nabdah-backend/src/modules/care/doctor-referrals.controller.ts:66:  @Post('issue-referrals-and-prescription')
audit-work/source/nabdah-backend/src/modules/care/doctor-referrals.controller.ts:94:  @Patch('diagnostic-callback/:appointmentId')
audit-work/source/nabdah-backend/src/modules/care/doctor-referrals.controller.ts:96:    // Intercepted from Lab/Radiology Upload webhook to alert the parent Doctor automatically
audit-work/source/nabdah-backend/src/modules/care/appointments.service.ts:22: * - Card payments: stay PENDING until payment.completed webhook confirms.
audit-work/source/nabdah-backend/src/modules/care/appointments.service.ts:173:      // Card payments stay PENDING until payment.completed webhook confirms.
audit-work/source/nabdah-backend/src/modules/care/appointments.service.ts:445:  // ===== Payment webhook handler =====
audit-work/source/nabdah-backend/src/modules/care/care.controller.ts:5:@Controller('care')
audit-work/source/nabdah-backend/src/modules/care/care.controller.ts:11:  @Get('specialties')
audit-work/source/nabdah-backend/src/modules/care/care.controller.ts:17:  @Get('insurance')
audit-work/source/nabdah-backend/src/modules/care/care.controller.ts:23:  @Get('degrees')
audit-work/source/nabdah-backend/src/modules/care/care.controller.ts:29:  @Get('doctors')
audit-work/source/nabdah-backend/src/modules/care/care.controller.ts:60:  @Get('doctors/:id')
audit-work/source/nabdah-backend/src/modules/care/care.controller.ts:66:  @Get('doctors/:id/slots')
audit-work/source/nabdah-backend/src/modules/care/care.controller.ts:76:  @Get('search')
audit-work/source/nabdah-backend/src/modules/care/care.controller.ts:83:  @Get('facilities')
audit-work/source/nabdah-backend/src/modules/care/care.controller.ts:95:  @Get('facilities/:id')
audit-work/source/nabdah-backend/src/modules/care/care.controller.ts:102:@Controller('public')
audit-work/source/nabdah-backend/src/modules/care/care.controller.ts:107:  @Get('specialties')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:5:@Controller('radiology')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:9:  @Public() @Get('services')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:31:  @Public() @Get('modalities')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:34:  @Public() @Get('services/:id')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:37:  @Post('bookings')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:40:  @Get('bookings/mine')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:43:  @Get('bookings/:id')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:46:  @Post('bookings/:id/cancel')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:49:  @Patch('bookings/:id/state')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:54:  @Post('bookings/:id/publish-report')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:59:  @Get('reports/mine')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:62:  @Post('bookings/:id/documents')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:67:  @Patch('bookings/:id/insurance')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:72:  @Get('provider/inbox')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:77:  @Post('bookings/:id/assign-technician')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:82:  @Post('bookings/:id/upload-report')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:88:  @Post('bookings/:id/checkin')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:93:  @Post('bookings/:id/start-scan')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:99:  @Post('bookings/:id/abort')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:105:  @Post('bookings/:id/submit-report-for-review')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:110:  @Post('bookings/:id/approve-report')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:116:  @Post('bookings/:id/insurance-approval')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:122:  @Patch('bookings/:id/reschedule')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:128:  @Get('bookings/:id/tracking')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:134:  @Post('catalog/delta-request')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:140:  @Post('bookings/:id/confirm-preparation')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:145:  @Get('admin/all')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:159:  @Post('admin/catalog')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:165:  @Put('admin/catalog/:id')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:171:  @Delete('admin/catalog/:id')
audit-work/source/nabdah-backend/src/modules/radiology/radiology.controller.ts:178:  @Patch('admin/bookings/:id/force-state')
audit-work/source/nabdah-backend/src/modules/radiology/controllers/radiology-provider.controller.ts:25:@Controller('radiology/provider')

## web_admin_dashboard
audit-work/source/web_admin_dashboard/src/pages/_app.tsx:5:export default function App({ Component, pageProps, router }: AppProps) {
audit-work/source/web_admin_dashboard/src/pages/_app.tsx:7:  if (router.pathname.startsWith('/admin')) {
audit-work/source/web_admin_dashboard/src/pages/login.tsx:2:import { useRouter } from 'next/router';
audit-work/source/web_admin_dashboard/src/pages/login.tsx:14:  const router = useRouter();
audit-work/source/web_admin_dashboard/src/pages/login.tsx:31:      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
audit-work/source/web_admin_dashboard/src/pages/login.tsx:62:      const res = await fetch(`${API_BASE}/api/v1/auth/login/verify-2fa`, {
audit-work/source/web_admin_dashboard/src/pages/login.tsx:84:      const res = await fetch(`${API_BASE}/api/v1/auth/passkey/login/verify`, {
audit-work/source/web_admin_dashboard/src/pages/login.tsx:103:      const res = await fetch(`${API_BASE}/api/v1/auth/send-otp`, {
audit-work/source/web_admin_dashboard/src/pages/login.tsx:122:      const res = await fetch(`${API_BASE}/api/v1/auth/reset-password`, {
audit-work/source/web_admin_dashboard/src/pages/login.tsx:152:    router.push('/admin/dashboard');
audit-work/source/web_admin_dashboard/src/pages/s/[type]/[slug].tsx:246:    const r = await fetch(`${API_BASE}/api/v1/seo/meta/${type}/${encodeURIComponent(slug)}`, {
audit-work/source/web_admin_dashboard/src/pages/admin/audit-logs.tsx:27:      const res = await fetch(`${API_BASE}/api/v1/admin/governance/audit-logs`, {
audit-work/source/web_admin_dashboard/src/pages/admin/ai-control.tsx:9:  openrouter: { label: 'OpenRouter', color: '#B84FC7' },
audit-work/source/web_admin_dashboard/src/pages/admin/disputes.tsx:30:      const res = await fetch(`${API_BASE}/api/v1/admin/disputes`, {
audit-work/source/web_admin_dashboard/src/pages/admin/disputes.tsx:48:      await fetch(`${API_BASE}/api/v1/admin/authority/orders/${id}/force-cancel`, {
audit-work/source/web_admin_dashboard/src/pages/admin/order-detail.tsx:3:import { useRouter } from 'next/router';
audit-work/source/web_admin_dashboard/src/pages/admin/order-detail.tsx:9:  const router = useRouter();
audit-work/source/web_admin_dashboard/src/pages/admin/order-detail.tsx:10:  const { kind, id } = router.query as { kind?: string; id?: string };
audit-work/source/web_admin_dashboard/src/pages/admin/order-detail.tsx:29:      <button onClick={() => router.back()} className="text-teal-700 font-bold text-sm">→ عودة لمركز القيادة</button>
audit-work/source/web_admin_dashboard/src/utils/api.ts:10:  const response = await fetch(url, {
audit-work/source/web_admin_dashboard/src/components/PublicDirectory.tsx:123:    const r = await fetch(`${API_BASE}/api/v1${endpoint}`, { headers: { Accept: 'application/json' } });
audit-work/source/web_admin_dashboard/src/components/AdminGuard.tsx:2:import { useRouter } from 'next/router';
audit-work/source/web_admin_dashboard/src/components/AdminGuard.tsx:58:  const router = useRouter();
audit-work/source/web_admin_dashboard/src/components/AdminGuard.tsx:66:      router.push('/login');
audit-work/source/web_admin_dashboard/src/components/AdminGuard.tsx:70:  }, [router]);
audit-work/source/web_admin_dashboard/src/components/AdminGuard.tsx:88:                  const active = router.pathname === item.href;
audit-work/source/web_admin_dashboard/src/components/AdminGuard.tsx:114:              router.push('/login');

