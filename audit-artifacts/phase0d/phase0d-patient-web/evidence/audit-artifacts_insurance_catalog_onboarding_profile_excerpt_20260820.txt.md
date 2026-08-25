# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/insurance_catalog_onboarding_profile_excerpt_20260820.txt`
- **Member SHA-256:** `9c536888666d51205e1a391ab6fd9e9254e9a68a67a146f95156b63ea76a06bb`
- **Line count:** 1268
- **Read range:** `1-1268`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `2: ===== provider/src/screens/doctor/DoctorRegistration.tsx =====`
- `8: 15-import { RegistrationSuccess } from '../shared/SharedScreens';`
- `43: 124-  return screens[step] ?? null;`
- `155: ===== provider/src/screens/lab/LabRegistration.tsx =====`
- `168: 21-import { RegistrationSuccess } from '../shared/SharedScreens';`
- `327: ===== provider/src/screens/radiology/RadiologyRegistration.tsx =====`
- `340: 21-import { RegistrationSuccess } from '../shared/SharedScreens';`
- `499: ===== provider/src/screens/pharmacy/PharmacyRegistration.tsx =====`
- `512: 20-import { RegistrationSuccess } from '../shared/SharedScreens';`
- `610: ===== provider/src/screens/nursing/NursingRegistration.tsx =====`
- `623: 20-import { RegistrationSuccess } from '../shared/SharedScreens';`
- `638: 77-  // Submit`
### backend_consumers_or_contracts
- `13: 26-import { ProviderApi, sanitizeWizardData } from '../../api/provider';`
- `14: 27:import { useInsuranceCatalog } from '../../api/catalogs';`
- `158: 9-import { ProviderApi, sanitizeWizardData } from '../../api/provider';`
- `159: 10:import { useInsuranceCatalog, useServicesCatalog } from '../../api/catalogs';`
- `327: ===== provider/src/screens/radiology/RadiologyRegistration.tsx =====`
- `330: 9-import { ProviderApi, sanitizeWizardData } from '../../api/provider';`
- `331: 10:import { useInsuranceCatalog, useServicesCatalog } from '../../api/catalogs';`
- `499: ===== provider/src/screens/pharmacy/PharmacyRegistration.tsx =====`
- `502: 10-import { ProviderApi, sanitizeWizardData } from '../../api/provider';`
- `503: 11:import { useInsuranceCatalog } from '../../api/catalogs';`
- `610: ===== provider/src/screens/nursing/NursingRegistration.tsx =====`
- `613: 9-import { ProviderApi, sanitizeWizardData } from '../../api/provider';`
### auth_ownership
- `27: 61-  signatureData: string; signerName: string; signerRole: string;`
- `32: 78:  cashOnly:false, acceptedInsurance:[], city:'', location: {lat: 0, lng: 0}, address:'', clinicName:'', signatureData:'', signerName:'', signerRole:''`
- `186: 79-  signatureData: string; signerName: string; signerRole: string;`
- `201: 101-  signatureData: '', signerName: '', signerRole: '',`
- `358: 79-  signatureData: string; signerName: string; signerRole: string;`
- `373: 101-  signatureData: '', signerName: '', signerRole: '',`
- `521: 70-  signatureData: string; signerName: string; signerRole: string;`
- `528: 88-  signatureData: '', signerName: '', signerRole: '',   termsAgreed: false, location: {lat: 0, lng: 0}, accountHolderName: ''`
- `625: 22-import { OtpModal } from '../../components/OtpModal';`
- `639: 78-  signatureData: string; signerName: string; signerRole: string;`
- `648: 91-  signatureData: '', signerName: '', signerRole: '', termsAgreed: false,`
- `768: 798:          {tr('مستقبلاً، أي تعديل للأسعار أو تغيير لنطاق التغطية سيتطلب موافقة الأدمن للتأكد من مطابقة تراخيص التمريض المنزلي.', 'Future changes to nursing fees or coverage radius must be reviewed and approved by the Admin first.')}`
### state_transitions
- `8: 15-import { RegistrationSuccess } from '../shared/SharedScreens';`
- `126: 847-            show(tr('يرجى إكمال العنوان الشامل (المدينة، الحي، الشارع)', 'Please complete the address (City, District, Street)'), 'error');`
- `130: 851:            show(tr('يرجى اختيار شركة تأمين واحدة على الأقل أو تفعيل الدفع النقدي فقط', 'Please select at least one insurance company or enable Cash Only'), 'error');`
- `168: 21-import { RegistrationSuccess } from '../shared/SharedScreens';`
- `340: 21-import { RegistrationSuccess } from '../shared/SharedScreens';`
- `508: 16-  NHeader, NScroll, NSuccess, NPriceInput, NSearch, NDropdown, NDatePickerSheet`
- `512: 20-import { RegistrationSuccess } from '../shared/SharedScreens';`
- `623: 20-import { RegistrationSuccess } from '../shared/SharedScreens';`
- `668: 558-      <NInput label={tr('العنوان', 'Address')} value={data.address} onChange={v => update({ address: v })} required error={errs.addr} multi lines={2} />`
- `768: 798:          {tr('مستقبلاً، أي تعديل للأسعار أو تغيير لنطاق التغطية سيتطلب موافقة الأدمن للتأكد من مطابقة تراخيص التمريض المنزلي.', 'Future changes to nursing fees or coverage radius must be reviewed and approved by the Admin first.')}`
- `773: 834-      show(tr('أدخل سعراً موجباً لكل نموذج تسعير مختار', 'Enter a positive price for each selected pricing model'), 'error');`
- `777: 838:      show(tr('أكمل نطاق التغطية وأيام وساعات العمل', 'Complete coverage radius and working days/hours'), 'error');`
### payment_insurance_relevance
- `6: 13:import { SP, R, FS, FW, SPECIALTIES, DEGREES, INSURANCE, CITIES } from '../../constants';`
- `14: 27:import { useInsuranceCatalog } from '../../api/catalogs';`
- `22: 56:  // Step 6 - Insurance & Location`
- `23: 57-  cashOnly: boolean;`
- `24: 58:  acceptedInsurance: { companyId: string; plans: string[] }[];`
- `32: 78:  cashOnly:false, acceptedInsurance:[], city:'', location: {lat: 0, lng: 0}, address:'', clinicName:'', signatureData:'', signerName:'', signerRole:''`
- `37: 118-    3: <Step3Profile data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,`
- `38: 119-    4: <Step4PricingAndLocation data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,`
- `39: 120-    5: <Step5Schedule data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,`
- `40: 121:    6: <Step6Insurance data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,`
- `41: 122-    7: <Step7Signature data={data} update={update} onDone={onDone} onBack={back} step={step} total={TOTAL} />,`
- `45: 481-                <NInput label={tr('رسوم الانتقال', 'Transport Fee')} value={data.homeTransportPrice} onChange={v=>update({homeTransportPrice:v})} kbType="numeric" />`
### error_empty_loading_retry_cancel
- `126: 847-            show(tr('يرجى إكمال العنوان الشامل (المدينة، الحي، الشارع)', 'Please complete the address (City, District, Street)'), 'error');`
- `130: 851:            show(tr('يرجى اختيار شركة تأمين واحدة على الأقل أو تفعيل الدفع النقدي فقط', 'Please select at least one insurance company or enable Cash Only'), 'error');`
- `668: 558-      <NInput label={tr('العنوان', 'Address')} value={data.address} onChange={v => update({ address: v })} required error={errs.addr} multi lines={2} />`
- `773: 834-      show(tr('أدخل سعراً موجباً لكل نموذج تسعير مختار', 'Enter a positive price for each selected pricing model'), 'error');`
- `777: 838:      show(tr('أكمل نطاق التغطية وأيام وساعات العمل', 'Complete coverage radius and working days/hours'), 'error');`
- `822: 1041-        <NBtn label={tr('إرسال الطلب للمراجعة', 'Submit Application')} onPress={submit} loading={loading} disabled={!agreed} style={{ marginBottom: 50, backgroundColor: theme.success }} />`
- `849: 68-  signatureData: string; loading?: boolean; signerName: string; signerRole: string; termsAgreed: boolean;`
- `856: 76:  city: '', fullAddress: '', location: {lat: 0, lng: 0}, subProviders: [], cashOnly: false, acceptedInsurance: [], hasInsuranceCoordinator: false, signatureData: '', signerName: '', signerRole: '', termsAgreed: false, loading: false`
- `982: 932-    } catch (e: any) {`
- `1039: 26-  const [loading, setLoading] = useState(true);`
- `1055: 42-    } catch {`
- `1058: 45-      setLoading(false);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
