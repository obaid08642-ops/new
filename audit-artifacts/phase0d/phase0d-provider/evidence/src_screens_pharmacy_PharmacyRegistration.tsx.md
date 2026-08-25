# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/screens/pharmacy/PharmacyRegistration.tsx`
- **Member SHA-256:** `0b55cd3ab0e2f82aeaea23ebbb1a7a6d5b0c5eebbcb8b53bb12201da9056c744`
- **Line count:** 954
- **Read range:** `1-954`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `20: import { RegistrationSuccess } from '../shared/SharedScreens';`
- `25: import { SuccessScreen } from '../../components/SuccessScreen';`
- `101: const screens: Record<number, React.ReactElement> = {`
- `102: 9: <SuccessScreen onDone={() => { setShowSuccess(false); onDone(); }} />,`
- `110: 8: <PStep7Submit data={data} update={update} onDone={onDone} onBack={back} step={step} total={TOTAL} />,`
- `112: return screens[step] ?? null;`
- `158: await ProviderApi.login(data.managerPhone, data.password);`
- `162: await ProviderApi.login(data.managerPhone, data.password);`
- `164: } catch (loginErr: any) {`
- `181: <TouchableOpacity key={pt.id} onPress={() => update({ type:pt.id })} style={[s.typeRow, { backgroundColor: sel ? theme.primaryLight : theme.surface2, borderColor: sel ? theme.primary : theme.border, flexDirection: AR?'row-reverse':'row' }]}`
- `189: <NInput innerRef={nameArRef} label={AR?'اسم الصيدلية بالعربي':'Pharmacy Name (Arabic)'} placeholder={AR?'صيدلية نبضة الصحة':'Nabdah Health Pharmacy'} value={data.nameAr} onChange={v=>update({nameAr:v})} required error={errs.nameAr} caps="wo`
- `190: <NInput innerRef={nameEnRef} label={AR?'اسم الصيدلية بالإنجليزي':'Pharmacy Name (English)'} placeholder="Nabdah Health Pharmacy" value={data.nameEn} onChange={v=>update({nameEn:v})} caps="words" returnKey="next" onSubmit={() => pharmaRef.cu`
### backend_consumers_or_contracts
- `10: import { ProviderApi, sanitizeWizardData } from '../../api/provider';`
- `11: import { useInsuranceCatalog } from '../../api/catalogs';`
- `24: import { sendEmailOtp, verifyEmailOtp } from '../../api/otp';`
### auth_ownership
- `23: import { OtpModal } from '../../components/OtpModal';`
- `24: import { sendEmailOtp, verifyEmailOtp } from '../../api/otp';`
- `69: signatureData: string; signerName: string; signerRole: string;`
- `87: signatureData: '', signerName: '', signerRole: '',   termsAgreed: false, location: {lat: 0, lng: 0}, accountHolderName: ''`
- `109: 7: <PStep7AdminWarning data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,`
- `158: await ProviderApi.login(data.managerPhone, data.password);`
- `162: await ProviderApi.login(data.managerPhone, data.password);`
- `164: } catch (loginErr: any) {`
- `243: const { status } = await ImagePicker.requestCameraPermissionsAsync();`
- `245: show(AR ? 'صلاحية الكاميرا مطلوبة' : 'Camera permission required', 'error');`
- `690: function PStep7AdminWarning({ data, update, onNext, onBack, step, total }: any) {`
- `705: {AR ? 'أي تعديل مستقبلي للمخزون أو الأسعار أو الحدود المالية يخضع لمراجعة الأدمن للموافقة عليه لضمان الجودة ومطابقة لوائح هيئة الغذاء والدواء SFDA.' : 'Any future updates to inventory, delivery parameters, or listings must be approved by th`
### state_transitions
- `1: import React, { useState, useRef, useCallback } from 'react';`
- `16: NHeader, NScroll, NSuccess, NPriceInput, NSearch, NDropdown, NDatePickerSheet`
- `20: import { RegistrationSuccess } from '../shared/SharedScreens';`
- `25: import { SuccessScreen } from '../../components/SuccessScreen';`
- `92: const [step, setStep] = useState(1);`
- `93: const [data, setData] = useState<PharmacyRegData>(INIT);`
- `94: const [showMap, setShowMap] = useState(false);`
- `96: const [showSuccess, setShowSuccess] = useState(false);`
- `102: 9: <SuccessScreen onDone={() => { setShowSuccess(false); onDone(); }} />,`
- `118: const [errs, setErrs] = useState<Record<string,string>>({});`
- `144: const [loading, setLoading] = useState(false);`
- `149: setLoading(true);`
### payment_insurance_relevance
- `11: import { useInsuranceCatalog } from '../../api/catalogs';`
- `14: NBtn, NCard, NInput, NPhoneInput, NPassStrength,`
- `16: NHeader, NScroll, NSuccess, NPriceInput, NSearch, NDropdown, NDatePickerSheet`
- `19: import { SP, R, FS, FW, PHARMA_CATS, CITIES, LIMITS, C, INSURANCE , LANGS } from '../../constants';`
- `49: iban: string; accountHolderName: string; taxNumber: string;`
- `66: cashOnly: boolean;`
- `67: acceptedInsurance: { companyId: string; plans: string[] }[];`
- `77: crNumber:'', mohLicense:'', sfdaNumber:'', iban:'', taxNumber:'',`
- `86: scheduledDelivery: false, cashOnly: false, acceptedInsurance: [],`
- `95: const TOTAL = 8;`
- `98: const next = () => { if (step < TOTAL) setStep(s => s+1); else setStep(9); };`
- `103: 1: <PStep1Basic data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,`
### error_empty_loading_retry_cancel
- `144: const [loading, setLoading] = useState(false);`
- `149: setLoading(true);`
- `160: } catch (e: any) {`
- `164: } catch (loginErr: any) {`
- `165: setErrs({ phone: e.message || 'Error' });`
- `168: setLoading(false);`
- `189: <NInput innerRef={nameArRef} label={AR?'اسم الصيدلية بالعربي':'Pharmacy Name (Arabic)'} placeholder={AR?'صيدلية نبضة الصحة':'Nabdah Health Pharmacy'} value={data.nameAr} onChange={v=>update({nameAr:v})} required error={errs.nameAr} caps="wo`
- `193: <NInput innerRef={pharmaRef} label={AR?'اسم الصيدلاني المسؤول':'Head Pharmacist Name'} placeholder={AR?'محمد أحمد السعودي':'Mohamed Ahmed'} value={data.pharmacistName} onChange={v=>update({pharmacistName:v})} required error={errs.pharma} ca`
- `196: <NInput innerRef={mgrNameRef} label={AR?'اسم المدير التنفيذي':'Manager Name'} placeholder={AR?'خالد عمر المالكي':'Khalid Omar'} value={data.managerName} onChange={v=>update({managerName:v})} required error={errs.mgr} caps="words" returnKey=`
- `197: <NInput innerRef={emailRef} label={AR?'البريد الإلكتروني':'Email'} placeholder="pharmacy@email.com" value={data.managerEmail} onChange={v=>update({managerEmail:v.toLowerCase()})} required error={errs.email} kbType="email-address" returnKey=`
- `198: <NPhoneInput innerRef={phoneRef} label={AR?'رقم الجوال':'Phone'} value={data.managerPhone} onChange={v=>update({managerPhone:v})} required error={errs.phone} />`
- `199: <NInput innerRef={passwordRef} label={AR?'كلمة المرور':'Password'} placeholder="••••••••" value={data.password} onChange={v=>update({password:v})} secure required error={errs.pass} hint={AR?'8 أحرف — أرقام وحروف كبيرة وصغيرة ورموز':'8+ char`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
