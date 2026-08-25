# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/screens/ambulance/AmbulanceRegistration.tsx`
- **Member SHA-256:** `0f6ec165362c07179af6a911b96e871c5b9e076fb8c4244c14fa920ff3620870`
- **Line count:** 257
- **Read range:** `1-257`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `11: import { RegistrationSuccess } from '../shared/SharedScreens';`
- `40: const [submitted, setSub] = useState(false);`
- `45: if (submitted) return <RegistrationSuccess onDone={onDone} email={data.managerEmail} providerType="ambulance" />;`
- `52: {step === 4 && <AS4BankSubmit data={data} update={update} onDone={() => setSub(true)} onBack={back} step={step} total={TOTAL} />}`
- `83: await ProviderApi.login(data.managerPhone, data.password);`
- `86: // Account may already exist from a previous attempt — try continuing via login`
- `88: await ProviderApi.login(data.managerPhone, data.password);`
- `113: <TouchableOpacity key={l.id} onPress={() => update({ languages: on ? data.languages.filter((x: string) => x !== l.id) : [...(data.languages || []), l.id] })}`
- `120: <NBtn label={AR ? 'التالي' : 'Next'} onPress={handleNext} loading={loading} />`
- `154: <NBtn label={AR ? 'التالي' : 'Next'} onPress={handleNext} />`
- `186: <NBtn label={AR ? 'التالي' : 'Next'} onPress={handleNext} />`
- `191: /* ─── Step 4: bank + submit ─── */`
### backend_consumers_or_contracts
- `3: import { ProviderApi, sanitizeWizardData } from '../../api/provider';`
### auth_ownership
- `83: await ProviderApi.login(data.managerPhone, data.password);`
- `86: // Account may already exist from a previous attempt — try continuing via login`
- `88: await ProviderApi.login(data.managerPhone, data.password);`
- `230: show(AR ? 'تم إرسال الطلب بنجاح! سيظهر للمرضى بعد اعتماد الإدارة' : 'Submitted! Visible to patients after admin approval', 'success');`
### state_transitions
- `1: import React, { useState } from 'react';`
- `11: import { RegistrationSuccess } from '../shared/SharedScreens';`
- `38: const [step, setStep] = useState(1);`
- `39: const [data, setData] = useState<AmbRegData>(INITIAL);`
- `40: const [submitted, setSub] = useState(false);`
- `45: if (submitted) return <RegistrationSuccess onDone={onDone} email={data.managerEmail} providerType="ambulance" />;`
- `60: const [errs, setErrs] = useState<any>({});`
- `61: const [loading, setLoading] = useState(false);`
- `74: setLoading(true);`
- `94: setLoading(false);`
- `102: <NInput label={AR ? 'اسم المسؤول' : 'Manager name'} value={data.managerName} onChange={(v: string) => update({ managerName: v })} error={errs.managerName} />`
- `103: <NPhoneInput label={AR ? 'رقم الجوال' : 'Mobile number'} value={data.managerPhone} onChange={(v: string) => update({ managerPhone: v })} error={errs.managerPhone} />`
### payment_insurance_relevance
- `6: NBtn, NCard, NInput, NPhoneInput,`
- `20: equipmentText: string; coverageRadius: string;`
- `21: acceptsCash: boolean; acceptedInsurance: string[];`
- `30: equipmentText: '', coverageRadius: '',`
- `31: acceptsCash: true, acceptedInsurance: [],`
- `35: const TOTAL = 4;`
- `49: {step === 1 && <AS1Account data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />}`
- `50: {step === 2 && <AS2Service data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />}`
- `51: {step === 3 && <AS3Fleet data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />}`
- `52: {step === 4 && <AS4BankSubmit data={data} update={update} onDone={() => setSub(true)} onBack={back} step={step} total={TOTAL} />}`
- `58: function AS1Account({ data, update, onNext, onBack, step, total }: any) {`
- `100: <NHeader title={AR ? 'بيانات الحساب' : 'Account Info'} sub={AR ? 'خدمة إسعاف — الخطوة الأولى' : 'Ambulance service — step 1'} step={step} total={total} onBack={onBack} />`
### error_empty_loading_retry_cancel
- `61: const [loading, setLoading] = useState(false);`
- `74: setLoading(true);`
- `85: } catch (e: any) {`
- `90: } catch {`
- `94: setLoading(false);`
- `102: <NInput label={AR ? 'اسم المسؤول' : 'Manager name'} value={data.managerName} onChange={(v: string) => update({ managerName: v })} error={errs.managerName} />`
- `103: <NPhoneInput label={AR ? 'رقم الجوال' : 'Mobile number'} value={data.managerPhone} onChange={(v: string) => update({ managerPhone: v })} error={errs.managerPhone} />`
- `105: <NInput label={AR ? 'كلمة المرور' : 'Password'} value={data.password} onChange={(v: string) => update({ password: v })} secure error={errs.password} />`
- `106: <NInput label={AR ? 'تأكيد كلمة المرور' : 'Confirm password'} value={data.confirmPass} onChange={(v: string) => update({ confirmPass: v })} secure error={errs.confirmPass} />`
- `120: <NBtn label={AR ? 'التالي' : 'Next'} onPress={handleNext} loading={loading} />`
- `144: <NInput label={AR ? 'اسم الخدمة (عربي)' : 'Service name (Arabic)'} value={data.nameAr} onChange={(v: string) => update({ nameAr: v })} error={errs.nameAr} />`
- `151: <NInput label={AR ? 'رقم ترخيص وزارة الصحة' : 'MOH license number'} value={data.mohLicense} onChange={(v: string) => update({ mohLicense: v })} error={errs.mohLicense} />`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
