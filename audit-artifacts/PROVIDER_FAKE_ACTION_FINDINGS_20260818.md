# Provider fake-action findings
provider-app/src/screens/doctor/DoctorDashboard.tsx:1980:            <TouchableOpacity onPress={() => show(AR ? 'بدء مكالمة فيديو' : 'Starting video call...', 'info')} style={{ padding: SP.xs }}>
provider-app/src/screens/doctor/DoctorDashboard.tsx:2827: onPress={() => show(AR ? 'جاري الاتصال المشفّر...' : 'Encrypted call...', 'info')} />
provider-app/src/screens/doctor/DoctorDashboard.tsx:2830: onPress={() => show(AR ? 'تم إرسال طلب التواصل' : 'Connection request sent', 'success')} />
provider-app/src/screens/doctor/DoctorDashboard.tsx:3281: onPress={() => show(AR ? 'جاري إنشاء التقرير...' : 'Generating report...', 'info')}
provider-app/src/screens/facility/FacilityDashboard.tsx:691: <TouchableOpacity onPress={() => show(AR ? 'عرض بطاقة التوثيق' : 'Credential card', 'info')}
provider-app/src/screens/facility/FacilityDashboard.tsx:1090: <TouchableOpacity onPress={() => show(AR?'تعديل المناوبة':'Edit shift','info')}>
provider-app/src/screens/facility/FacilityDashboard.tsx:1099: onPress={() => show(AR?'إضافة مناوبة':'Add shift','info')} />
provider-app/src/screens/facility/FacilityDashboard.tsx:1663: style={{ paddingHorizontal: SP.lg }} onPress={() => show(AR?'تم إعادة الإرسال':'Resubmitted','success')} />
provider-app/src/screens/facility/FacilityDashboard.tsx:1665: style={{ paddingHorizontal: SP.lg }} onPress={() => show(AR?'تفاصيل المطالبة':'Claim details','info')} />
provider-app/src/screens/facility/FacilityDashboard.tsx:1672: onPress={() => show(AR?'فتح نموذج المطالبة':'Claim form opening','info')} />
provider-app/src/screens/facility/FacilityDashboard.tsx:1820: onPress={() => show(AR?'جاري إنشاء التقرير...':'Generating report...','info')} />
provider-app/src/screens/facility/FacilityDashboard.tsx:1824: onPress={() => show(AR?'جاري التصدير...':'Exporting...','info')} />
provider-app/src/screens/facility/FacilityDashboard.tsx:1901: onPress={() => show(AR?'جاري إنشاء التقرير...':'Generating...','info')} />
provider-app/src/screens/facility/FacilityDashboard.tsx:2134: style={{ paddingHorizontal: SP.lg }} onPress={() => show(AR?'عرض الوثائق':'View docs','info')} />
provider-app/src/screens/facility/FacilityDashboard.tsx:2137: style={{ paddingHorizontal: SP.lg }} onPress={() => show(AR?'فتح نموذج التجديد':'Renewal form','info')} />
provider-app/src/screens/facility/FacilityDashboard.tsx:2271: onPress={() => show(AR?'إعدادات الأمان والتراخيص مفعلة':'Security & licensing active','info')} />
provider-app/src/screens/facility/FacilityDashboard.tsx:2284: onPress={() => show(AR?'الدعم: support@nabdah.com':'Support: support@nabdah.com','info')} />
provider-app/src/screens/lab/LabDashboard.tsx:819:            <NBtn label={AR?'حفظ كمسودة (للفني)':'Save Draft (Tech)'} variant="secondary" onPress={() => show(AR?'تم الحفظ كمسودة':'Draft Saved', 'success')} style={{flex:2}} />
provider-app/src/screens/lab/LabRegistration.tsx:1065:        onPress={() => show(AR ? 'سيُرسل للإدارة للموافقة' : 'Will be sent to admin for approval', 'info')} />
provider-app/src/screens/shared/BlueprintScreens.tsx:205: <TouchableOpacity onPress={() => show(AR ? 'تم النسخ إلى الحافظة ' : 'Copied to clipboard ', 'success')}>
provider-app/src/screens/shared/BlueprintScreens.tsx:339: <NBtn label={AR ? ' نسخ الكود' : ' Copy Code'} variant="outline" onPress={() => show(AR ? 'تم النسخ' : 'Copied', 'success')} />
provider-app/src/screens/shared/RealScreensExtended.tsx:25:        <NBtn label={AR ? 'تحميل بطاقة الرمز المطبوعة PDF' : 'Download Printable PDF'} onPress={() => show(AR ? 'جاري التحميل...' : 'Downloading...', 'info')} style={{ width: '100%' }} />
provider-app/src/screens/shared/SharedScreens.tsx:193: <TouchableOpacity onPress={() => show(AR ? 'بدء مكالمة صوتية' : 'Starting voice call', 'info')}>
provider-app/src/screens/shared/SharedScreens.tsx:196: <TouchableOpacity onPress={() => show(AR ? 'بدء مكالمة فيديو' : 'Starting video call', 'info')}>
provider-app/src/screens/shared/SharedScreens.tsx:243: <TouchableOpacity onPress={() => show(AR ? 'تسجيل صوتي' : 'Voice recording', 'info')} style={{ padding: SP.sm }}>
provider-app/src/screens/shared/SharedScreens.tsx:488: <TouchableOpacity onPress={() => show(AR ? 'تم إزالة الجهاز' : 'Device removed', 'success')}>
provider-app/src/screens/shared/SharedScreens.tsx:588: onPress={() => show(device.connected ? (AR ? 'الجهاز متصل بالفعل' : 'Already connected') : (AR ? 'جاري الربط...' : 'Connecting...'), 'info')} />
provider-app/src/screens/shared/SharedScreens.tsx:860:  <View style={{ flex: 1 }}><NBtn label={AR ? 'تصدير PDF' : 'Export PDF'} variant="outline" onPress={() => show(AR ? 'جاري إنشاء التقرير' : 'Generating report', 'info')} /></View>
provider-app/src/screens/shared/SharedScreens.tsx:861:  <View style={{ flex: 1 }}><NBtn label={AR ? 'تصدير Excel' : 'Export Excel'} variant="secondary" onPress={() => show(AR ? 'جاري التصدير' : 'Exporting', 'info')} /></View>
provider-app/src/screens/shared/SharedScreens.tsx:1577:          <NBtn label={AR ? 'تنزيل السيرة الذاتية (Download CV)' : 'Download CV'} onPress={() => show(AR ? 'جاري تحميل السيرة الذاتية...' : 'Downloading CV...', 'success')} style={{ marginTop: SP.lg }} />
provider-app/src/screens/radiology/RadiologyRegistration.tsx:1065:        onPress={() => show(AR ? 'سيُرسل للإدارة للموافقة' : 'Will be sent to admin for approval', 'info')} />
provider-app/src/screens/radiology/RadiologyDashboard.tsx:338:      await client.post(`/radiology/bookings/${order.id}/upload-report`, { pdf_url: 'https://storage.nabdah.com/reports/' + order.id + '.pdf', dicom_url: dicomUrl || null, findings });
provider-app/src/screens/radiology/RadiologyDashboard.tsx:385:        <NBtn label={AR?' رفع صور الأشعة (JPEG/PNG)':' Upload Scan Images (JPEG/PNG)'} variant="outline" loading={loading} onPress={() => show(AR?'سيتم دعمه مع تكامل S3':'Coming with S3 integration','info')} />
provider-app/src/screens/radiology/RadiologyDashboard.tsx:458:              <NBtn label={AR ? 'تعديل' : 'Edit'} size="xs" variant="outline" full={false} onPress={() => show(AR ? 'التعديلات تُرسل للمراجعة الإدارية' : 'Edits go through admin review', 'info')} />
provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:1365:        <NBtn label={AR ? 'محاكاة مسح دواء' : 'Simulate Drug Scan'} onPress={() => { show(AR ? 'تم التعرف: Paracetamol 500mg' : 'Detected: Paracetamol 500mg', 'success'); onBack(); }} />
provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:1386:            <NBtn label={AR?'قبول الطلب وتجهيز الدواء':'Accept Order'} size="sm" onPress={() => show(AR?'تم قبول الطلب وتنبيه المريض':'Order accepted','success')} style={{ flex: 1 }} />

## QA interpretation
A button is a confirmed placeholder only when its handler does not call a backend/storage contract and claims a terminal business result. Form input placeholders and success toasts after an awaited client request are not placeholders by themselves.
