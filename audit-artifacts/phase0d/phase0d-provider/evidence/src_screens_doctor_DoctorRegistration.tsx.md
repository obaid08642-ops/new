# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/screens/doctor/DoctorRegistration.tsx`
- **Member SHA-256:** `27a7093e1b6ecc2ee04a9acdcd0c83bd7b24c031707b54f3531c3465874bfce3`
- **Line count:** 1129
- **Read range:** `1-1129`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `15: import { RegistrationSuccess } from '../shared/SharedScreens';`
- `20: import { SuccessScreen } from '../../components/SuccessScreen';`
- `113: const screens: Record<number, React.ReactElement> = {`
- `114: 8: <SuccessScreen onDone={() => { setShowSuccess(false); onDone(); }} />,`
- `123: return screens[step] ?? null;`
- `166: await ProviderApi.login(data.phone, data.password);`
- `170: await ProviderApi.login(data.phone, data.password);`
- `172: } catch (loginErr: any) {`
- `182: <NHeader title={AR ? 'المعلومات الأساسية' : 'Basic Info'} sub={AR ? 'الاسم وبيانات الدخول' : 'Name & Login Info'} step={step} total={total} onBack={onBack} />`
- `184: <NInput innerRef={nameArRef} label={AR ? 'الاسم الكامل (بالعربية)' : 'Full Name (Arabic)'} value={data.nameAr} onChange={v => update({ nameAr: v })} required error={errs.nameAr} returnKey="next" onSubmit={() => nameEnRef.current?.focus()} /`
- `185: <NInput innerRef={nameEnRef} label={AR ? 'الاسم الكامل (بالإنجليزية)' : 'Full Name (English)'} value={data.nameEn} onChange={v => update({ nameEn: v })} required error={errs.nameEn} returnKey="next" onSubmit={() => phoneRef.current?.focus()`
- `188: <NInput innerRef={emailRef} label={AR ? 'البريد الإلكتروني' : 'Email'} value={data.email} onChange={v => update({ email: v })} kbType="email-address" caps="none" error={errs.email} required returnKey="next" onSubmit={() => passwordRef.curre`
### backend_consumers_or_contracts
- `19: import { sendEmailOtp, verifyEmailOtp } from '../../api/otp';`
- `26: import { ProviderApi, sanitizeWizardData } from '../../api/provider';`
- `27: import { useInsuranceCatalog } from '../../api/catalogs';`
### auth_ownership
- `18: import { OtpModal } from '../../components/OtpModal';`
- `19: import { sendEmailOtp, verifyEmailOtp } from '../../api/otp';`
- `60: signatureData: string; signerName: string; signerRole: string;`
- `77: cashOnly:false, acceptedInsurance:[], city:'', location: {lat: 0, lng: 0}, address:'', clinicName:'', signatureData:'', signerName:'', signerRole:''`
- `166: await ProviderApi.login(data.phone, data.password);`
- `170: await ProviderApi.login(data.phone, data.password);`
- `172: } catch (loginErr: any) {`
- `182: <NHeader title={AR ? 'المعلومات الأساسية' : 'Basic Info'} sub={AR ? 'الاسم وبيانات الدخول' : 'Name & Login Info'} step={step} total={total} onBack={onBack} />`
- `219: const { status } = await ImagePicker.requestCameraPermissionsAsync();`
- `221: show(AR ? 'صلاحية الكاميرا مطلوبة' : 'Camera permission required', 'error');`
- `853: const [showOtp, setShowOtp] = useState(false);`
- `854: const handleVerifyOtp = async (code: string) => verifyEmailOtp(data.managerEmail || data.email, code);`
### state_transitions
- `1: import React, { useState, useRef, useCallback } from 'react';`
- `15: import { RegistrationSuccess } from '../shared/SharedScreens';`
- `20: import { SuccessScreen } from '../../components/SuccessScreen';`
- `103: const [step, setStep] = useState(1);`
- `104: const [data, setData] = useState<DoctorRegData>(INITIAL);`
- `105: const [showMap, setShowMap] = useState(false);`
- `107: const [showSuccess, setShowSuccess] = useState(false);`
- `114: 8: <SuccessScreen onDone={() => { setShowSuccess(false); onDone(); }} />,`
- `129: const [errs, setErrs] = useState<any>({});`
- `151: const [loading, setLoading] = useState(false);`
- `157: setLoading(true);`
- `173: setErrs({ phone: e.message || 'Error' });`
### payment_insurance_relevance
- `13: import { SP, R, FS, FW, SPECIALTIES, DEGREES, INSURANCE, CITIES } from '../../constants';`
- `27: import { useInsuranceCatalog } from '../../api/catalogs';`
- `43: offersClinic: boolean; clinicPrice: string; clinicDuration: string;`
- `44: offersHome: boolean; homePrice: string; homeRadius: number;`
- `45: homeTransportFee: boolean; homeTransportPrice: string;`
- `46: offersVideo: boolean; videoPrice: string; videoDuration: string;`
- `55: // Step 6 - Insurance & Location`
- `56: cashOnly: boolean;`
- `57: acceptedInsurance: { companyId: string; plans: string[] }[];`
- `67: offersClinic:false, clinicPrice:'', clinicDuration:'',`
- `68: offersHome:false, homePrice:'', homeRadius: 0, homeTransportFee: false, homeTransportPrice: '',`
- `69: offersVideo:false, videoPrice:'', videoDuration:'',`
### error_empty_loading_retry_cancel
- `151: const [loading, setLoading] = useState(false);`
- `157: setLoading(true);`
- `168: } catch (e: any) {`
- `172: } catch (loginErr: any) {`
- `173: setErrs({ phone: e.message || 'Error' });`
- `176: setLoading(false);`
- `184: <NInput innerRef={nameArRef} label={AR ? 'الاسم الكامل (بالعربية)' : 'Full Name (Arabic)'} value={data.nameAr} onChange={v => update({ nameAr: v })} required error={errs.nameAr} returnKey="next" onSubmit={() => nameEnRef.current?.focus()} /`
- `185: <NInput innerRef={nameEnRef} label={AR ? 'الاسم الكامل (بالإنجليزية)' : 'Full Name (English)'} value={data.nameEn} onChange={v => update({ nameEn: v })} required error={errs.nameEn} returnKey="next" onSubmit={() => phoneRef.current?.focus()`
- `187: <NPhoneInput innerRef={phoneRef} label={AR ? 'رقم الجوال' : 'Phone'} value={data.phone} onChange={v => update({ phone: v })} error={errs.phone} required />`
- `188: <NInput innerRef={emailRef} label={AR ? 'البريد الإلكتروني' : 'Email'} value={data.email} onChange={v => update({ email: v })} kbType="email-address" caps="none" error={errs.email} required returnKey="next" onSubmit={() => passwordRef.curre`
- `196: <NInput innerRef={passwordRef} label={AR ? 'كلمة المرور' : 'Password'} value={data.password} onChange={v => update({ password: v })} secure error={errs.password} required returnKey="next" onSubmit={() => confirmPassRef.current?.focus()} />`
- `198: <NInput innerRef={confirmPassRef} label={AR ? 'تأكيد كلمة المرور' : 'Confirm Password'} value={data.confirmPass} onChange={v => update({ confirmPass: v })} secure error={errs.confirmPass} required returnKey="done" onSubmit={handleNext} />`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
