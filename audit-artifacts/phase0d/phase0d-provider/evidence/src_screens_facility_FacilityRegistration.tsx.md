# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/screens/facility/FacilityRegistration.tsx`
- **Member SHA-256:** `af9cef5840c337b0f249438899b1347fbdc887ce35338c0e9135a06a44f6c4bb`
- **Line count:** 1176
- **Read range:** `1-1176`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `16: import { RegistrationSuccess } from '../shared/SharedScreens';`
- `20: import { SuccessScreen } from '../../components/SuccessScreen';`
- `81: const [submitted, setSubmitted] = useState(false);`
- `89: const screens: Record<number, React.ReactElement> = {`
- `90: 8: <SuccessScreen onDone={() => { setShowSuccess(false); onDone(); }} />,`
- `101: {screens[step] ?? null}`
- `156: await ProviderApi.login(data.managerPhone, data.password);`
- `158: await ProviderApi.login(data.managerPhone, data.password);`
- `174: <TouchableOpacity key={t.id} onPress={() => update({ facilityType: t.id })} style={{ flex: 1, padding: SP.md, borderWidth: 1, borderColor: data.facilityType === t.id ? theme.primary : theme.border, backgroundColor: data.facilityType === t.i`
- `181: <NInput innerRef={nameArRef} label={AR ? 'اسم المنشأة (بالعربية)' : 'Facility Name (AR)'} value={data.facilityNameAr} onChange={v => update({ facilityNameAr: v })} required error={errs.nameAr} returnKey="next" onSubmit={() => nameEnRef.curr`
- `182: <NInput innerRef={nameEnRef} label={AR ? 'اسم المنشأة (بالإنجليزية)' : 'Facility Name (EN)'} value={data.facilityNameEn} onChange={v => update({ facilityNameEn: v })} required error={errs.nameEn} returnKey="next" onSubmit={() => mgrNameRef.`
- `184: <NInput innerRef={mgrNameRef} label={AR ? 'اسم مدير المنشأة' : 'Manager Name'} value={data.managerName} onChange={v => update({ managerName: v })} required error={errs.mgr} returnKey="next" onSubmit={() => phoneRef.current?.focus()} />`
### backend_consumers_or_contracts
- `19: import { sendEmailOtp, verifyEmailOtp } from '../../api/otp';`
- `25: import { ProviderApi, sanitizeWizardData } from '../../api/provider';`
- `26: import { useInsuranceCatalog, useServicesCatalog } from '../../api/catalogs';`
### auth_ownership
- `18: import { OtpModal } from '../../components/OtpModal';`
- `19: import { sendEmailOtp, verifyEmailOtp } from '../../api/otp';`
- `67: signatureData: string; loading?: boolean; signerName: string; signerRole: string; termsAgreed: boolean;`
- `75: city: '', fullAddress: '', location: {lat: 0, lng: 0}, subProviders: [], cashOnly: false, acceptedInsurance: [], hasInsuranceCoordinator: false, signatureData: '', signerName: '', signerRole: '', termsAgreed: false, loading: false`
- `96: 6: <Step6AdminWarning data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,`
- `156: await ProviderApi.login(data.managerPhone, data.password);`
- `158: await ProviderApi.login(data.managerPhone, data.password);`
- `221: const { status } = await ImagePicker.requestCameraPermissionsAsync();`
- `223: show(AR ? 'صلاحية الكاميرا مطلوبة' : 'Camera permission required', 'error');`
- `535: <NInput label={AR ? 'البريد الإلكتروني (لتسجيل الدخول لاحقاً)' : 'Email (for future login)'} value={tempSub.email} onChange={v=>setTempSub({...tempSub, email:v.toLowerCase()})} required kbType="email-address" />`
- `1014: function Step6AdminWarning({ data, update, onNext, onBack, step, total }: any) {`
- `1029: {AR ? 'كذلك في المستقبل، عند تعديل الأسعار، المواعيد، أو إضافة أقسام جديدة من الإعدادات، يجب أن تمر أولاً عبر (الأدمن) للمراجعة والموافقة لضمان الجودة.' : 'In the future, any changes to prices, schedules, or new departments must pass throug`
### state_transitions
- `1: import React, { useState, useRef, useCallback } from 'react';`
- `16: import { RegistrationSuccess } from '../shared/SharedScreens';`
- `20: import { SuccessScreen } from '../../components/SuccessScreen';`
- `67: signatureData: string; loading?: boolean; signerName: string; signerRole: string; termsAgreed: boolean;`
- `75: city: '', fullAddress: '', location: {lat: 0, lng: 0}, subProviders: [], cashOnly: false, acceptedInsurance: [], hasInsuranceCoordinator: false, signatureData: '', signerName: '', signerRole: '', termsAgreed: false, loading: false`
- `79: const [step, setStep] = useState(1);`
- `80: const [data, setData] = useState<FacilityRegData>(INIT);`
- `81: const [submitted, setSubmitted] = useState(false);`
- `83: const [showSuccess, setShowSuccess] = useState(false);`
- `90: 8: <SuccessScreen onDone={() => { setShowSuccess(false); onDone(); }} />,`
- `102: <Modal visible={data.loading} transparent animationType="fade">`
- `117: const [errs, setErrs] = useState<Record<string, string>>({});`
### payment_insurance_relevance
- `9: NCheckbox, NHeader, NScroll, NSheet, NCard,`
- `14: import { SP, R, FS, FW, INSURANCE, CITIES, SPECIALTIES, DEGREES, LAB_TESTS, RAD_SCANS, NURSING_SVCS , LANGS } from '../../constants';`
- `26: import { useInsuranceCatalog, useServicesCatalog } from '../../api/catalogs';`
- `62: subProviders: any[]; // { type: 'doctor'|'lab'|'pharmacy', nameAr: string, nameEn: string, license: string, hasInsuranceEmp: boolean, ... }`
- `63: // Insurance`
- `64: cashOnly: boolean;`
- `65: acceptedInsurance: { companyId: string; plans: string[] }[];`
- `66: hasInsuranceCoordinator: boolean;`
- `75: city: '', fullAddress: '', location: {lat: 0, lng: 0}, subProviders: [], cashOnly: false, acceptedInsurance: [], hasInsuranceCoordinator: false, signatureData: '', signerName: '', signerRole: '', termsAgreed: false, loading: false`
- `82: const TOTAL = 8;`
- `86: const next = () => { if (step < TOTAL) setStep(s => s + 1); else setStep(8); };`
- `91: 1: <Step1Basic data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,`
### error_empty_loading_retry_cancel
- `67: signatureData: string; loading?: boolean; signerName: string; signerRole: string; termsAgreed: boolean;`
- `75: city: '', fullAddress: '', location: {lat: 0, lng: 0}, subProviders: [], cashOnly: false, acceptedInsurance: [], hasInsuranceCoordinator: false, signatureData: '', signerName: '', signerRole: '', termsAgreed: false, loading: false`
- `102: <Modal visible={data.loading} transparent animationType="fade">`
- `147: update({ loading: true });`
- `157: } catch (e) {`
- `161: } catch (e: any) {`
- `162: show(Array.isArray(e.response?.data?.message) ? e.response?.data?.message[0] : (e.response?.data?.message || e.message || 'Error occurred'), 'error');`
- `164: update({ loading: false });`
- `181: <NInput innerRef={nameArRef} label={AR ? 'اسم المنشأة (بالعربية)' : 'Facility Name (AR)'} value={data.facilityNameAr} onChange={v => update({ facilityNameAr: v })} required error={errs.nameAr} returnKey="next" onSubmit={() => nameEnRef.curr`
- `182: <NInput innerRef={nameEnRef} label={AR ? 'اسم المنشأة (بالإنجليزية)' : 'Facility Name (EN)'} value={data.facilityNameEn} onChange={v => update({ facilityNameEn: v })} required error={errs.nameEn} returnKey="next" onSubmit={() => mgrNameRef.`
- `184: <NInput innerRef={mgrNameRef} label={AR ? 'اسم مدير المنشأة' : 'Manager Name'} value={data.managerName} onChange={v => update({ managerName: v })} required error={errs.mgr} returnKey="next" onSubmit={() => phoneRef.current?.focus()} />`
- `185: <NPhoneInput innerRef={phoneRef} label={AR ? 'رقم جوال المدير' : 'Manager Phone'} value={data.managerPhone} onChange={v => update({ managerPhone: v })} required error={errs.phone} />`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
