# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/screens/radiology/RadiologyRegistration.tsx`
- **Member SHA-256:** `c4dbe730524ee2230ccc49df48e6a5887af0a1e26fb1e99d38bd64e4a56fbdcb`
- **Line count:** 1858
- **Read range:** `1-1858`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `21: import { RegistrationSuccess } from '../shared/SharedScreens';`
- `26: import { SuccessScreen } from '../../components/SuccessScreen';`
- `127: const screens: Record<number, React.ReactElement> = {`
- `128: 8: <SuccessScreen onDone={() => { setShowSuccess(false); onDone(); }} />,`
- `137: return screens[step] ?? null;`
- `190: await ProviderApi.login(data.managerPhone, data.password);`
- `194: await ProviderApi.login(data.managerPhone, data.password);`
- `196: } catch (loginErr: any) {`
- `212: {/* Center Type Removed (Auto-detected from Welcome Screen) */}`
- `220: returnKey="next" onSubmit={() => nameEnRef.current?.focus()}`
- `228: returnKey="next" onSubmit={() => mgrNameRef.current?.focus()}`
- `239: returnKey="next" onSubmit={() => emailRef.current?.focus()}`
### backend_consumers_or_contracts
- `9: import { ProviderApi, sanitizeWizardData } from '../../api/provider';`
- `10: import { useInsuranceCatalog, useServicesCatalog } from '../../api/catalogs';`
- `25: import { sendEmailOtp, verifyEmailOtp } from '../../api/otp';`
- `344: // Custom validation for Radiology/Radiology separation`
- `490: hint={AR ? 'ترخيص المركز/مركز الأشعة من MOH' : 'Radiology/Radiology license from MOH'} />`
### auth_ownership
- `24: import { OtpModal } from '../../components/OtpModal';`
- `25: import { sendEmailOtp, verifyEmailOtp } from '../../api/otp';`
- `78: signatureData: string; signerName: string; signerRole: string;`
- `100: signatureData: '', signerName: '', signerRole: '',`
- `134: 6: <LStep7AdminWarning data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,`
- `190: await ProviderApi.login(data.managerPhone, data.password);`
- `194: await ProviderApi.login(data.managerPhone, data.password);`
- `196: } catch (loginErr: any) {`
- `370: const { status } = await ImagePicker.requestCameraPermissionsAsync();`
- `372: show(AR ? 'صلاحية الكاميرا مطلوبة' : 'Camera permission required', 'error');`
- `589: await ProviderApi.login(data.managerPhone, data.password);`
- `593: await ProviderApi.login(data.managerPhone, data.password);`
### state_transitions
- `1: import React, { useState, useCallback, useRef } from 'react';`
- `21: import { RegistrationSuccess } from '../shared/SharedScreens';`
- `26: import { SuccessScreen } from '../../components/SuccessScreen';`
- `118: const [step, setStep] = useState(1);`
- `119: const [data, setData] = useState<RadiologyRegData>({ ...INIT, centerType: 'radiology' });`
- `120: const [showMap, setShowMap] = useState(false);`
- `122: const [showSuccess, setShowSuccess] = useState(false);`
- `128: 8: <SuccessScreen onDone={() => { setShowSuccess(false); onDone(); }} />,`
- `150: const [errs, setErrs] = useState<Record<string, string>>({});`
- `177: const [loading, setLoading] = useState(false);`
- `181: setLoading(true);`
- `197: setErrs({ phone: e.message || 'Error' });`
### payment_insurance_relevance
- `10: import { useInsuranceCatalog, useServicesCatalog } from '../../api/catalogs';`
- `13: NBtn, NCard, NInput, NPhoneInput, NPassStrength,`
- `15: NHeader, NScroll, NPriceInput, NSearch, NDropdown, NDatePickerSheet`
- `20: import { SP, R, FS, FW, CITIES, INSURANCE, C, LAB_TESTS, RAD_SCANS, LIMITS , LANGS } from '../../constants';`
- `46: taxNumber: string;`
- `58: testPrices: Record<string, string>;`
- `61: testInsuranceCov: Record<string, boolean>;`
- `62: scanInsuranceCov: Record<string, boolean>;`
- `64: scanPrices: Record<string, string>;`
- `66: bundles: { id: string; nameAr: string; nameEn: string; tests: string[]; price: string; discount: string }[];`
- `75: cashOnly: boolean;`
- `76: acceptedInsurance: { companyId: string; plans: string[] }[];`
### error_empty_loading_retry_cancel
- `177: const [loading, setLoading] = useState(false);`
- `181: setLoading(true);`
- `192: } catch (e: any) {`
- `196: } catch (loginErr: any) {`
- `197: setErrs({ phone: e.message || 'Error' });`
- `200: setLoading(false);`
- `219: icon="⊥" required error={errs.name} caps="words"`
- `238: required error={errs.mgr} caps="words"`
- `246: required error={errs.email} kbType="email-address"`
- `253: required error={errs.phone}`
- `274: required error={errs.tech} caps="words"`
- `293: secure required error={errs.pass}`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
