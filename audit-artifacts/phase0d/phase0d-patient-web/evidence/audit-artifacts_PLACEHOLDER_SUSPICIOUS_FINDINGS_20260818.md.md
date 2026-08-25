# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PLACEHOLDER_SUSPICIOUS_FINDINGS_20260818.md`
- **Member SHA-256:** `0554d44338dcf496a76148fa3e4372e9ec4cb6c5954ddecd97d254d74e390eee`
- **Line count:** 257
- **Read range:** `1-257`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: provider-app/src/screens/facility/FacilityInvitationScreen.tsx:107:        placeholder={AR ? 'مثال: +966500000000 أو NBD-1234' : 'e.g., +966500000000 or NBD-1234'}`
- `4: provider-app/src/screens/radiology/RadiologyDashboard.tsx:338:      await client.post(`/radiology/bookings/${order.id}/upload-report`, { pdf_url: 'https://storage.nabdah.com/reports/' + order.id + '.pdf', dicom_url: dicomUrl || null, findin`
- `11: provider-app/src/screens/doctor/DoctorDashboard.tsx:226: show(AR ? 'تم قبول الطلب بنجاح' : 'Request accepted successfully', 'success');`
- `12: provider-app/src/screens/doctor/DoctorDashboard.tsx:236: show(AR ? 'تم رفض الطلب' : 'Request rejected', 'info');`
- `13: provider-app/src/screens/doctor/DoctorDashboard.tsx:251:     show(AR ? 'تم إرسال الطلب للمريض لدفع نسبة التحمل' : 'Request sent to patient for Co-Pay', 'success');`
- `14: provider-app/src/screens/doctor/DoctorDashboard.tsx:254:     show(AR ? 'حدث خطأ أثناء رفع الاعتماد' : 'Error submitting approval', 'error');`
- `15: provider-app/src/screens/doctor/DoctorDashboard.tsx:321:     onPress={() => { show(AR ? 'تم قفل حالة الدفع وبدء الاستشارة' : 'Payment locked. Starting consultation.', 'success'); onNavigate('consultation', req); }} />`
- `16: provider-app/src/screens/doctor/DoctorDashboard.tsx:660:      show(AR ? 'تم إنهاء الاستشارة وإرسال الوصفة للمريض بنجاح' : 'Consultation ended and E-Rx sent successfully', 'success');`
- `17: provider-app/src/screens/doctor/DoctorDashboard.tsx:664:      show(AR ? 'تم إنهاء الاستشارة' : 'Consultation ended', 'success');`
- `18: provider-app/src/screens/doctor/DoctorDashboard.tsx:693:            <NBtn label={AR ? 'بدء الكشف' : 'Start Checkup'} size="sm" disabled={distanceKm > 0.5} onPress={() => { if (apt) show(AR ? 'تم بدء الفحص الطبي' : 'Checkup started', 'succes`
- `19: provider-app/src/screens/doctor/DoctorDashboard.tsx:939:  show(AR ? 'تم إصدار الوصفة الطبية وإرسالها للمريض ' : 'Prescription issued and sent to patient ', 'success');`
- `20: provider-app/src/screens/doctor/DoctorDashboard.tsx:1098: <TouchableOpacity key={t.id} onPress={() => { setDrugs(t.drugs); setShowTemplates(false); show(AR ? 'تم تحميل النموذج' : 'Template loaded successfully', 'success'); }} style={{ paddi`
### backend_consumers_or_contracts
- `4: provider-app/src/screens/radiology/RadiologyDashboard.tsx:338:      await client.post(`/radiology/bookings/${order.id}/upload-report`, { pdf_url: 'https://storage.nabdah.com/reports/' + order.id + '.pdf', dicom_url: dicomUrl || null, findin`
- `96: provider-app/src/screens/auth/AuthScreens.tsx:400:      show(AR ? 'مرحباً بعودتك! ' : 'Welcome back! ', 'success');`
- `97: provider-app/src/screens/auth/AuthScreens.tsx:415:      show(AR ? 'تم تفعيل البصمة بنجاح' : 'Biometric enabled successfully', 'success');`
- `98: provider-app/src/screens/auth/AuthScreens.tsx:425:      show(AR ? 'تم الدخول بالبصمة ' : 'Biometric login successful', 'success');`
- `99: provider-app/src/screens/auth/AuthScreens.tsx:618: show(AR ? 'تم إرسال رمز التحقق إلى بريدك' : 'OTP sent to your email', 'success');`
- `100: provider-app/src/screens/auth/AuthScreens.tsx:672: show(AR ? 'تم تغيير كلمة المرور — جاري تسجيل الدخول…' : 'Password changed — signing you in…', 'success');`
- `101: provider-app/src/screens/auth/AuthScreens.tsx:726: onResend={() => { show(AR ? 'تم إعادة الإرسال' : 'Code resent', 'info'); }}`
- `144: provider-app/src/screens/shared/InsuranceRequestsScreen.tsx:94:      show(AR ? 'تم إرسال القرار للمريض' : 'Decision sent to patient', 'success');`
- `186: provider-app/src/screens/nursing/NursingDashboard.tsx:144:               show(AR ? 'تم قبول الطلب بنجاح' : 'Request accepted successfully', 'success');`
- `187: provider-app/src/screens/nursing/NursingDashboard.tsx:154:               show(AR ? 'تم رفض الطلب' : 'Request rejected', 'info');`
- `188: provider-app/src/screens/nursing/NursingDashboard.tsx:425: show(AR ? 'تم قبول الطلب بنجاح' : 'Order accepted successfully', 'success');`
- `189: provider-app/src/screens/nursing/NursingDashboard.tsx:436: show(AR ? 'تم رفض الطلب' : 'Order rejected', 'success');`
### auth_ownership
- `70: provider-app/src/screens/doctor/DoctorRegistration.tsx:1104:      <OtpModal visible={showOtp} onClose={() => setShowOtp(false)} target={data.managerEmail || data.email} onVerify={async (code) => { const ok = await handleVerifyOtp(code); if(`
- `76: provider-app/src/screens/facility/FacilityRegistration.tsx:1173:      <OtpModal visible={showOtp} onClose={() => setShowOtp(false)} target={data.managerEmail || data.email} onVerify={async (code) => { const ok = await handleVerifyOtp(code);`
- `92: provider-app/src/screens/facility/FacilityDashboard.tsx:2175:   show(AR ? 'بانتظار موافقة الإدارة على الأسعار الجديدة' : 'Pending admin approval for new pricing', 'success');`
- `93: provider-app/src/screens/facility/FacilityDashboard.tsx:2188:      show(AR ? 'بانتظار موافقة الإدارة على التعديلات' : 'Pending admin approval for changes', 'success');`
- `98: provider-app/src/screens/auth/AuthScreens.tsx:425:      show(AR ? 'تم الدخول بالبصمة ' : 'Biometric login successful', 'success');`
- `99: provider-app/src/screens/auth/AuthScreens.tsx:618: show(AR ? 'تم إرسال رمز التحقق إلى بريدك' : 'OTP sent to your email', 'success');`
- `132: provider-app/src/screens/lab/LabRegistration.tsx:1813:      <OtpModal visible={showOtp} onClose={() => setShowOtp(false)} target={data.managerEmail} onVerify={async (code) => { const ok = await handleVerifyOtp(code); if(ok) { setShowOtp(fal`
- `133: provider-app/src/screens/ambulance/AmbulanceRegistration.tsx:230:      show(AR ? 'تم إرسال الطلب بنجاح! سيظهر للمرضى بعد اعتماد الإدارة' : 'Submitted! Visible to patients after admin approval', 'success');`
- `148: provider-app/src/screens/shared/BlueprintScreens.tsx:258: show(AR ? 'تم إرسال طلب الحملة الإعلانية — ستُفعّل بعد مراجعة الإدارة' : 'Ad campaign submitted — goes live after admin review', 'success');`
- `160: provider-app/src/screens/shared/RealScreensExtended.tsx:231:      show(AR ? 'تم إرسال الصنف لمراجعة الإدارة واعتماده' : 'Product submitted for admin review and approval', 'success');`
- `161: provider-app/src/screens/shared/RealScreensExtended.tsx:348:      show(AR ? 'تم إرسال البلاغ للإدارة — سيصلك الرد عبر الدعم' : 'Report sent to admin — you will be answered via support', 'success');`
- `176: provider-app/src/screens/shared/SharedScreens.tsx:1949:     show(AR ? 'تم إرسال الاقتراح — بانتظار موافقة الإدارة' : 'Suggestion sent — pending admin approval', 'success');`
### state_transitions
- `10: ## Candidate toast-only success / hardcoded state`
- `11: provider-app/src/screens/doctor/DoctorDashboard.tsx:226: show(AR ? 'تم قبول الطلب بنجاح' : 'Request accepted successfully', 'success');`
- `12: provider-app/src/screens/doctor/DoctorDashboard.tsx:236: show(AR ? 'تم رفض الطلب' : 'Request rejected', 'info');`
- `13: provider-app/src/screens/doctor/DoctorDashboard.tsx:251:     show(AR ? 'تم إرسال الطلب للمريض لدفع نسبة التحمل' : 'Request sent to patient for Co-Pay', 'success');`
- `14: provider-app/src/screens/doctor/DoctorDashboard.tsx:254:     show(AR ? 'حدث خطأ أثناء رفع الاعتماد' : 'Error submitting approval', 'error');`
- `15: provider-app/src/screens/doctor/DoctorDashboard.tsx:321:     onPress={() => { show(AR ? 'تم قفل حالة الدفع وبدء الاستشارة' : 'Payment locked. Starting consultation.', 'success'); onNavigate('consultation', req); }} />`
- `16: provider-app/src/screens/doctor/DoctorDashboard.tsx:660:      show(AR ? 'تم إنهاء الاستشارة وإرسال الوصفة للمريض بنجاح' : 'Consultation ended and E-Rx sent successfully', 'success');`
- `17: provider-app/src/screens/doctor/DoctorDashboard.tsx:664:      show(AR ? 'تم إنهاء الاستشارة' : 'Consultation ended', 'success');`
- `18: provider-app/src/screens/doctor/DoctorDashboard.tsx:693:            <NBtn label={AR ? 'بدء الكشف' : 'Start Checkup'} size="sm" disabled={distanceKm > 0.5} onPress={() => { if (apt) show(AR ? 'تم بدء الفحص الطبي' : 'Checkup started', 'succes`
- `19: provider-app/src/screens/doctor/DoctorDashboard.tsx:939:  show(AR ? 'تم إصدار الوصفة الطبية وإرسالها للمريض ' : 'Prescription issued and sent to patient ', 'success');`
- `20: provider-app/src/screens/doctor/DoctorDashboard.tsx:1098: <TouchableOpacity key={t.id} onPress={() => { setDrugs(t.drugs); setShowTemplates(false); show(AR ? 'تم تحميل النموذج' : 'Template loaded successfully', 'success'); }} style={{ paddi`
- `21: provider-app/src/screens/doctor/DoctorDashboard.tsx:1121: show(AR ? 'تم حفظ النموذج الجديد بنجاح' : 'Template saved successfully', 'success');`
### payment_insurance_relevance
- `13: provider-app/src/screens/doctor/DoctorDashboard.tsx:251:     show(AR ? 'تم إرسال الطلب للمريض لدفع نسبة التحمل' : 'Request sent to patient for Co-Pay', 'success');`
- `15: provider-app/src/screens/doctor/DoctorDashboard.tsx:321:     onPress={() => { show(AR ? 'تم قفل حالة الدفع وبدء الاستشارة' : 'Payment locked. Starting consultation.', 'success'); onNavigate('consultation', req); }} />`
- `53: provider-app/src/screens/doctor/DoctorDashboard.tsx:3765:    show(AR ? 'تم حفظ الموقع ونطاق التغطية' : 'Location & Coverage Saved', 'success');`
- `54: provider-app/src/screens/doctor/DoctorDashboard.tsx:3820: show(AR ? 'تم حفظ إعدادات التأمين بنجاح' : 'Insurance settings saved successfully', 'success');`
- `105: provider-app/src/screens/lab/LabDashboard.tsx:384:      show(AR ? 'تم طلب نسبة التحمل من المريض' : 'Co-Pay requested from patient', 'success');`
- `144: provider-app/src/screens/shared/InsuranceRequestsScreen.tsx:94:      show(AR ? 'تم إرسال القرار للمريض' : 'Decision sent to patient', 'success');`
- `202: provider-app/src/screens/nursing/NursingDashboard.tsx:1404:   show(AR ? ' تم تحديد موقع الـ GPS بنجاح والتحقق من التغطية الإقليمية!' : ' GPS location and regional coverage verified successfully!', 'success');`
- `220: provider-app/src/screens/radiology/RadiologyDashboard.tsx:94:      setStats({ todayCount: data.length, inScanCount: data.filter(o => o.state === 'IN_SCANNING').length, completedCount: data.filter(o => o.state === 'REPORT_READY').length, rev`
- `223: provider-app/src/screens/radiology/RadiologyDashboard.tsx:205:    try { await client.post(`/radiology/bookings/${currentOrder.id}/insurance-approval`, { approval_code: nphiesCode, copay: parseFloat(copay) || 0 }); show(AR ? 'تم إرسال التأمي`
- `224: provider-app/src/screens/radiology/RadiologyDashboard.tsx:212:    try { await client.post(`/radiology/bookings/${currentOrder.id}/abort`, { reason: abortReason }); show(AR ? 'تم إلغاء الفحص وإنشاء طلب استرداد' : 'Scan aborted. Refund ticket`
- `226: provider-app/src/screens/radiology/RadiologyDashboard.tsx:270:          <NBtn label={AR?' تأكيد الطلب (كاش)':' Confirm Order (Cash)'} loading={loading} onPress={async () => { setLoading(true); try { await client.patch(`/radiology/bookings/$`
- `243: provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:1220:      show(AR ? `تم تسجيل قرار التأمين — التحمل: ${realCopay} ريال` : `Insurance recorded — Copay: ${realCopay}`, 'success');`
### error_empty_loading_retry_cancel
- `14: provider-app/src/screens/doctor/DoctorDashboard.tsx:254:     show(AR ? 'حدث خطأ أثناء رفع الاعتماد' : 'Error submitting approval', 'error');`
- `49: provider-app/src/screens/doctor/DoctorDashboard.tsx:3408: show(AR ? 'تم حذف الاستثناء' : 'Exception removed', 'error');`
- `61: provider-app/src/screens/doctor/DoctorOpsScreens.tsx:63:      show(AR ? 'أُلغيت الإجازة' : 'Leave cancelled', 'success');`
- `70: provider-app/src/screens/doctor/DoctorRegistration.tsx:1104:      <OtpModal visible={showOtp} onClose={() => setShowOtp(false)} target={data.managerEmail || data.email} onVerify={async (code) => { const ok = await handleVerifyOtp(code); if(`
- `76: provider-app/src/screens/facility/FacilityRegistration.tsx:1173:      <OtpModal visible={showOtp} onClose={() => setShowOtp(false)} target={data.managerEmail || data.email} onVerify={async (code) => { const ok = await handleVerifyOtp(code);`
- `92: provider-app/src/screens/facility/FacilityDashboard.tsx:2175:   show(AR ? 'بانتظار موافقة الإدارة على الأسعار الجديدة' : 'Pending admin approval for new pricing', 'success');`
- `93: provider-app/src/screens/facility/FacilityDashboard.tsx:2188:      show(AR ? 'بانتظار موافقة الإدارة على التعديلات' : 'Pending admin approval for changes', 'success');`
- `121: provider-app/src/screens/lab/LabDashboard.tsx:1114:            show(AR ? 'تم الإلغاء وجاري التعيين' : 'Cancelled & Reassigning', 'success');`
- `132: provider-app/src/screens/lab/LabRegistration.tsx:1813:      <OtpModal visible={showOtp} onClose={() => setShowOtp(false)} target={data.managerEmail} onVerify={async (code) => { const ok = await handleVerifyOtp(code); if(ok) { setShowOtp(fal`
- `174: provider-app/src/screens/shared/SharedScreens.tsx:1577:          <NBtn label={AR ? 'تنزيل السيرة الذاتية (Download CV)' : 'Download CV'} onPress={() => show(AR ? 'جاري تحميل السيرة الذاتية...' : 'Downloading CV...', 'success')} style={{ mar`
- `176: provider-app/src/screens/shared/SharedScreens.tsx:1949:     show(AR ? 'تم إرسال الاقتراح — بانتظار موافقة الإدارة' : 'Suggestion sent — pending admin approval', 'success');`
- `177: provider-app/src/screens/shared/SharedScreens.tsx:1989:     show(AR ? 'تم إرسال الصورة المقترحة — بانتظار موافقة الإدارة' : 'Image suggestion sent — pending admin approval', 'success');`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
