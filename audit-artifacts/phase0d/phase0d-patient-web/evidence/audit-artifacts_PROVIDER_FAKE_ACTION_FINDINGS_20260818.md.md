# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PROVIDER_FAKE_ACTION_FINDINGS_20260818.md`
- **Member SHA-256:** `e9bd144567d02cebe72e5e9153f961ffed5c8d598d9d2389765704333c88cef1`
- **Line count:** 40
- **Read range:** `1-40`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `2: provider-app/src/screens/doctor/DoctorDashboard.tsx:1980:            <TouchableOpacity onPress={() => show(AR ? 'بدء مكالمة فيديو' : 'Starting video call...', 'info')} style={{ padding: SP.xs }}>`
- `3: provider-app/src/screens/doctor/DoctorDashboard.tsx:2827: onPress={() => show(AR ? 'جاري الاتصال المشفّر...' : 'Encrypted call...', 'info')} />`
- `4: provider-app/src/screens/doctor/DoctorDashboard.tsx:2830: onPress={() => show(AR ? 'تم إرسال طلب التواصل' : 'Connection request sent', 'success')} />`
- `5: provider-app/src/screens/doctor/DoctorDashboard.tsx:3281: onPress={() => show(AR ? 'جاري إنشاء التقرير...' : 'Generating report...', 'info')}`
- `6: provider-app/src/screens/facility/FacilityDashboard.tsx:691: <TouchableOpacity onPress={() => show(AR ? 'عرض بطاقة التوثيق' : 'Credential card', 'info')}`
- `7: provider-app/src/screens/facility/FacilityDashboard.tsx:1090: <TouchableOpacity onPress={() => show(AR?'تعديل المناوبة':'Edit shift','info')}>`
- `8: provider-app/src/screens/facility/FacilityDashboard.tsx:1099: onPress={() => show(AR?'إضافة مناوبة':'Add shift','info')} />`
- `9: provider-app/src/screens/facility/FacilityDashboard.tsx:1663: style={{ paddingHorizontal: SP.lg }} onPress={() => show(AR?'تم إعادة الإرسال':'Resubmitted','success')} />`
- `10: provider-app/src/screens/facility/FacilityDashboard.tsx:1665: style={{ paddingHorizontal: SP.lg }} onPress={() => show(AR?'تفاصيل المطالبة':'Claim details','info')} />`
- `11: provider-app/src/screens/facility/FacilityDashboard.tsx:1672: onPress={() => show(AR?'فتح نموذج المطالبة':'Claim form opening','info')} />`
- `12: provider-app/src/screens/facility/FacilityDashboard.tsx:1820: onPress={() => show(AR?'جاري إنشاء التقرير...':'Generating report...','info')} />`
- `13: provider-app/src/screens/facility/FacilityDashboard.tsx:1824: onPress={() => show(AR?'جاري التصدير...':'Exporting...','info')} />`
### backend_consumers_or_contracts
- `32: provider-app/src/screens/radiology/RadiologyRegistration.tsx:1065:        onPress={() => show(AR ? 'سيُرسل للإدارة للموافقة' : 'Will be sent to admin for approval', 'info')} />`
- `33: provider-app/src/screens/radiology/RadiologyDashboard.tsx:338:      await client.post(`/radiology/bookings/${order.id}/upload-report`, { pdf_url: 'https://storage.nabdah.com/reports/' + order.id + '.pdf', dicom_url: dicomUrl || null, findin`
- `34: provider-app/src/screens/radiology/RadiologyDashboard.tsx:385:        <NBtn label={AR?' رفع صور الأشعة (JPEG/PNG)':' Upload Scan Images (JPEG/PNG)'} variant="outline" loading={loading} onPress={() => show(AR?'سيتم دعمه مع تكامل S3':'Coming `
- `35: provider-app/src/screens/radiology/RadiologyDashboard.tsx:458:              <NBtn label={AR ? 'تعديل' : 'Edit'} size="xs" variant="outline" full={false} onPress={() => show(AR ? 'التعديلات تُرسل للمراجعة الإدارية' : 'Edits go through admin `
- `36: provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:1365:        <NBtn label={AR ? 'محاكاة مسح دواء' : 'Simulate Drug Scan'} onPress={() => { show(AR ? 'تم التعرف: Paracetamol 500mg' : 'Detected: Paracetamol 500mg', 'success'); onBack()`
- `37: provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:1386:            <NBtn label={AR?'قبول الطلب وتجهيز الدواء':'Accept Order'} size="sm" onPress={() => show(AR?'تم قبول الطلب وتنبيه المريض':'Order accepted','success')} style={{ flex: 1`
### auth_ownership
- `20: provider-app/src/screens/lab/LabRegistration.tsx:1065:        onPress={() => show(AR ? 'سيُرسل للإدارة للموافقة' : 'Will be sent to admin for approval', 'info')} />`
- `32: provider-app/src/screens/radiology/RadiologyRegistration.tsx:1065:        onPress={() => show(AR ? 'سيُرسل للإدارة للموافقة' : 'Will be sent to admin for approval', 'info')} />`
- `35: provider-app/src/screens/radiology/RadiologyDashboard.tsx:458:              <NBtn label={AR ? 'تعديل' : 'Edit'} size="xs" variant="outline" full={false} onPress={() => show(AR ? 'التعديلات تُرسل للمراجعة الإدارية' : 'Edits go through admin `
### state_transitions
- `4: provider-app/src/screens/doctor/DoctorDashboard.tsx:2830: onPress={() => show(AR ? 'تم إرسال طلب التواصل' : 'Connection request sent', 'success')} />`
- `9: provider-app/src/screens/facility/FacilityDashboard.tsx:1663: style={{ paddingHorizontal: SP.lg }} onPress={() => show(AR?'تم إعادة الإرسال':'Resubmitted','success')} />`
- `19: provider-app/src/screens/lab/LabDashboard.tsx:819:            <NBtn label={AR?'حفظ كمسودة (للفني)':'Save Draft (Tech)'} variant="secondary" onPress={() => show(AR?'تم الحفظ كمسودة':'Draft Saved', 'success')} style={{flex:2}} />`
- `21: provider-app/src/screens/shared/BlueprintScreens.tsx:205: <TouchableOpacity onPress={() => show(AR ? 'تم النسخ إلى الحافظة ' : 'Copied to clipboard ', 'success')}>`
- `22: provider-app/src/screens/shared/BlueprintScreens.tsx:339: <NBtn label={AR ? ' نسخ الكود' : ' Copy Code'} variant="outline" onPress={() => show(AR ? 'تم النسخ' : 'Copied', 'success')} />`
- `23: provider-app/src/screens/shared/RealScreensExtended.tsx:25:        <NBtn label={AR ? 'تحميل بطاقة الرمز المطبوعة PDF' : 'Download Printable PDF'} onPress={() => show(AR ? 'جاري التحميل...' : 'Downloading...', 'info')} style={{ width: '100%'`
- `27: provider-app/src/screens/shared/SharedScreens.tsx:488: <TouchableOpacity onPress={() => show(AR ? 'تم إزالة الجهاز' : 'Device removed', 'success')}>`
- `31: provider-app/src/screens/shared/SharedScreens.tsx:1577:          <NBtn label={AR ? 'تنزيل السيرة الذاتية (Download CV)' : 'Download CV'} onPress={() => show(AR ? 'جاري تحميل السيرة الذاتية...' : 'Downloading CV...', 'success')} style={{ mar`
- `34: provider-app/src/screens/radiology/RadiologyDashboard.tsx:385:        <NBtn label={AR?' رفع صور الأشعة (JPEG/PNG)':' Upload Scan Images (JPEG/PNG)'} variant="outline" loading={loading} onPress={() => show(AR?'سيتم دعمه مع تكامل S3':'Coming `
- `36: provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:1365:        <NBtn label={AR ? 'محاكاة مسح دواء' : 'Simulate Drug Scan'} onPress={() => { show(AR ? 'تم التعرف: Paracetamol 500mg' : 'Detected: Paracetamol 500mg', 'success'); onBack()`
- `37: provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:1386:            <NBtn label={AR?'قبول الطلب وتجهيز الدواء':'Accept Order'} size="sm" onPress={() => show(AR?'تم قبول الطلب وتنبيه المريض':'Order accepted','success')} style={{ flex: 1`
- `40: A button is a confirmed placeholder only when its handler does not call a backend/storage contract and claims a terminal business result. Form input placeholders and success toasts after an awaited client request are not placeholders by the`
### payment_insurance_relevance
- `6: provider-app/src/screens/facility/FacilityDashboard.tsx:691: <TouchableOpacity onPress={() => show(AR ? 'عرض بطاقة التوثيق' : 'Credential card', 'info')}`
### error_empty_loading_retry_cancel
- `23: provider-app/src/screens/shared/RealScreensExtended.tsx:25:        <NBtn label={AR ? 'تحميل بطاقة الرمز المطبوعة PDF' : 'Download Printable PDF'} onPress={() => show(AR ? 'جاري التحميل...' : 'Downloading...', 'info')} style={{ width: '100%'`
- `31: provider-app/src/screens/shared/SharedScreens.tsx:1577:          <NBtn label={AR ? 'تنزيل السيرة الذاتية (Download CV)' : 'Download CV'} onPress={() => show(AR ? 'جاري تحميل السيرة الذاتية...' : 'Downloading CV...', 'success')} style={{ mar`
- `34: provider-app/src/screens/radiology/RadiologyDashboard.tsx:385:        <NBtn label={AR?' رفع صور الأشعة (JPEG/PNG)':' Upload Scan Images (JPEG/PNG)'} variant="outline" loading={loading} onPress={() => show(AR?'سيتم دعمه مع تكامل S3':'Coming `

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
