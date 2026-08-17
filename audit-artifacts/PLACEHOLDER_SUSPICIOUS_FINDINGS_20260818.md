# Suspicious placeholder findings — filtered
## Fixed/generated identifiers and storage URLs
provider-app/src/screens/facility/FacilityInvitationScreen.tsx:107:        placeholder={AR ? 'مثال: +966500000000 أو NBD-1234' : 'e.g., +966500000000 or NBD-1234'}
provider-app/src/screens/radiology/RadiologyDashboard.tsx:338:      await client.post(`/radiology/bookings/${order.id}/upload-report`, { pdf_url: 'https://storage.nabdah.com/reports/' + order.id + '.pdf', dicom_url: dicomUrl || null, findings });
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/webhooks/guards/livekit-webhook.guard.ts:10:      process.env.LIVEKIT_API_KEY || 'fake_key',
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/webhooks/guards/livekit-webhook.guard.ts:11:      process.env.LIVEKIT_API_SECRET || 'fake_secret'
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/i18n/i18n.service.ts:80:  'coming_soon.body': { ar: 'هذه الخدمة قيد التطوير وستكون متاحة قريباً ضمن منظومة نبض الصحية الموحّدة. سنبلغك فور إطلاقها.', en: 'This service is coming soon as part of the unified Nabd Healthcare ecosystem. We will notify you on launch.', ur: 'یہ سروس جلد دستیاب ہوگی' },
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/i18n/i18n.service.ts:418:  'notif.lab_processing.body': { ar: 'سيتم إصدار النتيجة قريباً', en: 'Results coming soon', ur: 'جلد نتائج' },
/tmp/nabdah-appointment-work/nabdah-backend/src/modules/i18n/i18n.service.ts:438:  'notif.radiology_in_progress.body': { ar: 'سيتم إصدار التقرير قريباً', en: 'Report coming soon', ur: 'جلد' },
## Candidate toast-only success / hardcoded state
provider-app/src/screens/doctor/DoctorDashboard.tsx:226: show(AR ? 'تم قبول الطلب بنجاح' : 'Request accepted successfully', 'success');
provider-app/src/screens/doctor/DoctorDashboard.tsx:236: show(AR ? 'تم رفض الطلب' : 'Request rejected', 'info');
provider-app/src/screens/doctor/DoctorDashboard.tsx:251:     show(AR ? 'تم إرسال الطلب للمريض لدفع نسبة التحمل' : 'Request sent to patient for Co-Pay', 'success');
provider-app/src/screens/doctor/DoctorDashboard.tsx:254:     show(AR ? 'حدث خطأ أثناء رفع الاعتماد' : 'Error submitting approval', 'error');
provider-app/src/screens/doctor/DoctorDashboard.tsx:321:     onPress={() => { show(AR ? 'تم قفل حالة الدفع وبدء الاستشارة' : 'Payment locked. Starting consultation.', 'success'); onNavigate('consultation', req); }} />
provider-app/src/screens/doctor/DoctorDashboard.tsx:660:      show(AR ? 'تم إنهاء الاستشارة وإرسال الوصفة للمريض بنجاح' : 'Consultation ended and E-Rx sent successfully', 'success');
provider-app/src/screens/doctor/DoctorDashboard.tsx:664:      show(AR ? 'تم إنهاء الاستشارة' : 'Consultation ended', 'success');
provider-app/src/screens/doctor/DoctorDashboard.tsx:693:            <NBtn label={AR ? 'بدء الكشف' : 'Start Checkup'} size="sm" disabled={distanceKm > 0.5} onPress={() => { if (apt) show(AR ? 'تم بدء الفحص الطبي' : 'Checkup started', 'success'); }} />
provider-app/src/screens/doctor/DoctorDashboard.tsx:939:  show(AR ? 'تم إصدار الوصفة الطبية وإرسالها للمريض ' : 'Prescription issued and sent to patient ', 'success');
provider-app/src/screens/doctor/DoctorDashboard.tsx:1098: <TouchableOpacity key={t.id} onPress={() => { setDrugs(t.drugs); setShowTemplates(false); show(AR ? 'تم تحميل النموذج' : 'Template loaded successfully', 'success'); }} style={{ padding: SP.md, borderBottomWidth: 1, borderBottomColor: theme.border, flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between' }}>
provider-app/src/screens/doctor/DoctorDashboard.tsx:1121: show(AR ? 'تم حفظ النموذج الجديد بنجاح' : 'Template saved successfully', 'success');
provider-app/src/screens/doctor/DoctorDashboard.tsx:1220:     show(AR?'تم إصدار الإجازة المرضية بنجاح':'Sick leave issued successfully', 'success');
provider-app/src/screens/doctor/DoctorDashboard.tsx:1224:     show(AR?'تم إصدار الإجازة المرضية بنجاح':'Sick leave issued successfully', 'success');
provider-app/src/screens/doctor/DoctorDashboard.tsx:1345:  show(AR?'تم إرسال التحويل بنجاح ':'Referral sent ', 'success');
provider-app/src/screens/doctor/DoctorDashboard.tsx:1447: show(AR?`تم إرسال طلب ${selected.length} فحص `:`${selected.length} test(s) requested `,'success'); 
provider-app/src/screens/doctor/DoctorDashboard.tsx:1499: show(AR ? 'تم إضافة الوسم' : 'Tag added successfully', 'success');
provider-app/src/screens/doctor/DoctorDashboard.tsx:1504: show(AR ? 'تم حذف الوسم' : 'Tag removed', 'info');
provider-app/src/screens/doctor/DoctorDashboard.tsx:1512: show(AR ? 'تم حفظ ملاحظة CRM' : 'CRM Note saved', 'success');
provider-app/src/screens/doctor/DoctorDashboard.tsx:1517: show(val ? (AR ? 'تم ترقية المريض إلى VIP ' : 'Patient upgraded to VIP ') : (AR ? 'تم إلغاء حالة VIP' : 'VIP status removed'), 'success');
provider-app/src/screens/doctor/DoctorDashboard.tsx:1522: show(val ? (AR ? 'تم الإضافة للمفضلة ' : 'Added to favorites ') : (AR ? 'تم الإزالة من المفضلة' : 'Removed from favorites'), 'success');
provider-app/src/screens/doctor/DoctorDashboard.tsx:1527: show(val ? (AR ? 'تم إدراج المريض في الحظر ' : 'Patient added to blocklist ') : (AR ? 'تم إلغاء الحظر' : 'Patient unblocked'), 'warning');
provider-app/src/screens/doctor/DoctorDashboard.tsx:1822: onPress={() => { show(AR?'تم حفظ إعدادات الغياب':'Settings saved', 'success'); onBack(); }} />
provider-app/src/screens/doctor/DoctorDashboard.tsx:2126:    show(AR ? 'تم إرسال طلب فك الارتباط' : 'Unlink request sent', 'info');
provider-app/src/screens/doctor/DoctorDashboard.tsx:2346: show(AR ? 'تم إرسال المطالبة بنجاح ' : 'Claim submitted successfully ', 'success');
provider-app/src/screens/doctor/DoctorDashboard.tsx:2450:     show(AR ? 'تم إصدار التقرير الطبي ' : 'Report issued ', 'success');
provider-app/src/screens/doctor/DoctorDashboard.tsx:2626: show(googleSync ? (AR ? 'تم فصل Google Calendar' : 'Google disconnected') : (AR ? 'تم ربط Google Calendar ' : 'Google Calendar connected '), googleSync ? 'info' : 'success');
provider-app/src/screens/doctor/DoctorDashboard.tsx:2653: show(appleSync ? (AR ? 'تم فصل Apple Calendar' : 'Apple disconnected') : (AR ? 'تم ربط Apple Calendar ' : 'Apple Calendar connected '), appleSync ? 'info' : 'success');
provider-app/src/screens/doctor/DoctorDashboard.tsx:2677: onPress={() => { show(AR ? 'تم حفظ إعدادات المزامنة' : 'Sync settings saved', 'success'); onBack(); }} />
provider-app/src/screens/doctor/DoctorDashboard.tsx:2737: show(v ? (AR ? 'نبضة التوفر مفعّلة ' : 'Pulse activated ') : (AR ? 'نبضة التوفر معطّلة' : 'Pulse off'), v ? 'success' : 'info');
provider-app/src/screens/doctor/DoctorDashboard.tsx:2772: onPress={() => { show(AR ? 'تم حفظ الإعدادات' : 'Settings saved', 'success'); onBack(); }} />
provider-app/src/screens/doctor/DoctorDashboard.tsx:2830: onPress={() => show(AR ? 'تم إرسال طلب التواصل' : 'Connection request sent', 'success')} />
provider-app/src/screens/doctor/DoctorDashboard.tsx:2949: show(AR ? 'تم تحديث حالة الخدمة' : 'Service status updated', 'success');
provider-app/src/screens/doctor/DoctorDashboard.tsx:2982: show(AR ? 'تمت إضافة الخدمة بنجاح' : 'Service added successfully', 'success');
provider-app/src/screens/doctor/DoctorDashboard.tsx:2992: show(AR ? 'تم حذف الخدمة' : 'Service deleted', 'success');
provider-app/src/screens/doctor/DoctorDashboard.tsx:3018: show(AR ? 'تم حفظ التعديلات' : 'Changes saved successfully', 'success');
provider-app/src/screens/doctor/DoctorDashboard.tsx:3165: onPress={() => { show(AR ? 'تم حفظ باقات الاشتراك ' : 'Plans saved ', 'success'); onBack(); }} />
provider-app/src/screens/doctor/DoctorDashboard.tsx:3369:      show(AR ? 'تم حفظ جدول التوفر الأسبوعي' : 'Weekly availability saved', 'success');
provider-app/src/screens/doctor/DoctorDashboard.tsx:3403: show(AR ? 'تمت إضافة الاستثناء بنجاح' : 'Exception added successfully', 'success');
provider-app/src/screens/doctor/DoctorDashboard.tsx:3408: show(AR ? 'تم حذف الاستثناء' : 'Exception removed', 'error');
provider-app/src/screens/doctor/DoctorDashboard.tsx:3427: <Switch value={vacationMode} onValueChange={(val) => { setVacationMode(val); show(val ? (AR ? '️ تم تفعيل وضع الإجازة' : '️ Vacation enabled') : (AR ? '🟢 تم إلغاء وضع الإجازة' : '🟢 Vacation disabled'), val ? 'warning' : 'success'); }} trackColor={{ true: theme.danger }} />
provider-app/src/screens/doctor/DoctorDashboard.tsx:3695: show(AR ? 'تم حفظ التعديلات بنجاح' : 'Profile updated successfully', 'success');
provider-app/src/screens/doctor/DoctorDashboard.tsx:3719: show(AR ? 'تم تحديث الصورة الشخصية' : 'Profile picture updated', 'success');
provider-app/src/screens/doctor/DoctorDashboard.tsx:3765:    show(AR ? 'تم حفظ الموقع ونطاق التغطية' : 'Location & Coverage Saved', 'success');
provider-app/src/screens/doctor/DoctorDashboard.tsx:3820: show(AR ? 'تم حفظ إعدادات التأمين بنجاح' : 'Insurance settings saved successfully', 'success');
provider-app/src/screens/doctor/DoctorDashboard.tsx:3900: show(AR ? 'تم رفع المستند بنجاح وهو قيد المراجعة' : 'Document uploaded successfully and is under review', 'success');
provider-app/src/screens/doctor/DoctorDashboard.tsx:3990: show(AR ? 'تم حذف الصورة' : 'Photo deleted', 'info');
provider-app/src/screens/doctor/DoctorDashboard.tsx:4000: show(AR ? 'تم إضافة الصورة بنجاح' : 'Photo added successfully', 'success');
provider-app/src/screens/doctor/DoctorDashboard.tsx:4104:      show(AR ? 'تم إرسال إشعار للمريض' : 'Ping sent', 'info');
provider-app/src/screens/doctor/DoctorDashboard.tsx:4118:      show(AR ? 'تم تسجيل الغياب' : 'Marked as no-show', 'success');
provider-app/src/screens/doctor/DoctorOpsScreens.tsx:52:      show(AR ? 'أُضيفت الإجازة — لن يستطيع المرضى الحجز فيها' : 'Leave added — patients cannot book during it', 'success');
provider-app/src/screens/doctor/DoctorOpsScreens.tsx:63:      show(AR ? 'أُلغيت الإجازة' : 'Leave cancelled', 'success');
provider-app/src/screens/doctor/DoctorOpsScreens.tsx:149:      show(AR ? 'حُفظ القالب' : 'Template saved', 'success');
provider-app/src/screens/doctor/DoctorOpsScreens.tsx:229:      show(AR ? 'حُفظ التشخيص' : 'Diagnosis saved', 'success');
provider-app/src/screens/doctor/DoctorOpsScreens.tsx:290:      show(AR ? 'أُزيل من القائمة — يستطيع الحجز مجدداً' : 'Unblocked — patient can book again', 'success');
provider-app/src/screens/doctor/DoctorRegistration.tsx:227:              show(AR ? 'تم إرفاق المستند' : 'Document attached', 'success');
provider-app/src/screens/doctor/DoctorRegistration.tsx:237:              show(AR ? 'تم إرفاق المستند' : 'Document attached', 'success');
provider-app/src/screens/doctor/DoctorRegistration.tsx:247:              show(AR ? 'تم إرفاق المستند' : 'Document attached', 'success');
provider-app/src/screens/doctor/DoctorRegistration.tsx:956:      show(AR ? 'تم إرسال الطلب بنجاح!' : 'Submitted successfully!', 'success');
provider-app/src/screens/doctor/DoctorRegistration.tsx:972:      .then(() => show(AR ? 'تم إرسال رمز التحقق إلى بريدك الإلكتروني' : 'Verification code sent to your email', 'success'))
provider-app/src/screens/doctor/DoctorRegistration.tsx:1104:      <OtpModal visible={showOtp} onClose={() => setShowOtp(false)} target={data.managerEmail || data.email} onVerify={async (code) => { const ok = await handleVerifyOtp(code); if(ok) { setShowOtp(false); finishSubmit(); return true; } return false; }} onResend={() => sendEmailOtp(data.managerEmail || data.email).then(() => show(AR ? 'أُعيد إرسال الرمز' : 'Code resent', 'success')).catch(() => show(AR ? 'تعذر الإرسال — انتظر قليلاً' : 'Could not resend — wait a moment', 'error'))} />
provider-app/src/screens/facility/FacilityRegistration.tsx:229:              show(AR ? 'تم إرفاق المستند' : 'Document attached', 'success');
provider-app/src/screens/facility/FacilityRegistration.tsx:239:              show(AR ? 'تم إرفاق المستند' : 'Document attached', 'success');
provider-app/src/screens/facility/FacilityRegistration.tsx:249:              show(AR ? 'تم إرفاق المستند' : 'Document attached', 'success');
provider-app/src/screens/facility/FacilityRegistration.tsx:1068:      show(AR ? 'تم إرسال طلب المستشفى وملحقاته بنجاح!' : 'Facility Registration Submitted!', 'success');
provider-app/src/screens/facility/FacilityRegistration.tsx:1081:      .then(() => show(AR ? 'تم إرسال رمز التحقق إلى بريدك الإلكتروني' : 'Verification code sent to your email', 'success'))
provider-app/src/screens/facility/FacilityRegistration.tsx:1173:      <OtpModal visible={showOtp} onClose={() => setShowOtp(false)} target={data.managerEmail || data.email} onVerify={async (code) => { const ok = await handleVerifyOtp(code); if(ok) { setShowOtp(false); finishSubmit(); return true; } return false; }} onResend={() => sendEmailOtp(data.managerEmail || data.email).then(() => show(AR ? 'أُعيد إرسال الرمز' : 'Code resent', 'success')).catch(() => show(AR ? 'تعذر الإرسال — انتظر قليلاً' : 'Could not resend — wait a moment', 'error'))} />
provider-app/src/screens/facility/FacilityAnnouncementsScreen.tsx:34:      show(AR ? 'تم نشر التعميم' : 'Announcement published', 'success');
provider-app/src/screens/facility/FacilityLeaveRequestsScreen.tsx:46:      show(AR ? `تم ${action === 'approved' ? 'قبول' : 'رفض'} الطلب` : `Request ${action}`, 'success');
provider-app/src/screens/facility/FacilityResourcesScreen.tsx:48:      show(AR ? 'تمت إضافة المورد' : 'Resource added', 'success');
provider-app/src/screens/facility/FacilityInvitationScreen.tsx:59:      show(AR ? 'تم إرسال الدعوة بنجاح' : 'Invitation sent successfully', 'success');
provider-app/src/screens/facility/DischargeSummaryScreen.tsx:50:      show(AR ? 'تم حفظ ملخص الخروج وإخراج المريض' : 'Discharge summary saved and patient discharged', 'success');
provider-app/src/screens/facility/FacilityProfileConfigScreen.tsx:50:      show(AR ? 'تم حفظ ملف المنشأة بنجاح' : 'Facility profile saved successfully', 'success');
provider-app/src/screens/facility/FacilityDashboard.tsx:581:     show(AR ? 'تم حذف الحساب من الخادم' : 'Account deleted on the server', 'success');
provider-app/src/screens/facility/FacilityDashboard.tsx:778: show(AR ? ` تم إنشاء الحساب الفرعي بنجاح` : ` Sub-account created successfully`, 'success');
provider-app/src/screens/facility/FacilityDashboard.tsx:1063:     show(AR?'تم تعيين بديل':'Substitute assigned','success');
provider-app/src/screens/facility/FacilityDashboard.tsx:1155: show(AR ? 'تم قبول المريض وتخصيص السرير بنجاح' : 'Patient admitted and bed allocated successfully', 'success');
provider-app/src/screens/facility/FacilityDashboard.tsx:1177: show(AR ? 'تم إخراج المريض بنجاح' : 'Patient discharged successfully', 'success');
provider-app/src/screens/facility/FacilityDashboard.tsx:1196: show(AR ? 'تم إنشاء الجناح بنجاح' : 'Ward created successfully', 'success');
provider-app/src/screens/facility/FacilityDashboard.tsx:1441: show(AR ? 'تم تأكيد وصول المريض' : 'Patient arrival confirmed', 'success');
provider-app/src/screens/facility/FacilityDashboard.tsx:1663: style={{ paddingHorizontal: SP.lg }} onPress={() => show(AR?'تم إعادة الإرسال':'Resubmitted','success')} />
provider-app/src/screens/facility/FacilityDashboard.tsx:1964: show(AR ? 'تم حجز غرفة العمليات وجدولة العملية بنجاح' : 'Surgery room booked and scheduled successfully', 'success');
provider-app/src/screens/facility/FacilityDashboard.tsx:2175:   show(AR ? 'بانتظار موافقة الإدارة على الأسعار الجديدة' : 'Pending admin approval for new pricing', 'success');
provider-app/src/screens/facility/FacilityDashboard.tsx:2188:      show(AR ? 'بانتظار موافقة الإدارة على التعديلات' : 'Pending admin approval for changes', 'success');
provider-app/src/screens/facility/FacilityDashboard.tsx:2360: show(AR ? 'تم تعيين الممرض بنجاح' : 'Nurse assigned successfully', 'success');
provider-app/src/screens/facility/FacilityDashboard.tsx:2451:      show(action === 'accept' ? (AR ? 'تم قبول الطلب' : 'Order accepted') : (AR ? 'تم رفض الطلب' : 'Order rejected'), action === 'accept' ? 'success' : 'info');
provider-app/src/screens/auth/AuthScreens.tsx:400:      show(AR ? 'مرحباً بعودتك! ' : 'Welcome back! ', 'success');
provider-app/src/screens/auth/AuthScreens.tsx:415:      show(AR ? 'تم تفعيل البصمة بنجاح' : 'Biometric enabled successfully', 'success');
provider-app/src/screens/auth/AuthScreens.tsx:425:      show(AR ? 'تم الدخول بالبصمة ' : 'Biometric login successful', 'success');
provider-app/src/screens/auth/AuthScreens.tsx:618: show(AR ? 'تم إرسال رمز التحقق إلى بريدك' : 'OTP sent to your email', 'success');
provider-app/src/screens/auth/AuthScreens.tsx:672: show(AR ? 'تم تغيير كلمة المرور — جاري تسجيل الدخول…' : 'Password changed — signing you in…', 'success');
provider-app/src/screens/auth/AuthScreens.tsx:726: onResend={() => { show(AR ? 'تم إعادة الإرسال' : 'Code resent', 'info'); }}
provider-app/src/screens/lab/LabQcActions.tsx:28:      show(AR ? 'تم التنفيذ' : 'Done', 'success');
provider-app/src/screens/lab/LabDashboard.tsx:252:  setStats({ todayCount: 0, analyzingCount: 0, readyCount: 0, revenue: 0 });
provider-app/src/screens/lab/LabDashboard.tsx:374:      show(AR ? 'تم رفض الطلب' : 'Declined', 'info');
provider-app/src/screens/lab/LabDashboard.tsx:384:      show(AR ? 'تم طلب نسبة التحمل من المريض' : 'Co-Pay requested from patient', 'success');
provider-app/src/screens/lab/LabDashboard.tsx:398:      show(AR ? 'تم تأكيد الطلب المباشر' : 'Direct order confirmed', 'success');
provider-app/src/screens/lab/LabDashboard.tsx:411:      show(AR ? `تم تعيين ${techName}` : `Assigned ${techName}`, 'success');
provider-app/src/screens/lab/LabDashboard.tsx:426:      show(AR ? 'تم إعادة الجدولة بنجاح' : 'Rescheduled successfully', 'success');
provider-app/src/screens/lab/LabDashboard.tsx:441:      show(AR ? 'تم تسجيل العينة بنجاح ' : 'Sample registered successfully ', 'success');
provider-app/src/screens/lab/LabDashboard.tsx:630: show(AR ? 'بدأ التحليل ' : 'Analysis started ', 'success');
provider-app/src/screens/lab/LabDashboard.tsx:743:   show(AR ? ' تم إرفاق ملف الـ PDF بنجاح!' : ' PDF report attached successfully!', 'success');
provider-app/src/screens/lab/LabDashboard.tsx:819:            <NBtn label={AR?'حفظ كمسودة (للفني)':'Save Draft (Tech)'} variant="secondary" onPress={() => show(AR?'تم الحفظ كمسودة':'Draft Saved', 'success')} style={{flex:2}} />
provider-app/src/screens/lab/LabDashboard.tsx:827:            show(AR ? 'تم النشر بنجاح' : 'Published Successfully', 'success');
provider-app/src/screens/lab/LabDashboard.tsx:850:              show(AR ? 'تم رفض العينة وإشعار المريض بطلب إعادة السحب مجاناً' : 'Sample rejected. Patient notified for free recollection.', 'success');
provider-app/src/screens/lab/LabDashboard.tsx:884: show(AR ? 'تم إرسال النتيجة' : 'Result sent', 'success');
provider-app/src/screens/lab/LabDashboard.tsx:955: <Switch value={b.active} onValueChange={()=>show(AR?'تم التحديث':'Updated','success')} trackColor={{false:theme.border,true:'#9C27B0'}} thumbColor="#FFF" />
provider-app/src/screens/lab/LabDashboard.tsx:1013:    show(AR?'تم الإرسال للمراجعة':'Submitted for review','success');
provider-app/src/screens/lab/LabDashboard.tsx:1082:              show(AR ? 'تم الوصول بنجاح' : 'Arrived successfully', 'success');
provider-app/src/screens/lab/LabDashboard.tsx:1103:            show(AR ? 'تم تسجيل الحالة' : 'Status logged', 'info');
provider-app/src/screens/lab/LabDashboard.tsx:1108:            show(AR ? 'تم تسجيل الحالة' : 'Status logged', 'info');
provider-app/src/screens/lab/LabDashboard.tsx:1114:            show(AR ? 'تم الإلغاء وجاري التعيين' : 'Cancelled & Reassigning', 'success');
provider-app/src/screens/lab/LabDashboard.tsx:1141:                    show(AR ? `تم تعيين ${col.name}` : `${col.name} assigned`, 'success');
provider-app/src/screens/lab/LabDashboard.tsx:1176: <NBtn label={AR?'حفظ كصورة':'Save as Image'} variant="outline" onPress={()=>show(AR?'تم الحفظ':'Saved','success')} />
provider-app/src/screens/lab/LabDashboard.tsx:1261: show(AR ? 'تم التحديث بنجاح' : 'Updated successfully', 'success');
provider-app/src/screens/lab/LabDashboard.tsx:1528:      show(AR ? 'تم إرسال التعديلات للمراجعة' : 'Changes sent for review', 'success');
provider-app/src/screens/lab/LabDashboard.tsx:1552:      show(AR ? 'تم إرسال طلب الإضافة للمراجعة' : 'Add request sent for review', 'success');
provider-app/src/screens/lab/LabRegistration.tsx:378:              show(AR ? 'تم إرفاق المستند' : 'Document attached', 'success');
provider-app/src/screens/lab/LabRegistration.tsx:388:              show(AR ? 'تم إرفاق المستند' : 'Document attached', 'success');
provider-app/src/screens/lab/LabRegistration.tsx:398:              show(AR ? 'تم إرفاق المستند' : 'Document attached', 'success');
provider-app/src/screens/lab/LabRegistration.tsx:1583:      .then(() => show(AR ? 'تم إرسال رمز التحقق إلى بريدك الإلكتروني' : 'Verification code sent to your email', 'success'))
provider-app/src/screens/lab/LabRegistration.tsx:1664:      show(AR ? 'تم إرسال الطلب وملحقاته بنجاح!' : 'Registration Submitted!', 'success');
provider-app/src/screens/lab/LabRegistration.tsx:1813:      <OtpModal visible={showOtp} onClose={() => setShowOtp(false)} target={data.managerEmail} onVerify={async (code) => { const ok = await handleVerifyOtp(code); if(ok) { setShowOtp(false); finishSubmit(); return true; } return false; }} onResend={() => sendEmailOtp(data.managerEmail).then(() => show(AR ? 'أُعيد إرسال الرمز' : 'Code resent', 'success')).catch(() => show(AR ? 'تعذر الإرسال — انتظر قليلاً' : 'Could not resend — wait a moment', 'error'))} />
provider-app/src/screens/ambulance/AmbulanceRegistration.tsx:230:      show(AR ? 'تم إرسال الطلب بنجاح! سيظهر للمرضى بعد اعتماد الإدارة' : 'Submitted! Visible to patients after admin approval', 'success');
provider-app/src/screens/ambulance/AmbulanceDashboard.tsx:64:      show(AR ? 'تم قبول المهمة — انطلق' : 'Mission claimed — go!', 'success');
provider-app/src/screens/ambulance/AmbulanceDashboard.tsx:265:      show(AR ? 'تم التسليم للمستشفى' : 'Handed over to hospital', 'success');
provider-app/src/screens/ambulance/AmbulanceDashboard.tsx:321:      show(AR ? 'اكتملت المهمة — أحسنت' : 'Mission completed — well done', 'success');
provider-app/src/screens/shared/RegistrationSuccess.tsx:27:      show(AR ? 'تم إرسال رمز التحقق إلى بريدك الإلكتروني' : 'Verification code sent to email', 'success');
provider-app/src/screens/shared/RegistrationSuccess.tsx:43:        show(AR ? 'تم تأكيد البريد الإلكتروني بنجاح' : 'Email verified successfully', 'success');
provider-app/src/screens/shared/RegistrationSuccess.tsx:68:      show(AR ? 'تم حفظ العقد بنجاح' : 'Contract saved successfully', 'success');
provider-app/src/screens/shared/RealScreens.tsx:28:      show(AR ? 'تم إرسال الرد بنجاح' : 'Reply sent successfully', 'success');
provider-app/src/screens/shared/RealScreens.tsx:161:      show(AR ? 'تم حفظ أوقات العمل بنجاح' : 'Working hours saved successfully', 'success');
provider-app/src/screens/shared/RealScreens.tsx:242:      show(AR ? 'تم تغيير كلمة المرور بنجاح' : 'Password changed successfully', 'success');
provider-app/src/screens/shared/RealScreens.tsx:374:      show(AR ? 'تم فتح تذكرة دعم فني جديدة بنجاح' : 'Support ticket created', 'success');
provider-app/src/screens/shared/InsuranceRequestsScreen.tsx:94:      show(AR ? 'تم إرسال القرار للمريض' : 'Decision sent to patient', 'success');
provider-app/src/screens/shared/BlueprintScreens.tsx:143: show(AR ? 'تم إرسال العرض للمراجعة بنجاح ' : 'Promotion sent for review successfully ', 'success');
provider-app/src/screens/shared/BlueprintScreens.tsx:181: show(AR ? 'تم حفظ إعدادات الموقع بنجاح' : 'Public site configuration saved', 'success');
provider-app/src/screens/shared/BlueprintScreens.tsx:205: <TouchableOpacity onPress={() => show(AR ? 'تم النسخ إلى الحافظة ' : 'Copied to clipboard ', 'success')}>
provider-app/src/screens/shared/BlueprintScreens.tsx:258: show(AR ? 'تم إرسال طلب الحملة الإعلانية — ستُفعّل بعد مراجعة الإدارة' : 'Ad campaign submitted — goes live after admin review', 'success');
provider-app/src/screens/shared/BlueprintScreens.tsx:339: <NBtn label={AR ? ' نسخ الكود' : ' Copy Code'} variant="outline" onPress={() => show(AR ? 'تم النسخ' : 'Copied', 'success')} />
provider-app/src/screens/shared/BlueprintScreens.tsx:610: show(AR ? 'تم حفظ تفاصيل العميل بنجاح' : 'Patient CRM updated successfully', 'success');
provider-app/src/screens/shared/BlueprintScreens.tsx:838:     show(AR ? 'تم حفظ التقرير الطبي بنجاح' : 'Clinical SOAP note saved', 'success');
provider-app/src/screens/shared/BlueprintScreens.tsx:988:        show(AR ? 'تم تسجيل الإحالة الخارجية في سجل التدقيق.' : 'Outbound override logged in Audit Trails.', 'warning');
provider-app/src/screens/shared/BlueprintScreens.tsx:991:      show(AR ? 'تم إصدار كود التحويل الموحد' : 'Outbound Referral Code Generated', 'success');
provider-app/src/screens/shared/BlueprintScreens.tsx:1001:    show(AR ? 'تم توجيه الإحالة للمختبر الداخلي بنجاح' : 'Referral routed to Internal Lab successfully', 'success');
provider-app/src/screens/shared/BlueprintScreens.tsx:1118:     show(AR ? 'تم إرسال نداء الاستغاثة لمركز التحكم' : 'SOS Sent to Command Center', 'success');
provider-app/src/screens/shared/BlueprintScreens.tsx:1130:     show(AR ? 'تم قبول النداء — الحالة الآن مسندة إليك' : 'SOS claimed — case assigned to you', 'success');
provider-app/src/screens/shared/BlueprintScreens.tsx:1215:     show(AR ? 'تم بدء الرحلة — موقعك يُبث للمريض والمركز' : 'Trip started — your position is streamed', 'success');
provider-app/src/screens/shared/BlueprintScreens.tsx:1223:   show(AR ? 'تم تسجيل الوصول للمريض بنجاح' : 'Arrival logged', 'success');
provider-app/src/screens/shared/BlueprintScreens.tsx:1352:      show(AR ? 'بدأ تحليل العينة' : 'Sample analysis started', 'success');
provider-app/src/screens/shared/RealScreensExtended.tsx:231:      show(AR ? 'تم إرسال الصنف لمراجعة الإدارة واعتماده' : 'Product submitted for admin review and approval', 'success');
provider-app/src/screens/shared/RealScreensExtended.tsx:348:      show(AR ? 'تم إرسال البلاغ للإدارة — سيصلك الرد عبر الدعم' : 'Report sent to admin — you will be answered via support', 'success');
provider-app/src/screens/shared/SharedScreens.tsx:301: const markAllRead = () => { setNotifs(prev => prev.map(n => ({ ...n, read: true }))); show(AR ? 'تم قراءة الكل' : 'All marked read', 'success'); };
provider-app/src/screens/shared/SharedScreens.tsx:429:     show(AR ? 'تم إرسال التذكرة — سنرد خلال 24 ساعة' : 'Ticket submitted — reply within 24h', 'success');
provider-app/src/screens/shared/SharedScreens.tsx:466: value={twoFA} onChange={v => { setTwoFA(v); show(v ? (AR ? 'تم تفعيل 2FA' : '2FA enabled') : (AR ? 'تم تعطيل 2FA' : '2FA disabled'), v ? 'success' : 'info'); }} />
provider-app/src/screens/shared/SharedScreens.tsx:472: value={biometric} onChange={v => { setBiometric(v); show(v ? (AR ? 'تم التفعيل' : 'Enabled') : (AR ? 'تم التعطيل' : 'Disabled'), 'success'); }} />
provider-app/src/screens/shared/SharedScreens.tsx:488: <TouchableOpacity onPress={() => show(AR ? 'تم إزالة الجهاز' : 'Device removed', 'success')}>
provider-app/src/screens/shared/SharedScreens.tsx:745: onPress={() => { setCalling(false); clearInterval(timerRef.current); show(AR ? `انتهت المكالمة — المدة: ${fmt(elapsed)}` : `Call ended — ${fmt(elapsed)}`, 'success'); setElapsed(0); }} />
provider-app/src/screens/shared/SharedScreens.tsx:893: show(AR ? 'تم إرسال الرد' : 'Reply sent', 'success');
provider-app/src/screens/shared/SharedScreens.tsx:918: value={autoReply} onChange={v => { setAutoReply(v); show(v ? (AR ? 'تم التفعيل' : 'Enabled') : (AR ? 'تم التعطيل' : 'Disabled'), 'success'); }} />
provider-app/src/screens/shared/SharedScreens.tsx:1386:      show(AR ? 'تم نشر الإعلان بنجاح' : 'Posted successfully', 'success');
provider-app/src/screens/shared/SharedScreens.tsx:1400:      show(AR ? 'جاري تحويلك للواتساب...' : 'Opening WhatsApp...', 'success');
provider-app/src/screens/shared/SharedScreens.tsx:1415:      show(AR ? 'تم إرسال طلبك لصاحب العمل بنجاح' : 'Application sent to employer', 'success');
provider-app/src/screens/shared/SharedScreens.tsx:1541:          <TouchableOpacity onPress={() => setApplyCV(true)} style={{ backgroundColor: applyCV ? theme.successBg : theme.surface2, padding: SP.xl, borderRadius: R.lg, borderWidth: 2, borderColor: applyCV ? theme.success : theme.border, borderStyle: applyCV ? 'solid' : 'dashed', alignItems: 'center', gap: SP.sm }}>
provider-app/src/screens/shared/SharedScreens.tsx:1577:          <NBtn label={AR ? 'تنزيل السيرة الذاتية (Download CV)' : 'Download CV'} onPress={() => show(AR ? 'جاري تحميل السيرة الذاتية...' : 'Downloading CV...', 'success')} style={{ marginTop: SP.lg }} />
provider-app/src/screens/shared/SharedScreens.tsx:1679:            <TouchableOpacity onPress={() => setPostType('request')} style={{ flex: 1, padding: SP.xl, borderRadius: R.lg, borderWidth: 2, borderColor: postType === 'request' ? theme.success : theme.border, backgroundColor: postType === 'request' ? theme.successBg : theme.surface, alignItems: 'center' }}>
provider-app/src/screens/shared/SharedScreens.tsx:1949:     show(AR ? 'تم إرسال الاقتراح — بانتظار موافقة الإدارة' : 'Suggestion sent — pending admin approval', 'success');
provider-app/src/screens/shared/SharedScreens.tsx:1989:     show(AR ? 'تم إرسال الصورة المقترحة — بانتظار موافقة الإدارة' : 'Image suggestion sent — pending admin approval', 'success');
provider-app/src/screens/shared/SharedScreens.tsx:2510:     show(AR ? 'تم إرسال التعديلات — تُطبق بعد اعتماد الإدارة' : 'Changes sent — applied after admin approval', 'success');
provider-app/src/screens/shared/SharedScreens.tsx:2634: show(AR ? 'تم رفع المستند وهو الآن قيد مراجعة الإدارة' : 'Document uploaded and is now under admin review', 'success');
provider-app/src/screens/shared/SharedScreens.tsx:2650: case 'under_review': return { label: AR ? 'قيد المراجعة' : 'Under Review', variant: 'primary' as const };
provider-app/src/screens/shared/SharedScreens.tsx:2821:     show(AR ? 'تم إرسال طلب الحذف — يسري بعد اعتماد الإدارة' : 'Deletion submitted — effective after admin approval', 'info');
provider-app/src/screens/shared/SharedScreens.tsx:2851:     show(AR ? 'تم رفع الصورة — تظهر نهائياً بعد اعتماد الإدارة' : 'Photo uploaded — final after admin approval', 'success');
provider-app/src/screens/shared/SharedScreens.tsx:3058:    show(val ? (AR ? 'تم تفعيل الدخول بالبصمة' : 'Face ID Enabled') : (AR ? 'تم إيقاف الدخول بالبصمة' : 'Face ID Disabled'), 'success');
provider-app/src/screens/shared/FleetScreen.tsx:67:              show(AR ? 'حُذفت المركبة' : 'Vehicle removed', 'success');
provider-app/src/screens/shared/FleetScreen.tsx:171:      show(AR ? 'أُضيفت المركبة — بانتظار اعتماد الإدارة' : 'Vehicle added — pending admin approval', 'success');
provider-app/src/screens/nursing/NursingDashboard.tsx:144:               show(AR ? 'تم قبول الطلب بنجاح' : 'Request accepted successfully', 'success');
provider-app/src/screens/nursing/NursingDashboard.tsx:154:               show(AR ? 'تم رفض الطلب' : 'Request rejected', 'info');
provider-app/src/screens/nursing/NursingDashboard.tsx:425: show(AR ? 'تم قبول الطلب بنجاح' : 'Order accepted successfully', 'success');
provider-app/src/screens/nursing/NursingDashboard.tsx:436: show(AR ? 'تم رفض الطلب' : 'Order rejected', 'success');
provider-app/src/screens/nursing/NursingDashboard.tsx:604: show(AR ? 'بدأت الرحلة — تتبع الـ GPS نشط' : 'Trip started — GPS tracking active', 'success');
provider-app/src/screens/nursing/NursingDashboard.tsx:621: show(AR ? 'تم تسجيل الوصول — الموقع مؤكد' : 'Checked in — location verified', 'success');
provider-app/src/screens/nursing/NursingDashboard.tsx:672: show(AR?`انتهت الزيارة — المدة: ${fmt(elapsed)}`:`Visit ended — Duration: ${fmt(elapsed)}`,'success');
provider-app/src/screens/nursing/NursingDashboard.tsx:714: show(AR ? 'تم إنشاء خطة الرعاية' : 'Care plan created', 'success');
provider-app/src/screens/nursing/NursingDashboard.tsx:809:     show(AR?'تم حفظ الملاحظة':'Note saved','success');
provider-app/src/screens/nursing/NursingDashboard.tsx:877: show(AR ? 'تم إرسال تقرير الزيارة بنجاح وإنهاء الحجز' : 'Visit report submitted and booking closed', 'success');
provider-app/src/screens/nursing/NursingDashboard.tsx:935: show(AR?'تم حفظ التوقيع بنجاح':'Signature saved successfully', 'success');
provider-app/src/screens/nursing/NursingDashboard.tsx:964: show(AR ? 'تم طلب المستلزم من مخزن المستشفى بنجاح' : 'Supply requested from hospital inventory', 'success');
provider-app/src/screens/nursing/NursingDashboard.tsx:1048: show(AR ? 'تم إرسال طلب السحب للمراجعة' : 'Withdrawal request submitted for review', 'success');
provider-app/src/screens/nursing/NursingDashboard.tsx:1120:      show(AR ? 'بانتظار موافقة الإدارة على التعديلات' : 'Pending admin approval for changes', 'success');
provider-app/src/screens/nursing/NursingDashboard.tsx:1217:   show(AR ? 'بانتظار موافقة الإدارة على التعديلات' : 'Pending admin approval for changes', 'success');
provider-app/src/screens/nursing/NursingDashboard.tsx:1314:   show(AR ? 'بانتظار موافقة الإدارة على التعديلات' : 'Pending admin approval for changes', 'success');
provider-app/src/screens/nursing/NursingDashboard.tsx:1404:   show(AR ? ' تم تحديد موقع الـ GPS بنجاح والتحقق من التغطية الإقليمية!' : ' GPS location and regional coverage verified successfully!', 'success');
provider-app/src/screens/nursing/NursingDashboard.tsx:1472:      show(AR ? 'بانتظار موافقة الإدارة على التعديلات' : 'Pending admin approval for changes', 'success');
provider-app/src/screens/nursing/NursingDashboard.tsx:1539: show(AR ? 'تم حفظ التعديلات بنجاح' : 'Profile updated successfully', 'success');
provider-app/src/screens/nursing/NursingDashboard.tsx:1563: show(AR ? 'تم تحديث الصورة الشخصية' : 'Profile picture updated', 'success');
provider-app/src/screens/nursing/NursingDashboard.tsx:1678:      show(AR ? 'تم حفظ إعدادات الجدول' : 'Schedule saved', 'success');
provider-app/src/screens/nursing/NursingFieldOps.tsx:69:      show(AR ? 'تم تحديث الحالة بنجاح' : 'State updated successfully', 'success');
provider-app/src/screens/nursing/NursingRegistration.tsx:274:              show(AR ? 'تم إرفاق المستند' : 'Document attached', 'success');
provider-app/src/screens/nursing/NursingRegistration.tsx:284:              show(AR ? 'تم إرفاق المستند' : 'Document attached', 'success');
provider-app/src/screens/nursing/NursingRegistration.tsx:294:              show(AR ? 'تم إرفاق المستند' : 'Document attached', 'success');
provider-app/src/screens/nursing/NursingRegistration.tsx:809:      .then(() => show(AR ? 'تم إرسال رمز التحقق إلى بريدك الإلكتروني' : 'Verification code sent to your email', 'success'))
provider-app/src/screens/nursing/NursingRegistration.tsx:879:      show(AR ? 'تم إرسال الطلب وملحقاته بنجاح!' : 'Registration Submitted!', 'success');
provider-app/src/screens/nursing/NursingRegistration.tsx:1002:      <OtpModal visible={showOtp} onClose={() => setShowOtp(false)} target={data.managerEmail || data.email} onVerify={async (code) => { const ok = await handleVerifyOtp(code); if (ok) { setShowOtp(false); finishSubmit(); return true; } return false; }} onResend={() => sendEmailOtp(data.managerEmail || data.email).then(() => show(AR ? 'أُعيد إرسال الرمز' : 'Code resent', 'success')).catch(() => show(AR ? 'تعذر الإرسال — انتظر قليلاً' : 'Could not resend — wait a moment', 'error'))} />
provider-app/src/screens/radiology/RadiologyRegistration.tsx:378:              show(AR ? 'تم إرفاق المستند' : 'Document attached', 'success');
provider-app/src/screens/radiology/RadiologyRegistration.tsx:388:              show(AR ? 'تم إرفاق المستند' : 'Document attached', 'success');
provider-app/src/screens/radiology/RadiologyRegistration.tsx:398:              show(AR ? 'تم إرفاق المستند' : 'Document attached', 'success');
provider-app/src/screens/radiology/RadiologyRegistration.tsx:1583:      .then(() => show(AR ? 'تم إرسال رمز التحقق إلى بريدك الإلكتروني' : 'Verification code sent to your email', 'success'))
provider-app/src/screens/radiology/RadiologyRegistration.tsx:1664:      show(AR ? 'تم إرسال الطلب وملحقاته بنجاح!' : 'Registration Submitted!', 'success');
provider-app/src/screens/radiology/RadiologyRegistration.tsx:1813:      <OtpModal visible={showOtp} onClose={() => setShowOtp(false)} target={data.managerEmail} onVerify={async (code) => { const ok = await handleVerifyOtp(code); if(ok) { setShowOtp(false); finishSubmit(); return true; } return false; }} onResend={() => sendEmailOtp(data.managerEmail).then(() => show(AR ? 'أُعيد إرسال الرمز' : 'Code resent', 'success')).catch(() => show(AR ? 'تعذر الإرسال — انتظر قليلاً' : 'Could not resend — wait a moment', 'error'))} />
provider-app/src/screens/radiology/RadiologyDashboard.tsx:94:      setStats({ todayCount: data.length, inScanCount: data.filter(o => o.state === 'IN_SCANNING').length, completedCount: data.filter(o => o.state === 'REPORT_READY').length, revenue: data.reduce((acc, cur) => acc + (cur.total || 0), 0) });
provider-app/src/screens/radiology/RadiologyDashboard.tsx:95:    } catch { setOrders([]); setStats({ todayCount: 0, inScanCount: 0, completedCount: 0, revenue: 0 }); } finally { setLoading(false); }
provider-app/src/screens/radiology/RadiologyDashboard.tsx:197:    try { await client.post(`/radiology/bookings/${currentOrder.id}/${action}`, body || {}); show(AR ? 'تم بنجاح' : 'Done', 'success'); await refresh(); }
provider-app/src/screens/radiology/RadiologyDashboard.tsx:205:    try { await client.post(`/radiology/bookings/${currentOrder.id}/insurance-approval`, { approval_code: nphiesCode, copay: parseFloat(copay) || 0 }); show(AR ? 'تم إرسال التأمين للمريض' : 'Insurance approval sent', 'success'); setShowNphies(false); await refresh(); }
provider-app/src/screens/radiology/RadiologyDashboard.tsx:212:    try { await client.post(`/radiology/bookings/${currentOrder.id}/abort`, { reason: abortReason }); show(AR ? 'تم إلغاء الفحص وإنشاء طلب استرداد' : 'Scan aborted. Refund ticket created.', 'info'); setShowAbort(false); await refresh(); }
provider-app/src/screens/radiology/RadiologyDashboard.tsx:229:      show(AR ? 'تمت إعادة الجدولة بنجاح' : 'Rescheduled successfully', 'success');
provider-app/src/screens/radiology/RadiologyDashboard.tsx:270:          <NBtn label={AR?' تأكيد الطلب (كاش)':' Confirm Order (Cash)'} loading={loading} onPress={async () => { setLoading(true); try { await client.patch(`/radiology/bookings/${currentOrder.id}/state`, { state:'CONFIRMED', note:'Cash confirmed' }); show(AR?'تم التأكيد':'Confirmed','success'); await refresh(); } catch(e:any){show(e.message,'error');} finally{setLoading(false);} }} />
provider-app/src/screens/radiology/RadiologyDashboard.tsx:272:          <NBtn label={AR?' رفض الطلب':' Decline Order'} variant="danger" loading={loading} onPress={async () => { setLoading(true); try { await client.patch(`/radiology/bookings/${currentOrder.id}/state`, { state:'CANCELLED', note:'Rejected by center' }); show(AR?'تم الرفض':'Declined','info'); onBack(); } catch(e:any){show(e.message,'error');} finally{setLoading(false);} }} />
provider-app/src/screens/radiology/RadiologyDashboard.tsx:340:      show(AR ? 'تم رفع التقرير — المسودة جاهزة' : 'Report uploaded — Draft ready', 'success');
provider-app/src/screens/radiology/RadiologyDashboard.tsx:347:    try { await client.post(`/radiology/bookings/${order.id}/submit-report-for-review`, {}); setReportStatus('under_review'); show(AR ? 'تم الإرسال للمراجعة' : 'Sent for review', 'success'); }
provider-app/src/screens/radiology/RadiologyDashboard.tsx:353:    try { await client.post(`/radiology/bookings/${order.id}/approve-report`, {}); setReportStatus('ready'); show(AR?'تم نشر التقرير للمريض':'Report published','success'); onBack(); }
provider-app/src/screens/radiology/RadiologyDashboard.tsx:357:  const STEPS = [{ key: 'draft', ar: 'رفع الملفات', en: 'Upload' }, { key: 'under_review', ar: 'مراجعة', en: 'Review' }, { key: 'ready', ar: 'نُشر', en: 'Published' }];
provider-app/src/screens/radiology/RadiologyDashboard.tsx:385:        <NBtn label={AR?' رفع صور الأشعة (JPEG/PNG)':' Upload Scan Images (JPEG/PNG)'} variant="outline" loading={loading} onPress={() => show(AR?'سيتم دعمه مع تكامل S3':'Coming with S3 integration','info')} />
provider-app/src/screens/radiology/RadiologyDashboard.tsx:389:      {reportStatus ==='under_review' && <NBtn label={AR?' اعتماد وإرسال للمريض':' Approve & Publish to Patient'} loading={loading} onPress={handleApproveAndPublish} style={{ backgroundColor:'#4CAF50', marginBottom: SP.md }} />}
provider-app/src/screens/radiology/RadiologyDashboard.tsx:431:      show(AR ? 'تم إرسال طلب الإضافة للمراجعة الإدارية' : 'Add request sent for admin review', 'success');
provider-app/src/screens/radiology/RadiologyDashboard.tsx:502:    try { await client.post('/radiology/catalog/delta-request', { type: 'schedule_update', working_days: workingDays, morning_shift: { from: morningFrom, to: morningTo }, evening_shift: { from: eveningFrom, to: eveningTo }, emergency_available: emergencyAvailable }); show(AR ? 'تم حفظ الجدول وإرساله للمراجعة' : 'Schedule saved and sent for review', 'success'); }
provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:258:        show(AR ? 'تم قبول الطلب بنجاح!' : 'Order accepted successfully!', 'success');
provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:277:      show(AR ? 'تم رفض الطلب' : 'Order rejected', 'info');
provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:388:        show(AR ? 'لم يتم العثور على وصفة بهذا الرقم ضمن طلبات صيدليتك' : 'No prescription with this number was found in your pharmacy orders', 'error');
provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:406:      show(AR ? 'تم تأكيد الصرف — الطلب جاهز للتسليم' : 'Dispense confirmed — order is ready for handover', 'success');
provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:583:      show(AR ? 'تم إرسال طلب عرض السعر للإدارة — سيصلك الرد هنا' : 'Quote request sent to admin', 'success');
provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:1030:      show(AR ? 'تم خروج الطلب للتوصيل' : 'Order out for delivery', 'success');
provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:1047:      show(AR ? 'تم تأكيد التوصيل بنجاح' : 'Delivery confirmed', 'success');
provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:1220:      show(AR ? `تم تسجيل قرار التأمين — التحمل: ${realCopay} ريال` : `Insurance recorded — Copay: ${realCopay}`, 'success');
provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:1234:    show(AR ? 'تمت إضافة البديل' : 'Substitute added', 'success');
provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:1240:      show(AR ? 'تم إرسال السلة للمريض للمراجعة' : 'Basket sent to patient for review', 'success');
provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:1365:        <NBtn label={AR ? 'محاكاة مسح دواء' : 'Simulate Drug Scan'} onPress={() => { show(AR ? 'تم التعرف: Paracetamol 500mg' : 'Detected: Paracetamol 500mg', 'success'); onBack(); }} />
provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:1386:            <NBtn label={AR?'قبول الطلب وتجهيز الدواء':'Accept Order'} size="sm" onPress={() => show(AR?'تم قبول الطلب وتنبيه المريض':'Order accepted','success')} style={{ flex: 1 }} />
provider-app/src/screens/pharmacy/PharmacyDashboard.tsx:1672:      show(AR ? 'بانتظار موافقة الإدارة على التعديلات' : 'Pending admin approval for changes', 'success');
provider-app/src/screens/pharmacy/PharmacyRegistration.tsx:251:              show(AR ? 'تم إرفاق المستند' : 'Document attached', 'success');
provider-app/src/screens/pharmacy/PharmacyRegistration.tsx:261:              show(AR ? 'تم إرفاق المستند' : 'Document attached', 'success');
provider-app/src/screens/pharmacy/PharmacyRegistration.tsx:271:              show(AR ? 'تم إرفاق المستند' : 'Document attached', 'success');
provider-app/src/screens/pharmacy/PharmacyRegistration.tsx:796:      show(AR ? 'تم إرسال الطلب وملحقاته بنجاح!' : 'Registration Submitted!', 'success');
provider-app/src/screens/pharmacy/PharmacyRegistration.tsx:813:      .then(() => show(AR ? 'تم إرسال رمز التحقق إلى بريدك الإلكتروني' : 'Verification code sent to your email', 'success'))
provider-app/src/screens/pharmacy/PharmacyRegistration.tsx:913:      <OtpModal visible={showOtp} onClose={() => setShowOtp(false)} target={data.managerEmail || data.email} onVerify={async (code) => { const ok = await handleVerifyOtp(code); if(ok) { setShowOtp(false); finishSubmit(); return true; } return false; }} onResend={() => sendEmailOtp(data.managerEmail || data.email).then(() => show(AR ? 'أُعيد إرسال الرمز' : 'Code resent', 'success')).catch(() => show(AR ? 'تعذر الإرسال — انتظر قليلاً' : 'Could not resend — wait a moment', 'error'))} />
provider-app/src/components/ui.tsx:926: show(AR ? 'تم تحسين وتحديث الصورة بنجاح! ' : 'Profile photo optimized successfully! ', 'success');
## Interpretation
Input-field placeholders such as example IBAN, name, address, time, and document formats are intentional UX hints and are not classified as mock data. Fixed storage URLs, locally generated IDs, and toast-only terminal claims remain OPEN until backend/storage evidence is proven.
