# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PROVIDER_REGISTRATION_DEFAULTS_POSTFIX_SCAN_20260818.txt`
- **Member SHA-256:** `7216ac34674d85b1ec214df434126ffb58dd7ab705efd1172f238b75e399df83`
- **Line count:** 109
- **Read range:** `1-109`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `2: provider-app/src/screens/doctor/DoctorRegistration.tsx:43:  offersClinic: boolean; clinicPrice: string; clinicDuration: string;`
- `3: provider-app/src/screens/doctor/DoctorRegistration.tsx:44:  offersHome: boolean; homePrice: string; homeRadius: number;`
- `4: provider-app/src/screens/doctor/DoctorRegistration.tsx:46:  offersVideo: boolean; videoPrice: string; videoDuration: string;`
- `5: provider-app/src/screens/doctor/DoctorRegistration.tsx:47:  lat: number; lng: number;`
- `6: provider-app/src/screens/doctor/DoctorRegistration.tsx:56:  cashOnly: boolean;`
- `7: provider-app/src/screens/doctor/DoctorRegistration.tsx:58:  city: string; location: {lat: number; lng: number}; address: string; clinicName: string;`
- `8: provider-app/src/screens/doctor/DoctorRegistration.tsx:67:  offersClinic:false, clinicPrice:'', clinicDuration:'',`
- `9: provider-app/src/screens/doctor/DoctorRegistration.tsx:68:  offersHome:false, homePrice:'', homeRadius: 0, homeTransportFee: false, homeTransportPrice: '',`
- `10: provider-app/src/screens/doctor/DoctorRegistration.tsx:69:  offersVideo:false, videoPrice:'', videoDuration:'',`
- `11: provider-app/src/screens/doctor/DoctorRegistration.tsx:70:  lat: 0, lng: 0,`
- `12: provider-app/src/screens/doctor/DoctorRegistration.tsx:77:  cashOnly:false, acceptedInsurance:[], city:'', location: {lat: 0, lng: 0}, address:'', clinicName:'', signatureData:'', signerName:'', signerRole:''`
- `13: provider-app/src/screens/doctor/DoctorRegistration.tsx:415:              <NInput label={AR ? 'سعر الكشف في العيادة' : 'Clinic Visit Price'} value={data.clinicPrice} onChange={v=>update({clinicPrice:v})} kbType="numeric" />`
### backend_consumers_or_contracts
- `57: provider-app/src/screens/nursing/NursingRegistration.tsx:67:  priceVisit: string; priceHour: string; priceDay: string; priceMonth: string;`
- `58: provider-app/src/screens/nursing/NursingRegistration.tsx:69:  city: string; location: {lat: number; lng: number}; district: string; address: string;`
- `59: provider-app/src/screens/nursing/NursingRegistration.tsx:72:  workDays: string[]; shiftType: 'morning' | 'evening' | 'both'; openTime: string; closeTime: string; eveningOpenTime: string; eveningCloseTime: string; is24_7: boolean; vacationDa`
- `60: provider-app/src/screens/nursing/NursingRegistration.tsx:74:  cashOnly: boolean;`
- `61: provider-app/src/screens/nursing/NursingRegistration.tsx:86:  pricingModels: [], priceVisit: '', priceHour: '', priceDay: '', priceMonth: '',`
- `62: provider-app/src/screens/nursing/NursingRegistration.tsx:87:  city: '', location: { lat: 0, lng: 0 }, district: '', address: '', coverageRadius: 0, coverageAreas: [],`
- `63: provider-app/src/screens/nursing/NursingRegistration.tsx:88:  workDays: [], shiftType: 'morning', openTime: '', closeTime: '', eveningOpenTime: '', eveningCloseTime: '', is24_7: false, vacationDate: '',`
- `64: provider-app/src/screens/nursing/NursingRegistration.tsx:89:  cashOnly: false, acceptedInsurance: [],`
- `65: provider-app/src/screens/nursing/NursingRegistration.tsx:479:              value={pm.id === 'per_visit' ? data.priceVisit : pm.id === 'per_hour' ? data.priceHour : pm.id === 'per_day' ? data.priceDay : data.priceMonth}`
- `66: provider-app/src/screens/nursing/NursingRegistration.tsx:480:              onChange={v => update(pm.id === 'per_visit' ? { priceVisit: v } : pm.id === 'per_hour' ? { priceHour: v } : pm.id === 'per_day' ? { priceDay: v } : { priceMonth: v }`
- `67: provider-app/src/screens/nursing/NursingRegistration.tsx:601:        <LocationPickerModal visible={showLocModal} onClose={() => setShowLocModal(false)} onSelectLocation={(l) => update({ location: l })} initialLocation={data.location.lat ? d`
- `68: provider-app/src/screens/nursing/NursingRegistration.tsx:617:    update({ workDays: d });`
### auth_ownership
- `12: provider-app/src/screens/doctor/DoctorRegistration.tsx:77:  cashOnly:false, acceptedInsurance:[], city:'', location: {lat: 0, lng: 0}, address:'', clinicName:'', signatureData:'', signerName:'', signerRole:''`
- `25: provider-app/src/screens/doctor/DoctorRegistration.tsx:954:      await ProviderApi.submit({ signer_name: data.signerName, signer_role: data.signerRole, lat: data.lat, lng: data.lng , signature_url: sigUrl, full_data: sanitizeWizardData(data`
- `31: provider-app/src/screens/facility/FacilityRegistration.tsx:75:  city: '', fullAddress: '', location: {lat: 0, lng: 0}, subProviders: [], cashOnly: false, acceptedInsurance: [], hasInsuranceCoordinator: false, signatureData: '', signerName: `
- `55: provider-app/src/screens/lab/LabRegistration.tsx:1662:      await ProviderApi.submit({ signer_name: data.signerName, signer_role: data.signerRole, lat: data.location?.lat || 0, lng: data.location?.lng || 0 , signature_url: sigUrl, full_data`
- `78: provider-app/src/screens/nursing/NursingRegistration.tsx:877:      await ProviderApi.submit({ signer_name: data.signerName, signer_role: data.signerRole, lat: data.location?.lat || 0, lng: data.location?.lng || 0 , signature_url: sigUrl, fu`
- `92: provider-app/src/screens/radiology/RadiologyRegistration.tsx:1662:      await ProviderApi.submit({ signer_name: data.signerName, signer_role: data.signerRole, lat: data.location?.lat || 0, lng: data.location?.lng || 0 , signature_url: sigUr`
- `100: provider-app/src/screens/pharmacy/PharmacyRegistration.tsx:87:  signatureData: '', signerName: '', signerRole: '',   termsAgreed: false, location: {lat: 0, lng: 0}, accountHolderName: ''`
- `107: provider-app/src/screens/pharmacy/PharmacyRegistration.tsx:794:      await ProviderApi.submit({ signer_name: data.signerName, signer_role: data.signerRole, lat: data.location?.lat || 0, lng: data.location?.lng || 0 , signature_url: sigUrl, `
### state_transitions
- `31: provider-app/src/screens/facility/FacilityRegistration.tsx:75:  city: '', fullAddress: '', location: {lat: 0, lng: 0}, subProviders: [], cashOnly: false, acceptedInsurance: [], hasInsuranceCoordinator: false, signatureData: '', signerName: `
- `109: Expected policy: empty/zero/false defaults are neutral; nonzero commercial/geographic/schedule defaults require explicit product justification.`
### payment_insurance_relevance
- `2: provider-app/src/screens/doctor/DoctorRegistration.tsx:43:  offersClinic: boolean; clinicPrice: string; clinicDuration: string;`
- `3: provider-app/src/screens/doctor/DoctorRegistration.tsx:44:  offersHome: boolean; homePrice: string; homeRadius: number;`
- `4: provider-app/src/screens/doctor/DoctorRegistration.tsx:46:  offersVideo: boolean; videoPrice: string; videoDuration: string;`
- `6: provider-app/src/screens/doctor/DoctorRegistration.tsx:56:  cashOnly: boolean;`
- `8: provider-app/src/screens/doctor/DoctorRegistration.tsx:67:  offersClinic:false, clinicPrice:'', clinicDuration:'',`
- `9: provider-app/src/screens/doctor/DoctorRegistration.tsx:68:  offersHome:false, homePrice:'', homeRadius: 0, homeTransportFee: false, homeTransportPrice: '',`
- `10: provider-app/src/screens/doctor/DoctorRegistration.tsx:69:  offersVideo:false, videoPrice:'', videoDuration:'',`
- `12: provider-app/src/screens/doctor/DoctorRegistration.tsx:77:  cashOnly:false, acceptedInsurance:[], city:'', location: {lat: 0, lng: 0}, address:'', clinicName:'', signatureData:'', signerName:'', signerRole:''`
- `13: provider-app/src/screens/doctor/DoctorRegistration.tsx:415:              <NInput label={AR ? 'سعر الكشف في العيادة' : 'Clinic Visit Price'} value={data.clinicPrice} onChange={v=>update({clinicPrice:v})} kbType="numeric" />`
- `14: provider-app/src/screens/doctor/DoctorRegistration.tsx:429:              <NInput label={AR ? 'سعر الاستشارة الأونلاين' : 'Online Consult Price'} value={data.videoPrice} onChange={v=>update({videoPrice:v})} kbType="numeric" />`
- `15: provider-app/src/screens/doctor/DoctorRegistration.tsx:444:              <NInput label={AR ? 'سعر الزيارة المنزلية' : 'Home Visit Price'} value={data.homePrice} onChange={v=>update({homePrice:v})} kbType="numeric" />`
- `18: provider-app/src/screens/doctor/DoctorRegistration.tsx:715:        <Switch value={data.cashOnly} onValueChange={v=>update({cashOnly:v})} />`
### error_empty_loading_retry_cancel
- `31: provider-app/src/screens/facility/FacilityRegistration.tsx:75:  city: '', fullAddress: '', location: {lat: 0, lng: 0}, subProviders: [], cashOnly: false, acceptedInsurance: [], hasInsuranceCoordinator: false, signatureData: '', signerName: `
- `109: Expected policy: empty/zero/false defaults are neutral; nonzero commercial/geographic/schedule defaults require explicit product justification.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
