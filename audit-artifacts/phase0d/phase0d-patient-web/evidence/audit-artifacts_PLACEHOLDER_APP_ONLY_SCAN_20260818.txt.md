# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PLACEHOLDER_APP_ONLY_SCAN_20260818.txt`
- **Member SHA-256:** `bd2a7854932103877a347b23f8c390772cb242225a4559977a02e8a868b2c252`
- **Line count:** 402
- **Read range:** `1-402`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: provider-app/src/screens/doctor/DoctorDashboard.tsx:419:  <NInput label={AR ? 'نسبة تحمل المريض (SAR)' : 'Patient Co-Pay (SAR)'} value={patientCopay} onChange={setPatientCopay} kbType="numeric" placeholder="e.g. 50" icon="" />`
- `4: provider-app/src/screens/doctor/DoctorDashboard.tsx:420:  <NInput label={AR ? 'تحمل شركة التأمين (SAR)' : 'Insurance Coverage (SAR)'} value={insuranceCoverage} onChange={setInsuranceCoverage} kbType="numeric" placeholder="e.g. 150" icon="" `
- `5: provider-app/src/screens/doctor/DoctorDashboard.tsx:421:  <NInput label={AR ? 'رقم الموافقة المرجعي (Approval Code)' : 'Approval Code'} value={approvalCode} onChange={setApprovalCode} placeholder="e.g. NPH-9213" icon="" />`
- `6: provider-app/src/screens/doctor/DoctorDashboard.tsx:792:            <TextInput style={{ flex: 1, backgroundColor: theme.surface2, borderRadius: R.full, paddingHorizontal: SP.md, paddingVertical: SP.sm, color: theme.text, textAlign: AR ? 'ri`
- `7: provider-app/src/screens/doctor/DoctorDashboard.tsx:990: <NInput label={AR ? 'الجرعة' : 'Dosage'} placeholder={AR ? 'مثال: قرص واحد' : 'e.g., 1 tablet'}`
- `8: provider-app/src/screens/doctor/DoctorDashboard.tsx:1035: placeholder={AR ? 'مثال: تناول الدواء بعد الأكل، الإكثار من الماء...' : 'e.g., Take with food, drink plenty of water...'}`
- `9: provider-app/src/screens/doctor/DoctorDashboard.tsx:1070: <NSearch value={search} onChange={setSearch} placeholder={AR ? 'اسم الدواء...' : 'Medication name...'} />`
- `10: provider-app/src/screens/doctor/DoctorDashboard.tsx:1109: <NInput label={AR ? 'اسم النموذج' : 'Template Title'} value={templateName} onChange={setTemplateName} placeholder={AR ? 'مثال: نموذج علاج الربو' : 'e.g., Asthma Treatment'} />`
- `11: provider-app/src/screens/doctor/DoctorDashboard.tsx:1176: <NInput label={AR ? 'التشخيص' : 'Diagnosis'}  placeholder={AR ? 'سبب الإجازة الطبية' : 'Medical reason for leave'}`
- `12: provider-app/src/screens/doctor/DoctorDashboard.tsx:1179: <NInput label={AR ? 'تاريخ البداية' : 'Start Date'} placeholder="YYYY-MM-DD"`
- `13: provider-app/src/screens/doctor/DoctorDashboard.tsx:1311:  placeholder={AR ? 'اشرح سبب التحويل ومعلومات ذات صلة...' : 'Explain the reason and relevant information...'}`
- `14: provider-app/src/screens/doctor/DoctorDashboard.tsx:1671: placeholder={AR ? 'أضف وسماً (مثال: متعاون، مدخن)' : 'Add tag (e.g. Cooperative, Smoker)'}`
### backend_consumers_or_contracts
- `77: provider-app/src/screens/auth/AuthScreens.tsx:460: placeholder={AR ? 'example@email.com أو 05X...' : 'example@email.com or 05X...'}`
- `78: provider-app/src/screens/auth/AuthScreens.tsx:466: placeholder="••••••••"`
- `79: provider-app/src/screens/auth/AuthScreens.tsx:550:         placeholder="e.g. 192.168.1.10"`
- `80: provider-app/src/screens/auth/AuthScreens.tsx:713: placeholder="example@email.com"`
- `81: provider-app/src/screens/auth/AuthScreens.tsx:737: placeholder="••••••••"`
- `82: provider-app/src/screens/auth/AuthScreens.tsx:745: placeholder="••••••••"`
- `83: provider-app/src/screens/auth/PendingDashboard.tsx:99:                  placeholder="123456"`
- `99: provider-app/src/screens/lab/LabDashboard.tsx:849:              await client.patch(`/labs/samples/${sample.id}/stage`, { stage: 'sample_rejected', reason: rejectReason });`
- `154: provider-app/src/screens/shared/InsuranceRequestsScreen.tsx:230:                  placeholder="20"`
- `155: provider-app/src/screens/shared/InsuranceRequestsScreen.tsx:231:                  placeholderTextColor={theme.textHint}`
- `156: provider-app/src/screens/shared/InsuranceRequestsScreen.tsx:254:                  placeholder={AR ? 'مثال: الخدمة غير مغطاة في وثيقتك' : 'e.g. Service not covered by your policy'}`
- `157: provider-app/src/screens/shared/InsuranceRequestsScreen.tsx:255:                  placeholderTextColor={theme.textHint}`
### auth_ownership
- `37: provider-app/src/screens/doctor/DoctorRegistration.tsx:1033:              placeholder={AR ? 'مثل: مالك، مدير عام' : 'e.g., Owner, General Manager'}`
- `48: provider-app/src/screens/facility/FacilityRegistration.tsx:1111:<NInput value={data.signerRole} onChange={v => update({ signerRole: v })} placeholder={AR ? 'مثال: المالك، المدير العام' : 'e.g. Owner, General Manager'} />`
- `68: provider-app/src/screens/facility/FacilityDashboard.tsx:1315: <NInput label={AR ? 'معرف المريض (Patient ID)' : 'Patient ID'} placeholder={AR ? 'أدخل معرف المريض...' : 'Enter patient ID...'} value={patientId} onChange={setPatientId} required`
- `73: provider-app/src/screens/facility/FacilityDashboard.tsx:2048: <NInput label={AR ? 'معرف المريض (Patient ID)' : 'Patient ID'} placeholder={AR ? 'أدخل معرف المريض...' : 'Enter patient ID...'} value={patientId} onChange={setPatientId} required`
- `139: provider-app/src/screens/lab/LabRegistration.tsx:1731:<NInput value={data.signerRole} onChange={v => update({ signerRole: v })} placeholder={AR ? 'مثال: المالك، المدير العام' : 'e.g. Owner, General Manager'} />`
- `168: provider-app/src/screens/shared/BlueprintScreens.tsx:1011: <NInput label={AR ? 'اسم أو رقم المريض' : 'Patient Name / ID'} value={patientId} onChange={setPatientId} placeholder={AR ? 'أدخل اسم المريض أو هويته...' : 'Enter patient name/ID...'`
- `197: provider-app/src/screens/shared/SharedScreens.tsx:2452: // as onboarding, the patient app and the admin dashboard) — never hardcoded.`
- `240: provider-app/src/screens/nursing/NursingRegistration.tsx:950:<NInput value={data.signerRole} onChange={v => update({ signerRole: v })} placeholder={AR ? 'مثال: المالك، المدير العام' : 'e.g. Owner, General Manager'} />`
- `276: provider-app/src/screens/radiology/RadiologyRegistration.tsx:1731:<NInput value={data.signerRole} onChange={v => update({ signerRole: v })} placeholder={AR ? 'مثال: المالك، المدير العام' : 'e.g. Owner, General Manager'} />`
- `315: provider-app/src/screens/pharmacy/PharmacyRegistration.tsx:886:<NInput value={data.signerRole} onChange={v => update({ signerRole: v })} placeholder={AR ? 'مثال: المالك، المدير التنفيذي' : 'e.g. Owner, CEO'} />`
- `336: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/admin-web-core/controllers/admin-extended-operations.controller.ts:19:  // deltas APPROVED with a placeholder instead of applying them. The canonical,`
- `341: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/auth/auth.service.ts:23:  // M0-01: hardcoded admin seeding removed from boot — use scripts/seed-admin.ts instead.`
### state_transitions
- `20: provider-app/src/screens/doctor/DoctorDashboard.tsx:2415: placeholder={AR ? 'اذكر الأعراض والفحوصات والنتائج...' : 'State symptoms, examinations and findings...'}`
- `83: provider-app/src/screens/auth/PendingDashboard.tsx:99:                  placeholder="123456"`
- `86: provider-app/src/screens/lab/LabQcActions.tsx:142:              <NBtn label={AR ? 'تأكيد الرفض' : 'Confirm Reject'} variant="danger" loading={busy === 'sample_rejected'}`
- `87: provider-app/src/screens/lab/LabQcActions.tsx:143:                onPress={async () => { setShowReject(false); qc('sample_rejected', { reason: rejectReason.trim() || 'unsuitable_sample' }); setRejectReason(''); }}`
- `99: provider-app/src/screens/lab/LabDashboard.tsx:849:              await client.patch(`/labs/samples/${sample.id}/stage`, { stage: 'sample_rejected', reason: rejectReason });`
- `148: provider-app/src/screens/shared/RegistrationSuccess.tsx:120:                  placeholder={AR ? 'أدخل الرمز المكون من 6 أرقام' : 'Enter 6-digit code'}`
- `162: provider-app/src/screens/shared/BlueprintScreens.tsx:668: <NInput label={AR ? 'سبب الحظر' : 'Block Reason'} value={blockReason} onChange={setBlockReason} placeholder={AR ? 'مثال: عدم الحضور المتكرر للمواعيد' : 'e.g. Frequent no-show'} />`
- `222: provider-app/src/screens/nursing/NursingRegistration.tsx:197:      <NInput innerRef={nameArRef} label={AR ? 'الاسم الكامل بالعربي' : 'Name (Arabic)'} placeholder={AR ? (data.mode === 'company' ? 'شركة نبضة للتمريض' : 'ممرض/ة محمد أحمد') : (`
- `224: provider-app/src/screens/nursing/NursingRegistration.tsx:221:      <NInput innerRef={emailRef} label={AR ? 'البريد الإلكتروني' : 'Email'} placeholder="nurse@email.com" value={data.managerEmail} onChange={v => update({ managerEmail: v.toLowe`
- `225: provider-app/src/screens/nursing/NursingRegistration.tsx:223:      <NInput innerRef={passwordRef} label={AR ? 'كلمة المرور' : 'Password'} placeholder="••••••••" value={data.password} onChange={v => update({ password: v })} secure required e`
- `226: provider-app/src/screens/nursing/NursingRegistration.tsx:225:      <NInput innerRef={confirmPassRef} label={AR ? 'تأكيد كلمة المرور' : 'Confirm Password'} placeholder="••••••••" value={data.confirmPass} onChange={v => update({ confirmPass: `
- `227: provider-app/src/screens/nursing/NursingRegistration.tsx:354:          <NInput label={AR ? 'رقم ترخيص SCFHS' : 'SCFHS License Number'} placeholder="123456" value={data.scfhsNumber} onChange={v => update({ scfhsNumber: v.replace(/\D/g, '') }`
### payment_insurance_relevance
- `3: provider-app/src/screens/doctor/DoctorDashboard.tsx:419:  <NInput label={AR ? 'نسبة تحمل المريض (SAR)' : 'Patient Co-Pay (SAR)'} value={patientCopay} onChange={setPatientCopay} kbType="numeric" placeholder="e.g. 50" icon="" />`
- `4: provider-app/src/screens/doctor/DoctorDashboard.tsx:420:  <NInput label={AR ? 'تحمل شركة التأمين (SAR)' : 'Insurance Coverage (SAR)'} value={insuranceCoverage} onChange={setInsuranceCoverage} kbType="numeric" placeholder="e.g. 150" icon="" `
- `41: provider-app/src/screens/facility/FacilityRegistration.tsx:625:                        <TextInput value={tempSub.testPrices?.[t.id] || ''} onChangeText={v => setTempSub({ ...tempSub, testPrices: { ...(tempSub.testPrices || {}), [t.id]: v } `
- `42: provider-app/src/screens/facility/FacilityRegistration.tsx:638:                      <TextInput value={tempSub.priceHome} onChangeText={v => setTempSub({...tempSub, priceHome: v})} placeholder={AR ? 'الرسوم (رس)' : 'Fee'} style={{ backgroun`
- `43: provider-app/src/screens/facility/FacilityRegistration.tsx:686:                        <TextInput value={tempSub.scanPrices?.[s.id] || ''} onChangeText={v => setTempSub({ ...tempSub, scanPrices: { ...(tempSub.scanPrices || {}), [s.id]: v } `
- `44: provider-app/src/screens/facility/FacilityRegistration.tsx:699:                      <TextInput value={tempSub.priceHome} onChangeText={v => setTempSub({...tempSub, priceHome: v})} placeholder={AR ? 'الرسوم (رس)' : 'Fee'} style={{ backgroun`
- `45: provider-app/src/screens/facility/FacilityRegistration.tsx:747:                        <TextInput value={tempSub.nursingPrices?.[s.id] || ''} onChangeText={v => setTempSub({ ...tempSub, nursingPrices: { ...(tempSub.nursingPrices||{}), [s.id`
- `46: provider-app/src/screens/facility/FacilityRegistration.tsx:760:                      <TextInput value={tempSub.priceHome} onChangeText={v => setTempSub({...tempSub, priceHome: v})} placeholder={AR ? 'الرسوم (رس)' : 'Fee'} style={{ backgroun`
- `70: provider-app/src/screens/facility/FacilityDashboard.tsx:1324: <NInput label={AR ? 'عدد الأسرّة' : 'Total Beds'} placeholder="10" value={wardBedsCount} onChange={setWardBedsCount} kbType="numeric" required />`
- `93: provider-app/src/screens/lab/LabDashboard.tsx:560:          <NInput label={AR ? 'نسبة التحمل (Co-Pay)' : 'Co-Pay SAR'} placeholder="0.00" value={copay} onChange={setCopay} icon="payments" kbType="numeric" />`
- `121: provider-app/src/screens/lab/LabRegistration.tsx:537:        placeholder="300XXXXXXXXX003" value={data.taxNumber}`
- `154: provider-app/src/screens/shared/InsuranceRequestsScreen.tsx:230:                  placeholder="20"`
### error_empty_loading_retry_cancel
- `83: provider-app/src/screens/auth/PendingDashboard.tsx:99:                  placeholder="123456"`
- `86: provider-app/src/screens/lab/LabQcActions.tsx:142:              <NBtn label={AR ? 'تأكيد الرفض' : 'Confirm Reject'} variant="danger" loading={busy === 'sample_rejected'}`
- `220: provider-app/src/screens/nursing/NursingFieldOps.tsx:257:          placeholder={AR ? "سبب الإلغاء الطارئ..." : "Reason for emergency abort..."}`
- `222: provider-app/src/screens/nursing/NursingRegistration.tsx:197:      <NInput innerRef={nameArRef} label={AR ? 'الاسم الكامل بالعربي' : 'Name (Arabic)'} placeholder={AR ? (data.mode === 'company' ? 'شركة نبضة للتمريض' : 'ممرض/ة محمد أحمد') : (`
- `224: provider-app/src/screens/nursing/NursingRegistration.tsx:221:      <NInput innerRef={emailRef} label={AR ? 'البريد الإلكتروني' : 'Email'} placeholder="nurse@email.com" value={data.managerEmail} onChange={v => update({ managerEmail: v.toLowe`
- `225: provider-app/src/screens/nursing/NursingRegistration.tsx:223:      <NInput innerRef={passwordRef} label={AR ? 'كلمة المرور' : 'Password'} placeholder="••••••••" value={data.password} onChange={v => update({ password: v })} secure required e`
- `226: provider-app/src/screens/nursing/NursingRegistration.tsx:225:      <NInput innerRef={confirmPassRef} label={AR ? 'تأكيد كلمة المرور' : 'Confirm Password'} placeholder="••••••••" value={data.confirmPass} onChange={v => update({ confirmPass: `
- `227: provider-app/src/screens/nursing/NursingRegistration.tsx:354:          <NInput label={AR ? 'رقم ترخيص SCFHS' : 'SCFHS License Number'} placeholder="123456" value={data.scfhsNumber} onChange={v => update({ scfhsNumber: v.replace(/\D/g, '') }`
- `230: provider-app/src/screens/nursing/NursingRegistration.tsx:360:          <NInput label={AR ? 'رقم السجل التجاري CR' : 'CR Number'} placeholder="1234567890" value={data.crNumber} onChange={v => update({ crNumber: v.replace(/\D/g, '') })} requi`
- `232: provider-app/src/screens/nursing/NursingRegistration.tsx:365:      <NInput label={AR ? 'رقم الآيبان IBAN' : 'Bank IBAN'} placeholder="SA0000000000000000000000" value={data.iban} onChange={v => update({ iban: v.toUpperCase().replace(/\s/g, '`
- `296: provider-app/src/screens/pharmacy/PharmacyRegistration.tsx:189:      <NInput innerRef={nameArRef} label={AR?'اسم الصيدلية بالعربي':'Pharmacy Name (Arabic)'} placeholder={AR?'صيدلية نبضة الصحة':'Nabdah Health Pharmacy'} value={data.nameAr} o`
- `298: provider-app/src/screens/pharmacy/PharmacyRegistration.tsx:193:      <NInput innerRef={pharmaRef} label={AR?'اسم الصيدلاني المسؤول':'Head Pharmacist Name'} placeholder={AR?'محمد أحمد السعودي':'Mohamed Ahmed'} value={data.pharmacistName} onC`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
