# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/screens/nursing/NursingRegistration.tsx`
- **Member SHA-256:** `ad140044fe6dcd23996b0657d22202fa5cf86129d99499e9f61adb419f4f7538`
- **Line count:** 1041
- **Read range:** `1-1041`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `20: import { RegistrationSuccess } from '../shared/SharedScreens';`
- `24: import { SuccessScreen } from '../../components/SuccessScreen';`
- `76: // Submit`
- `99: const [submitted, setSub] = useState(false);`
- `104: if (submitted) return <RegistrationSuccess onDone={onDone} email={data.managerEmail} providerType="nursing" />;`
- `106: const screens: Record<number, React.ReactElement> = {`
- `113: 7: <PStep7SubmitAdminWarning data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,`
- `116: return screens[step] ?? null;`
- `158: await ProviderApi.login(data.managerPhone, data.password);`
- `162: await ProviderApi.login(data.managerPhone, data.password);`
- `164: } catch (loginErr: any) {`
- `181: <TouchableOpacity key={pm.id} onPress={() => update({ mode: pm.id })}`
### backend_consumers_or_contracts
- `9: import { ProviderApi, sanitizeWizardData } from '../../api/provider';`
- `10: import { useInsuranceCatalog, useServicesCatalog } from '../../api/catalogs';`
- `23: import { sendEmailOtp, verifyEmailOtp } from '../../api/otp';`
### auth_ownership
- `22: import { OtpModal } from '../../components/OtpModal';`
- `23: import { sendEmailOtp, verifyEmailOtp } from '../../api/otp';`
- `77: signatureData: string; signerName: string; signerRole: string;`
- `90: signatureData: '', signerName: '', signerRole: '', termsAgreed: false,`
- `113: 7: <PStep7SubmitAdminWarning data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,`
- `158: await ProviderApi.login(data.managerPhone, data.password);`
- `162: await ProviderApi.login(data.managerPhone, data.password);`
- `164: } catch (loginErr: any) {`
- `266: const { status } = await ImagePicker.requestCameraPermissionsAsync();`
- `268: show(AR ? 'صلاحية الكاميرا مطلوبة' : 'Camera permission required', 'error');`
- `520: await ProviderApi.login(data.managerPhone, data.password);`
- `524: await ProviderApi.login(data.managerPhone, data.password);`
### state_transitions
- `1: import React, { useState, useCallback, useRef } from 'react';`
- `20: import { RegistrationSuccess } from '../shared/SharedScreens';`
- `24: import { SuccessScreen } from '../../components/SuccessScreen';`
- `95: const [step, setStep] = useState(1);`
- `96: const [data, setData] = useState<NurseRegData>(INIT);`
- `97: const [showMap, setShowMap] = useState(false);`
- `99: const [submitted, setSub] = useState(false);`
- `104: if (submitted) return <RegistrationSuccess onDone={onDone} email={data.managerEmail} providerType="nursing" />;`
- `122: const [errs, setErrs] = useState<Record<string, string>>({});`
- `123: const [showLocModal, setShowLocModal] = useState(false);`
- `146: const [loading, setLoading] = useState(false);`
- `149: setLoading(true);`
### payment_insurance_relevance
- `10: import { useInsuranceCatalog, useServicesCatalog } from '../../api/catalogs';`
- `13: NBtn, NCard, NInput, NPhoneInput, NPassStrength,`
- `15: NHeader, NScroll, NPriceInput, NSearch, NDropdown, NDatePickerSheet`
- `19: import { SP, R, FS, FW, NURSING_SVCS, CITIES, INSURANCE, C , LANGS } from '../../constants';`
- `67: priceVisit: string; priceHour: string; priceDay: string; priceMonth: string;`
- `68: // Coverage & Map`
- `70: coverageRadius: number; coverageAreas: string[];`
- `73: // Insurance`
- `74: cashOnly: boolean;`
- `75: acceptedInsurance: { companyId: string; plans: string[] }[];`
- `86: pricingModels: [], priceVisit: '', priceHour: '', priceDay: '', priceMonth: '',`
- `87: city: '', location: { lat: 0, lng: 0 }, district: '', address: '', coverageRadius: 0, coverageAreas: [],`
### error_empty_loading_retry_cancel
- `146: const [loading, setLoading] = useState(false);`
- `149: setLoading(true);`
- `160: } catch (e: any) {`
- `164: } catch (loginErr: any) {`
- `165: setErrs({ phone: e.message || 'Error' });`
- `168: setLoading(false);`
- `197: <NInput innerRef={nameArRef} label={AR ? 'الاسم الكامل بالعربي' : 'Name (Arabic)'} placeholder={AR ? (data.mode === 'company' ? 'شركة نبضة للتمريض' : 'ممرض/ة محمد أحمد') : (data.mode === 'company' ? 'Nabdah Nursing Co.' : 'Nurse Mohamed')} `
- `220: <NInput innerRef={mgrNameRef} label={AR ? 'اسم المسؤول' : 'Manager Name'} value={data.managerName} onChange={v => update({ managerName: v })} required error={errs.mgr} caps="words" returnKey="next" onSubmit={() => emailRef.current?.focus()}`
- `221: <NInput innerRef={emailRef} label={AR ? 'البريد الإلكتروني' : 'Email'} placeholder="nurse@email.com" value={data.managerEmail} onChange={v => update({ managerEmail: v.toLowerCase() })} required error={errs.email} kbType="email-address" retu`
- `222: <NPhoneInput innerRef={phoneRef} label={AR ? 'الجوال' : 'Phone'} value={data.managerPhone} onChange={v => update({ managerPhone: v })} required error={errs.phone} />`
- `223: <NInput innerRef={passwordRef} label={AR ? 'كلمة المرور' : 'Password'} placeholder="••••••••" value={data.password} onChange={v => update({ password: v })} secure required error={errs.pass} returnKey="next" onSubmit={() => confirmPassRef.cu`
- `225: <NInput innerRef={confirmPassRef} label={AR ? 'تأكيد كلمة المرور' : 'Confirm Password'} placeholder="••••••••" value={data.confirmPass} onChange={v => update({ confirmPass: v })} secure required error={errs.conf} returnKey="done" onSubmit={`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
